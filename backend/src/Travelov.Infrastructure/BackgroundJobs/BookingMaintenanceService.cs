using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Travelov.Application.Bookings;

namespace Travelov.Infrastructure.BackgroundJobs;

/// <summary>
/// Periodically expires unpaid bookings (releasing their stock) and completes
/// stays whose check-out date has passed. This is the alternative to a scheduler
/// such as Hangfire for the portfolio scope.
/// </summary>
public class BookingMaintenanceService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);
    private const int BatchSize = 100;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BookingMaintenanceService> _logger;

    public BookingMaintenanceService(IServiceScopeFactory scopeFactory, ILogger<BookingMaintenanceService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let the host finish starting before the first pass.
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var bookingService = scope.ServiceProvider.GetRequiredService<BookingService>();

                var expired = await bookingService.ExpireDueBookingsAsync(BatchSize, stoppingToken);
                var completed = await bookingService.CompletePastBookingsAsync(BatchSize, stoppingToken);

                if (expired > 0 || completed > 0)
                {
                    _logger.LogInformation(
                        "Booking maintenance: expired {ExpiredCount}, completed {CompletedCount}.",
                        expired,
                        completed);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Booking maintenance cycle failed.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
