using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Travelov.Api.Contracts;
using Travelov.Application.Bookings;
using Travelov.Application.Common.Models;

namespace Travelov.Api.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly BookingService _bookingService;

    public BookingsController(BookingService bookingService)
    {
        _bookingService = bookingService;
    }

    /// <summary>Creates a booking and holds room stock until the payment deadline.</summary>
    [HttpPost]
    public async Task<ActionResult<BookingDto>> Create(CreateBookingRequest request, CancellationToken cancellationToken)
    {
        var booking = await _bookingService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, booking);
    }

    /// <summary>Lists the authenticated user's bookings.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<BookingDto>>> Mine(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
        => Ok(await _bookingService.GetMyBookingsAsync(page, pageSize, cancellationToken));

    /// <summary>Returns one of the authenticated user's bookings.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BookingDto>> GetById(Guid id, CancellationToken cancellationToken)
        => Ok(await _bookingService.GetByIdAsync(id, cancellationToken));

    /// <summary>Cancels a booking and releases its stock.</summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<BookingDto>> Cancel(
        Guid id,
        [FromBody] CancelBookingRequest? request,
        CancellationToken cancellationToken)
        => Ok(await _bookingService.CancelAsync(id, request?.Reason, cancellationToken));
}
