using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Travelov.Application.Admin;
using Travelov.Application.Common.Models;

namespace Travelov.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/bookings")]
[Authorize(Policy = "Admin")]
public class AdminBookingsController : ControllerBase
{
    private readonly AdminBookingService _service;

    public AdminBookingsController(AdminBookingService service)
    {
        _service = service;
    }

    /// <summary>Lists all bookings, filterable by status and date range.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<AdminBookingDto>>> List(
        [FromQuery] string? status,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
        => Ok(await _service.GetBookingsAsync(status, from, to, page, pageSize, cancellationToken));
}
