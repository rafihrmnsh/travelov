using FluentValidation;

namespace Travelov.Application.Hotels;

public class HotelSearchRequestValidator : AbstractValidator<HotelSearchRequest>
{
    public HotelSearchRequestValidator()
    {
        RuleFor(x => x.Guests).GreaterThan(0).When(x => x.Guests.HasValue);
        RuleFor(x => x.Page).GreaterThan(0);
        RuleFor(x => x.PageSize).GreaterThan(0);
        RuleFor(x => x.MinPrice).GreaterThanOrEqualTo(0).When(x => x.MinPrice.HasValue);
        RuleFor(x => x.MaxPrice).GreaterThanOrEqualTo(0).When(x => x.MaxPrice.HasValue);
        RuleFor(x => x.MinRating).InclusiveBetween(0, 5).When(x => x.MinRating.HasValue);
        RuleFor(x => x.Stars).InclusiveBetween(1, 5).When(x => x.Stars.HasValue);

        RuleFor(x => x.CheckOut)
            .NotNull()
            .GreaterThan(x => x.CheckIn!.Value)
            .When(x => x.CheckIn.HasValue)
            .WithMessage("Check-out must be after check-in.");

        RuleFor(x => x.CheckIn)
            .NotNull()
            .When(x => x.CheckOut.HasValue)
            .WithMessage("Check-in is required when check-out is provided.");
    }
}
