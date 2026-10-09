namespace Travelov.Application.Abstractions;

/// <summary>
/// Small caching abstraction so the application layer can cache search results
/// without depending on Redis directly.
/// </summary>
public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);
    Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken cancellationToken = default);
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
}
