import type { BookingStatus } from '@/types/api';

export type Tone = 'warning' | 'success' | 'danger' | 'info' | 'neutral';

interface StatusMeta {
  label: string;
  tone: Tone;
  description: string;
}

const BOOKING_STATUS: Record<BookingStatus, StatusMeta> = {
  PendingPayment: {
    label: 'Menunggu Pembayaran',
    tone: 'warning',
    description: 'Stok kamar ditahan sampai batas waktu pembayaran.',
  },
  Confirmed: {
    label: 'Terkonfirmasi',
    tone: 'success',
    description: 'Pembayaran diterima. E-tiket kamu sudah terbit.',
  },
  Expired: {
    label: 'Kedaluwarsa',
    tone: 'neutral',
    description: 'Tidak dibayar sebelum batas waktu. Stok dikembalikan.',
  },
  Cancelled: {
    label: 'Dibatalkan',
    tone: 'danger',
    description: 'Pesanan dibatalkan dan stok dikembalikan.',
  },
  Completed: {
    label: 'Selesai',
    tone: 'info',
    description: 'Masa inap sudah selesai. Kamu bisa memberi ulasan.',
  },
};

export function bookingStatusMeta(status: BookingStatus | string): StatusMeta {
  return (
    BOOKING_STATUS[status as BookingStatus] ?? {
      label: String(status),
      tone: 'neutral',
      description: '',
    }
  );
}

export function bookingStatusLabel(status: BookingStatus | string): string {
  return bookingStatusMeta(status).label;
}

const PAYMENT_STATUS: Record<string, string> = {
  Pending: 'Menunggu',
  Paid: 'Dibayar',
  Failed: 'Gagal',
  Expired: 'Kedaluwarsa',
};

export function paymentStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return PAYMENT_STATUS[status] ?? status;
}

export const BOOKING_STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: 'PendingPayment', label: 'Menunggu Pembayaran' },
  { value: 'Confirmed', label: 'Terkonfirmasi' },
  { value: 'Completed', label: 'Selesai' },
  { value: 'Expired', label: 'Kedaluwarsa' },
  { value: 'Cancelled', label: 'Dibatalkan' },
];

export const SORT_OPTIONS = [
  { value: 'popular', label: 'Terpopuler' },
  { value: 'price_asc', label: 'Harga terendah' },
  { value: 'price_desc', label: 'Harga tertinggi' },
  { value: 'rating', label: 'Rating tertinggi' },
];
