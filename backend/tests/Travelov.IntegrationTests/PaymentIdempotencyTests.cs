using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Travelov.Application.Abstractions;
using Travelov.Application.Bookings;
using Travelov.Domain.Enums;
using Travelov.Domain.Exceptions;

namespace Travelov.IntegrationTests;

/// <summary>
/// Payment callbacks must be idempotent: gateways retry, and a replay must not
/// confirm, release stock, or email twice. Late payments expire and free stock.
/// </summary>
[Collection(PostgresCollection.Name)]
public class PaymentIdempotencyTests
{
    private readonly PostgresFixture _fixture;

    public PaymentIdempotencyTests(PostgresFixture fixture) => _fixture = fixture;

    private static CreateBookingRequest Request(Guid hotelId, Guid roomTypeId) =>
        new(hotelId, roomTypeId, TestData.CheckIn, TestData.CheckOut, 1, 2,
            "Integration Tester", "tester@travelov.test", "+62 812 0000 0000");

    /// <summary>Seeds a hotel and creates a pending booking, returning its code.</summary>
    private async Task<(string Code, Guid RoomTypeId)> CreatePendingBookingAsync(FixedClock clock, int totalUnits = 2)
    {
        await using var db = _fixture.CreateContext();
        var user = await TestData.SeedUserAsync(db);
        var (hotel, roomType) = await TestData.SeedHotelAsync(
            db, TestData.CheckIn, TestData.CheckOut, totalUnits: totalUnits);
        var booking = await TestData.BookingService(db, user, clock)
            .CreateAsync(Request(hotel.Id, roomType.Id), CancellationToken.None);

        booking.Status.Should().Be(nameof(BookingStatus.PendingPayment));
        return (booking.Code, roomType.Id);
    }

    /// <summary>Total held unit-nights across the stay's inventory rows.</summary>
    private async Task<int> ReservedUnitsAsync(Guid roomTypeId)
    {
        await using var db = _fixture.CreateContext();
        return await db.RoomInventories
            .Where(i => i.RoomTypeId == roomTypeId)
            .SumAsync(i => i.ReservedUnits);
    }

    [Fact]
    public async Task ReplayingASuccessfulCallback_ConfirmsOnceAndNeverDoubleProcesses()
    {
        var clock = TestData.Clock();
        var emails = new RecordingEmailSender();
        var (code, roomTypeId) = await CreatePendingBookingAsync(clock);

        await using (var db = _fixture.CreateContext())
        {
            var first = await TestData.PaymentService(db, clock, emails)
                .SimulateAsync(code, success: true, CancellationToken.None);

            first.BookingStatus.Should().Be(nameof(BookingStatus.Confirmed));
            first.PaymentStatus.Should().Be(nameof(PaymentStatus.Paid));
            first.AlreadyProcessed.Should().BeFalse();
        }

        await using (var db = _fixture.CreateContext())
        {
            var replay = await TestData.PaymentService(db, clock, emails)
                .SimulateAsync(code, success: true, CancellationToken.None);

            replay.BookingStatus.Should().Be(nameof(BookingStatus.Confirmed));
            replay.AlreadyProcessed.Should().BeTrue();
        }

        emails.ConfirmationCodes.Should().ContainSingle()
            .Which.Should().Be(code, "a replay must not send a second confirmation");

        await using (var db = _fixture.CreateContext())
        {
            var booking = await db.Bookings.Include(b => b.Payment).SingleAsync(b => b.Code == code);
            booking.Status.Should().Be(BookingStatus.Confirmed);
            booking.Payment!.Status.Should().Be(PaymentStatus.Paid);
        }

        (await ReservedUnitsAsync(roomTypeId)).Should().Be(TestData.Nights, "one room stays held on every night of the stay");
    }

    [Fact]
    public async Task AFailedCallback_MarksThePaymentFailedAndKeepsTheRoomHeld()
    {
        var clock = TestData.Clock();
        var emails = new RecordingEmailSender();
        var (code, roomTypeId) = await CreatePendingBookingAsync(clock);

        await using (var db = _fixture.CreateContext())
        {
            var result = await TestData.PaymentService(db, clock, emails)
                .SimulateAsync(code, success: false, CancellationToken.None);

            result.PaymentStatus.Should().Be(nameof(PaymentStatus.Failed));
            result.BookingStatus.Should().Be(nameof(BookingStatus.PendingPayment));
            result.AlreadyProcessed.Should().BeFalse();
        }

        emails.ConfirmationCodes.Should().BeEmpty();

        await using (var db = _fixture.CreateContext())
        {
            var replay = await TestData.PaymentService(db, clock, emails)
                .SimulateAsync(code, success: false, CancellationToken.None);

            replay.AlreadyProcessed.Should().BeTrue();
        }

        (await ReservedUnitsAsync(roomTypeId)).Should().Be(TestData.Nights, "the booking still holds one room on every night");
    }

    [Fact]
    public async Task APaymentAfterTheDeadline_ExpiresTheBookingAndReleasesTheRoom()
    {
        var clock = TestData.Clock();
        var emails = new RecordingEmailSender();
        var (code, roomTypeId) = await CreatePendingBookingAsync(clock);

        // Past the 15-minute payment window.
        clock.UtcNow = TestData.Now.AddMinutes(BookingService.PaymentWindowMinutes + 5);

        await using (var db = _fixture.CreateContext())
        {
            var result = await TestData.PaymentService(db, clock, emails)
                .SimulateAsync(code, success: true, CancellationToken.None);

            result.BookingStatus.Should().Be(nameof(BookingStatus.Expired));
            result.PaymentStatus.Should().Be(nameof(PaymentStatus.Expired));
        }

        emails.ConfirmationCodes.Should().BeEmpty("an expired booking is never confirmed");

        await using (var db = _fixture.CreateContext())
        {
            var booking = await db.Bookings.Include(b => b.Payment).SingleAsync(b => b.Code == code);
            booking.Status.Should().Be(BookingStatus.Expired);
            booking.Payment!.Status.Should().Be(PaymentStatus.Expired);
        }

        (await ReservedUnitsAsync(roomTypeId)).Should().Be(0, "expiry returns the room to the pool");
    }

    [Fact]
    public async Task ACallbackWithAnInvalidSignature_IsRejected()
    {
        await using var db = _fixture.CreateContext();
        var service = TestData.PaymentService(db, TestData.Clock(), new RecordingEmailSender());

        var callback = new PaymentCallbackRequest(
            "TRV-ABCDEF", "SBX-TRV-ABCDEF", 100_000m, Success: true, Signature: "not-a-valid-signature");

        var act = async () => await service.HandleCallbackAsync(callback, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>();
    }
}
