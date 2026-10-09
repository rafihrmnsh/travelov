import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, EmptyState, Field, LoadingBlock, Modal, Pagination } from '@/components/ui';
import { BuildingIcon, EditIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { adminApi } from '@/lib/queries';
import { getFieldErrors } from '@/lib/api';
import { formatIDR } from '@/lib/format';
import type { AdminHotel, AdminRoomType, HotelUpsertInput, RoomTypeUpsertInput } from '@/types/api';

const FACILITY_ICON_KEYS = ['wifi', 'pool', 'breakfast', 'parking', 'gym', 'spa', 'ac', 'restaurant'];

export function AdminHotelsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formTarget, setFormTarget] = useState<{ hotel: AdminHotel | null } | null>(null);
  const [roomsTarget, setRoomsTarget] = useState<AdminHotel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminHotel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'hotels', { search, page }],
    queryFn: () => adminApi.hotels({ search: search || undefined, page, pageSize: 10 }),
    placeholderData: (previous) => previous,
  });

  const items = query.data?.items ?? [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'hotels'] });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminApi.deleteHotel(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus hotel.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-headline-md text-ink">Hotel &amp; kamar</h2>
          <p className="mt-0.5 text-sm text-muted">Kelola katalog hotel, kamar, dan fasilitas.</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="hotel-search" className="label">
              Cari
            </label>
            <input
              id="hotel-search"
              className="input py-2"
              placeholder="Nama atau kota"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <button type="button" className="btn-primary" onClick={() => setFormTarget({ hotel: null })}>
            <PlusIcon className="h-4 w-4" /> Tambah hotel
          </button>
        </div>
      </div>

      {query.isLoading && <LoadingBlock label="Memuat hotel…" />}

      {query.isError && (
        <Alert tone="danger" title="Gagal memuat hotel">
          {(query.error as Error).message}
        </Alert>
      )}

      {query.data && items.length === 0 && (
        <EmptyState
          icon={<BuildingIcon className="h-10 w-10" />}
          title="Belum ada hotel"
          description="Tambahkan hotel pertama untuk mulai membangun katalog."
          action={
            <button type="button" className="btn-primary" onClick={() => setFormTarget({ hotel: null })}>
              <PlusIcon className="h-4 w-4" /> Tambah hotel
            </button>
          }
        />
      )}

      {items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-surface-border bg-surface-faint text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Hotel</th>
                  <th className="px-4 py-3 font-semibold">Bintang</th>
                  <th className="px-4 py-3 font-semibold">Rating</th>
                  <th className="px-4 py-3 font-semibold">Tipe kamar</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {items.map((hotel) => (
                  <tr key={hotel.id} className="hover:bg-surface-faint">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{hotel.name}</p>
                      <p className="text-xs text-muted">{hotel.city}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{hotel.starRating}★</td>
                    <td className="px-4 py-3 text-muted">
                      {hotel.reviewCount > 0 ? `${hotel.averageRating.toFixed(1)} (${hotel.reviewCount})` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">{hotel.roomTypes.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className="btn-neutral btn-sm"
                          onClick={() => setRoomsTarget(hotel)}
                          title="Kelola kamar"
                        >
                          Kamar
                        </button>
                        <button
                          type="button"
                          className="btn-neutral btn-sm"
                          onClick={() => setFormTarget({ hotel })}
                          title="Edit hotel"
                          aria-label={`Edit ${hotel.name}`}
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          onClick={() => {
                            setDeleteTarget(hotel);
                            setDeleteError(null);
                          }}
                          title="Hapus hotel"
                          aria-label={`Hapus ${hotel.name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
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

      <HotelFormModal
        open={formTarget !== null}
        hotel={formTarget?.hotel ?? null}
        onClose={() => setFormTarget(null)}
        onSaved={() => {
          setFormTarget(null);
          refresh();
        }}
      />

      <RoomTypesModal hotel={roomsTarget} open={roomsTarget !== null} onClose={() => setRoomsTarget(null)} />

      <Modal
        open={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Hapus hotel?"
        footer={
          <>
            <button type="button" className="btn-neutral" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Batal
            </button>
            <button type="button" className="btn-danger" disabled={deleting} onClick={confirmDelete}>
              {deleting ? 'Menghapus…' : 'Ya, hapus'}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Hotel <strong>{deleteTarget?.name}</strong> beserta kamar dan inventori terkait akan dihapus permanen.
        </p>
        {deleteError && (
          <div className="mt-4">
            <Alert tone="danger">{deleteError}</Alert>
          </div>
        )}
      </Modal>
    </div>
  );
}

function HotelFormModal({
  open,
  hotel,
  onClose,
  onSaved,
}: {
  open: boolean;
  hotel: AdminHotel | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();

  const facilitiesQuery = useQuery({
    queryKey: ['admin', 'facilities'],
    queryFn: () => adminApi.facilities(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const facilities = facilitiesQuery.data ?? [];

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [starRating, setStarRating] = useState(3);
  const [photoText, setPhotoText] = useState('');
  const [facilityIds, setFacilityIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [newFacilityName, setNewFacilityName] = useState('');
  const [newFacilityIcon, setNewFacilityIcon] = useState(FACILITY_ICON_KEYS[0]);
  const [creatingFacility, setCreatingFacility] = useState(false);
  const [facilityError, setFacilityError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(hotel?.name ?? '');
    setCity(hotel?.city ?? '');
    setAddress(hotel?.address ?? '');
    setDescription(hotel?.description ?? '');
    setStarRating(hotel?.starRating ?? 3);
    setPhotoText((hotel?.photos ?? []).map((photo) => photo.url).join('\n'));
    setFacilityIds((hotel?.facilities ?? []).map((facility) => facility.id));
    setError(null);
    setFieldErrors({});
    setNewFacilityName('');
    setFacilityError(null);
  }, [open, hotel]);

  function toggleFacility(id: string) {
    setFacilityIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const payload: HotelUpsertInput = {
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      description: description.trim(),
      starRating,
      photoUrls: photoText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      facilityIds,
    };

    try {
      if (hotel) await adminApi.updateHotel(hotel.id, payload);
      else await adminApi.createHotel(payload);
      onSaved();
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(err instanceof Error ? err.message : 'Gagal menyimpan hotel.');
    } finally {
      setSaving(false);
    }
  }

  async function addFacility() {
    if (!newFacilityName.trim()) return;
    setCreatingFacility(true);
    setFacilityError(null);
    try {
      const created = await adminApi.createFacility({ name: newFacilityName.trim(), icon: newFacilityIcon });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] });
      setFacilityIds((current) => [...current, created.id]);
      setNewFacilityName('');
    } catch (err) {
      setFacilityError(err instanceof Error ? err.message : 'Gagal menambah fasilitas.');
    } finally {
      setCreatingFacility(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={hotel ? 'Edit hotel' : 'Tambah hotel'}
      footer={
        <>
          <button type="button" className="btn-neutral" disabled={saving} onClick={onClose}>
            Batal
          </button>
          <button type="submit" form="hotel-form" className="btn-primary" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </>
      }
    >
      <form id="hotel-form" onSubmit={submit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <Field label="Nama hotel" htmlFor="h-name" error={fieldErrors.name} required>
          <input
            id="h-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={150}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kota" htmlFor="h-city" error={fieldErrors.city} required>
            <input
              id="h-city"
              className="input"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={100}
              required
            />
          </Field>
          <div>
            <label htmlFor="h-stars" className="label">
              Bintang
            </label>
            <select
              id="h-stars"
              className="input"
              value={starRating}
              onChange={(event) => setStarRating(Number(event.target.value))}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} bintang
                </option>
              ))}
            </select>
          </div>
        </div>

        <Field label="Alamat" htmlFor="h-address" error={fieldErrors.address} required>
          <input
            id="h-address"
            className="input"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            maxLength={300}
            required
          />
        </Field>

        <Field label="Deskripsi" htmlFor="h-desc" error={fieldErrors.description} required>
          <textarea
            id="h-desc"
            className="input min-h-28 resize-y"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4000}
            required
          />
        </Field>

        <div>
          <label htmlFor="h-photos" className="label">
            URL foto (satu per baris)
          </label>
          <textarea
            id="h-photos"
            className="input min-h-20 resize-y"
            value={photoText}
            onChange={(event) => setPhotoText(event.target.value)}
            placeholder="https://contoh.com/foto.jpg"
          />
        </div>

        <div>
          <span className="label">Fasilitas</span>
          {facilitiesQuery.isLoading ? (
            <LoadingBlock label="Memuat fasilitas…" />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {facilities.map((facility) => (
                <label
                  key={facility.id}
                  className="flex cursor-pointer items-center gap-2 rounded border border-surface-border px-2.5 py-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-surface-border text-primary focus:ring-primary/30"
                    checked={facilityIds.includes(facility.id)}
                    onChange={() => toggleFacility(facility.id)}
                  />
                  <span className="truncate">{facility.name}</span>
                </label>
              ))}
            </div>
          )}

          <div className="mt-3 rounded-lg border border-dashed border-surface-border p-3">
            <p className="text-xs font-semibold text-ink">Tambah fasilitas baru</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                className="input flex-1 py-2"
                placeholder="Nama fasilitas"
                value={newFacilityName}
                onChange={(event) => setNewFacilityName(event.target.value)}
                maxLength={80}
              />
              <select
                className="input py-2 sm:w-44"
                value={newFacilityIcon}
                onChange={(event) => setNewFacilityIcon(event.target.value)}
              >
                {FACILITY_ICON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-neutral"
                onClick={addFacility}
                disabled={creatingFacility || !newFacilityName.trim()}
              >
                <PlusIcon className="h-4 w-4" />
                {creatingFacility ? 'Menambah…' : 'Tambah'}
              </button>
            </div>
            {facilityError && <p className="mt-2 text-xs text-danger">{facilityError}</p>}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function RoomTypesModal({
  hotel,
  open,
  onClose,
}: {
  hotel: AdminHotel | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'room-types', hotel?.id],
    queryFn: () => adminApi.roomTypes(hotel!.id),
    enabled: open && Boolean(hotel),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('2');
  const [basePrice, setBasePrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setName('');
    setCapacity('2');
    setBasePrice('');
    setError(null);
  }, [open, hotel?.id]);

  function startEdit(room: AdminRoomType) {
    setEditingId(room.id);
    setName(room.name);
    setCapacity(String(room.capacity));
    setBasePrice(String(Math.round(room.basePrice)));
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!hotel) return;
    setSaving(true);
    setError(null);

    const payload: RoomTypeUpsertInput = {
      name: name.trim(),
      capacity: Number(capacity),
      basePrice: Number(basePrice),
    };

    try {
      if (editingId) await adminApi.updateRoomType(editingId, payload);
      else await adminApi.createRoomType(hotel.id, payload);
      setEditingId(null);
      setName('');
      setCapacity('2');
      setBasePrice('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'room-types', hotel.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'hotels'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan tipe kamar.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!hotel) return;
    setError(null);
    try {
      await adminApi.deleteRoomType(id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'room-types', hotel.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'hotels'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus tipe kamar.');
    }
  }

  const rooms = query.data ?? [];

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Kamar — ${hotel?.name ?? ''}`}>
      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {query.isLoading && <LoadingBlock label="Memuat kamar…" />}

      {query.data && rooms.length === 0 && (
        <p className="mb-4 text-sm text-muted">Belum ada tipe kamar. Tambahkan yang pertama di bawah.</p>
      )}

      {rooms.length > 0 && (
        <ul className="mb-5 space-y-2">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-surface-border px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{room.name}</p>
                <p className="text-xs text-muted">
                  {room.capacity} tamu · {formatIDR(room.basePrice)} / malam
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" className="btn-neutral btn-sm" onClick={() => startEdit(room)}>
                  <EditIcon className="h-4 w-4" />
                </button>
                <button type="button" className="btn-danger btn-sm" onClick={() => remove(room.id)}>
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-4 rounded-lg border border-surface-border bg-surface-faint p-4">
        <p className="text-title-md text-ink">{editingId ? 'Edit tipe kamar' : 'Tambah tipe kamar'}</p>

        <Field label="Nama tipe kamar" htmlFor="rt-name" required>
          <input
            id="rt-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Deluxe King"
            maxLength={120}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kapasitas (tamu)" htmlFor="rt-capacity" required>
            <input
              id="rt-capacity"
              type="number"
              min={1}
              max={20}
              className="input"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              required
            />
          </Field>
          <Field label="Harga dasar (Rp)" htmlFor="rt-price" required>
            <input
              id="rt-price"
              type="number"
              min={1}
              className="input"
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
              placeholder="750000"
              required
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          {editingId && (
            <button
              type="button"
              className="btn-neutral"
              onClick={() => {
                setEditingId(null);
                setName('');
                setCapacity('2');
                setBasePrice('');
              }}
            >
              Batal edit
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : 'Tambah kamar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
