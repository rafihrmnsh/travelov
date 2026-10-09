namespace Travelov.Infrastructure.Identity;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "travelov";
    public string Audience { get; set; } = "travelov-client";

    /// <summary>HMAC signing key. Must be at least 32 characters for HS256.</summary>
    public string SigningKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 14;
}
