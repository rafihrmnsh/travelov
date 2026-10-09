namespace Travelov.Domain.Exceptions;

/// <summary>
/// Raised when a business rule is violated. Surfaced to clients as HTTP 409/400.
/// </summary>
public class DomainException : Exception
{
    public DomainException(string message) : base(message)
    {
    }
}
