using Microsoft.EntityFrameworkCore;
using Travelov.Domain.Entities;

namespace Travelov.Application.Abstractions;

/// <summary>
/// Persistence capability required by the application layer. Implemented by the
/// EF Core <c>AppDbContext</c> in the infrastructure layer.
/// </summary>
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Hotel> Hotels { get; }
    DbSet<HotelPhoto> HotelPhotos { get; }
    DbSet<Facility> Facilities { get; }
    DbSet<RoomType> RoomTypes { get; }
    DbSet<RoomInventory> RoomInventories { get; }
    DbSet<Booking> Bookings { get; }
    DbSet<Payment> Payments { get; }
    DbSet<Review> Reviews { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
