namespace Travelov.Domain.Entities;

/// <summary>Join entity between <see cref="Hotel"/> and <see cref="Facility"/>.</summary>
public class HotelFacility
{
    public Guid HotelId { get; set; }
    public Hotel? Hotel { get; set; }

    public Guid FacilityId { get; set; }
    public Facility? Facility { get; set; }
}
