using System.Security.Claims;
using Travelov.Application.Abstractions;
using Travelov.Domain.Enums;

namespace Travelov.Api.Services;

/// <summary>
/// Reads the authenticated principal from the current HTTP request. Claim lookups
/// accept both the short JWT names and the .NET <see cref="ClaimTypes"/> names so
/// the service works regardless of inbound claim mapping.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? Principal => _httpContextAccessor.HttpContext?.User;

    public Guid? UserId
    {
        get
        {
            var value = FindFirst(
                ClaimTypes.NameIdentifier,
                "nameid",
                "sub",
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");

            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public string? Email => FindFirst(ClaimTypes.Email, "email");

    public UserRole? Role =>
        Enum.TryParse<UserRole>(FindFirst(ClaimTypes.Role, "role"), ignoreCase: true, out var role)
            ? role
            : null;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public bool IsAdmin => Role == UserRole.Admin;

    private string? FindFirst(params string[] claimTypes)
    {
        var principal = Principal;
        if (principal is null)
        {
            return null;
        }

        foreach (var claimType in claimTypes)
        {
            var value = principal.FindFirst(claimType)?.Value;
            if (!string.IsNullOrEmpty(value))
            {
                return value;
            }
        }

        return null;
    }
}
