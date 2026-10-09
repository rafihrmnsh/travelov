using Microsoft.EntityFrameworkCore;
using Travelov.Application.Abstractions;
using Travelov.Domain.Enums;

namespace Travelov.Application.Admin;

public class AdminStatsService
{
    private const int OccupancyWindowDays = 30;

    private readonly IApplicationDbContext _db;
    private readonly IDateTimeProvider _clock;

    public AdminStatsService(IApplicationDbContext db, IDateTimeProvider clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<AdminStatsDto> GetStatsAsync(CancellationToken cancellationToken)
    {
        var bookings = _db.Bookings.AsNoTracking();

        var totalBookings = await bookings.CountAsync(cancellationToken);
        var pending = await bookings.CountAsync(b => b.Status == BookingStatus.PendingPayment, cancellationToken);
        var confirmed = await bookings.CountAsync(b => b.Status == BookingStatus.Confirmed, cancellationToken);
        var expired = await bookings.CountAsync(b => b.Status == BookingStatus.Expired, cancellationToken);
        var cancelled = await bookings.CountAsync(b => b.Status == BookingStatus.Cancelled, cancellationToken);

        // Revenue counts paid stays (confirmed or completed).
        var revenue = await bookings
            .Where(b => b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Completed)
            .SumAsync(b => (decimal?)b.TotalPrice, cancellationToken) ?? 0m;

        var totalHotels = await _db.Hotels.CountAsync(cancellationToken);
        var totalRoomTypes = await _db.RoomTypes.CountAsync(cancellationToken);
        var totalUsers = await _db.Users.CountAsync(u => u.Role == UserRole.User, cancellationToken);

        var today = _clock.Today;
        var windowEnd = today.AddDays(OccupancyWindowDays);

        var inventoryTotals = await _db.RoomInventories
            .AsNoTracking()
            .Where(i => i.Date >= today && i.Date < windowEnd)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                TotalUnits = g.Sum(i => (long)i.TotalUnits),
                ReservedUnits = g.Sum(i => (long)i.ReservedUnits)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var occupancyRate = inventoryTotals is null || inventoryTotals.TotalUnits == 0
            ? 0d
            : Math.Round((double)inventoryTotals.ReservedUnits / inventoryTotals.TotalUnits * 100, 2);

        return new AdminStatsDto(
            totalBookings,
            pending,
            confirmed,
            expired,
            cancelled,
            revenue,
            totalHotels,
            totalRoomTypes,
            totalUsers,
            occupancyRate);
    }
}
