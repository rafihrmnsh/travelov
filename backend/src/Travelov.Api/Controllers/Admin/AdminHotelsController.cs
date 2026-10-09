using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Travelov.Application.Admin;
using Travelov.Application.Common.Models;
using Travelov.Application.Hotels;

namespace Travelov.Api.Controllers.Admin;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "Admin")]
public class AdminHotelsController : ControllerBase
{
    private readonly AdminHotelService _service;

    public AdminHotelsController(AdminHotelService service)
    {
        _service = service;
    }

    // ----- Hotels -----

    [HttpGet("hotels")]
    public async Task<ActionResult<PagedResult<AdminHotelDto>>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
        => Ok(await _service.GetHotelsAsync(search, page, pageSize, cancellationToken));

    [HttpGet("hotels/{id:guid}")]
    public async Task<ActionResult<AdminHotelDto>> Get(Guid id, CancellationToken cancellationToken)
        => Ok(await _service.GetHotelAsync(id, cancellationToken));

    [HttpPost("hotels")]
    public async Task<ActionResult<AdminHotelDto>> Create(HotelUpsertRequest request, CancellationToken cancellationToken)
    {
        var hotel = await _service.CreateHotelAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = hotel.Id }, hotel);
    }

    [HttpPut("hotels/{id:guid}")]
    public async Task<ActionResult<AdminHotelDto>> Update(Guid id, HotelUpsertRequest request, CancellationToken cancellationToken)
        => Ok(await _service.UpdateHotelAsync(id, request, cancellationToken));

    [HttpDelete("hotels/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _service.DeleteHotelAsync(id, cancellationToken);
        return NoContent();
    }

    // ----- Facilities -----

    [HttpGet("facilities")]
    public async Task<ActionResult<IReadOnlyList<FacilityDto>>> Facilities(CancellationToken cancellationToken)
        => Ok(await _service.GetFacilitiesAsync(cancellationToken));

    [HttpPost("facilities")]
    public async Task<ActionResult<FacilityDto>> CreateFacility(FacilityUpsertRequest request, CancellationToken cancellationToken)
        => Ok(await _service.CreateFacilityAsync(request, cancellationToken));

    // ----- Room types -----

    [HttpGet("hotels/{hotelId:guid}/room-types")]
    public async Task<ActionResult<IReadOnlyList<AdminRoomTypeDto>>> RoomTypes(Guid hotelId, CancellationToken cancellationToken)
        => Ok(await _service.GetRoomTypesAsync(hotelId, cancellationToken));

    [HttpPost("hotels/{hotelId:guid}/room-types")]
    public async Task<ActionResult<AdminRoomTypeDto>> CreateRoomType(Guid hotelId, RoomTypeUpsertRequest request, CancellationToken cancellationToken)
        => Ok(await _service.CreateRoomTypeAsync(hotelId, request, cancellationToken));

    [HttpPut("room-types/{id:guid}")]
    public async Task<ActionResult<AdminRoomTypeDto>> UpdateRoomType(Guid id, RoomTypeUpsertRequest request, CancellationToken cancellationToken)
        => Ok(await _service.UpdateRoomTypeAsync(id, request, cancellationToken));

    [HttpDelete("room-types/{id:guid}")]
    public async Task<IActionResult> DeleteRoomType(Guid id, CancellationToken cancellationToken)
    {
        await _service.DeleteRoomTypeAsync(id, cancellationToken);
        return NoContent();
    }
}
