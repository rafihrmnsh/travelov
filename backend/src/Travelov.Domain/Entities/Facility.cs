namespace Travelov.Domain.Entities;

public class Facility
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;

    /// <summary>Simple icon key understood by the frontend (e.g. "wifi", "pool").</summary>
    public string Icon { get; set; } = string.Empty;

    public ICollection<HotelFacility> Hotels { get; set; } = new List<HotelFacility>();
}
