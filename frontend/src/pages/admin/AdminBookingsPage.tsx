import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, EmptyState, LoadingBlock, Pagination, StatusChip } from '@/components/ui';
import { TicketIcon } from '@/components/icons';
import { adminApi } from '@/lib/queries';
import { BOOKING_STATUS_OPTIONS, paymentStatusLabel } from '@/lib/status';
import { formatDate, formatDateTime, formatIDR } from '@/lib/format';

export function AdminBookingsPage() {
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['admin', 'bookings', { status, from, to, page }],
    queryFn: () =>
      adminApi.bookings({
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: 15,
      }),
    placeholderData: (previous) => previous,
  });

  const items = query.data?.items ?? [];

  function patchFilter(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-headline-md text-ink">Pesanan</h2>
          <p className="mt-0.5 text-sm text-muted">Semua pesanan dari seluruh hotel.</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="filter-status" className="label">
              Status
            </label>
            <select
              id="filter-status"
              className="input py-2"
              value={status}
              onChange={(event) => patchFilter(setStatus)(event.target.value)}
            >
              <option value="">Semua status</option>
              {BOOKING_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-from" className="label">
              Dari
            </label>
            <input
              id="filter-from"
              type="date"
              className="input py-2"
              value={from}
              onChange={(event) => patchFilter(setFrom)(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="filter-to" className="label">
              Sampai
            </label>
            <input
              id="filter-to"
              type="date"
              className="input py-2"
              value={to}
              onChange={(event) => patchFilter(setTo)(event.target.value)}
            />
          </div>
          {(status || from || to) && (
            <button
              type="button"
              className="btn-neutral py-2.5"
              onClick={() => {
                setStatus('');
                setFrom('');
                setTo('');
                setPage(1);
              }}
            >
              Reset
            </button>
          )}
        </div>
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
          title="Tidak ada pesanan"
          description="Belum ada pesanan yang cocok dengan filter ini."
        />
      )}

      {items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-surface-border bg-surface-faint text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Kode</th>
                  <th className="px-4 py-3 font-semibold">Hotel / Kamar</th>
                  <th className="px-4 py-3 font-semibold">Tamu</th>
                  <th className="px-4 py-3 font-semibold">Menginap</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Dibayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {items.map((booking) => (
                  <tr key={booking.id} className="hover:bg-surface-faint">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{booking.code}</p>
                      <p className="text-xs text-muted">{formatDateTime(booking.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{booking.hotelName}</p>
                      <p className="text-xs text-muted">
                        {booking.roomTypeName} · {booking.rooms} kamar
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink">{booking.guestName}</p>
                      <p className="text-xs text-muted">{booking.guestEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">{formatIDR(booking.totalPrice)}</td>
                    <td className="px-4 py-3">
                      <StatusChip status={booking.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">{paymentStatusLabel(booking.paymentStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {query.data && query.data.totalPages > 1 && (
        <Pagination page={query.data.page} totalPages={query.data.totalPages} onChange={setPage} />
      )}
    </div>
  );
}
