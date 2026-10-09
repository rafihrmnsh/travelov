using Microsoft.EntityFrameworkCore;
using Travelov.Application.Abstractions;
using Travelov.Domain.Entities;

namespace Travelov.Infrastructure.Persistence;

public class AppDbContext : DbContext, IApplicationDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<HotelPhoto> HotelPhotos => Set<HotelPhoto>();
    public DbSet<Facility> Facilities => Set<Facility>();
    public DbSet<HotelFacility> HotelFacilities => Set<HotelFacility>();
    public DbSet<RoomType> RoomTypes => Set<RoomType>();
    public DbSet<RoomInventory> RoomInventories => Set<RoomInventory>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Review> Reviews => Set<Review>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureUsers(modelBuilder);
        ConfigureHotels(modelBuilder);
        ConfigureRooms(modelBuilder);
        ConfigureBookings(modelBuilder);
        ConfigureReviews(modelBuilder);

        base.OnModelCreating(modelBuilder);
    }

    private static void ConfigureUsers(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Name).HasMaxLength(100).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(256).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Token).HasMaxLength(200).IsRequired();
            entity.HasIndex(t => t.Token).IsUnique();
            entity.HasOne(t => t.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureHotels(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Hotel>(entity =>
        {
            entity.ToTable("hotels");
            entity.HasKey(h => h.Id);
            entity.Property(h => h.Name).HasMaxLength(150).IsRequired();
            entity.Property(h => h.City).HasMaxLength(100).IsRequired();
            entity.Property(h => h.Address).HasMaxLength(300).IsRequired();
            entity.Property(h => h.Description).HasMaxLength(4000).IsRequired();
            entity.HasIndex(h => h.City);
            entity.HasIndex(h => h.Name);
        });

        modelBuilder.Entity<HotelPhoto>(entity =>
        {
            entity.ToTable("hotel_photos");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Url).HasMaxLength(500).IsRequired();
            entity.HasOne(p => p.Hotel)
                .WithMany(h => h.Photos)
                .HasForeignKey(p => p.HotelId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Facility>(entity =>
        {
            entity.ToTable("facilities");
            entity.HasKey(f => f.Id);
            entity.Property(f => f.Name).HasMaxLength(80).IsRequired();
            entity.Property(f => f.Icon).HasMaxLength(60).IsRequired();
            entity.HasIndex(f => f.Name).IsUnique();
        });

        modelBuilder.Entity<HotelFacility>(entity =>
        {
            entity.ToTable("hotel_facilities");
            entity.HasKey(hf => new { hf.HotelId, hf.FacilityId });
            entity.HasOne(hf => hf.Hotel)
                .WithMany(h => h.Facilities)
                .HasForeignKey(hf => hf.HotelId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(hf => hf.Facility)
                .WithMany(f => f.Hotels)
                .HasForeignKey(hf => hf.FacilityId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureRooms(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RoomType>(entity =>
        {
            entity.ToTable("room_types");
            entity.HasKey(rt => rt.Id);
            entity.Property(rt => rt.Name).HasMaxLength(120).IsRequired();
            entity.Property(rt => rt.BasePrice).HasPrecision(18, 2);
            entity.HasOne(rt => rt.Hotel)
                .WithMany(h => h.RoomTypes)
                .HasForeignKey(rt => rt.HotelId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RoomInventory>(entity =>
        {
            entity.ToTable("room_inventories");
            entity.HasKey(i => i.Id);
            entity.Property(i => i.Price).HasPrecision(18, 2);
            entity.HasIndex(i => new { i.RoomTypeId, i.Date }).IsUnique();
            entity.HasOne(i => i.RoomType)
                .WithMany(rt => rt.Inventory)
                .HasForeignKey(i => i.RoomTypeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Optimistic concurrency via PostgreSQL's xmin system column. This is the
            // replacement for the obsolete UseXminAsConcurrencyToken helper and is what
            // prevents two concurrent bookings from claiming the same last room.
            entity.Property<uint>("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();
        });
    }

    private static void ConfigureBookings(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.ToTable("bookings");
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Code).HasMaxLength(20).IsRequired();
            entity.HasIndex(b => b.Code).IsUnique();
            entity.Property(b => b.GuestName).HasMaxLength(120).IsRequired();
            entity.Property(b => b.GuestEmail).HasMaxLength(256).IsRequired();
            entity.Property(b => b.GuestPhone).HasMaxLength(30).IsRequired();
            entity.Property(b => b.CancellationReason).HasMaxLength(300);
            entity.Property(b => b.Subtotal).HasPrecision(18, 2);
            entity.Property(b => b.TaxAmount).HasPrecision(18, 2);
            entity.Property(b => b.TotalPrice).HasPrecision(18, 2);
            entity.Property(b => b.Status).HasConversion<string>().HasMaxLength(30).IsRequired();

            entity.HasIndex(b => b.UserId);
            entity.HasIndex(b => b.Status);

            entity.HasOne(b => b.User)
                .WithMany(u => u.Bookings)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(b => b.Hotel)
                .WithMany()
                .HasForeignKey(b => b.HotelId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(b => b.RoomType)
                .WithMany(rt => rt.Bookings)
                .HasForeignKey(b => b.RoomTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Provider).HasMaxLength(50).IsRequired();
            entity.Property(p => p.Reference).HasMaxLength(100).IsRequired();
            entity.HasIndex(p => p.Reference).IsUnique();
            entity.Property(p => p.Amount).HasPrecision(18, 2);
            entity.Property(p => p.Status).HasConversion<string>().HasMaxLength(20).IsRequired();

            entity.HasOne(p => p.Booking)
                .WithOne(b => b.Payment!)
                .HasForeignKey<Payment>(p => p.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureReviews(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("reviews");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Comment).HasMaxLength(1000);
            entity.HasIndex(r => r.HotelId);
            entity.HasIndex(r => r.BookingId).IsUnique();

            entity.HasOne(r => r.Booking)
                .WithOne(b => b.Review!)
                .HasForeignKey<Review>(r => r.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.User)
                .WithMany(u => u.Reviews)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.Hotel)
                .WithMany(h => h.Reviews)
                .HasForeignKey(r => r.HotelId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
