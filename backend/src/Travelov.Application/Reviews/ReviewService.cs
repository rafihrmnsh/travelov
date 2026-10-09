using Microsoft.EntityFrameworkCore;
using Travelov.Application.Abstractions;
using Travelov.Application.Common.Exceptions;
using Travelov.Application.Common.Models;
using Travelov.Domain.Entities;
using Travelov.Domain.Enums;
using Travelov.Domain.Exceptions;

namespace Travelov.Application.Reviews;

public class ReviewService
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;

    public ReviewService(IApplicationDbContext db, ICurrentUserService currentUser, IDateTimeProvider clock)
    {
        _db = db;
        _currentUser = currentUser;
        _clock = clock;
    }

    public async Task<ReviewDto> CreateAsync(CreateReviewRequest request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new DomainException("Authentication is required.");

        var booking = await _db.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.Review)
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken)
            ?? throw new NotFoundException("Booking not found.");

        if (booking.UserId != userId)
        {
            throw new NotFoundException("Booking not found.");
        }

        if (booking.Status != BookingStatus.Completed)
        {
            throw new DomainException("Only completed stays can be reviewed.");
        }

        if (booking.Review is not null)
        {
            throw new DomainException("This booking has already been reviewed.");
        }

        var review = new Review
        {
            BookingId = booking.Id,
            UserId = userId,
            HotelId = booking.HotelId,
            Rating = request.Rating,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
            CreatedAt = _clock.UtcNow
        };

        _db.Reviews.Add(review);

        await RecomputeHotelRatingAsync(booking.HotelId, request.Rating, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        var reviewerName = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.Name)
            .FirstOrDefaultAsync(cancellationToken) ?? "Guest";

        return new ReviewDto(
            review.Id,
            review.BookingId,
            review.HotelId,
            booking.Hotel?.Name ?? string.Empty,
            review.Rating,
            review.Comment,
            reviewerName,
            review.CreatedAt);
    }

    public async Task<PagedResult<ReviewDto>> GetHotelReviewsAsync(Guid hotelId, int page, int pageSize, CancellationToken cancellationToken)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 50 ? 10 : pageSize;

        var query = _db.Reviews
            .Include(r => r.Hotel)
            .Include(r => r.User)
            .AsNoTracking()
            .Where(r => r.HotelId == hotelId);

        var total = await query.CountAsync(cancellationToken);
        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = reviews.Select(r => new ReviewDto(
            r.Id,
            r.BookingId,
            r.HotelId,
            r.Hotel?.Name ?? string.Empty,
            r.Rating,
            r.Comment,
            r.User?.Name ?? "Guest",
            r.CreatedAt)).ToList();

        return new PagedResult<ReviewDto>(items, page, pageSize, total);
    }

    private async Task RecomputeHotelRatingAsync(Guid hotelId, int newRating, CancellationToken cancellationToken)
    {
        var hotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == hotelId, cancellationToken);
        if (hotel is null)
        {
            return;
        }

        var storedRatings = await _db.Reviews
            .Where(r => r.HotelId == hotelId)
            .Select(r => r.Rating)
            .ToListAsync(cancellationToken);

        // The new review is not persisted yet, so include it explicitly.
        storedRatings.Add(newRating);
        hotel.ApplyReviews(storedRatings);
    }
}
