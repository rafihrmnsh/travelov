namespace Travelov.Api.Contracts;

/// <summary>Optional body for <c>POST /api/bookings/{id}/cancel</c>.</summary>
public record CancelBookingRequest(string? Reason);

/// <summary>
/// Body for <c>POST /api/payments/simulate</c> — a sandbox-only affordance used by
/// the demo payment page to emulate the gateway sending a callback.
/// </summary>
public record SimulatePaymentRequest(string BookingCode, bool Success);
