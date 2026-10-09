import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { HotelSummary } from '@/types/api';
import { formatIDR } from '@/lib/format';
import { BuildingIcon, FacilityIcon, ImageIcon, MapPinIcon } from './icons';
import { Badge, HotelStars, cn } from './ui';

/** Photo with a graceful gradient placeholder when the URL is missing or broken. */
export function SmartImage({
  src,
  alt,
  className,
  rounded,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;

  if (showPlaceholder) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-tertiary/10 text-primary/40',
          rounded,
          className,
        )}
        aria-label={alt}
        role="img"
      >
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', rounded, className)}
    />
  );
}

interface HotelCardProps {
  hotel: HotelSummary;
  searchQuery?: string;
  nights?: number;
}

export function HotelCard({ hotel, searchQuery = '', nights = 0 }: HotelCardProps) {
  const detailUrl = `/hotels/${hotel.id}${searchQuery}`;
  const unavailable = nights > 0 && !hotel.available;

  return (
    <article className="card group overflow-hidden transition hover:shadow-float">
      <div className="flex flex-col sm:flex-row">
        <Link
          to={detailUrl}
          className="relative block h-48 shrink-0 sm:h-auto sm:w-2/5"
          aria-label={`Lihat detail ${hotel.name}`}
        >
          <SmartImage src={hotel.thumbnailUrl} alt={hotel.name} className="h-48 sm:h-full" />
          {nights > 0 && (
            <span className="absolute left-3 top-3">
              <Badge tone={unavailable ? 'danger' : 'success'}>
                {unavailable ? 'Tidak tersedia' : 'Tersedia'}
              </Badge>
            </span>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-headline-sm text-ink">
                  <Link to={detailUrl} className="hover:text-primary">
                    {hotel.name}
                  </Link>
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <HotelStars stars={hotel.starRating} />
                  <span className="text-xs text-muted">{hotel.city}</span>
                </div>
              </div>
            </div>
            <p className="mt-2 flex items-start gap-1 text-xs text-muted">
              <MapPinIcon className="mt-px h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{hotel.address}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {hotel.facilities.slice(0, 4).map((facility) => (
              <span
                key={facility.id}
                className="inline-flex items-center gap-1 rounded-full bg-surface-faint px-2 py-1 text-xs text-muted"
              >
                <FacilityIcon icon={facility.icon} className="h-3.5 w-3.5" />
                {facility.name}
              </span>
            ))}
            {hotel.facilities.length > 4 && (
              <span className="inline-flex items-center rounded-full bg-surface-faint px-2 py-1 text-xs text-muted">
                +{hotel.facilities.length - 4} lainnya
              </span>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-4 border-t border-surface-border pt-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-success/10 px-2 py-1 text-sm font-bold text-success">
                {hotel.averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-muted">
                {hotel.reviewCount > 0 ? `${hotel.reviewCount} ulasan` : 'Belum ada ulasan'}
              </span>
            </div>

            <div className="text-right">
              {hotel.fromPricePerNight !== null ? (
                <>
                  <p className="text-xs text-muted">Mulai dari</p>
                  <p className="text-price text-primary">{formatIDR(hotel.fromPricePerNight)}</p>
                  <p className="text-xs text-muted">per malam</p>
                </>
              ) : (
                <p className="flex items-center justify-end gap-1 text-xs text-muted">
                  <BuildingIcon className="h-3.5 w-3.5" />
                  Cek ketersediaan
                </p>
              )}
              <Link to={detailUrl} className="btn-primary btn-sm mt-2">
                Lihat Kamar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
