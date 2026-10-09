using Travelov.Domain.Entities;

namespace Travelov.Application.Abstractions;

public interface IJwtTokenService
{
    /// <summary>Creates a short-lived JWT access token for the user.</summary>
    string CreateAccessToken(User user, out DateTimeOffset expiresAt);

    /// <summary>Creates an opaque refresh token string and its expiry.</summary>
    (string Token, DateTimeOffset ExpiresAt) CreateRefreshToken();
}
