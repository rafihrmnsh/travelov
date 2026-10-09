namespace Travelov.Domain.Enums;

/// <summary>
/// Lifecycle of a booking. Transitions are enforced by <c>Booking</c> domain methods.
/// </summary>
public enum BookingStatus
{
    /// <summary>Stock is held; waiting for payment before <c>PaymentDeadline</c>.</summary>
    PendingPayment = 0,

    /// <summary>Payment succeeded; stock stays held.</summary>
    Confirmed = 1,

    /// <summary>Not paid before the deadline; stock was released.</summary>
    Expired = 2,

    /// <summary>Cancelled by the user or an admin; stock was released.</summary>
    Cancelled = 3,

    /// <summary>Stay finished; eligible for review.</summary>
    Completed = 4
}
