namespace Travelov.Domain.Entities;

public class Hotel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>Hotel class from 1 to 5 stars.</summary>
    public int StarRating { get; set; } = 3;

    /// <summary>Denormalised average of guest review ratings (0 when there are no reviews).</summary>
    public double AverageRating { get; set; }

    public int ReviewCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<HotelPhoto> Photos { get; set; } = new List<HotelPhoto>();
    public ICollection<HotelFacility> Facilities { get; set; } = new List<HotelFacility>();
    public ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();

    /// <summary>Recomputes the denormalised rating from the supplied review ratings.</summary>
    public void ApplyReviews(IReadOnlyCollection<int> ratings)
    {
        ReviewCount = ratings.Count;
        AverageRating = ratings.Count == 0 ? 0 : Math.Round(ratings.Average(), 2);
    }
}
