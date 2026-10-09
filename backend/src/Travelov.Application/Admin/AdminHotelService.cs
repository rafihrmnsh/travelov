using Microsoft.EntityFrameworkCore;
using Travelov.Application.Abstractions;
using Travelov.Application.Common.Exceptions;
using Travelov.Application.Common.Models;
using Travelov.Application.Hotels;
using Travelov.Domain.Entities;
using Travelov.Domain.Exceptions;

namespace Travelov.Application.Admin;

public record InventoryDto(
    Guid Id,
    Guid RoomTypeId,
    DateOnly Date,
    int TotalUnits,
    int ReservedUnits,
    int AvailableUnits,
    decimal Price);

public class AdminHotelService
{
    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;

    public AdminHotelService(IApplicationDbContext db, ICacheService cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<PagedResult<AdminHotelDto>> GetHotelsAsync(string? search, int page, int pageSize, CancellationToken cancellationToken)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        var query = _db.Hotels
            .Include(h => h.Photos)
            .Include(h => h.Facilities).ThenInclude(hf => hf.Facility)
            .Include(h => h.RoomTypes)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(h => h.Name.ToLower().Contains(term) || h.City.ToLower().Contains(term));
        }

        var total = await query.CountAsync(cancellationToken);
        var hotels = await query
            .OrderBy(h => h.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<AdminHotelDto>(hotels.Select(ToDto).ToList(), page, pageSize, total);
    }

    public async Task<AdminHotelDto> GetHotelAsync(Guid id, CancellationToken cancellationToken)
    {
        var hotel = await _db.Hotels
            .Include(h => h.Photos)
            .Include(h => h.Facilities).ThenInclude(hf => hf.Facility)
            .Include(h => h.RoomTypes)
            .AsNoTracking()
            .FirstOrDefaultAsync(h => h.Id == id, cancellationToken)
            ?? throw new NotFoundException("Hotel not found.");

        return ToDto(hotel);
    }

    public async Task<AdminHotelDto> CreateHotelAsync(HotelUpsertRequest request, CancellationToken cancellationToken)
    {
        var hotel = new Hotel
        {
            Name = request.Name.Trim(),
            City = request.City.Trim(),
            Address = request.Address.Trim(),
            Description = request.Description.Trim(),
            StarRating = request.StarRating
        };

        ApplyPhotos(hotel, request.PhotoUrls);
        await ApplyFacilitiesAsync(hotel, request.FacilityIds, cancellationToken);

        _db.Hotels.Add(hotel);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetHotelAsync(hotel.Id, cancellationToken);
    }

    public async Task<AdminHotelDto> UpdateHotelAsync(Guid id, HotelUpsertRequest request, CancellationToken cancellationToken)
    {
        var hotel = await _db.Hotels
            .Include(h => h.Photos)
            .Include(h => h.Facilities)
            .FirstOrDefaultAsync(h => h.Id == id, cancellationToken)
            ?? throw new NotFoundException("Hotel not found.");

        hotel.Name = request.Name.Trim();
        hotel.City = request.City.Trim();
        hotel.Address = request.Address.Trim();
        hotel.Description = request.Description.Trim();
        hotel.StarRating = request.StarRating;

        hotel.Photos.Clear();
        ApplyPhotos(hotel, request.PhotoUrls);

        hotel.Facilities.Clear();
        await ApplyFacilitiesAsync(hotel, request.FacilityIds, cancellationToken);

        await _db.SaveChangesAsync(cancellationToken);
        return await GetHotelAsync(hotel.Id, cancellationToken);
    }

    public async Task DeleteHotelAsync(Guid id, CancellationToken cancellationToken)
    {
        var hotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == id, cancellationToken)
                    ?? throw new NotFoundException("Hotel not found.");

        var hasBookings = await _db.Bookings.AnyAsync(b => b.HotelId == id, cancellationToken);
        if (hasBookings)
        {
            throw new DomainException("This hotel has bookings and cannot be deleted.");
        }

        _db.Hotels.Remove(hotel);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<FacilityDto>> GetFacilitiesAsync(CancellationToken cancellationToken)
    {
        return await _db.Facilities
            .AsNoTracking()
            .OrderBy(f => f.Name)
            .Select(f => new FacilityDto(f.Id, f.Name, f.Icon))
            .ToListAsync(cancellationToken);
    }

    public async Task<FacilityDto> CreateFacilityAsync(FacilityUpsertRequest request, CancellationToken cancellationToken)
    {
        var facility = new Facility { Name = request.Name.Trim(), Icon = request.Icon.Trim() };
        _db.Facilities.Add(facility);
        await _db.SaveChangesAsync(cancellationToken);
        return new FacilityDto(facility.Id, facility.Name, facility.Icon);
    }

    public async Task<IReadOnlyList<AdminRoomTypeDto>> GetRoomTypesAsync(Guid hotelId, CancellationToken cancellationToken)
    {
        return await _db.RoomTypes
            .AsNoTracking()
            .Where(rt => rt.HotelId == hotelId)
            .OrderBy(rt => rt.BasePrice)
            .Select(rt => new AdminRoomTypeDto(rt.Id, rt.Name, rt.Capacity, rt.BasePrice))
            .ToListAsync(cancellationToken);
    }

    public async Task<AdminRoomTypeDto> CreateRoomTypeAsync(Guid hotelId, RoomTypeUpsertRequest request, CancellationToken cancellationToken)
    {
        if (!await _db.Hotels.AnyAsync(h => h.Id == hotelId, cancellationToken))
        {
            throw new NotFoundException("Hotel not found.");
        }

        var roomType = new RoomType
        {
            HotelId = hotelId,
            Name = request.Name.Trim(),
            Capacity = request.Capacity,
            BasePrice = request.BasePrice
        };

        _db.RoomTypes.Add(roomType);
        await _db.SaveChangesAsync(cancellationToken);
        return new AdminRoomTypeDto(roomType.Id, roomType.Name, roomType.Capacity, roomType.BasePrice);
    }

    public async Task<AdminRoomTypeDto> UpdateRoomTypeAsync(Guid id, RoomTypeUpsertRequest request, CancellationToken cancellationToken)
    {
        var roomType = await _db.RoomTypes.FirstOrDefaultAsync(rt => rt.Id == id, cancellationToken)
                       ?? throw new NotFoundException("Room type not found.");

        roomType.Name = request.Name.Trim();
        roomType.Capacity = request.Capacity;
        roomType.BasePrice = request.BasePrice;

        await _db.SaveChangesAsync(cancellationToken);
        return new AdminRoomTypeDto(roomType.Id, roomType.Name, roomType.Capacity, roomType.BasePrice);
    }

    public async Task DeleteRoomTypeAsync(Guid id, CancellationToken cancellationToken)
    {
        var roomType = await _db.RoomTypes.FirstOrDefaultAsync(rt => rt.Id == id, cancellationToken)
                       ?? throw new NotFoundException("Room type not found.");

        var hasBookings = await _db.Bookings.AnyAsync(b => b.RoomTypeId == id, cancellationToken);
        if (hasBookings)
        {
            throw new DomainException("This room type has bookings and cannot be deleted.");
        }

        _db.RoomTypes.Remove(roomType);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<InventoryDto>> GetInventoryAsync(
        Guid roomTypeId,
        DateOnly? from,
        DateOnly? to,
        CancellationToken cancellationToken)
    {
        var start = from ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var end = to ?? start.AddDays(30);

        return await _db.RoomInventories
            .AsNoTracking()
            .Where(i => i.RoomTypeId == roomTypeId && i.Date >= start && i.Date <= end)
            .OrderBy(i => i.Date)
            .Select(i => new InventoryDto(
                i.Id,
                i.RoomTypeId,
                i.Date,
                i.TotalUnits,
                i.ReservedUnits,
                i.TotalUnits - i.ReservedUnits,
                i.Price))
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Upserts inventory rows for every night in the range. Existing reservations
    /// are preserved, so total units can never be lowered below what is already reserved.
    /// </summary>
    public async Task<int> UpdateInventoryAsync(InventoryUpdateRequest request, CancellationToken cancellationToken)
    {
        if (!await _db.RoomTypes.AnyAsync(rt => rt.Id == request.RoomTypeId, cancellationToken))
        {
            throw new NotFoundException("Room type not found.");
        }

        var dates = EnumerateDates(request.StartDate, request.EndDate).ToList();
        if (dates.Count == 0)
        {
            throw new DomainException("The date range is empty.");
        }

        var existing = await _db.RoomInventories
            .Where(i => i.RoomTypeId == request.RoomTypeId && i.Date >= request.StartDate && i.Date <= request.EndDate)
            .ToDictionaryAsync(i => i.Date, cancellationToken);

        foreach (var date in dates)
        {
            if (existing.TryGetValue(date, out var row))
            {
                if (request.TotalUnits < row.ReservedUnits)
                {
                    throw new DomainException(
                        $"Cannot set {request.TotalUnits} units on {date:yyyy-MM-dd}: {row.ReservedUnits} are already reserved.");
                }

                row.TotalUnits = request.TotalUnits;
                row.Price = request.Price;
            }
            else
            {
                _db.RoomInventories.Add(new RoomInventory
                {
                    RoomTypeId = request.RoomTypeId,
                    Date = date,
                    TotalUnits = request.TotalUnits,
                    ReservedUnits = 0,
                    Price = request.Price
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        await InvalidateSearchCacheAsync(cancellationToken);

        return dates.Count;
    }

    private async Task ApplyFacilitiesAsync(Hotel hotel, IReadOnlyList<Guid>? facilityIds, CancellationToken cancellationToken)
    {
        if (facilityIds is not { Count: > 0 })
        {
            return;
        }

        var validFacilities = await _db.Facilities
            .Where(f => facilityIds.Contains(f.Id))
            .Select(f => f.Id)
            .ToListAsync(cancellationToken);

        foreach (var facilityId in validFacilities)
        {
            hotel.Facilities.Add(new HotelFacility { HotelId = hotel.Id, FacilityId = facilityId });
        }
    }

    private static void ApplyPhotos(Hotel hotel, IReadOnlyList<string>? urls)
    {
        if (urls is not { Count: > 0 })
        {
            return;
        }

        var order = 0;
        foreach (var url in urls.Where(u => !string.IsNullOrWhiteSpace(u)))
        {
            hotel.Photos.Add(new HotelPhoto { HotelId = hotel.Id, Url = url.Trim(), SortOrder = order++ });
        }
    }

    private static IEnumerable<DateOnly> EnumerateDates(DateOnly start, DateOnly end)
    {
        for (var date = start; date <= end; date = date.AddDays(1))
        {
            yield return date;
        }
    }

    private async Task InvalidateSearchCacheAsync(CancellationToken cancellationToken)
    {
        // Search keys are parameterised; drop the whole namespace marker is not supported
        // by the simple cache abstraction, so we clear the known first page keys instead.
        await _cache.RemoveAsync("hotels:search:all", cancellationToken);
    }

    private static AdminHotelDto ToDto(Hotel hotel) =>
        new(
            hotel.Id,
            hotel.Name,
            hotel.City,
            hotel.Address,
            hotel.Description,
            hotel.StarRating,
            hotel.AverageRating,
            hotel.ReviewCount,
            hotel.Photos.OrderBy(p => p.SortOrder).Select(p => new HotelPhotoDto(p.Id, p.Url, p.SortOrder)).ToList(),
            hotel.Facilities
                .Where(f => f.Facility is not null)
                .Select(f => new FacilityDto(f.FacilityId, f.Facility!.Name, f.Facility.Icon))
                .ToList(),
            hotel.RoomTypes.OrderBy(rt => rt.BasePrice)
                .Select(rt => new AdminRoomTypeDto(rt.Id, rt.Name, rt.Capacity, rt.BasePrice))
                .ToList());
}
