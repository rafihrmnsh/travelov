using FluentAssertions;
using Travelov.Domain.Entities;
using Travelov.Domain.Exceptions;

namespace Travelov.UnitTests;

/// <summary>Per-night inventory: reservation, release, and the overselling guard.</summary>
public class RoomInventoryTests
{
    private static RoomInventory Inventory(int totalUnits, int reservedUnits = 0) =>
        new() { Date = new DateOnly(2026, 10, 1), TotalUnits = totalUnits, ReservedUnits = reservedUnits, Price = 500_000m };

    [Fact]
    public void AvailableUnits_IsTotalMinusReserved()
    {
        Inventory(totalUnits: 5, reservedUnits: 2).AvailableUnits.Should().Be(3);
    }

    [Theory]
    [InlineData(5, true)]
    [InlineData(6, false)]
    public void HasAvailability_ComparesAgainstRemainingUnits(int rooms, bool expected)
    {
        Inventory(totalUnits: 5).HasAvailability(rooms).Should().Be(expected);
    }

    [Fact]
    public void Reserve_HoldsRequestedStock()
    {
        var inventory = Inventory(totalUnits: 5);

        inventory.Reserve(2);

        inventory.ReservedUnits.Should().Be(2);
        inventory.AvailableUnits.Should().Be(3);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Reserve_WithNonPositiveRooms_ThrowsDomainException(int rooms)
    {
        var inventory = Inventory(totalUnits: 5);

        var act = () => inventory.Reserve(rooms);

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Reserve_WhenNotEnoughUnits_ThrowsInsufficientInventoryException()
    {
        var inventory = Inventory(totalUnits: 1, reservedUnits: 1);

        var act = () => inventory.Reserve(1);

        var exception = act.Should().Throw<InsufficientInventoryException>().Which;
        exception.Requested.Should().Be(1);
        exception.Available.Should().Be(0);
        exception.Date.Should().Be(new DateOnly(2026, 10, 1));
    }

    [Fact]
    public void Release_FreesHeldStock()
    {
        var inventory = Inventory(totalUnits: 5, reservedUnits: 3);

        inventory.Release(2);

        inventory.ReservedUnits.Should().Be(1);
    }

    [Fact]
    public void Release_NeverDropsBelowZero()
    {
        var inventory = Inventory(totalUnits: 5, reservedUnits: 1);

        inventory.Release(5);

        inventory.ReservedUnits.Should().Be(0);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public void Release_WithNonPositiveRooms_IsANoOp(int rooms)
    {
        var inventory = Inventory(totalUnits: 5, reservedUnits: 2);

        inventory.Release(rooms);

        inventory.ReservedUnits.Should().Be(2);
    }
}
