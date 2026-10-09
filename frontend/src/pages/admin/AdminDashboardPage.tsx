import { useQuery } from '@tanstack/react-query';
import { Alert, LoadingBlock, StatusChip } from '@/components/ui';
import { adminApi } from '@/lib/queries';
import { formatIDR, formatRating } from '@/lib/format';
import { BedIcon, BuildingIcon, ChartIcon, TicketIcon, UsersIcon, WalletIcon } from '@/components/icons';

export function AdminDashboardPage() {
  const query = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => adminApi.stats() });

  if (query.isLoading) return <LoadingBlock label="Memuat statistik…" />;

  if (query.isError || !query.data) {
    return (
      <Alert tone="danger" title="Gagal memuat statistik">
        {(query.error as Error | null)?.message ?? 'Data tidak tersedia.'}
      </Alert>
    );
  }

  const stats = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-headline-md text-ink">Ringkasan</h2>
        <p className="mt-0.5 text-sm text-muted">Metrik utama 30 hari terakhir.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<TicketIcon className="h-5 w-5" />} label="Total pesanan" value={String(stats.totalBookings)} />
        <StatCard
          icon={<WalletIcon className="h-5 w-5" />}
          label="Pendapatan"
          value={formatIDR(stats.totalRevenue)}
          tone="success"
        />
        <StatCard
          icon={<ChartIcon className="h-5 w-5" />}
          label="Okupansi"
          value={`${formatRating(stats.occupancyRate)}%`}
        />
        <StatCard icon={<BuildingIcon className="h-5 w-5" />} label="Hotel terdaftar" value={String(stats.totalHotels)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<BedIcon className="h-5 w-5" />} label="Tipe kamar" value={String(stats.totalRoomTypes)} />
        <StatCard icon={<UsersIcon className="h-5 w-5" />} label="Pengguna" value={String(stats.totalUsers)} />
        <StatCard
          icon={<TicketIcon className="h-5 w-5" />}
          label="Menunggu pembayaran"
          value={String(stats.pendingBookings)}
          tone="warning"
        />
        <StatCard
          icon={<TicketIcon className="h-5 w-5" />}
          label="Terkonfirmasi"
          value={String(stats.confirmedBookings)}
          tone="success"
        />
      </div>

      <section className="card p-5">
        <h3 className="text-title-md text-ink">Status pesanan</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatusBreakdown label="Menunggu pembayaran" status="PendingPayment" value={stats.pendingBookings} />
          <StatusBreakdown label="Terkonfirmasi" status="Confirmed" value={stats.confirmedBookings} />
          <StatusBreakdown label="Kedaluwarsa" status="Expired" value={stats.expiredBookings} />
          <StatusBreakdown label="Dibatalkan" status="Cancelled" value={stats.cancelledBookings} />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'warning';
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-success/10 text-success'
      : tone === 'warning'
        ? 'bg-warning/10 text-warning'
        : 'bg-primary/10 text-primary';

  return (
    <div className="card p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>{icon}</span>
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className="mt-0.5 text-headline-lg text-ink">{value}</p>
    </div>
  );
}

function StatusBreakdown({ label, status, value }: { label: string; status: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-3">
      <div>
        <StatusChip status={status} />
        <p className="mt-1.5 text-xs text-muted">{label}</p>
      </div>
      <span className="text-headline-md font-extrabold text-ink">{value}</span>
    </div>
  );
}
