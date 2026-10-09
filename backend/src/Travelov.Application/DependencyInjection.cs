using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Travelov.Application.Admin;
using Travelov.Application.Auth;
using Travelov.Application.Bookings;
using Travelov.Application.Hotels;
using Travelov.Application.Payments;
using Travelov.Application.Reviews;

namespace Travelov.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<AuthService>();
        services.AddScoped<HotelService>();
        services.AddScoped<BookingService>();
        services.AddScoped<PaymentService>();
        services.AddScoped<ReviewService>();
        services.AddScoped<AdminHotelService>();
        services.AddScoped<AdminBookingService>();
        services.AddScoped<AdminStatsService>();

        services.AddValidatorsFromAssemblyContaining<HotelSearchRequestValidator>(ServiceLifetime.Scoped);

        return services;
    }
}
