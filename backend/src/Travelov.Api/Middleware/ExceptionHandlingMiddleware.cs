using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Travelov.Application.Common.Exceptions;
using Travelov.Domain.Exceptions;

namespace Travelov.Api.Middleware;

/// <summary>
/// Catches unhandled exceptions and converts them into a single, predictable JSON
/// error shape: <c>{ status, error, details, traceId }</c>.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception exception)
    {
        if (context.Response.HasStarted)
        {
            _logger.LogError(exception, "The response has already started; cannot write an error payload.");
            throw exception;
        }

        var (status, message, details) = Map(exception);

        if (status >= StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception while processing {Method} {Path}.",
                context.Request.Method, context.Request.Path);
        }
        else
        {
            _logger.LogWarning("Request {Method} {Path} rejected with {Status}: {Message}",
                context.Request.Method, context.Request.Path, status, message);
        }

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";

        var payload = new ErrorResponse(
            status,
            message,
            details,
            Activity.Current?.Id ?? context.TraceIdentifier);

        await context.Response.WriteAsJsonAsync(payload);
    }

    private (int Status, string Message, IReadOnlyDictionary<string, string[]>? Details) Map(Exception exception) =>
        exception switch
        {
            FluentValidation.ValidationException validation => (
                StatusCodes.Status400BadRequest,
                "One or more validation errors occurred.",
                validation.Errors
                    .GroupBy(e => string.IsNullOrWhiteSpace(e.PropertyName) ? "request" : e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())),

            NotFoundException notFound => (StatusCodes.Status404NotFound, notFound.Message, null),

            UnauthorizedException unauthorized => (StatusCodes.Status401Unauthorized, unauthorized.Message, null),

            InsufficientInventoryException inventory => (
                StatusCodes.Status409Conflict,
                inventory.Message,
                new Dictionary<string, string[]>
                {
                    ["date"] = new[] { inventory.Date.ToString("yyyy-MM-dd") },
                    ["requested"] = new[] { inventory.Requested.ToString() },
                    ["available"] = new[] { inventory.Available.ToString() }
                }),

            DomainException domain => (StatusCodes.Status409Conflict, domain.Message, null),

            DbUpdateConcurrencyException => (
                StatusCodes.Status409Conflict,
                "The resource was modified by another request. Please retry.",
                null),

            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, exception.Message, null),

            _ => (
                StatusCodes.Status500InternalServerError,
                _environment.IsDevelopment() ? exception.Message : "An unexpected error occurred.",
                null)
        };

    private sealed record ErrorResponse(
        int Status,
        string Error,
        IReadOnlyDictionary<string, string[]>? Details,
        string TraceId);
}
