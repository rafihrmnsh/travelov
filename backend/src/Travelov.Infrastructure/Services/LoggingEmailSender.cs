using Microsoft.Extensions.Logging;
using Travelov.Application.Abstractions;

namespace Travelov.Infrastructure.Services;

/// <summary>
/// Development email sender: logs the confirmation instead of sending it.
/// Swap for an SMTP/provider implementation in production.
/// </summary>
public class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendBookingConfirmationAsync(string to, string bookingCode, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Booking confirmation email queued. BookingCode={BookingCode} To={Email}",
            bookingCode,
            to);

        return Task.CompletedTask;
    }
}
