using Microsoft.EntityFrameworkCore;
using Travelov.Application.Abstractions;
using Travelov.Application.Common.Exceptions;
using Travelov.Application.Common.Models;
using Travelov.Domain.Entities;
using Travelov.Domain.Enums;
using Travelov.Domain.Exceptions;

namespace Travelov.Application.Bookings;

public class BookingService
{
    /// <summary>How long a booking holds inventory while awaiting payment.</summary>
    public const int PaymentWindowMinutes = 15;

    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IPaymentGateway _paymentGateway;

    public BookingService(
        IApplicationDbContext db,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IPaymentGateway paymentGateway)
    {
        _db = db;
        _currentUser = currentUser;
        _clock = clock;
        _paymentGateway = paymentGateway;
    }

    public async Task<BookingDto> CreateAsync(CreateBookingRequest request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();

        var hotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == request.HotelId, cancellationToken)
                    ?? throw new NotFoundException("Hotel not found.");

        var roomType = await _db.RoomTypes
                           .FirstOrDefaultAsync(rt => rt.Id == request.RoomTypeId && rt.HotelId == request.HotelId, cancellationToken)
                       ?? throw new DomainException("The selected room type does not belong to this hotel.");

        var today = _clock.Today;
        if (request.CheckIn < today)
        {
            throw new DomainException("Check-in date cannot be in the past.");
        }

        if (request.Guests > roomType.Capacity * request.Rooms)
        {
            throw new DomainException($"This room type sleeps at most {roomType.Capacity} guests per room.");
        }

        var nights = Enumerable
            .Range(0, request.CheckOut.DayNumber - request.CheckIn.DayNumber)
            .Select(offset => request.CheckIn.AddDays(offset))
            .ToList();

        // Tracked on purpose: each night is reserved and saved atomically below.
        var inventory = await _db.RoomInventories
            .Where(i => i.RoomTypeId == request.RoomTypeId && i.Date >= request.CheckIn && i.Date < request.CheckOut)
            .ToListAsync(cancellationToken);

        var inventoryByDate = inventory.ToDictionary(i => i.Date);
        var breakdown = new List<NightlyPriceDto>(nights.Count);

        foreach (var date in nights)
        {
            if (!inventoryByDate.TryGetValue(date, out var row))
            {
                throw new DomainException($"Rooms are not on sale for {date:yyyy-MM-dd}.");
            }

            // Throws InsufficientInventoryException when the remaining stock is too low.
            row.Reserve(request.Rooms);
            breakdown.Add(new NightlyPriceDto(date, row.Price));
        }

        var price = BookingPricing.Calculate(breakdown, request.Rooms);
        var now = _clock.UtcNow;

        var booking = new Booking
        {
            Code = Booking.NewCode(),
            UserId = userId,
            HotelId = hotel.Id,
            RoomTypeId = roomType.Id,
            CheckIn = request.CheckIn,
            CheckOut = request.CheckOut,
            Rooms = request.Rooms,
            Guests = request.Guests,
            GuestName = request.GuestName.Trim(),
            GuestEmail = request.GuestEmail.Trim(),
            GuestPhone = request.GuestPhone.Trim(),
            Subtotal = price.Subtotal,
            TaxAmount = price.TaxAmount,
            TotalPrice = price.TotalPrice,
            Status = BookingStatus.PendingPayment,
            CreatedAt = now,
            PaymentDeadline = now.AddMinutes(PaymentWindowMinutes)
        };

        booking.Payment = new Payment
        {
            BookingId = booking.Id,
            Provider = _paymentGateway.Name,
            Reference = BuildReference(booking.Code),
            Amount = booking.TotalPrice,
            Status = PaymentStatus.Pending,
            CreatedAt = now
        };

        _db.Bookings.Add(booking);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Another request reserved the same inventory first: optimistic concurrency rejected this write.
            throw new DomainException("Sorry, the last rooms were just taken. Please try different dates or another room type.");
        }

        booking.Hotel = hotel;
        booking.RoomType = roomType;

        return ToDto(booking);
    }

    public async Task<PagedResult<BookingDto>> GetMyBookingsAsync(int page, int pageSize, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 50 ? 10 : pageSize;

        var query = _db.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .Include(b => b.Payment)
            .Include(b => b.Review)
            .AsNoTracking()
            .Where(b => b.UserId == userId);

        var total = await query.CountAsync(cancellationToken);
        var bookings = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<BookingDto>(bookings.Select(ToDto).ToList(), page, pageSize, total);
    }

    public async Task<BookingDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var booking = await LoadForAccessAsync(id, cancellationToken);
        return ToDto(booking);
    }

    public async Task<BookingDto> CancelAsync(Guid id, string? reason, CancellationToken cancellationToken)
    {
        var booking = await LoadForAccessAsync(id, cancellationToken);
        var now = _clock.UtcNow;

        // Throws when the booking can no longer be cancelled.
        booking.Cancel(string.IsNullOrWhiteSpace(reason) ? "Cancelled by user." : reason, now, _clock.Today);

        await ReleaseInventoryAsync(booking, cancellationToken);

        if (booking.Payment is { Status: PaymentStatus.Pending } payment)
        {
            payment.MarkFailed();
        }

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(booking);
    }

    /// <summary>
    /// Expires unpaid bookings whose payment deadline has passed and releases their stock.
    /// Returns the number of bookings expired. Called by the background service.
    /// </summary>
    public async Task<int> ExpireDueBookingsAsync(int batchSize, CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;

        var due = await _db.Bookings
            .Include(b => b.Payment)
            .Where(b => b.Status == BookingStatus.PendingPayment && b.PaymentDeadline <= now)
            .OrderBy(b => b.PaymentDeadline)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        if (due.Count == 0)
        {
            return 0;
        }

        foreach (var booking in due)
        {
            await ReleaseInventoryAsync(booking, cancellationToken);
            booking.Expire(now);

            if (booking.Payment is { Status: PaymentStatus.Pending } payment)
            {
                payment.Status = PaymentStatus.Expired;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return due.Count;
    }

    /// <summary>
    /// Marks confirmed stays whose check-out date has passed as completed so guests can review them.
    /// Returns the number of bookings completed. Called by the background service.
    /// </summary>
    public async Task<int> CompletePastBookingsAsync(int batchSize, CancellationToken cancellationToken)
    {
        var today = _clock.Today;

        var due = await _db.Bookings
            .Where(b => b.Status == BookingStatus.Confirmed && b.CheckOut <= today)
            .OrderBy(b => b.CheckOut)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        if (due.Count == 0)
        {
            return 0;
        }

        foreach (var booking in due)
        {
            booking.Complete();
        }

        await _db.SaveChangesAsync(cancellationToken);
        return due.Count;
    }

    private async Task<Booking> LoadForAccessAsync(Guid id, CancellationToken cancellationToken)
    {
        var booking = await _db.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .Include(b => b.Payment)
            .Include(b => b.Review)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken)
            ?? throw new NotFoundException("Booking not found.");

        if (!_currentUser.IsAdmin && booking.UserId != _currentUser.UserId)
        {
            throw new NotFoundException("Booking not found.");
        }

        return booking;
    }

    /// <summary>Gives back the reserved stock for every night of the booking.</summary>
    private async Task ReleaseInventoryAsync(Booking booking, CancellationToken cancellationToken)
    {
        if (!booking.HoldsInventory)
        {
            return;
        }

        var inventory = await _db.RoomInventories
            .Where(i => i.RoomTypeId == booking.RoomTypeId
                        && i.Date >= booking.CheckIn
                        && i.Date < booking.CheckOut)
            .ToListAsync(cancellationToken);

        foreach (var row in inventory)
        {
            row.Release(booking.Rooms);
        }
    }

    private Guid RequireUserId() =>
        _currentUser.UserId ?? throw new DomainException("Authentication is required.");

    private static string BuildReference(string bookingCode) => $"SBX-{bookingCode}";

    private BookingDto ToDto(Booking b) => new(
        b.Id,
        b.Code,
        b.HotelId,
        b.Hotel?.Name ?? string.Empty,
        b.Hotel?.City ?? string.Empty,
        b.RoomTypeId,
        b.RoomType?.Name ?? string.Empty,
        b.CheckIn,
        b.CheckOut,
        b.Nights,
        b.Rooms,
        b.Guests,
        b.GuestName,
        b.GuestEmail,
        b.GuestPhone,
        b.Subtotal,
        b.TaxAmount,
        b.TotalPrice,
        b.Status.ToString(),
        b.CreatedAt,
        b.PaymentDeadline,
        b.ConfirmedAt,
        b.CancellationReason,
        b.CanBeCancelled(_clock.Today),
        b.Status == BookingStatus.Completed && b.Review is null,
        b.Payment is null
            ? null
            : new PaymentInfoDto(
                b.Payment.Id,
                b.Payment.Provider,
                b.Payment.Reference,
                b.Payment.Status.ToString(),
                b.Payment.Amount,
                b.Payment.PaidAt,
                $"/payment/{b.Code}"));
}
