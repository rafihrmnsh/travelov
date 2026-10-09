using FluentAssertions;
using FluentValidation.TestHelper;
using Travelov.Application.Bookings;

namespace Travelov.UnitTests;

/// <summary>Request-level validation rules enforced before a booking is created.</summary>
public class CreateBookingRequestValidatorTests
{
    private readonly CreateBookingRequestValidator _validator = new();

    private static CreateBookingRequest ValidRequest(
        int rooms = 1,
        int guests = 2,
        DateOnly? checkIn = null,
        DateOnly? checkOut = null,
        string guestName = "Budi Santoso",
        string guestEmail = "budi@example.com",
        string guestPhone = "+62 812 0000 0000") =>
        new(
            Guid.NewGuid(),
            Guid.NewGuid(),
            checkIn ?? new DateOnly(2026, 11, 1),
            checkOut ?? new DateOnly(2026, 11, 4),
            rooms,
            guests,
            guestName,
            guestEmail,
            guestPhone);

    [Fact]
    public void ValidRequest_PassesValidation()
    {
        _validator.TestValidate(ValidRequest()).IsValid.Should().BeTrue();
    }

    [Fact]
    public void AStayOfExactlyThirtyNights_IsAllowed()
    {
        var checkIn = new DateOnly(2026, 11, 1);

        var result = _validator.TestValidate(ValidRequest(checkIn: checkIn, checkOut: checkIn.AddDays(30)));

        result.ShouldNotHaveValidationErrorFor(x => x.CheckOut);
    }

    [Fact]
    public void AStayOfThirtyOneNights_IsRejected()
    {
        var checkIn = new DateOnly(2026, 11, 1);

        var result = _validator.TestValidate(ValidRequest(checkIn: checkIn, checkOut: checkIn.AddDays(31)));

        result.ShouldHaveValidationErrorFor(x => x.CheckOut);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public void RoomCount_OutsideOneToTen_IsRejected(int rooms)
    {
        _validator.TestValidate(ValidRequest(rooms: rooms))
            .ShouldHaveValidationErrorFor(x => x.Rooms);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(21)]
    public void GuestCount_OutsideOneToTwenty_IsRejected(int guests)
    {
        _validator.TestValidate(ValidRequest(guests: guests))
            .ShouldHaveValidationErrorFor(x => x.Guests);
    }

    [Fact]
    public void CheckOut_NotAfterCheckIn_IsRejected()
    {
        var day = new DateOnly(2026, 11, 5);

        _validator.TestValidate(ValidRequest(checkIn: day, checkOut: day))
            .ShouldHaveValidationErrorFor(x => x.CheckOut);
    }

    [Fact]
    public void InvalidEmail_IsRejected()
    {
        _validator.TestValidate(ValidRequest(guestEmail: "not-an-email"))
            .ShouldHaveValidationErrorFor(x => x.GuestEmail);
    }

    [Fact]
    public void EmptyGuestName_IsRejected()
    {
        _validator.TestValidate(ValidRequest(guestName: string.Empty))
            .ShouldHaveValidationErrorFor(x => x.GuestName);
    }

    [Fact]
    public void GuestName_LongerThanOneHundredTwenty_IsRejected()
    {
        _validator.TestValidate(ValidRequest(guestName: new string('a', 121)))
            .ShouldHaveValidationErrorFor(x => x.GuestName);
    }

    [Fact]
    public void GuestPhone_LongerThanThirty_IsRejected()
    {
        _validator.TestValidate(ValidRequest(guestPhone: new string('0', 31)))
            .ShouldHaveValidationErrorFor(x => x.GuestPhone);
    }

    [Fact]
    public void EmptyHotelOrRoomType_IsRejected()
    {
        var request = new CreateBookingRequest(
            Guid.Empty, Guid.Empty,
            new DateOnly(2026, 11, 1), new DateOnly(2026, 11, 4),
            1, 2, "Budi Santoso", "budi@example.com", "+62 812 0000 0000");

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor(x => x.HotelId);
        result.ShouldHaveValidationErrorFor(x => x.RoomTypeId);
    }
}
