using Microsoft.EntityFrameworkCore;
using Travelov.Application.Abstractions;
using Travelov.Application.Bookings;
using Travelov.Application.Common.Exceptions;
using Travelov.Domain.Entities;
using Travelov.Domain.Enums;
using Travelov.Domain.Exceptions;

namespace Travelov.Application.Payments;

public class PaymentService
{
    private readonly IApplicationDbContext _db;
    private readonly IDateTimeProvider _clock;
    private readonly IPaymentGateway _gateway;
    private readonly IPaymentSimulator _simulator;
    private readonly IEmailSender _emailSender;

    public PaymentService(
        IApplicationDbContext db,
        IDateTimeProvider clock,
        IPaymentGateway gateway,
        IPaymentSimulator simulator,
        IEmailSender emailSender)
    {
        _db = db;
        _clock = clock;
        _gateway = gateway;
        _simulator = simulator;
        _emailSender = emailSender;
    }

    /// <summary>
    /// Processes a payment gateway callback. Safe to call multiple times with the
    /// same reference: the second call is a no-op (idempotency).
    /// </summary>
    public async Task<PaymentResultDto> HandleCallbackAsync(PaymentCallbackRequest callback, CancellationToken cancellationToken)
    {
        if (!_gateway.VerifySignature(callback))
        {
            throw new DomainException("The payment callback signature is invalid.");
        }

        var booking = await _db.Bookings
            .Include(b => b.Payment)
            .FirstOrDefaultAsync(b => b.Code == callback.BookingCode, cancellationToken)
            ?? throw new NotFoundException("Booking not found for this callback.");

        var payment = booking.Payment;
        if (payment is null)
        {
            throw new NotFoundException("Payment not found for this booking.");
        }

        // Idempotency guard: a duplicate callback must not confirm or release stock twice.
        if (payment.Status is PaymentStatus.Paid or PaymentStatus.Expired or PaymentStatus.Failed)
        {
            return new PaymentResultDto(
                booking.Code,
                booking.Status.ToString(),
                payment.Status.ToString(),
                AlreadyProcessed: true,
                Message: "This payment callback has already been processed.");
        }

        var now = _clock.UtcNow;

        if (!callback.Success)
        {
            payment.MarkFailed();
            await _db.SaveChangesAsync(cancellationToken);
            return new PaymentResultDto(booking.Code, booking.Status.ToString(), payment.Status.ToString(), false, "Payment failed.");
        }

        if (booking.Status != BookingStatus.PendingPayment)
        {
            payment.MarkFailed();
            await _db.SaveChangesAsync(cancellationToken);
            return new PaymentResultDto(
                booking.Code,
                booking.Status.ToString(),
                payment.Status.ToString(),
                false,
                "The booking is no longer awaiting payment.");
        }

        if (now > booking.PaymentDeadline)
        {
            // Paid too late: expire the booking and release stock instead of confirming.
            await ReleaseInventoryAsync(booking, cancellationToken);
            booking.Expire(now);
            payment.Status = PaymentStatus.Expired;
            await _db.SaveChangesAsync(cancellationToken);
            return new PaymentResultDto(
                booking.Code,
                booking.Status.ToString(),
                payment.Status.ToString(),
                false,
                "The payment arrived after the deadline; the booking has expired.");
        }

        booking.Confirm(now);
        payment.MarkPaid(now);
        await _db.SaveChangesAsync(cancellationToken);

        await _emailSender.SendBookingConfirmationAsync(booking.GuestEmail, booking.Code, cancellationToken);

        return new PaymentResultDto(
            booking.Code,
            booking.Status.ToString(),
            payment.Status.ToString(),
            false,
            "Payment confirmed.");
    }

    /// <summary>
    /// Sandbox helper used by the demo UI and tests: produces a signed callback
    /// server-side and routes it through the same code path as a real callback.
    /// </summary>
    public async Task<PaymentResultDto> SimulateAsync(string bookingCode, bool success, CancellationToken cancellationToken)
    {
        var booking = await _db.Bookings
            .Include(b => b.Payment)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Code == bookingCode, cancellationToken)
            ?? throw new NotFoundException("Booking not found.");

        if (booking.Payment is null)
        {
            throw new NotFoundException("Payment not found for this booking.");
        }

        var callback = _simulator.CreateSignedCallback(
            booking.Code,
            booking.Payment.Reference,
            booking.Payment.Amount,
            success);

        return await HandleCallbackAsync(callback, cancellationToken);
    }

    private async Task ReleaseInventoryAsync(Booking booking, CancellationToken cancellationToken)
    {
        if (!booking.HoldsInventory)
        {
            return;
        }

        var inventory = await _db.RoomInventories
            .Where(i => i.RoomTypeId == booking.RoomTypeId
                        && i.Date >= booking.CheckIn
                        && i.Date < booking.CheckOut)
            .ToListAsync(cancellationToken);

        foreach (var row in inventory)
        {
            row.Release(booking.Rooms);
        }
    }
}
