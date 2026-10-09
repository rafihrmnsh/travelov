import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '@/components/SearchBar';
import { HotelCard } from '@/components/HotelCard';
import { Alert, EmptyState, LoadingBlock, Pagination, Spinner, cn } from '@/components/ui';
import { CloseIcon, MapPinIcon, SearchIcon, StarIcon } from '@/components/icons';
import { hotelsApi } from '@/lib/queries';
import { readSearchParams, searchParamsToQuery } from '@/lib/searchParams';
import { SORT_OPTIONS } from '@/lib/status';
import { diffNights, formatIDR } from '@/lib/format';
import type { HotelSearchParams } from '@/types/api';

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readSearchParams(searchParams), [searchParams]);
  const [showFilters, setShowFilters] = useState(false);

  const query = useQuery({
    queryKey: ['hotels', 'search', filters],
    queryFn: () => hotelsApi.search(filters),
    placeholderData: keepPreviousData,
  });

  const facilities = useQuery({
    queryKey: ['facilities'],
    queryFn: () => hotelsApi.facilities(),
    staleTime: 10 * 60 * 1000,
  });

  const nights = filters.checkIn && filters.checkOut ? diffNights(filters.checkIn, filters.checkOut) : 0;
  const detailQuery = searchParamsToQuery({
    checkIn: filters.checkIn,
    checkOut: filters.checkOut,
    guests: filters.guests,
  });

  function patch(next: Partial<HotelSearchParams>, resetPage = true) {
    const merged = { ...filters, ...next, page: resetPage ? 1 : next.page ?? filters.page };
    setSearchParams(new URLSearchParams(searchParamsToQuery(merged).replace(/^\?/, '')), { replace: true });
  }

  const activeFilterCount = [
    filters.minPrice,
    filters.maxPrice,
    filters.minRating,
    filters.stars,
  ].filter((v) => v !== undefined).length + (filters.facilityIds?.length ?? 0);

  const totalCount = query.data?.totalCount ?? 0;
  const items = query.data?.items ?? [];

  return (
    <div className="bg-canvas">
      {/* Search bar */}
      <div className="border-b border-surface-border bg-white">
        <div className="container-page py-4">
          <SearchBar
            variant="inline"
            busy={query.isFetching}
            initial={{
              city: filters.city ?? '',
              checkIn: filters.checkIn,
              checkOut: filters.checkOut,
              guests: filters.guests,
            }}
            onSearch={(values) => patch(values)}
          />
        </div>
      </div>

      <div className="container-page py-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Filters */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <button
              type="button"
              className="btn-neutral mb-3 w-full lg:hidden"
              onClick={() => setShowFilters((v) => !v)}
            >
              Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>

            <div className={cn('card p-4', !showFilters && 'hidden lg:block')}>
              <div className="flex items-center justify-between">
                <h2 className="text-title-md text-ink">Filter</h2>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() =>
                      patch({ minPrice: undefined, maxPrice: undefined, minRating: undefined, stars: undefined, facilityIds: [] })
                    }
                  >
                    Reset
                  </button>
                )}
              </div>

              <PriceFilter
                minPrice={filters.minPrice}
                maxPrice={filters.maxPrice}
                onCommit={(min, max) => patch({ minPrice: min, maxPrice: max })}
              />

              <FilterGroup title="Bintang hotel">
                <div className="flex flex-wrap gap-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const active = filters.stars === star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => patch({ stars: active ? undefined : star })}
                        className={cn(
                          'inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-semibold transition',
                          active
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-surface-border bg-white text-muted hover:border-primary/40',
                        )}
                      >
                        {star}
                        <StarIcon filled className="h-3.5 w-3.5 text-tertiary" />
                      </button>
                    );
                  })}
                </div>
              </FilterGroup>

              <FilterGroup title="Rating tamu">
                <div className="flex flex-wrap gap-1.5">
                  {[9, 8, 7, 6].map((rating) => {
                    const value = rating / 2; // 9 -> 4.5
                    const active = filters.minRating === value;
                    return (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => patch({ minRating: active ? undefined : value })}
                        className={cn(
                          'rounded border px-2.5 py-1.5 text-xs font-semibold transition',
                          active
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-surface-border bg-white text-muted hover:border-primary/40',
                        )}
                      >
                        {value.toFixed(1)}+
                      </button>
                    );
                  })}
                </div>
              </FilterGroup>

              <FilterGroup title="Fasilitas">
                {facilities.isLoading ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <div className="space-y-2">
                    {facilities.data?.map((facility) => {
                      const checked = filters.facilityIds?.includes(facility.id) ?? false;
                      return (
                        <label key={facility.id} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-surface-border text-primary focus:ring-primary/30"
                            checked={checked}
                            onChange={() => {
                              const current = filters.facilityIds ?? [];
                              const next = checked
                                ? current.filter((id) => id !== facility.id)
                                : [...current, facility.id];
                              patch({ facilityIds: next });
                            }}
                          />
                          {facility.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </FilterGroup>
            </div>
          </aside>

          {/* Results */}
          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-headline-md text-ink">
                  {filters.city ? `Hotel di ${filters.city}` : filters.name ? `Hasil untuk “${filters.name}”` : 'Semua hotel'}
                </h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                  {query.isFetching && <Spinner className="h-3.5 w-3.5" />}
                  {query.data ? `${totalCount} hotel ditemukan` : 'Mencari…'}
                  {nights > 0 && ` · ${nights} malam`}
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted">Urutkan</span>
                <select
                  className="input py-2"
                  value={filters.sort ?? 'popular'}
                  onChange={(e) => patch({ sort: e.target.value })}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {filters.stars !== undefined && (
                  <Chip label={`${filters.stars} bintang`} onRemove={() => patch({ stars: undefined })} />
                )}
                {filters.minRating !== undefined && (
                  <Chip label={`Rating ${filters.minRating.toFixed(1)}+`} onRemove={() => patch({ minRating: undefined })} />
                )}
                {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
                  <Chip
                    label={`${filters.minPrice ? formatIDR(filters.minPrice) : 'Rp 0'} – ${
                      filters.maxPrice ? formatIDR(filters.maxPrice) : '∞'
                    }`}
                    onRemove={() => patch({ minPrice: undefined, maxPrice: undefined })}
                  />
                )}
                {filters.facilityIds?.map((id) => {
                  const name = facilities.data?.find((f) => f.id === id)?.name ?? 'Fasilitas';
                  return (
                    <Chip
                      key={id}
                      label={name}
                      onRemove={() => patch({ facilityIds: filters.facilityIds?.filter((x) => x !== id) })}
                    />
                  );
                })}
              </div>
            )}

            {query.isLoading && <LoadingBlock label="Mencari hotel…" />}

            {query.isError && (
              <Alert tone="danger" title="Pencarian gagal">
                {(query.error as Error).message}
              </Alert>
            )}

            {query.data && items.length === 0 && (
              <EmptyState
                icon={<SearchIcon className="h-10 w-10" />}
                title="Tidak ada hotel yang cocok"
                description="Coba ubah tanggal, naikkan rentang harga, atau kurangi filter fasilitas."
              />
            )}

            <div className={cn('grid gap-4', query.isFetching && 'opacity-60 transition')}>
              {items.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} nights={nights} searchQuery={detailQuery} />
              ))}
            </div>

            {query.data && query.data.totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  page={query.data.page}
                  totalPages={query.data.totalPages}
                  onChange={(page) => {
                    patch({ page }, false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )}

            {query.data && totalCount > 0 && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
                <MapPinIcon className="h-3.5 w-3.5" />
                Harga per malam dapat berubah mengikuti musim dan akhir pekan.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-surface-border pt-4">
      <h3 className="mb-2.5 text-label-sm uppercase text-muted">{title}</h3>
      {children}
    </div>
  );
}

function PriceFilter({
  minPrice,
  maxPrice,
  onCommit,
}: {
  minPrice?: number;
  maxPrice?: number;
  onCommit: (min?: number, max?: number) => void;
}) {
  const [min, setMin] = useState(minPrice ? String(minPrice) : '');
  const [max, setMax] = useState(maxPrice ? String(maxPrice) : '');

  useEffect(() => {
    setMin(minPrice ? String(minPrice) : '');
    setMax(maxPrice ? String(maxPrice) : '');
  }, [minPrice, maxPrice]);

  function commit() {
    const parsedMin = min ? Number(min) : undefined;
    const parsedMax = max ? Number(max) : undefined;
    if (parsedMin === minPrice && parsedMax === maxPrice) return;
    onCommit(parsedMin, parsedMax);
  }

  return (
    <FilterGroup title="Rentang harga per malam">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          placeholder="Min"
          className="input py-2 text-sm"
          value={min}
          min={0}
          onChange={(e) => setMin(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
        <span className="text-muted">–</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="Maks"
          className="input py-2 text-sm"
          value={max}
          min={0}
          onChange={(e) => setMax(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
      </div>
    </FilterGroup>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
      {label}
      <button type="button" onClick={onRemove} className="hover:opacity-70" aria-label={`Hapus filter ${label}`}>
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
