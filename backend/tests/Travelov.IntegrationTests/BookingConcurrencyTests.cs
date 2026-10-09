using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Travelov.Application.Bookings;
using Travelov.Domain.Exceptions;

namespace Travelov.IntegrationTests;

/// <summary>
/// The headline concurrency guarantee: two guests racing for the last room must
/// never oversell it. Stock is guarded by the PostgreSQL <c>xmin</c> row version,
/// so the losing write is rejected by optimistic concurrency.
/// </summary>
[Collection(PostgresCollection.Name)]
public class BookingConcurrencyTests
{
    private readonly PostgresFixture _fixture;

    public BookingConcurrencyTests(PostgresFixture fixture) => _fixture = fixture;

    private static CreateBookingRequest Request(Guid hotelId, Guid roomTypeId, int rooms = 1, int guests = 2) =>
        new(hotelId, roomTypeId, TestData.CheckIn, TestData.CheckOut, rooms, guests,
            "Integration Tester", "tester@travelov.test", "+62 812 0000 0000");

    [Fact]
    public async Task TwoSimultaneousBookingsForTheLastRoom_OnlyOneSucceeds()
    {
        var clock = TestData.Clock();

        Guid hotelId, roomTypeId, userId;
        await using (var db = _fixture.CreateContext())
        {
            var user = await TestData.SeedUserAsync(db);
            var (hotel, roomType) = await TestData.SeedHotelAsync(
                db, TestData.CheckIn, TestData.CheckOut, totalUnits: 1);

            hotelId = hotel.Id;
            roomTypeId = roomType.Id;
            userId = user.Id;
        }

        var request = Request(hotelId, roomTypeId);

        async Task<Exception?> AttemptAsync()
        {
            await using var db = _fixture.CreateContext();
            var user = new Travelov.Domain.Entities.User { Id = userId, Role = Travelov.Domain.Enums.UserRole.User };
            var service = TestData.BookingService(db, user, clock);

            try
            {
                await service.CreateAsync(request, CancellationToken.None);
                return null;
            }
            catch (Exception ex)
            {
                return ex;
            }
        }

        // Start both attempts together so they read the same stock before either writes.
        var outcomes = await Task.WhenAll(AttemptAsync(), AttemptAsync());

        var winners = outcomes.Count(outcome => outcome is null);
        var losers = outcomes.Where(outcome => outcome is not null).ToList();

        winners.Should().Be(1, "the last room must go to exactly one guest");
        losers.Should().HaveCount(1);
        losers[0].Should().BeAssignableTo<DomainException>(
            "the losing request is rejected by the inventory or concurrency guard");

        // The stock level must reflect a single reservation, never an oversell:
        // one room held on each night of the three-night stay.
        await using var verification = _fixture.CreateContext();
        var reservedPerNight = await verification.RoomInventories
            .Where(i => i.RoomTypeId == roomTypeId)
            .OrderBy(i => i.Date)
            .Select(i => i.ReservedUnits)
            .ToListAsync();

        reservedPerNight.Should().HaveCount(TestData.Nights);
        reservedPerNight.Should().OnlyContain(reserved => reserved == 1);

        var confirmedBookings = await verification.Bookings
            .CountAsync(b => b.RoomTypeId == roomTypeId);

        confirmedBookings.Should().Be(1);
    }

    [Fact]
    public async Task AnInventoryRowChangedByAnotherWriter_IsRejectedByOptimisticConcurrency()
    {
        Guid roomTypeId;
        await using (var seed = _fixture.CreateContext())
        {
            var (_, roomType) = await TestData.SeedHotelAsync(
                seed, TestData.CheckIn, TestData.CheckOut, totalUnits: 5);
            roomTypeId = roomType.Id;
        }

        await using var first = _fixture.CreateContext();
        await using var second = _fixture.CreateContext();

        var firstRow = await first.RoomInventories
            .SingleAsync(i => i.RoomTypeId == roomTypeId && i.Date == TestData.CheckIn);
        var secondRow = await second.RoomInventories
            .SingleAsync(i => i.RoomTypeId == roomTypeId && i.Date == TestData.CheckIn);

        firstRow.Reserve(1);
        await first.SaveChangesAsync();

        // The second writer still holds the stale row version.
        secondRow.Reserve(1);
        var act = async () => await second.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateConcurrencyException>();
    }
}
