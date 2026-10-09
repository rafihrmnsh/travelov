namespace Travelov.Application.Abstractions;

public record PaymentInitiationRequest(
    Guid BookingId,
    string BookingCode,
    decimal Amount,
    string Currency,
    DateTimeOffset ExpiresAt);

public record PaymentInitiation(string Provider, string Reference, string PaymentUrl);

/// <summary>
/// Payload sent by the payment gateway to <c>POST /api/payments/callback</c>.
/// </summary>
/// <param name="BookingCode">Booking the payment belongs to.</param>
/// <param name="Reference">Gateway transaction reference (unique, used for idempotency).</param>
/// <param name="Amount">Amount paid.</param>
/// <param name="Success">Whether the payment succeeded.</param>
/// <param name="Signature">HMAC signature proving the payload came from the gateway.</param>
public record PaymentCallbackRequest(
    string BookingCode,
    string Reference,
    decimal Amount,
    bool Success,
    string Signature);

public interface IPaymentGateway
{
    /// <summary>Gateway name persisted on the payment record, e.g. "sandbox".</summary>
    string Name { get; }

    /// <summary>Creates a transaction and returns the reference plus a redirect URL.</summary>
    Task<PaymentInitiation> InitiateAsync(PaymentInitiationRequest request, CancellationToken cancellationToken = default);

    /// <summary>Verifies that a callback payload was produced by the gateway.</summary>
    bool VerifySignature(PaymentCallbackRequest callback);
}

/// <summary>
/// Sandbox-only affordance: lets the demo (and tests) emulate the gateway
/// producing a signed callback without exposing the signing secret to clients.
/// </summary>
public interface IPaymentSimulator
{
    PaymentCallbackRequest CreateSignedCallback(string bookingCode, string reference, decimal amount, bool success);
}
