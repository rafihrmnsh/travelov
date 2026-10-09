using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Travelov.Application.Admin;
using Travelov.Application.Common.Models;
using Travelov.Application.Hotels;
using Travelov.Application.Reviews;

namespace Travelov.Api.Controllers;

[ApiController]
[Route("api/hotels")]
[AllowAnonymous]
public class HotelsController : ControllerBase
{
    private readonly HotelService _hotelService;
    private readonly ReviewService _reviewService;
    private readonly AdminHotelService _adminHotelService;

    public HotelsController(
        HotelService hotelService,
        ReviewService reviewService,
        AdminHotelService adminHotelService)
    {
        _hotelService = hotelService;
        _reviewService = reviewService;
        _adminHotelService = adminHotelService;
    }

    /// <summary>Searches hotels with filters and pagination.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<HotelSummaryDto>>> Search(
        [FromQuery] HotelSearchRequest request,
        CancellationToken cancellationToken)
        => Ok(await _hotelService.SearchAsync(request, cancellationToken));

    /// <summary>Lists all facilities, used to populate search filters.</summary>
    [HttpGet("facilities")]
    public async Task<ActionResult<IReadOnlyList<FacilityDto>>> Facilities(CancellationToken cancellationToken)
        => Ok(await _adminHotelService.GetFacilitiesAsync(cancellationToken));

    /// <summary>Hotel detail with per-night room availability for the requested dates.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HotelDetailDto>> Detail(
        Guid id,
        [FromQuery] DateOnly? checkIn,
        [FromQuery] DateOnly? checkOut,
        [FromQuery] int? guests,
        CancellationToken cancellationToken)
        => Ok(await _hotelService.GetDetailAsync(id, checkIn, checkOut, guests, cancellationToken));

    /// <summary>Paginated guest reviews for a hotel.</summary>
    [HttpGet("{id:guid}/reviews")]
    public async Task<ActionResult<PagedResult<ReviewDto>>> Reviews(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
        => Ok(await _reviewService.GetHotelReviewsAsync(id, page, pageSize, cancellationToken));
}
