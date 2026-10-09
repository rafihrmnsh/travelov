using Travelov.Domain.Enums;

namespace Travelov.Domain.Entities;

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookingId { get; set; }
    public Booking? Booking { get; set; }

    /// <summary>Gateway identifier, e.g. "sandbox".</summary>
    public string Provider { get; set; } = "sandbox";

    /// <summary>Reference returned by the gateway; unique for idempotency.</summary>
    public string Reference { get; set; } = string.Empty;

    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PaidAt { get; set; }

    public void MarkPaid(DateTimeOffset now)
    {
        if (Status == PaymentStatus.Paid)
        {
            return;
        }

        Status = PaymentStatus.Paid;
        PaidAt = now;
    }

    public void MarkFailed()
    {
        if (Status == PaymentStatus.Paid)
        {
            return;
        }

        Status = PaymentStatus.Failed;
    }
}
