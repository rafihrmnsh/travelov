using FluentValidation;

namespace Travelov.Application.Bookings;

public class CreateBookingRequestValidator : AbstractValidator<CreateBookingRequest>
{
    public CreateBookingRequestValidator()
    {
        RuleFor(x => x.HotelId).NotEmpty();
        RuleFor(x => x.RoomTypeId).NotEmpty();
        RuleFor(x => x.Rooms).InclusiveBetween(1, 10);
        RuleFor(x => x.Guests).InclusiveBetween(1, 20);
        RuleFor(x => x.GuestName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.GuestEmail).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.GuestPhone).NotEmpty().MaximumLength(30);
        RuleFor(x => x.CheckIn).NotEmpty();
        RuleFor(x => x.CheckOut).GreaterThan(x => x.CheckIn)
            .WithMessage("Check-out must be after check-in.");
        RuleFor(x => x.CheckOut)
            .Must((request, checkOut) => checkOut.DayNumber - request.CheckIn.DayNumber <= 30)
            .WithMessage("A booking can cover at most 30 nights.");
    }
}
