using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Travelov.Application.Reviews;

namespace Travelov.Api.Controllers;

[ApiController]
[Route("api/reviews")]
[Authorize]
public class ReviewsController : ControllerBase
{
    private readonly ReviewService _reviewService;

    public ReviewsController(ReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    /// <summary>Leaves a review for one of the user's completed stays (once per booking).</summary>
    [HttpPost]
    public async Task<ActionResult<ReviewDto>> Create(CreateReviewRequest request, CancellationToken cancellationToken)
    {
        var review = await _reviewService.CreateAsync(request, cancellationToken);
        return Created($"/api/hotels/{review.HotelId}/reviews", review);
    }
}
