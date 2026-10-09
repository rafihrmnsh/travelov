using FluentAssertions;
using Travelov.Application.Bookings;

namespace Travelov.UnitTests;

/// <summary>Pricing rules: 11% PPN applied on the nightly subtotal, times the room count.</summary>
public class BookingPricingTests
{
    private static NightlyPriceDto[] Nights(params decimal[] prices) =>
        prices.Select((price, index) => new NightlyPriceDto(new DateOnly(2026, 10, 1).AddDays(index), price)).ToArray();

    [Fact]
    public void Calculate_AppliesTaxOnSubtotalTimesRooms()
    {
        var summary = BookingPricing.Calculate(Nights(100_000m, 200_000m), rooms: 2);

        summary.Currency.Should().Be("IDR");
        summary.Nights.Should().Be(2);
        summary.Rooms.Should().Be(2);
        summary.NightlyAverage.Should().Be(150_000m);
        summary.Subtotal.Should().Be(600_000m);              // 300_000 per night * 2 rooms
        summary.TaxAmount.Should().Be(66_000m);              // 11% of 600_000
        summary.TotalPrice.Should().Be(666_000m);
        summary.Breakdown.Should().HaveCount(2);
    }

    [Fact]
    public void Calculate_RoundsTaxToTwoDecimals()
    {
        var summary = BookingPricing.Calculate(Nights(12_345.67m), rooms: 1);

        summary.Subtotal.Should().Be(12_345.67m);
        summary.TaxAmount.Should().Be(1_358.02m);            // 12_345.67 * 0.11 = 1_358.0237 -> 1_358.02
        summary.TotalPrice.Should().Be(13_703.69m);
    }

    [Fact]
    public void Calculate_NightlyAverageRoundsToTwoDecimals()
    {
        var summary = BookingPricing.Calculate(Nights(100_000m, 100_000m, 100_001m), rooms: 1);

        summary.NightlyAverage.Should().Be(100_000.33m);     // 300_001 / 3
    }

    [Fact]
    public void Calculate_ClampsRoomCountToAtLeastOne()
    {
        var summary = BookingPricing.Calculate(Nights(100_000m), rooms: 0);

        summary.Rooms.Should().Be(1);
        summary.Subtotal.Should().Be(100_000m);
    }

    [Fact]
    public void Calculate_WithNoNights_ReturnsZeroes()
    {
        var summary = BookingPricing.Calculate(Array.Empty<NightlyPriceDto>(), rooms: 3);

        summary.Nights.Should().Be(0);
        summary.NightlyAverage.Should().Be(0m);
        summary.Subtotal.Should().Be(0m);
        summary.TaxAmount.Should().Be(0m);
        summary.TotalPrice.Should().Be(0m);
    }
}
