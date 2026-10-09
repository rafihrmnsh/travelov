using FluentValidation;
using Travelov.Application.Hotels;

namespace Travelov.Application.Admin;

public record HotelUpsertRequest(
    string Name,
    string City,
    string Address,
    string Description,
    int StarRating,
    IReadOnlyList<string>? PhotoUrls = null,
    IReadOnlyList<Guid>? FacilityIds = null);

public record RoomTypeUpsertRequest(
    string Name,
    int Capacity,
    decimal BasePrice);

public record InventoryUpdateRequest(
    Guid RoomTypeId,
    DateOnly StartDate,
    DateOnly EndDate,
    int TotalUnits,
    decimal Price);

public record FacilityUpsertRequest(string Name, string Icon);

public record AdminRoomTypeDto(Guid Id, string Name, int Capacity, decimal BasePrice);

public record AdminHotelDto(
    Guid Id,
    string Name,
    string City,
    string Address,
    string Description,
    int StarRating,
    double AverageRating,
    int ReviewCount,
    IReadOnlyList<HotelPhotoDto> Photos,
    IReadOnlyList<FacilityDto> Facilities,
    IReadOnlyList<AdminRoomTypeDto> RoomTypes);

public record AdminBookingDto(
    Guid Id,
    string Code,
    string HotelName,
    string RoomTypeName,
    string GuestName,
    string GuestEmail,
    DateOnly CheckIn,
    DateOnly CheckOut,
    int Rooms,
    decimal TotalPrice,
    string Status,
    string PaymentStatus,
    DateTimeOffset CreatedAt,
    DateTimeOffset PaymentDeadline);

public record AdminStatsDto(
    int TotalBookings,
    int PendingBookings,
    int ConfirmedBookings,
    int ExpiredBookings,
    int CancelledBookings,
    decimal TotalRevenue,
    int TotalHotels,
    int TotalRoomTypes,
    int TotalUsers,
    double OccupancyRate);

public class HotelUpsertRequestValidator : AbstractValidator<HotelUpsertRequest>
{
    public HotelUpsertRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.City).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Address).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.StarRating).InclusiveBetween(1, 5);
    }
}

public class RoomTypeUpsertRequestValidator : AbstractValidator<RoomTypeUpsertRequest>
{
    public RoomTypeUpsertRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Capacity).InclusiveBetween(1, 20);
        RuleFor(x => x.BasePrice).GreaterThan(0);
    }
}

public class InventoryUpdateRequestValidator : AbstractValidator<InventoryUpdateRequest>
{
    public InventoryUpdateRequestValidator()
    {
        RuleFor(x => x.RoomTypeId).NotEmpty();
        RuleFor(x => x.TotalUnits).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.EndDate).GreaterThanOrEqualTo(x => x.StartDate);
    }
}

public class FacilityUpsertRequestValidator : AbstractValidator<FacilityUpsertRequest>
{
    public FacilityUpsertRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Icon).NotEmpty().MaximumLength(60);
    }
}
