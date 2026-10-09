import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SmartImage } from '@/components/HotelCard';
import {
  Alert,
  EmptyState,
  HotelStars,
  LoadingBlock,
  Pagination,
  SectionHeading,
  StarRating,
  cn,
} from '@/components/ui';
import {
  ArrowRightIcon,
  BedIcon,
  CheckIcon,
  ClockIcon,
  FacilityIcon,
  MapPinIcon,
  UsersIcon,
} from '@/components/icons';
import { hotelsApi } from '@/lib/queries';
import { useAuth } from '@/auth/AuthContext';
import {
  addDays,
  diffNights,
  formatDate,
  formatIDR,
  formatRating,
  nightsLabel,
  parseDateOnly,
  todayISO,
} from '@/lib/format';

export function HotelDetailPage() {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { status } = useAuth();

  const checkIn = searchParams.get('checkIn') ?? '';
  const checkOut = searchParams.get('checkOut') ?? '';
  const guestsParam = searchParams.get('guests');
  const guests = guestsParam ? Number(guestsParam) : 2;

  const nights = diffNights(checkIn, checkOut);
  const hasDates = nights > 0;

  const [activePhoto, setActivePhoto] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);

  const detailQuery = useQuery({
    queryKey: ['hotel', id, checkIn, checkOut, guests],
    queryFn: () =>
      hotelsApi.detail(id, {
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
        guests,
      }),
    enabled: Boolean(id),
  });

  const reviewsQuery = useQuery({
    queryKey: ['hotel', id, 'reviews', reviewPage],
    queryFn: () => hotelsApi.reviews(id, reviewPage, 4),
    enabled: Boolean(id),
  });

  function updateDates(values: { checkIn: string; checkOut: string; guests: number }) {
    const next = new URLSearchParams(searchParams);
    next.set('checkIn', values.checkIn);
    next.set('checkOut', values.checkOut);
    next.set('guests', String(values.guests));
    setSearchParams(next, { replace: true });
  }

  function handleBook(roomTypeId: string) {
    if (status !== 'authenticated') {
      const redirect = `${location.pathname}${location.search}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    const query = new URLSearchParams({
      hotelId: id,
      roomTypeId,
      checkIn,
      checkOut,
      guests: String(guests),
      rooms: '1',
    });
    navigate(`/checkout?${query.toString()}`);
  }

  if (detailQuery.isLoading) {
    return (
      <div className="container-page py-10">
        <LoadingBlock label="Memuat hotel…" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="container-page py-10">
        <Alert tone="danger" title="Hotel tidak ditemukan">
          {(detailQuery.error as Error | null)?.message ?? 'Data hotel tidak tersedia.'}
        </Alert>
        <Link to="/search" className="btn-primary mt-4">
          Kembali ke pencarian
        </Link>
      </div>
    );
  }

  const hotel = detailQuery.data;
  const activePhotoUrl = hotel.photos[activePhoto]?.url;

  return (
    <div className="bg-canvas pb-16">
      {/* Header */}
      <div className="border-b border-surface-border bg-white">
        <div className="container-page py-4">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <Link to="/" className="hover:text-primary">
              Beranda
            </Link>
            <span>/</span>
            <Link to={`/search?city=${encodeURIComponent(hotel.city)}`} className="hover:text-primary">
              {hotel.city}
            </Link>
            <span>/</span>
            <span className="text-ink">{hotel.name}</span>
          </nav>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <HotelStars stars={hotel.starRating} />
                <span className="text-label-sm uppercase text-muted">{hotel.city}</span>
              </div>
              <h1 className="mt-1 text-headline-lg text-ink">{hotel.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <MapPinIcon className="h-4 w-4 shrink-0" />
                {hotel.address}
              </p>
            </div>

            {hotel.reviewCount > 0 && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2">
                <span className="text-headline-md font-extrabold text-success">{formatRating(hotel.averageRating)}</span>
                <div className="text-xs text-success">
                  <p className="font-semibold">Rating tamu</p>
                  <p>{hotel.reviewCount} ulasan</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container-page py-6">
        {/* Gallery */}
        <div className="grid gap-2 overflow-hidden md:grid-cols-[2fr_1fr]">
          <SmartImage
            src={activePhotoUrl}
            alt={hotel.name}
            className="h-64 md:h-96"
            rounded="rounded-xl"
          />
          <div className="grid grid-cols-3 gap-2 md:grid-cols-2">
            {hotel.photos.slice(0, 4).map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActivePhoto(index)}
                className={cn('overflow-hidden rounded-lg', index === activePhoto && 'ring-2 ring-primary')}
                aria-label={`Foto ${index + 1} dari ${hotel.name}`}
              >
                <SmartImage src={photo.url} alt={`${hotel.name} ${index + 1}`} className="h-20 w-full md:h-[7.5rem]" />
              </button>
            ))}
          </div>
        </div>

        {/* Date selector */}
        <section className="card mt-6 p-4 sm:p-5">
          <DateForm checkIn={checkIn} checkOut={checkOut} guests={guests} onUpdate={updateDates} />
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <ClockIcon className="h-3.5 w-3.5" />
            Check-in mulai 14.00 · Check-out sebelum 12.00
          </p>
        </section>

        {/* Room types */}
        <section className="mt-8">
          <SectionHeading
            title="Pilih tipe kamar"
            subtitle={hasDates ? `${nightsLabel(nights)} · ${guests} tamu` : 'Pilih tanggal menginap untuk melihat ketersediaan.'}
          />

          {!hasDates && (
            <Alert tone="info" title="Tanggal belum dipilih">
              Tentukan tanggal check-in dan check-out di atas agar kami bisa menampilkan kamar yang tersedia dan harga
              pastinya.
            </Alert>
          )}

          <div className="mt-4 space-y-3">
            {hotel.roomTypes.map((room) => {
              const soldOut = room.availableUnits === 0;
              return (
                <article key={room.id} className="card p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-headline-sm text-ink">{room.name}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <UsersIcon className="h-4 w-4" /> Kapasitas {room.capacity} tamu
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BedIcon className="h-4 w-4" /> 1 kamar
                        </span>
                        {hasDates && room.availableUnits !== null && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 font-semibold',
                              soldOut ? 'text-danger' : 'text-success',
                            )}
                          >
                            <CheckIcon className="h-4 w-4" />
                            {soldOut ? 'Stok habis' : `Sisa ${room.availableUnits} kamar`}
                          </span>
                        )}
                      </div>
                      {hasDates && room.stayTotal !== null && (
                        <p className="mt-2 text-xs text-muted">
                          Rata-rata {formatIDR(room.stayTotal / nights)} / malam untuk {nightsLabel(nights)}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-price text-primary">{formatIDR(room.basePrice)}</p>
                      <p className="text-xs text-muted">per malam</p>
                      {hasDates && room.stayTotal !== null && (
                        <p className="mt-0.5 text-xs font-semibold text-ink">
                          {formatIDR(room.stayTotal)} / kamar
                        </p>
                      )}
                      <button
                        type="button"
                        className="btn-primary btn-sm mt-2"
                        disabled={!hasDates || soldOut}
                        onClick={() => handleBook(room.id)}
                      >
                        Pesan
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {hotel.roomTypes.length === 0 && (
              <EmptyState
                title="Belum ada tipe kamar"
                description="Hotel ini belum menambahkan kamar yang bisa dipesan."
              />
            )}
          </div>
        </section>

        {/* Facilities */}
        <section className="mt-10">
          <SectionHeading title="Fasilitas" />
          {hotel.facilities.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {hotel.facilities.map((facility) => (
                <div
                  key={facility.id}
                  className="flex items-center gap-2.5 rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-ink"
                >
                  <FacilityIcon icon={facility.icon} className="h-5 w-5 text-primary" />
                  {facility.name}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Fasilitas belum dicantumkan.</p>
          )}
        </section>

        {/* Description */}
        <section className="mt-10">
          <SectionHeading title="Tentang hotel ini" />
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{hotel.description}</p>
        </section>

        {/* Reviews */}
        <section className="mt-10">
          <SectionHeading
            title="Ulasan tamu"
            subtitle={hotel.reviewCount > 0 ? `${hotel.reviewCount} ulasan` : 'Belum ada ulasan'}
          />

          {reviewsQuery.isLoading && <LoadingBlock label="Memuat ulasan…" />}

          {reviewsQuery.isError && (
            <Alert tone="danger" title="Gagal memuat ulasan">
              {(reviewsQuery.error as Error).message}
            </Alert>
          )}

          {reviewsQuery.data && reviewsQuery.data.items.length === 0 && (
            <EmptyState
              title="Belum ada ulasan"
              description="Ulasan muncul di sini setelah tamu menyelesaikan masa inap."
            />
          )}

          <div className="space-y-3">
            {reviewsQuery.data?.items.map((review) => (
              <article key={review.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {review.reviewerName.trim().charAt(0).toUpperCase() || 'T'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{review.reviewerName}</p>
                      <p className="text-xs text-muted">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  <StarRating value={review.rating} showValue={false} size="sm" />
                </div>
                {review.comment && <p className="mt-3 text-sm text-muted">{review.comment}</p>}
              </article>
            ))}
          </div>

          {reviewsQuery.data && reviewsQuery.data.totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                page={reviewsQuery.data.page}
                totalPages={reviewsQuery.data.totalPages}
                onChange={(page) => {
                  setReviewPage(page);
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DateForm({
  checkIn,
  checkOut,
  guests,
  onUpdate,
}: {
  checkIn: string;
  checkOut: string;
  guests: number;
  onUpdate: (values: { checkIn: string; checkOut: string; guests: number }) => void;
}) {
  const [localIn, setLocalIn] = useState(checkIn);
  const [localOut, setLocalOut] = useState(checkOut);
  const [localGuests, setLocalGuests] = useState(guests);

  const minOut = localIn ? toInputValue(addDays(parseDateOnly(localIn), 1)) : toInputValue(addDays(new Date(), 1));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!localIn || !localOut || diffNights(localIn, localOut) < 1) return;
    onUpdate({ checkIn: localIn, checkOut: localOut, guests: localGuests });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_0.8fr_auto] sm:items-end">
      <div>
        <label htmlFor="detail-checkin" className="label">
          Check-in
        </label>
        <input
          id="detail-checkin"
          type="date"
          className="input"
          value={localIn}
          min={todayISO()}
          onChange={(event) => {
            const value = event.target.value;
            setLocalIn(value);
            if (diffNights(value, localOut) < 1) {
              setLocalOut(toInputValue(addDays(parseDateOnly(value), 1)));
            }
          }}
          required
        />
      </div>
      <div>
        <label htmlFor="detail-checkout" className="label">
          Check-out
        </label>
        <input
          id="detail-checkout"
          type="date"
          className="input"
          value={localOut}
          min={minOut}
          onChange={(event) => setLocalOut(event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="detail-guests" className="label">
          Tamu
        </label>
        <select
          id="detail-guests"
          className="input"
          value={localGuests}
          onChange={(event) => setLocalGuests(Number(event.target.value))}
        >
          {Array.from({ length: 10 }).map((_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1} tamu
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-primary">
        Perbarui
      </button>
    </form>
  );
}

function toInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
