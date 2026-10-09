using Travelov.Domain.Exceptions;

namespace Travelov.Domain.Entities;

/// <summary>
/// Per-night inventory for a room type. Availability is derived from
/// <c>TotalUnits - ReservedUnits</c>. Concurrency is guarded by the PostgreSQL
/// <c>xmin</c> system column configured as a row version.
/// </summary>
public class RoomInventory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoomTypeId { get; set; }
    public RoomType? RoomType { get; set; }

    public DateOnly Date { get; set; }

    /// <summary>Total sellable rooms for this room type on this date.</summary>
    public int TotalUnits { get; set; }

    /// <summary>Rooms currently held by active bookings (pending payment or confirmed).</summary>
    public int ReservedUnits { get; set; }

    /// <summary>Price per night for this specific date.</summary>
    public decimal Price { get; set; }

    public int AvailableUnits => TotalUnits - ReservedUnits;

    public bool HasAvailability(int rooms) => AvailableUnits >= rooms;

    /// <summary>Holds <paramref name="rooms"/> nights of stock, or throws when unavailable.</summary>
    public void Reserve(int rooms)
    {
        if (rooms <= 0)
        {
            throw new DomainException("Number of rooms must be greater than zero.");
        }

        if (!HasAvailability(rooms))
        {
            throw new InsufficientInventoryException(Date, rooms, AvailableUnits);
        }

        ReservedUnits += rooms;
    }

    /// <summary>Releases previously held stock. Never drops below zero.</summary>
    public void Release(int rooms)
    {
        if (rooms <= 0)
        {
            return;
        }

        ReservedUnits = Math.Max(0, ReservedUnits - rooms);
    }
}
