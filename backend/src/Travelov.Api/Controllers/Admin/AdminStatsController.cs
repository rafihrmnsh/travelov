using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Travelov.Application.Admin;

namespace Travelov.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/stats")]
[Authorize(Policy = "Admin")]
public class AdminStatsController : ControllerBase
{
    private readonly AdminStatsService _service;

    public AdminStatsController(AdminStatsService service)
    {
        _service = service;
    }

    /// <summary>Summary metrics used by the admin dashboard.</summary>
    [HttpGet]
    public async Task<ActionResult<AdminStatsDto>> Get(CancellationToken cancellationToken)
        => Ok(await _service.GetStatsAsync(cancellationToken));
}
