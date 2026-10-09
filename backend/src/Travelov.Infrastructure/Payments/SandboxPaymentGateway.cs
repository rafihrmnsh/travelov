using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Travelov.Application.Abstractions;

namespace Travelov.Infrastructure.Payments;

/// <summary>
/// Stand-in for a real gateway (e.g. Midtrans sandbox). Transactions are signed with
/// HMAC-SHA256 so the callback endpoint can prove a payload is authentic, and the
/// "payment page" is a frontend route the guest visits to simulate paying.
/// </summary>
public class SandboxPaymentGateway : IPaymentGateway, IPaymentSimulator
{
    private readonly SandboxPaymentOptions _options;

    public SandboxPaymentGateway(IOptions<SandboxPaymentOptions> options)
    {
        _options = options.Value;
    }

    public string Name => "sandbox";

    public Task<PaymentInitiation> InitiateAsync(PaymentInitiationRequest request, CancellationToken cancellationToken = default)
    {
        var reference = BuildReference(request.BookingCode);
        var paymentUrl = $"{_options.PaymentPagePath}/{request.BookingCode}";
        return Task.FromResult(new PaymentInitiation(Name, reference, paymentUrl));
    }

    public bool VerifySignature(PaymentCallbackRequest callback)
    {
        var expected = ComputeSignature(callback.BookingCode, callback.Reference, callback.Amount, callback.Success);
        var provided = callback.Signature ?? string.Empty;

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(provided));
    }

    public PaymentCallbackRequest CreateSignedCallback(string bookingCode, string reference, decimal amount, bool success) =>
        new(bookingCode, reference, amount, success, ComputeSignature(bookingCode, reference, amount, success));

    public static string BuildReference(string bookingCode) => $"SBX-{bookingCode}";

    private string ComputeSignature(string bookingCode, string reference, decimal amount, bool success)
    {
        var payload = string.Join('|',
            bookingCode,
            reference,
            amount.ToString("0.00", CultureInfo.InvariantCulture),
            success ? "1" : "0");

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.Secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
