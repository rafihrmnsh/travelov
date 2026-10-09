using System.Text.RegularExpressions;
using FluentAssertions;
using Travelov.Domain.Entities;
using Travelov.Domain.Enums;
using Travelov.Domain.Exceptions;

namespace Travelov.UnitTests;

/// <summary>Booking lifecycle: the state machine guarded by the domain entity itself.</summary>
public class BookingTests
{
    private static readonly DateOnly CheckIn = new(2026, 11, 1);
    private static readonly DateOnly CheckOut = new(2026, 11, 4);
    private static readonly DateTimeOffset Now = new(2026, 10, 1, 12, 0, 0, TimeSpan.Zero);

    private static Booking NewBooking() => new() { CheckIn = CheckIn, CheckOut = CheckOut };

    [Fact]
    public void Nights_IsTheDifferenceBetweenCheckOutAndCheckIn()
    {
        NewBooking().Nights.Should().Be(3);
    }

    [Fact]
    public void NewCode_HasTheDocumentedFormat()
    {
        var code = Booking.NewCode();

        code.Should().MatchRegex("^TRV-[A-HJ-NP-Z2-9]{6}$");
    }

    [Fact]
    public void NewCode_IsEffectivelyUnique()
    {
        var codes = Enumerable.Range(0, 200).Select(_ => Booking.NewCode()).ToList();

        codes.Distinct().Should().HaveCount(200);
    }

    // ----- Confirm -----

    [Fact]
    public void Confirm_MovesPendingBookingToConfirmed()
    {
        var booking = NewBooking();

        booking.Confirm(Now);

        booking.Status.Should().Be(BookingStatus.Confirmed);
        booking.ConfirmedAt.Should().Be(Now);
    }

    [Fact]
    public void Confirm_IsIdempotent_SoRepeatedCallbacksDoNotFail()
    {
        var booking = NewBooking();
        booking.Confirm(Now);

        booking.Confirm(Now.AddMinutes(5));

        booking.Status.Should().Be(BookingStatus.Confirmed);
        booking.ConfirmedAt.Should().Be(Now);
    }

    [Fact]
    public void Confirm_WhenNoLongerPending_Throws()
    {
        var booking = NewBooking();
        booking.Cancel("changed my mind", Now, CheckIn.AddDays(-1));

        var act = () => booking.Confirm(Now);

        act.Should().Throw<DomainException>();
    }

    // ----- Cancel -----

    [Theory]
    [InlineData(BookingStatus.PendingPayment)]
    [InlineData(BookingStatus.Confirmed)]
    public void CanBeCancelled_IsTrueWhileActiveAndStayHasNotStarted(BookingStatus status)
    {
        var booking = NewBooking();
        booking.Status = status;

        booking.CanBeCancelled(CheckIn.AddDays(-1)).Should().BeTrue();
    }

    [Fact]
    public void CanBeCancelled_IsFalseOnTheCheckInDay()
    {
        var booking = NewBooking();

        booking.CanBeCancelled(CheckIn).Should().BeFalse();
    }

    [Fact]
    public void Cancel_RecordsReasonAndTimestamp()
    {
        var booking = NewBooking();

        booking.Cancel("Found a cheaper hotel.", Now, CheckIn.AddDays(-2));

        booking.Status.Should().Be(BookingStatus.Cancelled);
        booking.CancellationReason.Should().Be("Found a cheaper hotel.");
        booking.CancelledAt.Should().Be(Now);
    }

    [Fact]
    public void Cancel_AfterTheStayHasStarted_Throws()
    {
        var booking = NewBooking();

        var act = () => booking.Cancel("too late", Now, CheckIn);

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Cancel_WhenAlreadyCancelled_IsANoOp()
    {
        var booking = NewBooking();
        booking.Cancel("first", Now, CheckIn.AddDays(-2));

        booking.Cancel("second", Now.AddMinutes(1), CheckIn.AddDays(-2));

        booking.CancellationReason.Should().Be("first");
    }

    // ----- Expire -----

    [Fact]
    public void Expire_MovesPendingBookingToExpired()
    {
        var booking = NewBooking();

        booking.Expire(Now);

        booking.Status.Should().Be(BookingStatus.Expired);
        booking.CancellationReason.Should().Be("Payment deadline passed.");
    }

    [Fact]
    public void Expire_WhenAlreadyConfirmed_IsANoOp()
    {
        var booking = NewBooking();
        booking.Confirm(Now);

        booking.Expire(Now.AddMinutes(1));

        booking.Status.Should().Be(BookingStatus.Confirmed);
    }

    // ----- Complete -----

    [Fact]
    public void Complete_MovesConfirmedBookingToCompleted()
    {
        var booking = NewBooking();
        booking.Confirm(Now);

        booking.Complete();

        booking.Status.Should().Be(BookingStatus.Completed);
    }

    [Fact]
    public void Complete_WhenNotConfirmed_Throws()
    {
        var booking = NewBooking();

        var act = () => booking.Complete();

        act.Should().Throw<DomainException>();
    }

    // ----- Inventory ownership -----

    [Theory]
    [InlineData(BookingStatus.PendingPayment, true)]
    [InlineData(BookingStatus.Confirmed, true)]
    [InlineData(BookingStatus.Expired, false)]
    [InlineData(BookingStatus.Cancelled, false)]
    [InlineData(BookingStatus.Completed, false)]
    public void HoldsInventory_IsTrueOnlyWhileWaitingOrConfirmed(BookingStatus status, bool expected)
    {
        new Booking { Status = status }.HoldsInventory.Should().Be(expected);
    }
}
