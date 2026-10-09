using Travelov.Domain.Enums;
using Travelov.Domain.Exceptions;

namespace Travelov.Domain.Entities;

public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Human friendly booking code shown to the guest, e.g. <c>TRV-8F3K2Q</c>.</summary>
    public string Code { get; set; } = string.Empty;

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid HotelId { get; set; }
    public Hotel? Hotel { get; set; }

    public Guid RoomTypeId { get; set; }
    public RoomType? RoomType { get; set; }

    public DateOnly CheckIn { get; set; }
    public DateOnly CheckOut { get; set; }

    public int Rooms { get; set; }
    public int Guests { get; set; }

    public string GuestName { get; set; } = string.Empty;
    public string GuestEmail { get; set; } = string.Empty;
    public string GuestPhone { get; set; } = string.Empty;

    /// <summary>Sum of nightly prices before tax.</summary>
    public decimal Subtotal { get; set; }

    public decimal TaxAmount { get; set; }
    public decimal TotalPrice { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.PendingPayment;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset PaymentDeadline { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }

    public Payment? Payment { get; set; }
    public Review? Review { get; set; }

    public int Nights => CheckOut.DayNumber - CheckIn.DayNumber;

    /// <summary>
    /// Free cancellation while the booking is still active and the stay has not started.
    /// </summary>
    public bool CanBeCancelled(DateOnly today)
        => Status is BookingStatus.PendingPayment or BookingStatus.Confirmed && today < CheckIn;

    public void Confirm(DateTimeOffset now)
    {
        if (Status == BookingStatus.Confirmed)
        {
            // Idempotent: a repeated payment callback must not fail.
            return;
        }

        if (Status != BookingStatus.PendingPayment)
        {
            throw new DomainException($"Cannot confirm a booking in status {Status}.");
        }

        Status = BookingStatus.Confirmed;
        ConfirmedAt = now;
    }

    public void Cancel(string reason, DateTimeOffset now, DateOnly today)
    {
        if (Status is BookingStatus.Cancelled or BookingStatus.Expired)
        {
            return;
        }

        if (!CanBeCancelled(today))
        {
            throw new DomainException("This booking can no longer be cancelled.");
        }

        Status = BookingStatus.Cancelled;
        CancelledAt = now;
        CancellationReason = reason;
    }

    public void Expire(DateTimeOffset now)
    {
        if (Status != BookingStatus.PendingPayment)
        {
            return;
        }

        Status = BookingStatus.Expired;
        CancelledAt = now;
        CancellationReason = "Payment deadline passed.";
    }

    public void Complete()
    {
        if (Status != BookingStatus.Confirmed)
        {
            throw new DomainException("Only confirmed bookings can be completed.");
        }

        Status = BookingStatus.Completed;
    }

    /// <summary>Whether this booking still holds inventory that must be released.</summary>
    public bool HoldsInventory => Status is BookingStatus.PendingPayment or BookingStatus.Confirmed;

    private const string CodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public static string NewCode()
    {
        Span<char> buffer = stackalloc char[6];
        for (var i = 0; i < buffer.Length; i++)
        {
            buffer[i] = CodeAlphabet[Random.Shared.Next(CodeAlphabet.Length)];
        }

        return $"TRV-{new string(buffer)}";
    }
}
