using Microsoft.EntityFrameworkCore;
using Travelov.Application.Abstractions;
using Travelov.Application.Common.Models;
using Travelov.Domain.Enums;
using Travelov.Domain.Exceptions;

namespace Travelov.Application.Admin;

public class AdminBookingService
{
    private readonly IApplicationDbContext _db;

    public AdminBookingService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<AdminBookingDto>> GetBookingsAsync(
        string? status,
        DateOnly? from,
        DateOnly? to,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        var query = _db.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .Include(b => b.Payment)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<BookingStatus>(status, ignoreCase: true, out var parsed))
            {
                throw new DomainException($"Unknown booking status '{status}'.");
            }

            query = query.Where(b => b.Status == parsed);
        }

        if (from is { } fromDate)
        {
            query = query.Where(b => b.CheckIn >= fromDate);
        }

        if (to is { } toDate)
        {
            query = query.Where(b => b.CheckOut <= toDate);
        }

        var total = await query.CountAsync(cancellationToken);
        var bookings = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = bookings.Select(b => new AdminBookingDto(
            b.Id,
            b.Code,
            b.Hotel?.Name ?? string.Empty,
            b.RoomType?.Name ?? string.Empty,
            b.GuestName,
            b.GuestEmail,
            b.CheckIn,
            b.CheckOut,
            b.Rooms,
            b.TotalPrice,
            b.Status.ToString(),
            b.Payment?.Status.ToString() ?? "None",
            b.CreatedAt,
            b.PaymentDeadline)).ToList();

        return new PagedResult<AdminBookingDto>(items, page, pageSize, total);
    }
}
