import { useId, useState, type FormEvent } from 'react';
import { CalendarIcon, MapPinIcon, SearchIcon, UsersIcon } from './icons';
import { addDays, daysFromNowISO, diffNights, parseDateOnly, todayISO } from '@/lib/format';
import { cn } from './ui';

export interface SearchValues {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export const CITY_SUGGESTIONS = ['Jakarta', 'Bali', 'Bandung', 'Yogyakarta', 'Surabaya'];

interface SearchBarProps {
  initial?: Partial<SearchValues>;
  onSearch: (values: SearchValues) => void;
  variant?: 'hero' | 'inline';
  busy?: boolean;
}

export function SearchBar({ initial, onSearch, variant = 'hero', busy }: SearchBarProps) {
  const listId = useId();
  const [city, setCity] = useState(initial?.city ?? '');
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? daysFromNowISO(1));
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? daysFromNowISO(3));
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [error, setError] = useState<string | null>(null);

  const minCheckOut = checkIn ? toInputValue(addDays(parseDateOnly(checkIn), 1)) : daysFromNowISO(2);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (checkIn && checkOut && diffNights(checkIn, checkOut) < 1) {
      setError('Tanggal check-out harus setelah check-in.');
      return;
    }
    setError(null);
    onSearch({ city: city.trim(), checkIn, checkOut, guests });
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        'grid gap-3 rounded-xl border border-surface-border bg-white p-3 shadow-float',
        variant === 'hero'
          ? 'md:grid-cols-[1.4fr_1fr_1fr_0.9fr_auto] md:items-end md:gap-0 md:p-2'
          : 'md:grid-cols-[1.4fr_1fr_1fr_0.9fr_auto] md:items-end',
      )}
    >
      <FieldSlot label="Kota atau hotel" icon={<MapPinIcon className="h-5 w-5" />} divider={variant === 'hero'}>
        <input
          className="w-full bg-transparent text-title-md text-ink placeholder:text-muted/70 focus:outline-none"
          placeholder="Mau ke mana hari ini?"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          list={listId}
          autoComplete="off"
        />
        <datalist id={listId}>
          {CITY_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </FieldSlot>

      <FieldSlot label="Check-in" icon={<CalendarIcon className="h-5 w-5" />} divider={variant === 'hero'}>
        <input
          type="date"
          className="w-full bg-transparent text-title-md text-ink focus:outline-none"
          value={checkIn}
          min={todayISO()}
          onChange={(e) => {
            setCheckIn(e.target.value);
            if (diffNights(e.target.value, checkOut) < 1) {
              setCheckOut(toInputValue(addDays(parseDateOnly(e.target.value), 1)));
            }
          }}
        />
      </FieldSlot>

      <FieldSlot label="Check-out" icon={<CalendarIcon className="h-5 w-5" />} divider={variant === 'hero'}>
        <input
          type="date"
          className="w-full bg-transparent text-title-md text-ink focus:outline-none"
          value={checkOut}
          min={minCheckOut}
          onChange={(e) => setCheckOut(e.target.value)}
        />
      </FieldSlot>

      <FieldSlot label="Tamu" icon={<UsersIcon className="h-5 w-5" />} divider={variant === 'hero'}>
        <select
          className="w-full bg-transparent text-title-md text-ink focus:outline-none"
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} tamu
            </option>
          ))}
        </select>
      </FieldSlot>

      <div className={cn('md:pl-2', variant === 'hero' ? 'md:pb-2 md:pr-1' : '')}>
        <button type="submit" className="btn-primary w-full md:w-auto md:px-6 md:py-3" disabled={busy}>
          <SearchIcon className="h-4 w-4" />
          Cari Hotel
        </button>
      </div>

      {error && <p className="text-xs font-medium text-danger md:col-span-5">{error}</p>}
    </form>
  );
}

function FieldSlot({
  label,
  icon,
  divider,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded px-3 py-2',
        divider && 'md:border-r md:border-surface-border md:last:border-r-0',
      )}
    >
      <span className="mt-0.5 text-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="label mb-0.5">{label}</span>
        {children}
      </div>
    </div>
  );
}

function toInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
