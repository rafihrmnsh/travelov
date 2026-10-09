using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Travelov.Api.Contracts;
using Travelov.Application.Abstractions;
using Travelov.Application.Payments;

namespace Travelov.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly PaymentService _paymentService;

    public PaymentsController(PaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    /// <summary>
    /// Receives a payment gateway callback. Verified by signature and idempotent:
    /// replaying the same callback does not confirm or release stock twice.
    /// </summary>
    [HttpPost("callback")]
    [AllowAnonymous]
    public async Task<ActionResult<PaymentResultDto>> Callback(
        PaymentCallbackRequest request,
        CancellationToken cancellationToken)
        => Ok(await _paymentService.HandleCallbackAsync(request, cancellationToken));

    /// <summary>
    /// Sandbox helper for the demo payment page: emits a signed callback server-side
    /// and routes it through the same processing path as a real gateway callback.
    /// </summary>
    [HttpPost("simulate")]
    [Authorize]
    public async Task<ActionResult<PaymentResultDto>> Simulate(
        SimulatePaymentRequest request,
        CancellationToken cancellationToken)
        => Ok(await _paymentService.SimulateAsync(request.BookingCode, request.Success, cancellationToken));
}
