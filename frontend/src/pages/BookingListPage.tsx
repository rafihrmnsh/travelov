import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, EmptyState, LoadingBlock, Pagination, StatusChip } from '@/components/ui';
import { ArrowRightIcon, CalendarIcon, ClockIcon, MapPinIcon, TicketIcon, WalletIcon } from '@/components/icons';
import { bookingsApi } from '@/lib/queries';
import { bookingStatusMeta } from '@/lib/status';
import { formatDate, formatDateTime, formatIDR, nightsLabel } from '@/lib/format';

export function BookingListPage() {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['bookings', page],
    queryFn: () => bookingsApi.mine(page, 8),
    placeholderData: (previous) => previous,
  });

  const items = query.data?.items ?? [];

  return (
    <div className="bg-canvas">
      <div className="container-page py-8">
        <div className="mb-6">
          <h1 className="text-headline-lg text-ink">Pesanan saya</h1>
          <p className="mt-1 text-sm text-muted">Pantau status, lanjutkan pembayaran, atau beri ulasan.</p>
        </div>

        {query.isLoading && <LoadingBlock label="Memuat pesanan…" />}

        {query.isError && (
          <Alert tone="danger" title="Gagal memuat pesanan">
            {(query.error as Error).message}
          </Alert>
        )}

        {query.data && items.length === 0 && (
          <EmptyState
            icon={<TicketIcon className="h-10 w-10" />}
            title="Belum ada pesanan"
            description="Setelah kamu memesan hotel, pesanannya akan muncul di sini."
            action={
              <Link to="/search" className="btn-primary">
                Cari hotel
              </Link>
            }
          />
        )}

        <div className="space-y-4">
          {items.map((booking) => {
            const meta = bookingStatusMeta(booking.status);
            return (
              <article key={booking.id} className="card overflow-hidden">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip status={booking.status} />
                      <span className="text-xs text-muted">Kode: {booking.code}</span>
                    </div>
                    <h2 className="mt-2 text-headline-sm text-ink">{booking.hotelName}</h2>
                    <p className="text-sm text-muted">{booking.roomTypeName}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPinIcon className="h-4 w-4" /> {booking.city}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4" />
                        {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <ClockIcon className="h-4 w-4" /> {nightsLabel(booking.nights)} · {booking.rooms} kamar
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted">{meta.description}</p>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    <p className="text-xs text-muted">Total</p>
                    <p className="text-price text-primary">{formatIDR(booking.totalPrice)}</p>
                    <p className="mt-1 text-xs text-muted">Dipesan {formatDateTime(booking.createdAt)}</p>

                    <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
                      {booking.status === 'PendingPayment' && (
                        <Link to={`/payments/${booking.id}`} className="btn-secondary btn-sm">
                          <WalletIcon className="h-3.5 w-3.5" /> Bayar
                        </Link>
                      )}
                      <Link to={`/bookings/${booking.id}`} className="btn-neutral btn-sm">
                        Detail
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {query.data && query.data.totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              page={query.data.page}
              totalPages={query.data.totalPages}
              onChange={(next) => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
