import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, LoadingBlock, StatusChip } from '@/components/ui';
import { ArrowRightIcon, CheckCircleIcon, ClockIcon, WalletIcon } from '@/components/icons';
import { bookingsApi, paymentsApi } from '@/lib/queries';
import { formatCountdown, formatDate, formatDateTime, formatIDR, nightsLabel } from '@/lib/format';
import type { PaymentResult } from '@/types/api';

export function PaymentPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const [result, setResult] = useState<PaymentResult | null>(null);
  const [processing, setProcessing] = useState<'success' | 'fail' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bookingQuery = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.byId(id),
    enabled: Boolean(id),
    refetchInterval: 20000,
  });

  const booking = bookingQuery.data;
  const isPending = booking?.status === 'PendingPayment';
  const remaining = useCountdown(isPending ? booking?.paymentDeadline : undefined);

  async function pay(success: boolean) {
    if (!booking) return;
    setError(null);
    setProcessing(success ? 'success' : 'fail');
    try {
      const response = await paymentsApi.simulate({ bookingCode: booking.code, success });
      setResult(response);
      await queryClient.invalidateQueries({ queryKey: ['booking', id] });
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pembayaran gagal diproses.');
    } finally {
      setProcessing(null);
    }
  }

  if (bookingQuery.isLoading) {
    return (
      <div className="container-page py-10">
        <LoadingBlock label="Memuat pembayaran…" />
      </div>
    );
  }

  if (bookingQuery.isError || !booking) {
    return (
      <div className="container-page py-10">
        <Alert tone="danger" title="Pesanan tidak ditemukan">
          {(bookingQuery.error as Error | null)?.message ?? 'Pesanan tidak tersedia.'}
        </Alert>
        <Link to="/bookings" className="btn-primary mt-4">
          Lihat pesanan saya
        </Link>
      </div>
    );
  }

  const settled = !isPending || (result?.alreadyProcessed ?? false);
  const paid = booking.status === 'Confirmed' || booking.status === 'Completed';

  return (
    <div className="bg-canvas">
      <div className="container-page py-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className="text-label-sm uppercase text-primary">Pembayaran sandbox</p>
            <h1 className="mt-1 text-headline-lg text-ink">Selesaikan pembayaran</h1>
            <p className="mt-1 text-sm text-muted">
              Ini lingkungan demo. Tidak ada uang sungguhan yang diproses.
            </p>
          </div>

          <div className="card mt-6 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-surface-border bg-surface-faint px-5 py-4">
              <div>
                <p className="text-xs text-muted">Kode booking</p>
                <p className="text-headline-sm font-extrabold tracking-wide text-ink">{booking.code}</p>
              </div>
              <StatusChip status={booking.status} />
            </div>

            <div className="px-5 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <WalletIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-title-md text-ink">{booking.hotelName}</p>
                  <p className="text-sm text-muted">{booking.roomTypeName}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} · {nightsLabel(booking.nights)} ·{' '}
                    {booking.rooms} kamar
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between border-t border-surface-border pt-4">
                <span className="text-sm text-muted">Total tagihan</span>
                <span className="text-price text-primary">{formatIDR(booking.totalPrice)}</span>
              </div>

              {/* Countdown */}
              {isPending && !settled && (
                <div
                  className={`mt-5 flex items-center gap-3 rounded-lg px-4 py-3 ${
                    remaining > 0 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                  }`}
                >
                  <ClockIcon className="h-5 w-5 shrink-0" />
                  <div className="text-sm">
                    {remaining > 0 ? (
                      <>
                        <p className="font-semibold">Selesaikan dalam {formatCountdown(remaining)}</p>
                        <p className="text-xs opacity-90">
                          Sebelum {formatDateTime(booking.paymentDeadline)}. Stok kamar ditahan sementara.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold">Batas waktu pembayaran terlewat</p>
                        <p className="text-xs opacity-90">
                          Pesanan akan otomatis kedaluwarsa dan stok dikembalikan.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Result */}
              {(result || settled) && (
                <div className="mt-5">
                  {paid ? (
                    <Alert tone="success" title="Pembayaran berhasil">
                      Pesanan <strong>{booking.code}</strong> sudah terkonfirmasi. E-tiket dapat dilihat pada detail
                      pesanan.
                    </Alert>
                  ) : booking.status === 'Expired' ? (
                    <Alert tone="neutral" title="Pesanan kedaluwarsa">
                      Batas waktu pembayaran terlewat. Stok kamar sudah dikembalikan.
                    </Alert>
                  ) : booking.status === 'Cancelled' ? (
                    <Alert tone="danger" title="Pesanan dibatalkan">
                      Pesanan ini telah dibatalkan.
                    </Alert>
                  ) : (
                    result?.message && <Alert tone="warning" title="Pembayaran gagal">{result.message}</Alert>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-5">
                  <Alert tone="danger" title="Gagal memproses pembayaran">
                    {error}
                  </Alert>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 space-y-2.5">
                {isPending && !settled && (
                  <>
                    <button
                      type="button"
                      className="btn-primary w-full"
                      disabled={processing !== null || remaining <= 0}
                      onClick={() => pay(true)}
                    >
                      <WalletIcon className="h-4 w-4" />
                      {processing === 'success' ? 'Memproses…' : 'Bayar sekarang'}
                    </button>
                    <button
                      type="button"
                      className="btn-danger w-full"
                      disabled={processing !== null}
                      onClick={() => pay(false)}
                    >
                      {processing === 'fail' ? 'Memproses…' : 'Simulasikan pembayaran gagal'}
                    </button>
                  </>
                )}

                {settled && (
                  <Link to={`/bookings/${booking.id}`} className="btn-primary w-full">
                    <CheckCircleIcon className="h-4 w-4" />
                    Lihat detail pesanan
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted">
            Halaman ini meniru callback payment gateway. Bisa dibuka lagi dari riwayat pesanan.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Ticks once per second while `target` is set; returns remaining milliseconds. */
function useCountdown(target: string | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (!target) return 0;
  return new Date(target).getTime() - now;
}
