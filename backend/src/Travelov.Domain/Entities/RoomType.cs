namespace Travelov.Domain.Entities;

public class RoomType
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HotelId { get; set; }
    public Hotel? Hotel { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Maximum number of guests per room.</summary>
    public int Capacity { get; set; } = 2;

    /// <summary>Default price per night used when no per-date inventory price is set.</summary>
    public decimal BasePrice { get; set; }

    public ICollection<RoomInventory> Inventory { get; set; } = new List<RoomInventory>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
