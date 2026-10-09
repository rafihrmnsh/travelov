namespace Travelov.Infrastructure.Payments;

public class SandboxPaymentOptions
{
    public const string SectionName = "SandboxPayment";

    /// <summary>Shared secret used to sign and verify sandbox callbacks.</summary>
    public string Secret { get; set; } = string.Empty;

    /// <summary>Frontend path guests are sent to in order to pay.</summary>
    public string PaymentPagePath { get; set; } = "/payment";
}
