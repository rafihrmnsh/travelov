namespace Travelov.Domain.Entities;

public class HotelPhoto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HotelId { get; set; }
    public Hotel? Hotel { get; set; }

    public string Url { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
