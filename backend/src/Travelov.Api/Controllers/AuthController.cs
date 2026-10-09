using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Travelov.Application.Auth;

namespace Travelov.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    /// <summary>Creates a new traveller account and returns tokens.</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
        => Ok(await _authService.RegisterAsync(request, cancellationToken));

    /// <summary>Authenticates a user and returns an access and refresh token.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
        => Ok(await _authService.LoginAsync(request, cancellationToken));

    /// <summary>Exchanges a refresh token for a new token pair (with rotation).</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken cancellationToken)
        => Ok(await _authService.RefreshAsync(request, cancellationToken));

    /// <summary>Revokes a refresh token.</summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(request.RefreshToken, cancellationToken);
        return NoContent();
    }

    /// <summary>Returns the authenticated user's profile.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me(CancellationToken cancellationToken)
        => Ok(await _authService.GetProfileAsync(cancellationToken));

    /// <summary>Updates the authenticated user's profile.</summary>
    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateProfile(UpdateProfileRequest request, CancellationToken cancellationToken)
        => Ok(await _authService.UpdateProfileAsync(request, cancellationToken));

    /// <summary>Changes the authenticated user's password.</summary>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        await _authService.ChangePasswordAsync(request, cancellationToken);
        return NoContent();
    }
}
