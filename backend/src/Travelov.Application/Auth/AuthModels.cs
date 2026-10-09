namespace Travelov.Application.Auth;

public record RegisterRequest(string Name, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record UpdateProfileRequest(string Name);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record UserDto(Guid Id, string Name, string Email, string Role, DateTimeOffset CreatedAt);

public record AuthResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    UserDto User);
