import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Field, LoadingBlock } from '@/components/ui';
import { BedIcon, CalendarIcon, CheckIcon, ClockIcon, MapPinIcon } from '@/components/icons';
import { hotelsApi, bookingsApi } from '@/lib/queries';
import { ApiError, getFieldErrors } from '@/lib/api';
import { useAuth } from '@/auth/AuthContext';
import { diffNights, formatDate, formatIDR, nightsLabel } from '@/lib/format';

/** Indonesian VAT (PPN) — mirrors BookingPricing.TaxRate on the backend. */
const TAX_RATE = 0.11;

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const hotelId = searchParams.get('hotelId') ?? '';
  const roomTypeId = searchParams.get('roomTypeId') ?? '';
  const checkIn = searchParams.get('checkIn') ?? '';
  const checkOut = searchParams.get('checkOut') ?? '';
  const initialGuests = Number(searchParams.get('guests') ?? '2');
  const initialRooms = Number(searchParams.get('rooms') ?? '1');

  const nights = diffNights(checkIn, checkOut);
  const paramsComplete = Boolean(hotelId && roomTypeId && nights > 0);

  const [rooms, setRooms] = useState(initialRooms);
  const [guests, setGuests] = useState(initialGuests);
  const [guestName, setGuestName] = useState(user?.name ?? '');
  const [guestEmail, setGuestEmail] = useState(user?.email ?? '');
  const [guestPhone, setGuestPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hotelQuery = useQuery({
    queryKey: ['hotel', hotelId, checkIn, checkOut, initialGuests],
    queryFn: () => hotelsApi.detail(hotelId, { checkIn, checkOut, guests: initialGuests }),
    enabled: paramsComplete,
  });

  if (!paramsComplete) {
    return (
      <div className="container-page py-10">
        <Alert tone="danger" title="Data pemesanan tidak lengkap">
          Silakan pilih hotel, tipe kamar, dan tanggal menginap terlebih dahulu.
        </Alert>
        <Link to="/search" className="btn-primary mt-4">
          Cari hotel
        </Link>
      </div>
    );
  }

  if (hotelQuery.isLoading) {
    return (
      <div className="container-page py-10">
        <LoadingBlock label="Menyiapkan ringkasan…" />
      </div>
    );
  }

  const hotel = hotelQuery.data;
  const roomType = hotel?.roomTypes.find((room) => room.id === roomTypeId);

  if (hotelQuery.isError || !hotel || !roomType) {
    return (
      <div className="container-page py-10">
        <Alert tone="danger" title="Kamar tidak ditemukan">
          {(hotelQuery.error as Error | null)?.message ?? 'Tipe kamar yang dipilih tidak lagi tersedia.'}
        </Alert>
        <Link to="/search" className="btn-primary mt-4">
          Cari hotel lain
        </Link>
      </div>
    );
  }

  const unavailableForDates = roomType.stayTotal === null;
  const maxRooms = Math.min(10, Math.max(1, roomType.availableUnits ?? 1));
  const maxGuests = Math.min(20, Math.max(1, rooms * roomType.capacity));
  const effectiveGuests = Math.min(guests, maxGuests);

  const stayTotalPerRoom = roomType.stayTotal ?? 0;
  const subtotal = stayTotalPerRoom * rooms;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;
  const nightlyAverage = nights > 0 ? stayTotalPerRoom / nights : 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const booking = await bookingsApi.create({
        hotelId,
        roomTypeId,
        checkIn,
        checkOut,
        rooms,
        guests: effectiveGuests,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
      });
      navigate(`/payments/${booking.id}`, { replace: true });
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      if (err instanceof ApiError && err.status === 409) {
        const date = err.details?.date?.[0];
        const available = err.details?.available?.[0];
        setError(
          date
            ? `${err.message} (${formatDate(date)} — sisa ${available ?? 0} kamar)`
            : err.message,
        );
      } else {
        setError(err instanceof Error ? err.message : 'Gagal membuat pesanan. Coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-canvas">
      <div className="container-page py-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted">
          <Link to={`/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${initialGuests}`} className="hover:text-primary">
            {hotel.name}
          </Link>
          <span>/</span>
          <span className="text-ink">Checkout</span>
        </nav>

        <h1 className="mt-3 text-headline-lg text-ink">Selesaikan pemesanan</h1>
        <p className="mt-1 text-sm text-muted">
          Periksa detail menginap, isi data tamu, lalu lanjutkan ke pembayaran.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            {/* Stay detail */}
            <section className="card p-5">
              <h2 className="text-headline-sm text-ink">Detail menginap</h2>

              <div className="mt-4 flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPinIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-title-md text-ink">{hotel.name}</p>
                  <p className="text-sm text-muted">{hotel.address}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg bg-surface-faint px-3 py-2.5 text-sm text-ink">
                <BedIcon className="h-4 w-4 text-primary" />
                {roomType.name} · kapasitas {roomType.capacity} tamu
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <SummaryTile icon={<CalendarIcon className="h-4 w-4" />} label="Check-in" value={formatDate(checkIn)} />
                <SummaryTile icon={<CalendarIcon className="h-4 w-4" />} label="Check-out" value={formatDate(checkOut)} />
                <SummaryTile icon={<ClockIcon className="h-4 w-4" />} label="Durasi" value={nightsLabel(nights)} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="rooms" className="label">
                    Jumlah kamar
                  </label>
                  <select
                    id="rooms"
                    className="input"
                    value={rooms}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setRooms(next);
                      setGuests((current) => Math.min(current, Math.min(20, Math.max(1, next * roomType.capacity))));
                    }}
                  >
                    {Array.from({ length: maxRooms }).map((_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1} kamar
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="guests" className="label">
                    Jumlah tamu
                  </label>
                  <select
                    id="guests"
                    className="input"
                    value={effectiveGuests}
                    onChange={(event) => setGuests(Number(event.target.value))}
                  >
                    {Array.from({ length: maxGuests }).map((_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1} tamu
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {unavailableForDates && (
                <div className="mt-4">
                  <Alert tone="warning" title="Kamar terbatas">
                    Kamar ini tidak tersedia untuk seluruh tanggal yang dipilih. Ubah tanggal menginap untuk
                    melanjutkan.
                  </Alert>
                </div>
              )}
            </section>

            {/* Guest form */}
            <form id="checkout-form" onSubmit={submit} className="card space-y-4 p-5">
              <div>
                <h2 className="text-headline-sm text-ink">Data tamu</h2>
                <p className="mt-0.5 text-sm text-muted">Kode booking akan dikirim ke email ini.</p>
              </div>

              <Field label="Nama lengkap" htmlFor="guestName" error={fieldErrors.guestName} required>
                <input
                  id="guestName"
                  className="input"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Nama sesuai identitas"
                  maxLength={120}
                  required
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" htmlFor="guestEmail" error={fieldErrors.guestEmail} required>
                  <input
                    id="guestEmail"
                    type="email"
                    className="input"
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    placeholder="nama@email.com"
                    maxLength={256}
                    required
                  />
                </Field>

                <Field label="Nomor telepon" htmlFor="guestPhone" error={fieldErrors.guestPhone} required>
                  <input
                    id="guestPhone"
                    type="tel"
                    className="input"
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                    placeholder="+62 812 3456 7890"
                    maxLength={30}
                    required
                  />
                </Field>
              </div>

              {error && <Alert tone="danger" title="Pemesanan gagal">{error}</Alert>}
            </form>
          </div>

          {/* Price summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-5">
              <h2 className="text-headline-sm text-ink">Ringkasan harga</h2>

              <dl className="mt-4 space-y-2.5 text-sm">
                <Row
                  label={`${formatIDR(stayTotalPerRoom)} × ${rooms} kamar`}
                  value={formatIDR(subtotal)}
                  hint={`${nightsLabel(nights)} · rata-rata ${formatIDR(nightlyAverage)}/malam`}
                />
                <Row label="Pajak & biaya (11%)" value={formatIDR(tax)} />
              </dl>

              <div className="mt-4 flex items-end justify-between border-t border-surface-border pt-4">
                <span className="text-title-md text-ink">Total</span>
                <span className="text-price text-primary">{formatIDR(total)}</span>
              </div>

              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <CheckIcon className="h-3.5 w-3.5 text-success" />
                Harga final, tanpa biaya tersembunyi.
              </p>

              <button
                type="submit"
                form="checkout-form"
                className="btn-primary mt-5 w-full"
                disabled={submitting || unavailableForDates}
              >
                {submitting ? 'Memproses…' : 'Lanjut ke pembayaran'}
              </button>

              <p className="mt-3 text-center text-xs text-muted">
                Stok kamar ditahan 15 menit sampai pembayaran berhasil.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <dt className="text-muted">{label}</dt>
        {hint && <p className="text-xs text-muted/80">{hint}</p>}
      </div>
      <dd className="shrink-0 font-semibold text-ink">{value}</dd>
    </div>
  );
}
