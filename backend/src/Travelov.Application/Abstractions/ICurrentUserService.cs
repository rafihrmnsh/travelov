using Travelov.Domain.Enums;

namespace Travelov.Application.Abstractions;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    UserRole? Role { get; }
    bool IsAuthenticated { get; }
    bool IsAdmin { get; }
}
