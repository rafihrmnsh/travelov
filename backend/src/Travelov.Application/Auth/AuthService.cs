using Microsoft.EntityFrameworkCore;
using Travelov.Application.Abstractions;
using Travelov.Application.Common.Exceptions;
using Travelov.Domain.Entities;
using Travelov.Domain.Enums;
using Travelov.Domain.Exceptions;

namespace Travelov.Application.Auth;

public class AuthService
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IDateTimeProvider _clock;
    private readonly ICurrentUserService _currentUser;

    public AuthService(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IDateTimeProvider clock,
        ICurrentUserService currentUser)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _clock = clock;
        _currentUser = currentUser;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);

        if (await _db.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            throw new DomainException("That email address is already registered.");
        }

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = UserRole.User
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedException("Invalid email or password.");
        }

        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken)
    {
        var token = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.RefreshToken, cancellationToken);

        if (token is null || !token.IsActive || token.User is null)
        {
            throw new UnauthorizedException("The refresh token is invalid or has expired.");
        }

        // Rotation: revoke the used token so it cannot be replayed.
        token.Revoke();
        await _db.SaveChangesAsync(cancellationToken);

        return await IssueTokensAsync(token.User, cancellationToken);
    }

    public async Task<UserDto> GetProfileAsync(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        return ToDto(user);
    }

    public async Task<UserDto> UpdateProfileAsync(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        user.Name = request.Name.Trim();
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(user);
    }

    public async Task ChangePasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new DomainException("The current password is incorrect.");
        }

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken cancellationToken)
    {
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == refreshToken, cancellationToken);
        if (token is null || !token.IsActive)
        {
            return;
        }

        token.Revoke();
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<User> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not { } userId)
        {
            throw new DomainException("Authentication is required.");
        }

        return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
               ?? throw new NotFoundException("User was not found.");
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, CancellationToken cancellationToken)
    {
        var accessToken = _jwtTokenService.CreateAccessToken(user, out var expiresAt);
        var (refreshToken, refreshExpiresAt) = _jwtTokenService.CreateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshToken,
            ExpiresAt = refreshExpiresAt,
            CreatedAt = _clock.UtcNow
        });

        await _db.SaveChangesAsync(cancellationToken);

        return new AuthResponse(accessToken, expiresAt, refreshToken, ToDto(user));
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static UserDto ToDto(User user) =>
        new(user.Id, user.Name, user.Email, user.Role.ToString(), user.CreatedAt);
}
