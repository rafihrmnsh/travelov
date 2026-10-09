import type { ReactElement, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  width: 20,
  height: 20,
  'aria-hidden': true,
};

export const SearchIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg {...base} {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 3.6l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" />
  </svg>
);

export const MapPinIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M20 10c0 5.5-8 11-8 11S4 15.5 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const CalendarIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 6M18 19.5c0-2.2-.6-3.9-1.8-5" />
  </svg>
);

export const BedIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 18.5v-13M3 12.5h16a2 2 0 0 1 2 2v4M3 12.5V8.8A1.8 1.8 0 0 1 4.8 7h5.4A1.8 1.8 0 0 1 12 8.8v3.7" />
    <circle cx="7.2" cy="10.2" r="1.4" />
  </svg>
);

export const WifiIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M2.5 8.5a15 15 0 0 1 19 0M5.5 12a10.5 10.5 0 0 1 13 0M8.6 15.4a6 6 0 0 1 6.8 0" />
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.2 12.4 2.5 2.5 5-5.4" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m14.5 5-7 7 7 7" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m9.5 5 7 7-7 7" />
  </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </svg>
);

export const BuildingIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
    <path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20.5v-3.5h4v3.5" />
  </svg>
);

export const ChartIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 16v-4M12 16V7M16 16v-6" />
  </svg>
);

export const TicketIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3.5 8.5V6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V13a2.5 2.5 0 0 0 0-5Z" />
    <path d="M14 4.5v15" strokeDasharray="2 2.5" />
  </svg>
);

export const WalletIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
    <path d="M3.5 10h17M16 14.5h1.5" />
  </svg>
);

export const UserIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c0-3.5 3.1-5.8 7-5.8s7 2.3 7 5.8" />
  </svg>
);

export const LogoutIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14" />
    <path d="M17.5 8.5 21 12l-3.5 3.5M21 12H10" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const EditIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z" />
    <path d="M14.5 6.5l3 3" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4.5 6.5h15M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5M6.5 6.5 7.5 20a1.5 1.5 0 0 0 1.5 1.4h6A1.5 1.5 0 0 0 16.5 20l1-13.5" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4.5 17 4.5-4.5 4 3.5 3-2.5 3.5 3.5" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 4.5 21 19.5H3z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

export const InfoIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const PoolIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 16.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" />
    <path d="M3 20.2c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" />
    <path d="M8.5 13.5V6.2a2 2 0 1 1 4 0M14.5 13.5V6.2a2 2 0 1 1 4 0" />
  </svg>
);

export const BreakfastIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4.5 8h12v5.5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5z" />
    <path d="M16.5 9.5h1.8a2.2 2.2 0 0 1 0 4.4h-1.8" />
    <path d="M4 21h13" />
  </svg>
);

export const ParkingIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M10 16.5V8h3.2a2.6 2.6 0 0 1 0 5.2H10" />
  </svg>
);

export const GymIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6.5 8.5v7M4 10v4M17.5 8.5v7M20 10v4M17.5 12h-11" />
  </svg>
);

export const SpaIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 20c0-5 3.4-8.8 8-9.8-.5 5.4-4 9.3-8 9.8Z" />
    <path d="M12 20c0-5-3.4-8.8-8-9.8.5 5.4 4 9.3 8 9.8Z" />
  </svg>
);

export const AcIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3.5v17M4.5 8l15 8M19.5 8l-15 8" />
  </svg>
);

export const RestaurantIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M7 3.5v7a2 2 0 0 0 4 0v-7M9 10.5V20.5" />
    <path d="M16 3.5c1.5.8 2.5 2.5 2.5 4.5S17.5 12 16 13v7.5" />
  </svg>
);

const FACILITY_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  wifi: WifiIcon,
  pool: PoolIcon,
  breakfast: BreakfastIcon,
  parking: ParkingIcon,
  gym: GymIcon,
  spa: SpaIcon,
  ac: AcIcon,
  restaurant: RestaurantIcon,
};

/** Maps a facility's `icon` key (wifi, pool, …) to an icon, falling back to a tick. */
export function FacilityIcon({ icon, className }: { icon: string; className?: string }) {
  const Component = FACILITY_ICONS[icon?.toLowerCase()] ?? CheckIcon;
  return <Component className={className} />;
}
