namespace Travelov.Domain.Exceptions;

/// <summary>
/// Raised when there is not enough room inventory left for the requested dates.
/// </summary>
public class InsufficientInventoryException : DomainException
{
    public InsufficientInventoryException(DateOnly date, int requested, int available)
        : base($"Not enough rooms available on {date:yyyy-MM-dd}: requested {requested}, available {available}.")
    {
        Date = date;
        Requested = requested;
        Available = available;
    }

    public DateOnly Date { get; }
    public int Requested { get; }
    public int Available { get; }
}
