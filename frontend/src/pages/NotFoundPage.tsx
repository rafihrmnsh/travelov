import { Link } from 'react-router-dom';
import { SearchIcon } from '@/components/icons';

export function NotFoundPage() {
  return (
    <div className="container-page flex flex-col items-center justify-center py-24 text-center">
      <p className="text-display-hero text-primary">404</p>
      <h1 className="mt-2 text-headline-lg text-ink">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Halaman yang kamu cari mungkin sudah dipindahkan atau tidak pernah ada. Coba mulai dari pencarian hotel.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn-primary">
          Ke beranda
        </Link>
        <Link to="/search" className="btn-neutral">
          <SearchIcon className="h-4 w-4" />
          Cari hotel
        </Link>
      </div>
    </div>
  );
}
