using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Travelov.Application.Admin;

namespace Travelov.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/inventory")]
[Authorize(Policy = "Admin")]
public class AdminInventoryController : ControllerBase
{
    private readonly AdminHotelService _service;

    public AdminInventoryController(AdminHotelService service)
    {
        _service = service;
    }

    /// <summary>Reads per-date stock and price for a room type.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InventoryDto>>> Get(
        [FromQuery] Guid roomTypeId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
        => Ok(await _service.GetInventoryAsync(roomTypeId, from, to, cancellationToken));

    /// <summary>Upserts stock and price for every night in the given range.</summary>
    [HttpPut]
    public async Task<IActionResult> Update(InventoryUpdateRequest request, CancellationToken cancellationToken)
    {
        var updated = await _service.UpdateInventoryAsync(request, cancellationToken);
        return Ok(new { updated });
    }
}
