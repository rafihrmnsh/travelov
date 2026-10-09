using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Travelov.Application.Abstractions;
using Travelov.Application.Common.Exceptions;
using Travelov.Application.Common.Models;
using Travelov.Domain.Entities;

namespace Travelov.Application.Hotels;

public class HotelService
{
    private static readonly TimeSpan SearchCacheTtl = TimeSpan.FromMinutes(5);

    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;

    public HotelService(IApplicationDbContext db, ICacheService cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<PagedResult<HotelSummaryDto>> SearchAsync(HotelSearchRequest request, CancellationToken cancellationToken)
    {
        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize is < 1 or > 50 ? 12 : request.PageSize;
        var cacheKey = BuildSearchCacheKey(request, page, pageSize);

        var cached = await _cache.GetAsync<PagedResult<HotelSummaryDto>>(cacheKey, cancellationToken);
        if (cached is not null)
        {
            return cached;
        }

        var hasRange = request.CheckIn.HasValue && request.CheckOut.HasValue
                       && request.CheckOut.Value > request.CheckIn.Value;
        var checkIn = request.CheckIn ?? default;
        var checkOut = request.CheckOut ?? default;
        var nights = hasRange ? checkOut.DayNumber - checkIn.DayNumber : 0;

        var query = _db.Hotels
            .Include(h => h.Photos)
            .Include(h => h.Facilities).ThenInclude(hf => hf.Facility)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.City))
        {
            var city = request.City.Trim().ToLowerInvariant();
            query = query.Where(h => h.City.ToLower().Contains(city));
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            var name = request.Name.Trim().ToLowerInvariant();
            query = query.Where(h => h.Name.ToLower().Contains(name));
        }

        if (request.Stars is { } stars)
        {
            query = query.Where(h => h.StarRating >= stars);
        }

        if (request.MinRating is { } minRating)
        {
            query = query.Where(h => h.AverageRating >= minRating);
        }

        if (request.FacilityIds is { Count: > 0 } facilityIds)
        {
            query = query.Where(h => h.Facilities.Any(f => facilityIds.Contains(f.FacilityId)));
        }

        var hotels = await query.ToListAsync(cancellationToken);

        var results = new List<HotelSummaryDto>(hotels.Count);

        if (hasRange && nights > 0)
        {
            var guests = request.Guests ?? 1;
            var hotelIds = hotels.Select(h => h.Id).ToList();

            var roomTypes = await _db.RoomTypes
                .Where(rt => hotelIds.Contains(rt.HotelId) && rt.Capacity >= guests)
                .Select(rt => new { rt.Id, rt.HotelId, rt.BasePrice })
                .ToListAsync(cancellationToken);

            var roomTypeIds = roomTypes.Select(rt => rt.Id).ToList();

            var inventory = await _db.RoomInventories
                .Where(i => roomTypeIds.Contains(i.RoomTypeId) && i.Date >= checkIn && i.Date < checkOut)
                .Select(i => new
                {
                    i.RoomTypeId,
                    i.Date,
                    Available = i.TotalUnits - i.ReservedUnits,
                    i.Price
                })
                .ToListAsync(cancellationToken);

            var inventoryByRoomType = inventory
                .GroupBy(i => i.RoomTypeId)
                .ToDictionary(g => g.Key, g => g.ToDictionary(x => x.Date));

            var bestPerHotel = new Dictionary<Guid, decimal>();

            foreach (var rt in roomTypes)
            {
                if (!inventoryByRoomType.TryGetValue(rt.Id, out var byDate))
                {
                    continue;
                }

                var available = true;
                decimal stayTotal = 0;

                for (var d = checkIn; d < checkOut; d = d.AddDays(1))
                {
                    if (!byDate.TryGetValue(d, out var row) || row.Available < 1)
                    {
                        available = false;
                        break;
                    }

                    stayTotal += row.Price;
                }

                if (!available)
                {
                    continue;
                }

                var nightly = Math.Round(stayTotal / nights, 2);
                if (!bestPerHotel.TryGetValue(rt.HotelId, out var current) || nightly < current)
                {
                    bestPerHotel[rt.HotelId] = nightly;
                }
            }

            foreach (var hotel in hotels)
            {
                if (bestPerHotel.TryGetValue(hotel.Id, out var nightly))
                {
                    results.Add(ToSummary(hotel, nightly, available: true));
                }
            }
        }
        else
        {
            var hotelIds = hotels.Select(h => h.Id).ToList();
            var minBasePrices = await _db.RoomTypes
                .Where(rt => hotelIds.Contains(rt.HotelId))
                .GroupBy(rt => rt.HotelId)
                .Select(g => new { HotelId = g.Key, Min = g.Min(rt => rt.BasePrice) })
                .ToListAsync(cancellationToken);

            var priceMap = minBasePrices.ToDictionary(x => x.HotelId, x => x.Min);

            foreach (var hotel in hotels)
            {
                var fromPrice = priceMap.TryGetValue(hotel.Id, out var price) ? price : (decimal?)null;
                results.Add(ToSummary(hotel, fromPrice, available: true));
            }
        }

        if (request.MinPrice is { } minPrice)
        {
            results = results.Where(r => r.FromPricePerNight >= minPrice).ToList();
        }

        if (request.MaxPrice is { } maxPrice)
        {
            results = results.Where(r => r.FromPricePerNight <= maxPrice).ToList();
        }

        results = ApplySort(results, request.Sort);

        var totalCount = results.Count;
        var items = results.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        var paged = new PagedResult<HotelSummaryDto>(items, page, pageSize, totalCount);

        await _cache.SetAsync(cacheKey, paged, SearchCacheTtl, cancellationToken);

        return paged;
    }

    public async Task<HotelDetailDto> GetDetailAsync(
        Guid id,
        DateOnly? checkIn,
        DateOnly? checkOut,
        int? guests,
        CancellationToken cancellationToken)
    {
        var hotel = await _db.Hotels
            .Include(h => h.Photos)
            .Include(h => h.Facilities).ThenInclude(hf => hf.Facility)
            .Include(h => h.RoomTypes)
            .AsNoTracking()
            .FirstOrDefaultAsync(h => h.Id == id, cancellationToken)
            ?? throw new NotFoundException("Hotel not found.");

        var hasRange = checkIn.HasValue && checkOut.HasValue && checkOut.Value > checkIn.Value;
        var capacity = guests ?? 1;
        var roomDtos = new List<RoomTypeDto>();

        if (hasRange)
        {
            var nights = checkOut!.Value.DayNumber - checkIn!.Value.DayNumber;
            var roomTypeIds = hotel.RoomTypes.Select(rt => rt.Id).ToList();

            var inventory = await _db.RoomInventories
                .AsNoTracking()
                .Where(i => roomTypeIds.Contains(i.RoomTypeId) && i.Date >= checkIn && i.Date < checkOut)
                .Select(i => new
                {
                    i.RoomTypeId,
                    i.Date,
                    Available = i.TotalUnits - i.ReservedUnits,
                    i.Price
                })
                .ToListAsync(cancellationToken);

            var inventoryByRoomType = inventory
                .GroupBy(i => i.RoomTypeId)
                .ToDictionary(g => g.Key, g => g.ToDictionary(x => x.Date));

            foreach (var rt in hotel.RoomTypes.OrderBy(rt => rt.BasePrice))
            {
                int? availableUnits = null;
                decimal? stayTotal = null;

                if (inventoryByRoomType.TryGetValue(rt.Id, out var byDate))
                {
                    var minAvailable = int.MaxValue;
                    decimal total = 0;
                    var complete = true;

                    for (var d = checkIn!.Value; d < checkOut!.Value; d = d.AddDays(1))
                    {
                        if (!byDate.TryGetValue(d, out var row))
                        {
                            complete = false;
                            break;
                        }

                        minAvailable = Math.Min(minAvailable, row.Available);
                        total += row.Price;
                    }

                    if (complete)
                    {
                        availableUnits = Math.Max(0, minAvailable);
                        stayTotal = total;
                    }
                }

                roomDtos.Add(new RoomTypeDto(rt.Id, rt.Name, rt.Capacity, rt.BasePrice, availableUnits, stayTotal, nights));
            }
        }
        else
        {
            foreach (var rt in hotel.RoomTypes.OrderBy(rt => rt.BasePrice))
            {
                roomDtos.Add(new RoomTypeDto(rt.Id, rt.Name, rt.Capacity, rt.BasePrice, null, null, null));
            }
        }

        return new HotelDetailDto(
            hotel.Id,
            hotel.Name,
            hotel.City,
            hotel.Address,
            hotel.Description,
            hotel.StarRating,
            hotel.AverageRating,
            hotel.ReviewCount,
            hotel.Photos.OrderBy(p => p.SortOrder).Select(p => new HotelPhotoDto(p.Id, p.Url, p.SortOrder)).ToList(),
            MapFacilities(hotel),
            roomDtos);
    }

    private static HotelSummaryDto ToSummary(Hotel hotel, decimal? fromPricePerNight, bool available) =>
        new(
            hotel.Id,
            hotel.Name,
            hotel.City,
            hotel.Address,
            hotel.StarRating,
            hotel.AverageRating,
            hotel.ReviewCount,
            hotel.Photos.OrderBy(p => p.SortOrder).Select(p => p.Url).FirstOrDefault(),
            fromPricePerNight,
            available,
            MapFacilities(hotel));

    private static List<FacilityDto> MapFacilities(Hotel hotel) =>
        hotel.Facilities
            .Where(f => f.Facility is not null)
            .Select(f => new FacilityDto(f.FacilityId, f.Facility!.Name, f.Facility.Icon))
            .ToList();

    private static List<HotelSummaryDto> ApplySort(List<HotelSummaryDto> items, string? sort) =>
        sort?.Trim().ToLowerInvariant() switch
        {
            "price_asc" or "price" => items.OrderBy(i => i.FromPricePerNight ?? decimal.MaxValue).ToList(),
            "price_desc" => items.OrderByDescending(i => i.FromPricePerNight ?? decimal.MinValue).ToList(),
            "rating" or "rating_desc" => items.OrderByDescending(i => i.AverageRating)
                .ThenByDescending(i => i.ReviewCount).ToList(),
            "popular" or "popularity" => items.OrderByDescending(i => i.ReviewCount)
                .ThenByDescending(i => i.AverageRating).ToList(),
            _ => items.OrderByDescending(i => i.ReviewCount).ThenByDescending(i => i.AverageRating).ToList()
        };

    private static string BuildSearchCacheKey(HotelSearchRequest r, int page, int pageSize)
    {
        var facilities = r.FacilityIds is { Count: > 0 }
            ? string.Join(',', r.FacilityIds.OrderBy(x => x))
            : "-";

        return string.Join('|',
            "hotels:search",
            r.City?.Trim().ToLowerInvariant() ?? "-",
            r.Name?.Trim().ToLowerInvariant() ?? "-",
            r.CheckIn?.ToString("yyyyMMdd", CultureInfo.InvariantCulture) ?? "-",
            r.CheckOut?.ToString("yyyyMMdd", CultureInfo.InvariantCulture) ?? "-",
            r.Guests?.ToString(CultureInfo.InvariantCulture) ?? "-",
            r.MinPrice?.ToString(CultureInfo.InvariantCulture) ?? "-",
            r.MaxPrice?.ToString(CultureInfo.InvariantCulture) ?? "-",
            r.MinRating?.ToString(CultureInfo.InvariantCulture) ?? "-",
            r.Stars?.ToString(CultureInfo.InvariantCulture) ?? "-",
            facilities,
            r.Sort?.ToLowerInvariant() ?? "-",
            page.ToString(CultureInfo.InvariantCulture),
            pageSize.ToString(CultureInfo.InvariantCulture));
    }
}
