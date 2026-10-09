import { useEffect, type ReactNode } from 'react';
import { bookingStatusMeta, type Tone } from '@/lib/status';
import { formatIDR } from '@/lib/format';
import { AlertIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, InfoIcon, StarIcon } from './icons';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const TONE_SOFT: Record<Tone, string> = {
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  neutral: 'bg-surface-faint text-muted',
};

// ----- Feedback -----

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={cn('animate-spin text-primary', className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingBlock({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
  onClose,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
}) {
  const Icon = tone === 'success' ? CheckCircleIcon : tone === 'danger' || tone === 'warning' ? AlertIcon : InfoIcon;
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded border px-4 py-3 text-sm',
        tone === 'success' && 'border-success/20 bg-success/5 text-success',
        tone === 'danger' && 'border-danger/20 bg-danger/5 text-danger',
        tone === 'warning' && 'border-warning/20 bg-warning/5 text-warning',
        tone === 'info' && 'border-info/20 bg-info/5 text-info',
        tone === 'neutral' && 'border-surface-border bg-surface-faint text-muted',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-sm')}>{children}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Tutup">
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-surface-border bg-white px-6 py-16 text-center">
      {icon && <div className="text-primary/40">{icon}</div>}
      <h3 className="text-headline-sm text-ink">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ----- Data display -----

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn('chip', TONE_SOFT[tone])}>{children}</span>;
}

export function StatusChip({ status }: { status: string }) {
  const meta = bookingStatusMeta(status);
  return <span className={cn('chip', TONE_SOFT[meta.tone])}>{meta.label}</span>;
}

export function StarRating({
  value,
  count,
  size = 'md',
  showValue = true,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
}) {
  const px = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5" title={`${value.toFixed(1)} dari 5`}>
      <span className="inline-flex text-tertiary">
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} filled={n <= rounded} className={px} />
        ))}
      </span>
      {showValue && <span className="text-sm font-semibold text-ink">{value.toFixed(1)}</span>}
      {count !== undefined && <span className="text-xs text-muted">({count})</span>}
    </span>
  );
}

export function HotelStars({ stars }: { stars: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-tertiary" title={`${stars} bintang`}>
      {Array.from({ length: stars }).map((_, i) => (
        <StarIcon key={i} filled className="h-3.5 w-3.5" />
      ))}
    </span>
  );
}

export function Money({ amount, className }: { amount: number | null | undefined; className?: string }) {
  return <span className={className}>{formatIDR(amount)}</span>;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  required,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-headline-md text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ----- Navigation -----

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | 'gap')[] = [];
  const push = (value: number | 'gap') => pages.push(value);
  const window = 1;

  push(1);
  if (page - window > 2) push('gap');
  for (let p = Math.max(2, page - window); p <= Math.min(totalPages - 1, page + window); p += 1) push(p);
  if (page + window < totalPages - 1) push('gap');
  if (totalPages > 1) push(totalPages);

  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Navigasi halaman">
      <button
        type="button"
        className="btn-neutral btn-sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Sebelumnya
      </button>

      {pages.map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1.5 text-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded px-3 text-sm font-semibold transition',
              item === page ? 'bg-primary text-white' : 'border border-surface-border bg-white text-ink hover:bg-surface-faint',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className="btn-neutral btn-sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Halaman berikutnya"
      >
        Berikutnya
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </nav>
  );
}

// ----- Modal -----

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 py-10 animate-fade-in">
      <div
        className={cn('w-full rounded-xl bg-white shadow-modal', size === 'lg' ? 'max-w-3xl' : 'max-w-lg')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-headline-sm text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label="Tutup">
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-surface-border px-5 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
