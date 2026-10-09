using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Travelov.Application.Abstractions;

namespace Travelov.Infrastructure.Caching;

/// <summary>
/// Cache abstraction over <see cref="IDistributedCache"/>. Backed by Redis when a
/// connection string is configured, otherwise by the in-memory distributed cache.
/// </summary>
public class DistributedCacheService : ICacheService
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly IDistributedCache _cache;
    private readonly ILogger<DistributedCacheService> _logger;

    public DistributedCacheService(IDistributedCache cache, ILogger<DistributedCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = await _cache.GetStringAsync(key, cancellationToken);
            return payload is null ? default : JsonSerializer.Deserialize<T>(payload, SerializerOptions);
        }
        catch (Exception ex)
        {
            // A cache outage must never break a request.
            _logger.LogWarning(ex, "Cache read failed for key {CacheKey}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = JsonSerializer.Serialize(value, SerializerOptions);
            await _cache.SetStringAsync(key, payload, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache write failed for key {CacheKey}", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            await _cache.RemoveAsync(key, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache eviction failed for key {CacheKey}", key);
        }
    }
}
