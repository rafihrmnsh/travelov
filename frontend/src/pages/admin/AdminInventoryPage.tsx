import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, EmptyState, LoadingBlock } from '@/components/ui';
import { BedIcon } from '@/components/icons';
import { adminApi } from '@/lib/queries';
import { daysFromNowISO, formatDate, formatIDR, todayISO } from '@/lib/format';

export function AdminInventoryPage() {
  const queryClient = useQueryClient();

  const [hotelId, setHotelId] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(daysFromNowISO(21));

  const [applyUnits, setApplyUnits] = useState('10');
  const [applyPrice, setApplyPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hotelsQuery = useQuery({
    queryKey: ['admin', 'hotels', 'all'],
    queryFn: () => adminApi.hotels({ pageSize: 100 }),
  });

  const roomTypesQuery = useQuery({
    queryKey: ['admin', 'room-types', hotelId],
    queryFn: () => adminApi.roomTypes(hotelId),
    enabled: Boolean(hotelId),
  });

  const inventoryQuery = useQuery({
    queryKey: ['admin', 'inventory', roomTypeId, from, to],
    queryFn: () => adminApi.inventory(roomTypeId, from, to),
    enabled: Boolean(roomTypeId),
  });

  // Keep a valid room type selected whenever the hotel or its rooms change.
  useEffect(() => {
    const rooms = roomTypesQuery.data;
    if (!hotelId || !rooms || rooms.length === 0) {
      setRoomTypeId('');
      return;
    }
    setRoomTypeId((current) => (rooms.some((room) => room.id === current) ? current : rooms[0].id));
  }, [hotelId, roomTypesQuery.data]);

  // Prefill the bulk price from the first day so admins have a sensible default.
  useEffect(() => {
    const firstDay = inventoryQuery.data?.[0];
    if (firstDay && !applyPrice) setApplyPrice(String(Math.round(firstDay.price)));
  }, [inventoryQuery.data, applyPrice]);

  async function applyUpdate(event: FormEvent) {
    event.preventDefault();
    if (!roomTypeId) return;

    const units = Number(applyUnits);
    const price = Number(applyPrice);
    if (!Number.isFinite(units) || units < 0) {
      setError('Jumlah unit harus 0 atau lebih.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Harga harus lebih dari 0.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await adminApi.updateInventory({
        roomTypeId,
        startDate: from,
        endDate: to,
        totalUnits: units,
        price,
      });
      setMessage(`${result.updated} hari diperbarui.`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', roomTypeId, from, to] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui inventori.');
    } finally {
      setSaving(false);
    }
  }

  const hotels = hotelsQuery.data?.items ?? [];
  const roomTypes = roomTypesQuery.data ?? [];
  const days = inventoryQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-headline-md text-ink">Stok & harga</h2>
        <p className="mt-0.5 text-sm text-muted">Atur ketersediaan kamar dan harga per tanggal.</p>
      </div>

      {/* Selectors */}
      <section className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="inv-hotel" className="label">
              Hotel
            </label>
            <select
              id="inv-hotel"
              className="input"
              value={hotelId}
              onChange={(event) => setHotelId(event.target.value)}
            >
              <option value="">Pilih hotel</option>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name} — {hotel.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="inv-room" className="label">
              Tipe kamar
            </label>
            <select
              id="inv-room"
              className="input"
              value={roomTypeId}
              onChange={(event) => setRoomTypeId(event.target.value)}
              disabled={!hotelId || roomTypes.length === 0}
            >
              <option value="">{roomTypes.length === 0 ? 'Belum ada kamar' : 'Pilih tipe kamar'}</option>
              {roomTypes.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="inv-from" className="label">
              Dari
            </label>
            <input
              id="inv-from"
              type="date"
              className="input"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="inv-to" className="label">
              Sampai
            </label>
            <input
              id="inv-to"
              type="date"
              className="input"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
      </section>

      {!hotelId && (
        <EmptyState
          icon={<BedIcon className="h-10 w-10" />}
          title="Pilih hotel dulu"
          description="Pilih hotel dan tipe kamar untuk melihat serta mengubah stok per tanggal."
        />
      )}

      {hotelId && roomTypes.length === 0 && !roomTypesQuery.isLoading && (
        <Alert tone="warning" title="Belum ada tipe kamar">
          Tambahkan tipe kamar untuk hotel ini di menu “Hotel &amp; Kamar” sebelum mengatur stok.
        </Alert>
      )}

      {roomTypeId && (
        <>
          {/* Bulk update */}
          <section className="card p-5">
            <h3 className="text-title-md text-ink">Perbarui rentang</h3>
            <p className="mt-0.5 text-sm text-muted">
              Terapkan ke {formatDate(from)} – {formatDate(to)} sekaligus.
            </p>
            <form onSubmit={applyUpdate} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label htmlFor="apply-units" className="label">
                  Total unit per hari
                </label>
                <input
                  id="apply-units"
                  type="number"
                  min={0}
                  className="input"
                  value={applyUnits}
                  onChange={(event) => setApplyUnits(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="apply-price" className="label">
                  Harga per malam (Rp)
                </label>
                <input
                  id="apply-price"
                  type="number"
                  min={1}
                  className="input"
                  value={applyPrice}
                  onChange={(event) => setApplyPrice(event.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Terapkan'}
              </button>
            </form>

            {message && (
              <div className="mt-4">
                <Alert tone="success">{message}</Alert>
              </div>
            )}
            {error && (
              <div className="mt-4">
                <Alert tone="danger">{error}</Alert>
              </div>
            )}
          </section>

          {/* Inventory table */}
          <section className="card overflow-hidden">
            {inventoryQuery.isLoading && <LoadingBlock label="Memuat inventori…" />}
            {inventoryQuery.isError && (
              <div className="p-5">
                <Alert tone="danger" title="Gagal memuat inventori">
                  {(inventoryQuery.error as Error).message}
                </Alert>
              </div>
            )}

            {inventoryQuery.data && days.length === 0 && (
              <div className="p-5">
                <Alert tone="info" title="Belum ada data">
                  Rentang tanggal ini belum memiliki baris inventori. Gunakan formulir di atas untuk membuatnya.
                </Alert>
              </div>
            )}

            {days.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-surface-border bg-surface-faint text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Tanggal</th>
                      <th className="px-4 py-3 font-semibold">Total</th>
                      <th className="px-4 py-3 font-semibold">Terisi</th>
                      <th className="px-4 py-3 font-semibold">Tersedia</th>
                      <th className="px-4 py-3 font-semibold">Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {days.map((day) => (
                      <tr key={day.id} className="hover:bg-surface-faint">
                        <td className="px-4 py-2.5 font-medium text-ink">{formatDate(day.date)}</td>
                        <td className="px-4 py-2.5 text-muted">{day.totalUnits}</td>
                        <td className="px-4 py-2.5 text-muted">{day.reservedUnits}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={
                              day.availableUnits > 0 ? 'font-semibold text-success' : 'font-semibold text-danger'
                            }
                          >
                            {day.availableUnits}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-ink">{formatIDR(day.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
