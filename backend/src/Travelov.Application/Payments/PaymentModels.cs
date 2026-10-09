namespace Travelov.Application.Payments;

public record PaymentResultDto(
    string BookingCode,
    string BookingStatus,
    string PaymentStatus,
    bool AlreadyProcessed,
    string? Message);
