import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { SearchBar, type SearchValues } from '@/components/SearchBar';
import { HotelCard } from '@/components/HotelCard';
import { Alert, EmptyState, SectionHeading } from '@/components/ui';
import { ArrowRightIcon, CheckIcon, ClockIcon, MapPinIcon, WalletIcon } from '@/components/icons';
import { hotelsApi } from '@/lib/queries';
import { searchParamsToQuery } from '@/lib/searchParams';

const DESTINATIONS = [
  { city: 'Jakarta', blurb: 'Pusat bisnis & kuliner', gradient: 'from-primary to-primary-light' },
  { city: 'Bali', blurb: 'Pantai & sawah Ubud', gradient: 'from-secondary to-tertiary' },
  { city: 'Bandung', blurb: 'Udara sejuk pegunungan', gradient: 'from-primary-dark to-secondary' },
  { city: 'Yogyakarta', blurb: 'Budaya & Malioboro', gradient: 'from-tertiary to-secondary' },
];

const TRUST = [
  { icon: WalletIcon, title: 'Harga transparan', text: 'Pajak dan total tampil sebelum bayar.' },
  { icon: ClockIcon, title: 'Konfirmasi instan', text: 'E-tiket terbit begitu pembayaran berhasil.' },
  { icon: CheckIcon, title: 'Tanpa double booking', text: 'Stok terkunci per tanggal, aman.' },
];

export function HomePage() {
  const navigate = useNavigate();

  const featured = useQuery({
    queryKey: ['hotels', 'featured'],
    queryFn: () => hotelsApi.search({ sort: 'popular', page: 1, pageSize: 6 }),
  });

  function handleSearch(values: SearchValues) {
    navigate(`/search${searchParamsToQuery(values)}`);
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark pb-20 pt-14 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 25%, rgba(243,156,18,0.5), transparent 45%), radial-gradient(circle at 85% 10%, rgba(226,88,62,0.6), transparent 50%)',
          }}
        />
        <div className="container-page relative">
          <p className="text-label-sm uppercase text-white/80">Mau ke mana hari ini?</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Jelajahi Keindahan Nusantara
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/85">
            Cari dan pesan hotel di seluruh Indonesia. Ketersediaan kamar real-time, tanpa biaya tersembunyi.
          </p>

          <div className="mt-8">
            <SearchBar variant="hero" onSearch={handleSearch} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/70">Populer:</span>
            {DESTINATIONS.map((d) => (
              <button
                key={d.city}
                type="button"
                onClick={() => navigate(`/search${searchParamsToQuery({ city: d.city })}`)}
                className="rounded-full bg-white/15 px-3 py-1 font-semibold text-white backdrop-blur transition hover:bg-white/25"
              >
                {d.city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations */}
      <section className="container-page -mt-10 relative z-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.city}
              to={`/search${searchParamsToQuery({ city: d.city })}`}
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${d.gradient} p-5 text-white shadow-float`}
            >
              <MapPinIcon className="h-6 w-6 opacity-80" />
              <p className="mt-8 text-headline-sm font-bold">{d.city}</p>
              <p className="text-xs text-white/80">{d.blurb}</p>
              <ArrowRightIcon className="absolute right-4 top-5 h-5 w-5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="container-page mt-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-lg border border-surface-border bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-title-md text-ink">{title}</p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured hotels */}
      <section className="container-page mt-14">
        <SectionHeading
          title="Hotel pilihan"
          subtitle="Paling banyak dipesan tamu Travelov minggu ini."
          action={
            <Link to="/search" className="btn-ghost btn-sm">
              Lihat semua
            </Link>
          }
        />

        {featured.isLoading && (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-56 skeleton" />
            ))}
          </div>
        )}

        {featured.isError && (
          <Alert tone="danger" title="Gagal memuat hotel">
            {(featured.error as Error).message}
          </Alert>
        )}

        {featured.data && featured.data.items.length === 0 && (
          <EmptyState
            title="Belum ada hotel"
            description="Data hotel akan muncul di sini setelah admin menambahkan katalog."
          />
        )}

        {featured.data && featured.data.items.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {featured.data.items.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
