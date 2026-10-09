namespace Travelov.Application.Hotels;

public record HotelSearchRequest(
    string? City = null,
    string? Name = null,
    DateOnly? CheckIn = null,
    DateOnly? CheckOut = null,
    int? Guests = null,
    decimal? MinPrice = null,
    decimal? MaxPrice = null,
    double? MinRating = null,
    int? Stars = null,
    IReadOnlyList<Guid>? FacilityIds = null,
    string? Sort = null,
    int Page = 1,
    int PageSize = 12);

public record FacilityDto(Guid Id, string Name, string Icon);

public record HotelPhotoDto(Guid Id, string Url, int SortOrder);

public record RoomTypeDto(
    Guid Id,
    string Name,
    int Capacity,
    decimal BasePrice,
    int? AvailableUnits,
    decimal? StayTotal,
    int? Nights);

public record HotelSummaryDto(
    Guid Id,
    string Name,
    string City,
    string Address,
    int StarRating,
    double AverageRating,
    int ReviewCount,
    string? ThumbnailUrl,
    decimal? FromPricePerNight,
    bool Available,
    IReadOnlyList<FacilityDto> Facilities);

public record HotelDetailDto(
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
    IReadOnlyList<RoomTypeDto> RoomTypes);
