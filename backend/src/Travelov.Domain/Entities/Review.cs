namespace Travelov.Domain.Entities;

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>One review per booking, enforced by a unique index.</summary>
    public Guid BookingId { get; set; }
    public Booking? Booking { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid HotelId { get; set; }
    public Hotel? Hotel { get; set; }

    /// <summary>Rating from 1 to 5.</summary>
    public int Rating { get; set; }

    public string? Comment { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
