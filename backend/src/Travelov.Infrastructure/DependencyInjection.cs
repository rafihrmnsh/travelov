using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Travelov.Application.Abstractions;
using Travelov.Infrastructure.BackgroundJobs;
using Travelov.Infrastructure.Caching;
using Travelov.Infrastructure.Identity;
using Travelov.Infrastructure.Payments;
using Travelov.Infrastructure.Persistence;
using Travelov.Infrastructure.Persistence.Seed;
using Travelov.Infrastructure.Services;

namespace Travelov.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<SandboxPaymentOptions>(configuration.GetSection(SandboxPaymentOptions.SectionName));

        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

        services.AddScoped<SandboxPaymentGateway>();
        services.AddScoped<IPaymentGateway>(sp => sp.GetRequiredService<SandboxPaymentGateway>());
        services.AddScoped<IPaymentSimulator>(sp => sp.GetRequiredService<SandboxPaymentGateway>());
        services.AddScoped<IEmailSender, LoggingEmailSender>();

        var redisConnection = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redisConnection))
        {
            services.AddStackExchangeRedisCache(options => options.Configuration = redisConnection);
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

        services.AddSingleton<ICacheService, DistributedCacheService>();
        services.AddScoped<DatabaseSeeder>();
        services.AddHostedService<BookingMaintenanceService>();

        return services;
    }
}
