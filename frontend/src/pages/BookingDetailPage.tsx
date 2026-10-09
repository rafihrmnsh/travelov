import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, LoadingBlock, Modal, SectionHeading, StatusChip, cn } from '@/components/ui';
import {
  BedIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  StarIcon,
  TicketIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/icons';
import { bookingsApi, reviewsApi } from '@/lib/queries';
import { bookingStatusMeta, paymentStatusLabel } from '@/lib/status';
import { formatDate, formatDateTime, formatIDR, nightsLabel } from '@/lib/format';

export function BookingDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewDone, setReviewDone] = useState(false);

  const query = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.byId(id),
    enabled: Boolean(id),
  });

  const booking = query.data;
  const meta = booking ? bookingStatusMeta(booking.status) : null;

  async function confirmCancel() {
    if (!booking) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await bookingsApi.cancel(booking.id, cancelReason.trim() || undefined);
      setCancelOpen(false);
      setCancelReason('');
      await queryClient.invalidateQueries({ queryKey: ['booking', id] });
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Gagal membatalkan pesanan.');
    } finally {
      setCancelling(false);
    }
  }

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    if (!booking) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await reviewsApi.create({
        bookingId: booking.id,
        rating,
        comment: comment.trim() || undefined,
      });
      setReviewDone(true);
      await queryClient.invalidateQueries({ queryKey: ['booking', id] });
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Gagal mengirim ulasan.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="container-page py-10">
        <LoadingBlock label="Memuat pesanan…" />
      </div>
    );
  }

  if (query.isError || !booking || !meta) {
    return (
      <div className="container-page py-10">
        <Alert tone="danger" title="Pesanan tidak ditemukan">
          {(query.error as Error | null)?.message ?? 'Pesanan tidak tersedia.'}
        </Alert>
        <Link to="/bookings" className="btn-primary mt-4">
          Kembali ke pesanan saya
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-canvas">
      <div className="container-page py-8">
        <Link to="/bookings" className="text-sm text-muted hover:text-primary">
          ← Kembali ke pesanan saya
        </Link>

        {/* Header */}
        <div className="card mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-surface-faint px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TicketIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted">Kode booking</p>
                <p className="text-headline-sm font-extrabold tracking-wide text-ink">{booking.code}</p>
              </div>
            </div>
            <StatusChip status={booking.status} />
          </div>

          <div className="px-5 py-5">
            <h1 className="text-headline-md text-ink">{booking.hotelName}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <MapPinIcon className="h-4 w-4" />
              {booking.city} · {booking.roomTypeName}
            </p>
            <p className="mt-2 text-sm text-muted">{meta.description}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <DetailItem icon={<CalendarIcon className="h-4 w-4" />} label="Check-in" value={formatDate(booking.checkIn)} />
              <DetailItem icon={<CalendarIcon className="h-4 w-4" />} label="Check-out" value={formatDate(booking.checkOut)} />
              <DetailItem icon={<ClockIcon className="h-4 w-4" />} label="Durasi" value={nightsLabel(booking.nights)} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            {/* Stay & guest */}
            <section className="card p-5">
              <SectionHeading title="Detail menginap" />
              <dl className="space-y-3 text-sm">
                <InfoRow icon={<BedIcon className="h-4 w-4" />} label="Kamar" value={`${booking.roomTypeName} · ${booking.rooms} kamar`} />
                <InfoRow icon={<UsersIcon className="h-4 w-4" />} label="Tamu" value={`${booking.guests} orang`} />
                <InfoRow label="Nama tamu" value={booking.guestName} />
                <InfoRow label="Email" value={booking.guestEmail} />
                <InfoRow label="Telepon" value={booking.guestPhone} />
              </dl>
            </section>

            {/* Price */}
            <section className="card p-5">
              <SectionHeading title="Rincian harga" />
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-semibold text-ink">{formatIDR(booking.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Pajak & biaya</dt>
                  <dd className="font-semibold text-ink">{formatIDR(booking.taxAmount)}</dd>
                </div>
                <div className="flex justify-between border-t border-surface-border pt-2.5">
                  <dt className="text-title-md text-ink">Total</dt>
                  <dd className="text-price text-primary">{formatIDR(booking.totalPrice)}</dd>
                </div>
              </dl>
            </section>

            {/* Review */}
            {booking.canReview && !reviewDone && (
              <section className="card p-5">
                <SectionHeading title="Beri ulasan" subtitle="Bagikan pengalaman menginapmu." />
                <form onSubmit={submitReview} className="space-y-4">
                  <div>
                    <span className="label">Rating</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          className="p-0.5 text-tertiary transition hover:scale-110"
                          aria-label={`${value} bintang`}
                        >
                          <StarIcon filled={value <= rating} className="h-7 w-7" />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-semibold text-ink">{rating}/5</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="review-comment" className="label">
                      Komentar (opsional)
                    </label>
                    <textarea
                      id="review-comment"
                      className="input min-h-24 resize-y"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Bagaimana kamar, layanan, dan lokasinya?"
                      maxLength={1000}
                    />
                  </div>

                  {reviewError && <Alert tone="danger">{reviewError}</Alert>}

                  <button type="submit" className="btn-primary" disabled={reviewSubmitting}>
                    {reviewSubmitting ? 'Mengirim…' : 'Kirim ulasan'}
                  </button>
                </form>
              </section>
            )}

            {reviewDone && (
              <Alert tone="success" title="Terima kasih!">
                Ulasanmu sudah terkirim dan akan tampil di halaman hotel.
              </Alert>
            )}

            {booking.status === 'Completed' && !booking.canReview && !reviewDone && (
              <Alert tone="neutral" title="Ulasan sudah dikirim">
                Kamu sudah memberi ulasan untuk pesanan ini. Satu ulasan per pesanan.
              </Alert>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Actions */}
            <section className="card p-5">
              <h2 className="text-title-md text-ink">Tindakan</h2>

              <div className="mt-3 space-y-2.5">
                {booking.status === 'PendingPayment' && (
                  <Link to={`/payments/${booking.id}`} className="btn-primary w-full">
                    <WalletIcon className="h-4 w-4" /> Selesaikan pembayaran
                  </Link>
                )}

                {booking.canBeCancelled ? (
                  <button type="button" className="btn-danger w-full" onClick={() => setCancelOpen(true)}>
                    Batalkan pesanan
                  </button>
                ) : (
                  <p className="text-xs text-muted">
                    Pesanan ini tidak dapat dibatalkan lagi.
                  </p>
                )}

                <Link to={`/hotels/${booking.hotelId}`} className="btn-neutral w-full">
                  Lihat hotel
                </Link>
              </div>

              {booking.cancellationReason && (
                <div className="mt-4">
                  <Alert tone="neutral" title="Alasan pembatalan">
                    {booking.cancellationReason}
                  </Alert>
                </div>
              )}
            </section>

            {/* Payment */}
            <section className="card p-5">
              <h2 className="text-title-md text-ink">Pembayaran</h2>
              {booking.payment ? (
                <dl className="mt-3 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Status</dt>
                    <dd className="font-semibold text-ink">{paymentStatusLabel(booking.payment.status)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Metode</dt>
                    <dd className="font-semibold text-ink">Sandbox</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Referensi</dt>
                    <dd className="truncate font-mono text-xs text-ink">{booking.payment.reference}</dd>
                  </div>
                  {booking.payment.paidAt && (
                    <div className="flex justify-between">
                      <dt className="text-muted">Dibayar</dt>
                      <dd className="font-semibold text-ink">{formatDateTime(booking.payment.paidAt)}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-muted">Belum ada pembayaran untuk pesanan ini.</p>
              )}
            </section>

            {/* Timeline */}
            <section className="card p-5">
              <h2 className="text-title-md text-ink">Riwayat</h2>
              <ol className="mt-3 space-y-3 text-sm">
                <TimelineItem label="Dibuat" value={formatDateTime(booking.createdAt)} />
                <TimelineItem label="Batas bayar" value={formatDateTime(booking.paymentDeadline)} />
                {booking.confirmedAt && <TimelineItem label="Dikonfirmasi" value={formatDateTime(booking.confirmedAt)} />}
              </ol>

              {booking.status === 'Confirmed' && (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-success">
                  <CheckCircleIcon className="h-4 w-4" />
                  E-tiket siap. Tunjukkan kode booking saat check-in.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* Cancel modal */}
      <Modal
        open={cancelOpen}
        onClose={() => !cancelling && setCancelOpen(false)}
        title="Batalkan pesanan?"
        footer={
          <>
            <button type="button" className="btn-neutral" disabled={cancelling} onClick={() => setCancelOpen(false)}>
              Batal
            </button>
            <button type="button" className="btn-danger" disabled={cancelling} onClick={confirmCancel}>
              {cancelling ? 'Membatalkan…' : 'Ya, batalkan'}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Stok kamar akan dikembalikan dan pesanan <strong>{booking.code}</strong> tidak bisa dipulihkan.
        </p>

        <div className="mt-4">
          <label htmlFor="cancel-reason" className="label">
            Alasan (opsional)
          </label>
          <textarea
            id="cancel-reason"
            className="input min-h-20 resize-y"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Misal: rencana berubah"
            maxLength={300}
          />
        </div>

        {cancelError && (
          <div className="mt-4">
            <Alert tone="danger">{cancelError}</Alert>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-1.5 text-muted">
        {icon && <span className="text-primary">{icon}</span>}
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary')} />
      <div>
        <p className="font-semibold text-ink">{label}</p>
        <p className="text-xs text-muted">{value}</p>
      </div>
    </li>
  );
}
