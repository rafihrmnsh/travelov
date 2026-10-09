namespace Travelov.Application.Abstractions;

public interface IEmailSender
{
    Task SendBookingConfirmationAsync(string to, string bookingCode, CancellationToken cancellationToken = default);
}
