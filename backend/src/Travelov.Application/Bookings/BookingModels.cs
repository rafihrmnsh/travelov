namespace Travelov.Application.Bookings;

public record NightlyPriceDto(DateOnly Date, decimal Price);

public record PriceSummaryDto(
    string Currency,
    int Nights,
    int Rooms,
    decimal NightlyAverage,
    decimal Subtotal,
    decimal TaxAmount,
    decimal TotalPrice,
    IReadOnlyList<NightlyPriceDto> Breakdown);

public record CreateBookingRequest(
    Guid HotelId,
    Guid RoomTypeId,
    DateOnly CheckIn,
    DateOnly CheckOut,
    int Rooms,
    int Guests,
    string GuestName,
    string GuestEmail,
    string GuestPhone);

public record PaymentInfoDto(
    Guid Id,
    string Provider,
    string Reference,
    string Status,
    decimal Amount,
    DateTimeOffset? PaidAt,
    string PaymentUrl);

public record BookingDto(
    Guid Id,
    string Code,
    Guid HotelId,
    string HotelName,
    string City,
    Guid RoomTypeId,
    string RoomTypeName,
    DateOnly CheckIn,
    DateOnly CheckOut,
    int Nights,
    int Rooms,
    int Guests,
    string GuestName,
    string GuestEmail,
    string GuestPhone,
    decimal Subtotal,
    decimal TaxAmount,
    decimal TotalPrice,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset PaymentDeadline,
    DateTimeOffset? ConfirmedAt,
    string? CancellationReason,
    bool CanBeCancelled,
    bool CanReview,
    PaymentInfoDto? Payment);
