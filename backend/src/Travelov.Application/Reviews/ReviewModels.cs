namespace Travelov.Application.Reviews;

public record CreateReviewRequest(Guid BookingId, int Rating, string? Comment);

public record ReviewDto(
    Guid Id,
    Guid BookingId,
    Guid HotelId,
    string HotelName,
    int Rating,
    string? Comment,
    string ReviewerName,
    DateTimeOffset CreatedAt);
