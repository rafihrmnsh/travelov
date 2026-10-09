import type { HotelSearchParams } from '@/types/api';

/** Serialises search filters into a query string (facilityIds becomes repeated keys). */
export function searchParamsToQuery(params: HotelSearchParams): string {
  const search = new URLSearchParams();

  const setIf = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  };

  setIf('city', params.city);
  setIf('name', params.name);
  setIf('checkIn', params.checkIn);
  setIf('checkOut', params.checkOut);
  setIf('guests', params.guests);
  setIf('minPrice', params.minPrice);
  setIf('maxPrice', params.maxPrice);
  setIf('minRating', params.minRating);
  setIf('stars', params.stars);
  setIf('sort', params.sort);
  setIf('page', params.page);
  setIf('pageSize', params.pageSize);

  params.facilityIds?.forEach((id) => search.append('facilityIds', id));

  const query = search.toString();
  return query ? `?${query}` : '';
}

function toNumber(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Parses a `useSearchParams()` result back into typed search filters. */
export function readSearchParams(params: URLSearchParams): HotelSearchParams {
  return {
    city: params.get('city') ?? undefined,
    name: params.get('name') ?? undefined,
    checkIn: params.get('checkIn') ?? undefined,
    checkOut: params.get('checkOut') ?? undefined,
    guests: toNumber(params.get('guests')),
    minPrice: toNumber(params.get('minPrice')),
    maxPrice: toNumber(params.get('maxPrice')),
    minRating: toNumber(params.get('minRating')),
    stars: toNumber(params.get('stars')),
    facilityIds: params.getAll('facilityIds').filter(Boolean),
    sort: params.get('sort') ?? undefined,
    page: toNumber(params.get('page')) ?? 1,
    pageSize: toNumber(params.get('pageSize')) ?? 12,
  };
}
