using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Travelov.Api.Filters;
using Travelov.Api.Middleware;
using Travelov.Api.Services;
using Travelov.Application;
using Travelov.Application.Abstractions;
using Travelov.Infrastructure;
using Travelov.Infrastructure.Identity;
using Travelov.Infrastructure.Persistence.Seed;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// ----- MVC + validation -----

builder.Services.AddControllers(options => options.Filters.Add<ValidationFilter>());
builder.Services.AddScoped<ValidationFilter>();

// ----- Swagger / OpenAPI -----

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Travelov API",
        Version = "v1",
        Description = "Mini hotel booking platform: search, per-date availability, bookings, sandbox payments, and admin."
    });

    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Paste the JWT access token returned by /api/auth/login.",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };

    options.AddSecurityDefinition("Bearer", scheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [scheme] = Array.Empty<string>()
    });
});

// ----- Application + Infrastructure -----

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// ----- Authentication -----

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

if (Encoding.UTF8.GetByteCount(jwt.SigningKey) < 32)
{
    throw new InvalidOperationException(
        "Jwt:SigningKey must be configured with at least 32 characters. Set it via configuration or the JWT__SIGNINGKEY environment variable.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Tolerant of both mapped (ClaimTypes.Role) and raw ("role") role claims.
    options.AddPolicy("Admin", policy => policy.RequireAssertion(context =>
        context.User.IsInRole("Admin")
        || context.User.HasClaim("role", "Admin")
        || context.User.HasClaim(ClaimTypes.Role, "Admin")
        || context.User.HasClaim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "Admin")));
});

// ----- CORS -----

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        if (allowedOrigins.Length == 0)
        {
            policy.AllowAnyOrigin();
        }
        else
        {
            policy.WithOrigins(allowedOrigins).AllowCredentials();
        }

        policy.AllowAnyHeader().AllowAnyMethod();
    });
});

// ----- Rate limiting (basic protection) -----

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

var app = builder.Build();

// ----- Pipeline -----

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Travelov API v1");
    options.DocumentTitle = "Travelov API";
});

app.UseSerilogRequestLogging();
app.UseCors("frontend");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

// ----- Seed demo data on startup (with a short retry for slow databases) -----

await SeedDatabaseAsync(app);

app.Run();

static async Task SeedDatabaseAsync(WebApplication app)
{
    const int maxAttempts = 10;

    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            await using var scope = app.Services.CreateAsyncScope();
            var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
            await seeder.SeedAsync();
            return;
        }
        catch (Exception ex)
        {
            var logger = app.Services.GetRequiredService<ILogger<Program>>();
            if (attempt == maxAttempts)
            {
                logger.LogError(ex, "Database seeding failed after {Attempts} attempts.", maxAttempts);
                throw;
            }

            logger.LogWarning("Database not ready (attempt {Attempt}/{Max}): {Message}. Retrying in 3s...",
                attempt, maxAttempts, ex.Message);
            await Task.Delay(TimeSpan.FromSeconds(3));
        }
    }
}
