import { api } from './api';
import type {
  AdminBooking,
  AdminHotel,
  AdminRoomType,
  AdminStats,
  AuthResponse,
  Booking,
  CreateBookingInput,
  Facility,
  HotelDetail,
  HotelSearchParams,
  HotelSummary,
  HotelUpsertInput,
  InventoryDay,
  InventoryUpdateInput,
  Paged,
  PaymentResult,
  Review,
  RoomTypeUpsertInput,
  User,
} from '@/types/api';

/** Serialises search params, expanding facilityIds into repeated keys the API binds. */
function toSearchParams(params: HotelSearchParams): URLSearchParams {
  const search = new URLSearchParams();
  const setIf = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  };

  setIf('city', params.city);
  setIf('name', params.name);
  setIf('checkIn', params.checkIn);
  setIf('checkOut', params.checkOut);
  setIf('guests', params.guests);
  setIf('minPrice', params.minPrice);
  setIf('maxPrice', params.maxPrice);
  setIf('minRating', params.minRating);
  setIf('stars', params.stars);
  setIf('sort', params.sort);
  setIf('page', params.page);
  setIf('pageSize', params.pageSize);

  params.facilityIds?.forEach((id) => {
    if (id) search.append('facilityIds', id);
  });

  return search;
}

// ----- Auth -----

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/register', body).then((r) => r.data),

  login: (body: { email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/login', body).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post<void>('/api/auth/logout', { refreshToken }).then((r) => r.data),

  me: () => api.get<User>('/api/auth/me').then((r) => r.data),

  updateProfile: (body: { name: string }) => api.put<User>('/api/auth/me', body).then((r) => r.data),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.post<void>('/api/auth/change-password', body).then((r) => r.data),
};

// ----- Hotels (public) -----

export const hotelsApi = {
  search: (params: HotelSearchParams) =>
    api.get<Paged<HotelSummary>>('/api/hotels', { params: toSearchParams(params) }).then((r) => r.data),

  facilities: () => api.get<Facility[]>('/api/hotels/facilities').then((r) => r.data),

  detail: (id: string, options?: { checkIn?: string; checkOut?: string; guests?: number }) =>
    api.get<HotelDetail>(`/api/hotels/${id}`, { params: options }).then((r) => r.data),

  reviews: (id: string, page = 1, pageSize = 6) =>
    api
      .get<Paged<Review>>(`/api/hotels/${id}/reviews`, { params: { page, pageSize } })
      .then((r) => r.data),
};

// ----- Bookings -----

export const bookingsApi = {
  create: (body: CreateBookingInput) => api.post<Booking>('/api/bookings', body).then((r) => r.data),

  mine: (page = 1, pageSize = 10) =>
    api.get<Paged<Booking>>('/api/bookings', { params: { page, pageSize } }).then((r) => r.data),

  byId: (id: string) => api.get<Booking>(`/api/bookings/${id}`).then((r) => r.data),

  cancel: (id: string, reason?: string) =>
    api.post<Booking>(`/api/bookings/${id}/cancel`, { reason: reason ?? null }).then((r) => r.data),
};

// ----- Payments -----

export const paymentsApi = {
  simulate: (body: { bookingCode: string; success: boolean }) =>
    api.post<PaymentResult>('/api/payments/simulate', body).then((r) => r.data),
};

// ----- Reviews -----

export const reviewsApi = {
  create: (body: { bookingId: string; rating: number; comment?: string }) =>
    api.post<Review>('/api/reviews', body).then((r) => r.data),
};

// ----- Admin -----

export const adminApi = {
  stats: () => api.get<AdminStats>('/api/admin/stats').then((r) => r.data),

  hotels: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<Paged<AdminHotel>>('/api/admin/hotels', { params }).then((r) => r.data),

  hotel: (id: string) => api.get<AdminHotel>(`/api/admin/hotels/${id}`).then((r) => r.data),

  createHotel: (body: HotelUpsertInput) =>
    api.post<AdminHotel>('/api/admin/hotels', body).then((r) => r.data),

  updateHotel: (id: string, body: HotelUpsertInput) =>
    api.put<AdminHotel>(`/api/admin/hotels/${id}`, body).then((r) => r.data),

  deleteHotel: (id: string) => api.delete<void>(`/api/admin/hotels/${id}`).then((r) => r.data),

  facilities: () => api.get<Facility[]>('/api/admin/facilities').then((r) => r.data),

  createFacility: (body: { name: string; icon: string }) =>
    api.post<Facility>('/api/admin/facilities', body).then((r) => r.data),

  roomTypes: (hotelId: string) =>
    api.get<AdminRoomType[]>(`/api/admin/hotels/${hotelId}/room-types`).then((r) => r.data),

  createRoomType: (hotelId: string, body: RoomTypeUpsertInput) =>
    api.post<AdminRoomType>(`/api/admin/hotels/${hotelId}/room-types`, body).then((r) => r.data),

  updateRoomType: (id: string, body: RoomTypeUpsertInput) =>
    api.put<AdminRoomType>(`/api/admin/room-types/${id}`, body).then((r) => r.data),

  deleteRoomType: (id: string) => api.delete<void>(`/api/admin/room-types/${id}`).then((r) => r.data),

  inventory: (roomTypeId: string, from?: string, to?: string) =>
    api
      .get<InventoryDay[]>('/api/admin/inventory', { params: { roomTypeId, from, to } })
      .then((r) => r.data),

  updateInventory: (body: InventoryUpdateInput) =>
    api.put<{ updated: number }>('/api/admin/inventory', body).then((r) => r.data),

  bookings: (params?: { status?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<Paged<AdminBooking>>('/api/admin/bookings', { params }).then((r) => r.data),
};
