namespace Travelov.Application.Bookings;

public static class BookingPricing
{
    /// <summary>Indonesian VAT (PPN) applied on top of the nightly subtotal.</summary>
    public const decimal TaxRate = 0.11m;

    public static PriceSummaryDto Calculate(IReadOnlyList<NightlyPriceDto> nights, int rooms)
    {
        rooms = rooms < 1 ? 1 : rooms;

        var nightlySubtotal = nights.Sum(n => n.Price);
        var subtotal = nightlySubtotal * rooms;
        var tax = Math.Round(subtotal * TaxRate, 2);
        var total = subtotal + tax;
        var nightlyAverage = nights.Count == 0 ? 0 : Math.Round(nightlySubtotal / nights.Count, 2);

        return new PriceSummaryDto(
            "IDR",
            nights.Count,
            rooms,
            nightlyAverage,
            subtotal,
            tax,
            total,
            nights);
    }
}
