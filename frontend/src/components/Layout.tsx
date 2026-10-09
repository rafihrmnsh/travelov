import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { BuildingIcon, ChartIcon, LogoutIcon, MenuIcon, TicketIcon, UserIcon, CloseIcon } from './icons';
import { cn } from './ui';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Travelov — beranda">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12 3.5 19 8v1.7h-1.4v8.8h-3v-5.6H9.4v5.6h-3V9.7H5V8z" />
        </svg>
      </span>
      <span className="text-headline-sm font-extrabold tracking-tight text-ink">
        Travel<span className="text-primary">ov</span>
      </span>
    </Link>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded px-3 py-2 text-sm font-semibold transition',
    isActive ? 'bg-primary/5 text-primary' : 'text-muted hover:bg-surface-faint hover:text-ink',
  );

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) return null;

  const initial = user.name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-surface-border bg-white py-1 pl-1 pr-3 hover:bg-surface-faint"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-semibold text-ink sm:inline">{user.name}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-surface-border bg-white py-1 shadow-float"
        >
          <div className="border-b border-surface-border px-4 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-faint"
            role="menuitem"
          >
            <UserIcon className="h-4 w-4 text-muted" /> Profil Saya
          </Link>
          <Link
            to="/bookings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-faint"
            role="menuitem"
          >
            <TicketIcon className="h-4 w-4 text-muted" /> Pesanan Saya
          </Link>
          {user.role === 'Admin' && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-faint"
              role="menuitem"
            >
              <ChartIcon className="h-4 w-4 text-muted" /> Dasbor Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="flex w-full items-center gap-2.5 border-t border-surface-border px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/5"
            role="menuitem"
          >
            <LogoutIcon className="h-4 w-4" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { user, status } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-surface-border bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/search" className={navLinkClass}>
              Cari Hotel
            </NavLink>
            {user && (
              <NavLink to="/bookings" className={navLinkClass}>
                Pesanan Saya
              </NavLink>
            )}
            {user?.role === 'Admin' && (
              <NavLink to="/admin" className={navLinkClass}>
                Dasbor Admin
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {status === 'authenticated' ? (
            <UserMenu />
          ) : status === 'loading' ? (
            <div className="h-9 w-24 skeleton" />
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm hidden sm:inline-flex">
                Masuk
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                Daftar
              </Link>
            </>
          )}

          <button
            type="button"
            className="btn-neutral btn-sm md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu navigasi"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-surface-border bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            <NavLink to="/search" className={navLinkClass}>
              Cari Hotel
            </NavLink>
            {user && (
              <NavLink to="/bookings" className={navLinkClass}>
                Pesanan Saya
              </NavLink>
            )}
            {user?.role === 'Admin' && (
              <NavLink to="/admin" className={navLinkClass}>
                Dasbor Admin
              </NavLink>
            )}
            {!user && (
              <NavLink to="/login" className={navLinkClass}>
                Masuk
              </NavLink>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-surface-border bg-white">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted">
            Cari dan pesan hotel di seluruh Nusantara. Harga transparan, ketersediaan kamar real-time, dan
            konfirmasi instan.
          </p>
        </div>
        <div>
          <h3 className="text-label-sm uppercase text-muted">Jelajahi</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/search?city=Jakarta" className="text-ink hover:text-primary">
                Hotel Jakarta
              </Link>
            </li>
            <li>
              <Link to="/search?city=Bali" className="text-ink hover:text-primary">
                Hotel Bali
              </Link>
            </li>
            <li>
              <Link to="/search?city=Yogyakarta" className="text-ink hover:text-primary">
                Hotel Yogyakarta
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-label-sm uppercase text-muted">Akun</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/bookings" className="inline-flex items-center gap-2 text-ink hover:text-primary">
                <TicketIcon className="h-4 w-4 text-muted" /> Pesanan Saya
              </Link>
            </li>
            <li>
              <Link to="/profile" className="inline-flex items-center gap-2 text-ink hover:text-primary">
                <UserIcon className="h-4 w-4 text-muted" /> Profil
              </Link>
            </li>
            <li>
              <Link to="/admin" className="inline-flex items-center gap-2 text-ink hover:text-primary">
                <BuildingIcon className="h-4 w-4 text-muted" /> Dasbor Admin
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-surface-border">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Travelov. Proyek portofolio — pembayaran memakai mode sandbox.</p>
          <p>Dibuat dengan ASP.NET Core &amp; React.</p>
        </div>
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
