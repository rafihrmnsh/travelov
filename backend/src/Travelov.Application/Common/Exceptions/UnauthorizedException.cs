namespace Travelov.Application.Common.Exceptions;

/// <summary>
/// Raised when credentials or tokens are missing or invalid. Surfaced as HTTP 401.
/// </summary>
public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message) : base(message)
    {
    }
}
