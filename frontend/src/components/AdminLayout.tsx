import { NavLink, Outlet } from 'react-router-dom';
import { BedIcon, BuildingIcon, ChartIcon, TicketIcon } from './icons';
import { cn } from './ui';

const items = [
  { to: '/admin', label: 'Ringkasan', icon: ChartIcon, end: true },
  { to: '/admin/hotels', label: 'Hotel & Kamar', icon: BuildingIcon, end: false },
  { to: '/admin/inventory', label: 'Stok & Harga', icon: BedIcon, end: false },
  { to: '/admin/bookings', label: 'Pesanan', icon: TicketIcon, end: false },
];

export function AdminLayout() {
  return (
    <div className="container-page py-6">
      <div className="mb-6">
        <p className="text-label-sm uppercase text-primary">Panel Admin</p>
        <h1 className="text-headline-lg text-ink">Dasbor Travelov</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="flex gap-1.5 overflow-x-auto rounded-lg border border-surface-border bg-white p-1.5 lg:flex-col lg:overflow-visible">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-2.5 rounded px-3 py-2.5 text-sm font-semibold transition',
                    isActive ? 'bg-primary text-white' : 'text-muted hover:bg-surface-faint hover:text-ink',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
