using Microsoft.Extensions.Options;
using Travelov.Application.Abstractions;
using Travelov.Application.Bookings;
using Travelov.Application.Payments;
using Travelov.Domain.Entities;
using Travelov.Domain.Enums;
using Travelov.Infrastructure.Payments;
using Travelov.Infrastructure.Persistence;

namespace Travelov.IntegrationTests;

/// <summary>A clock the tests can move forward to exercise deadlines and expiry.</summary>
public sealed class FixedClock : IDateTimeProvider
{
    public FixedClock(DateTimeOffset now) => UtcNow = now;

    public DateTimeOffset UtcNow { get; set; }

    public DateOnly Today => DateOnly.FromDateTime(UtcNow.UtcDateTime);
}

public sealed class TestCurrentUser : ICurrentUserService
{
    public Guid? UserId { get; set; }
    public string? Email { get; set; }
    public UserRole? Role { get; set; }

    public bool IsAuthenticated => UserId is not null;
    public bool IsAdmin => Role == UserRole.Admin;
}

/// <summary>Captures the confirmation emails a payment would send.</summary>
public sealed class RecordingEmailSender : IEmailSender
{
    public List<string> ConfirmationCodes { get; } = new();

    public Task SendBookingConfirmationAsync(string to, string bookingCode, CancellationToken cancellationToken = default)
    {
        ConfirmationCodes.Add(bookingCode);
        return Task.CompletedTask;
    }
}

/// <summary>Builds the real application services over a real database context.</summary>
public static class TestData
{
    public static readonly DateOnly CheckIn = new(2026, 3, 1);
    public static readonly DateOnly CheckOut = new(2026, 3, 4);

    /// <summary>Nights in the standard test stay; one room reserves one unit on each night.</summary>
    public static readonly int Nights = CheckOut.DayNumber - CheckIn.DayNumber;

    public static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    public static FixedClock Clock(DateTimeOffset? now = null) => new(now ?? Now);

    public static SandboxPaymentGateway Gateway(string secret = "integration-test-secret") =>
        new(Options.Create(new SandboxPaymentOptions { Secret = secret }));

    public static BookingService BookingService(AppDbContext db, User user, IDateTimeProvider clock) =>
        new(db, new TestCurrentUser { UserId = user.Id, Email = user.Email, Role = user.Role }, clock, Gateway());

    public static PaymentService PaymentService(AppDbContext db, IDateTimeProvider clock, IEmailSender emailSender)
    {
        var gateway = Gateway();
        return new PaymentService(db, clock, gateway, gateway, emailSender);
    }

    public static async Task<User> SeedUserAsync(AppDbContext db, UserRole role = UserRole.User)
    {
        var user = new User
        {
            Name = "Integration Tester",
            Email = $"tester-{Guid.NewGuid():N}@travelov.test",
            PasswordHash = "not-a-real-hash",
            Role = role
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public static async Task<(Hotel Hotel, RoomType RoomType)> SeedHotelAsync(
        AppDbContext db,
        DateOnly checkIn,
        DateOnly checkOut,
        int totalUnits = 5,
        decimal nightlyPrice = 500_000m,
        int capacity = 2)
    {
        var hotel = new Hotel
        {
            Name = $"Test Hotel {Guid.NewGuid():N}",
            City = "Testville",
            Address = "1 Test Street",
            Description = "A hotel created by an integration test.",
            StarRating = 4
        };

        var roomType = new RoomType
        {
            HotelId = hotel.Id,
            Name = "Test Room",
            Capacity = capacity,
            BasePrice = nightlyPrice
        };

        db.Hotels.Add(hotel);
        db.RoomTypes.Add(roomType);

        for (var date = checkIn; date < checkOut; date = date.AddDays(1))
        {
            db.RoomInventories.Add(new RoomInventory
            {
                RoomTypeId = roomType.Id,
                Date = date,
                TotalUnits = totalUnits,
                ReservedUnits = 0,
                Price = nightlyPrice
            });
        }

        await db.SaveChangesAsync();
        return (hotel, roomType);
    }
}
