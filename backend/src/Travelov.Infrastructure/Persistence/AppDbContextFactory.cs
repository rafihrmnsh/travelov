using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Travelov.Infrastructure.Persistence;

/// <summary>
/// Used only by the EF Core CLI (<c>dotnet ef</c>) so migrations can be created
/// without booting the API host or touching the database. The runtime app builds
/// its <see cref="AppDbContext"/> from configuration instead.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("TRAVELOV_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=travelov;Username=travelov;Password=travelov";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new AppDbContext(options);
    }
}
