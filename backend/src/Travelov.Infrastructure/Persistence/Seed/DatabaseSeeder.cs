using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Travelov.Application.Abstractions;
using Travelov.Domain.Entities;
using Travelov.Domain.Enums;

namespace Travelov.Infrastructure.Persistence.Seed;

public class DatabaseSeeder
{
    private const int InventoryDaysAhead = 120;
    private const int DefaultUnitsPerRoomType = 5;

    private readonly AppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IDateTimeProvider _clock;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(
        AppDbContext db,
        IPasswordHasher passwordHasher,
        IDateTimeProvider clock,
        ILogger<DatabaseSeeder> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _clock = clock;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await _db.Database.MigrateAsync(cancellationToken);

        if (await _db.Hotels.AnyAsync(cancellationToken))
        {
            _logger.LogInformation("Database already contains data; skipping seed.");
            return;
        }

        _logger.LogInformation("Seeding demo data...");

        var facilities = SeedFacilities();
        var (admin, demoUser) = SeedUsers();
        var hotels = SeedHotels(facilities);
        var roomTypes = SeedRoomTypes(hotels);

        _db.RoomInventories.AddRange(BuildInventory(roomTypes));
        SeedDemoBookings(demoUser, hotels, roomTypes);

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Seed complete: {HotelCount} hotels, {RoomTypeCount} room types.",
            hotels.Count,
            roomTypes.Count);
    }

    private List<Facility> SeedFacilities()
    {
        var facilities = new List<Facility>
        {
            new() { Name = "WiFi gratis", Icon = "wifi" },
            new() { Name = "Kolam renang", Icon = "pool" },
            new() { Name = "Sarapan", Icon = "breakfast" },
            new() { Name = "Parkir", Icon = "parking" },
            new() { Name = "Gym", Icon = "gym" },
            new() { Name = "Spa", Icon = "spa" },
            new() { Name = "AC", Icon = "ac" },
            new() { Name = "Restoran", Icon = "restaurant" }
        };

        _db.Facilities.AddRange(facilities);
        return facilities;
    }

    private (User Admin, User DemoUser) SeedUsers()
    {
        var admin = new User
        {
            Name = "Travelov Admin",
            Email = "admin@travelov.test",
            PasswordHash = _passwordHasher.Hash("Admin123!"),
            Role = UserRole.Admin
        };

        var demoUser = new User
        {
            Name = "Budi Santoso",
            Email = "user@travelov.test",
            PasswordHash = _passwordHasher.Hash("User123!"),
            Role = UserRole.User
        };

        _db.Users.AddRange(admin, demoUser);
        return (admin, demoUser);
    }

    private List<Hotel> SeedHotels(List<Facility> facilities)
    {
        var definitions = new[]
        {
            new HotelSeed("Grand Nusantara Jakarta", "Jakarta", "Jl. Jenderal Sudirman No. 52", 5,
                "Hotel bintang lima di pusat bisnis Jakarta dengan pemandangan skyline dan akses langsung ke pusat perbelanjaan.",
                new[] { "wifi", "pool", "gym", "spa", "restaurant", "breakfast" }),
            new HotelSeed("Ubud Rice Terrace Resort", "Bali", "Jl. Raya Tegallalang, Ubud", 5,
                "Resort tenang di tengah sawah Ubud dengan kolam renang infinity dan spa tradisional Bali.",
                new[] { "wifi", "pool", "spa", "breakfast", "restaurant" }),
            new HotelSeed("Kuta Beach Hotel", "Bali", "Jl. Pantai Kuta No. 10", 4,
                "Hanya lima menit berjalan kaki ke Pantai Kuta, cocok untuk liburan keluarga dan pasangan.",
                new[] { "wifi", "pool", "breakfast", "parking", "ac" }),
            new HotelSeed("Bandung Dago Hills", "Bandung", "Jl. Ir. H. Juanda No. 210, Dago", 4,
                "Hotel sejuk di kawasan Dago dengan pemandangan perbukitan dan udara pegunungan.",
                new[] { "wifi", "breakfast", "parking", "ac", "restaurant" }),
            new HotelSeed("Yogyakarta Malioboro Inn", "Yogyakarta", "Jl. Malioboro No. 88", 3,
                "Penginapan nyaman tepat di jantung Malioboro, dekat dengan kuliner dan keraton.",
                new[] { "wifi", "breakfast", "ac", "parking" }),
            new HotelSeed("Surabaya Riverfront", "Surabaya", "Jl. Tunjungan No. 45", 4,
                "Hotel modern di pusat kota Surabaya dengan akses mudah ke area bisnis dan bandara.",
                new[] { "wifi", "gym", "breakfast", "restaurant", "parking" })
        };

        var hotels = new List<Hotel>();

        foreach (var definition in definitions)
        {
            var hotel = new Hotel
            {
                Name = definition.Name,
                City = definition.City,
                Address = definition.Address,
                StarRating = definition.Stars,
                Description = definition.Description
            };

            for (var i = 1; i <= 4; i++)
            {
                hotel.Photos.Add(new HotelPhoto
                {
                    HotelId = hotel.Id,
                    Url = $"https://picsum.photos/seed/{Slug(definition.Name)}-{i}/1024/768",
                    SortOrder = i
                });
            }

            foreach (var facility in facilities.Where(f => definition.Facilities.Contains(f.Icon)))
            {
                hotel.Facilities.Add(new HotelFacility { HotelId = hotel.Id, FacilityId = facility.Id });
            }

            hotels.Add(hotel);
        }

        _db.Hotels.AddRange(hotels);
        return hotels;
    }

    private List<RoomType> SeedRoomTypes(List<Hotel> hotels)
    {
        var templates = new[]
        {
            ("Standard Room", 2, 0.7m),
            ("Deluxe Room", 3, 1.0m),
            ("Suite", 4, 1.6m)
        };

        var basePrices = new[] { 650_000m, 1_450_000m, 900_000m, 780_000m, 420_000m, 720_000m };
        var roomTypes = new List<RoomType>();

        for (var i = 0; i < hotels.Count; i++)
        {
            var hotel = hotels[i];

            for (var t = 0; t < templates.Length; t++)
            {
                var (name, capacity, multiplier) = templates[t];
                var basePrice = RoundToThousands(basePrices[i] * multiplier);

                var roomType = new RoomType
                {
                    HotelId = hotel.Id,
                    Name = name,
                    Capacity = capacity,
                    BasePrice = basePrice
                };

                roomTypes.Add(roomType);
            }
        }

        _db.RoomTypes.AddRange(roomTypes);
        return roomTypes;
    }

    private List<RoomInventory> BuildInventory(List<RoomType> roomTypes)
    {
        var random = new Random(20261009);
        var start = _clock.Today;
        var inventory = new List<RoomInventory>(roomTypes.Count * InventoryDaysAhead);

        foreach (var roomType in roomTypes)
        {
            for (var offset = 0; offset < InventoryDaysAhead; offset++)
            {
                // Weekend nights cost a little more.
                var date = start.AddDays(offset);
                var weekendMultiplier = date.DayOfWeek is DayOfWeek.Friday or DayOfWeek.Saturday ? 1.15m : 1m;
                var jitter = 1m + (decimal)(random.NextDouble() * 0.1 - 0.05);

                inventory.Add(new RoomInventory
                {
                    RoomTypeId = roomType.Id,
                    Date = date,
                    TotalUnits = DefaultUnitsPerRoomType,
                    ReservedUnits = 0,
                    Price = RoundToThousands(roomType.BasePrice * weekendMultiplier * jitter)
                });
            }
        }

        return inventory;
    }

    private void SeedDemoBookings(User user, List<Hotel> hotels, List<RoomType> roomTypes)
    {
        var today = _clock.Today;

        var starHotel = hotels[0];
        var starRoomTypes = roomTypes.Where(rt => rt.HotelId == starHotel.Id).ToList();
        var deluxe = starRoomTypes.First(rt => rt.Name == "Deluxe Room");
        var standard = starRoomTypes.First(rt => rt.Name == "Standard Room");

        // Two completed stays with reviews, exercising the average-rating calculation.
        var completedOne = NewBooking(user, starHotel, deluxe, today.AddDays(-20), today.AddDays(-17), 1, 2, BookingStatus.Completed);
        var completedTwo = NewBooking(user, starHotel, standard, today.AddDays(-45), today.AddDays(-42), 1, 2, BookingStatus.Completed);
        var completedThree = NewBooking(user, hotels[1], roomTypes.First(rt => rt.HotelId == hotels[1].Id), today.AddDays(-10), today.AddDays(-7), 1, 2, BookingStatus.Completed);

        _db.Bookings.AddRange(completedOne, completedTwo, completedThree);

        _db.Reviews.AddRange(
            new Review
            {
                BookingId = completedOne.Id,
                UserId = user.Id,
                HotelId = starHotel.Id,
                Rating = 5,
                Comment = "Lokasinya strategis dan stafnya sangat ramah. Sarapannya enak!",
                CreatedAt = _clock.UtcNow.AddDays(-16)
            },
            new Review
            {
                BookingId = completedTwo.Id,
                UserId = user.Id,
                HotelId = starHotel.Id,
                Rating = 4,
                Comment = "Kamar bersih dan nyaman, hanya saja lift agak lama saat jam sibuk.",
                CreatedAt = _clock.UtcNow.AddDays(-41)
            },
            new Review
            {
                BookingId = completedThree.Id,
                UserId = user.Id,
                HotelId = hotels[1].Id,
                Rating = 5,
                Comment = "Pemandangan sawahnya luar biasa. Pasti kembali lagi.",
                CreatedAt = _clock.UtcNow.AddDays(-6)
            });

        starHotel.ApplyReviews(new[] { 5, 4 });
        hotels[1].ApplyReviews(new[] { 5 });

        // An upcoming confirmed stay that currently holds inventory.
        var confirmed = NewBooking(user, hotels[2], roomTypes.First(rt => rt.HotelId == hotels[2].Id), today.AddDays(10), today.AddDays(13), 1, 2, BookingStatus.Confirmed);
        confirmed.ConfirmedAt = _clock.UtcNow.AddDays(-1);
        confirmed.Payment = new Payment
        {
            BookingId = confirmed.Id,
            Provider = "sandbox",
            Reference = $"SBX-{confirmed.Code}",
            Amount = confirmed.TotalPrice,
            Status = PaymentStatus.Paid,
            CreatedAt = _clock.UtcNow.AddDays(-1),
            PaidAt = _clock.UtcNow.AddDays(-1)
        };
        _db.Bookings.Add(confirmed);

        // An expired unpaid booking for the admin dashboard demo.
        var expired = NewBooking(user, hotels[3], roomTypes.First(rt => rt.HotelId == hotels[3].Id), today.AddDays(5), today.AddDays(7), 2, 4, BookingStatus.Expired);
        expired.CancellationReason = "Payment deadline passed.";
        expired.Payment = new Payment
        {
            BookingId = expired.Id,
            Provider = "sandbox",
            Reference = $"SBX-{expired.Code}",
            Amount = expired.TotalPrice,
            Status = PaymentStatus.Expired,
            CreatedAt = _clock.UtcNow.AddDays(-3)
        };
        _db.Bookings.Add(expired);

        // Reserve stock for the confirmed booking only.
        ReserveFor(confirmed);
    }

    private void ReserveFor(Booking booking)
    {
        var inventory = _db.RoomInventories.Local
            .Where(i => i.RoomTypeId == booking.RoomTypeId
                        && i.Date >= booking.CheckIn
                        && i.Date < booking.CheckOut)
            .ToList();

        foreach (var row in inventory)
        {
            row.Reserve(booking.Rooms);
        }
    }

    private Booking NewBooking(
        User user,
        Hotel hotel,
        RoomType roomType,
        DateOnly checkIn,
        DateOnly checkOut,
        int rooms,
        int guests,
        BookingStatus status)
    {
        var nights = checkOut.DayNumber - checkIn.DayNumber;
        var nightly = roomType.BasePrice;
        var subtotal = nightly * nights * rooms;
        var tax = Math.Round(subtotal * 0.11m, 2);

        return new Booking
        {
            Code = Booking.NewCode(),
            UserId = user.Id,
            HotelId = hotel.Id,
            RoomTypeId = roomType.Id,
            CheckIn = checkIn,
            CheckOut = checkOut,
            Rooms = rooms,
            Guests = guests,
            GuestName = user.Name,
            GuestEmail = user.Email,
            GuestPhone = "+62 812 0000 0000",
            Subtotal = subtotal,
            TaxAmount = tax,
            TotalPrice = subtotal + tax,
            Status = status,
            CreatedAt = _clock.UtcNow.AddDays(-nights - 2),
            PaymentDeadline = _clock.UtcNow.AddDays(-nights - 2).AddMinutes(15)
        };
    }

    private static decimal RoundToThousands(decimal value) => Math.Round(value / 1000m) * 1000m;

    private static string Slug(string value) =>
        value.ToLowerInvariant().Replace(' ', '-');

    private sealed record HotelSeed(
        string Name,
        string City,
        string Address,
        int Stars,
        string Description,
        string[] Facilities);
}
