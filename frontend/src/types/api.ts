// Shapes mirror the ASP.NET Core DTOs (System.Text.Json, camelCase).
// Dates are ISO strings ("2026-10-15" for DateOnly, full ISO for DateTimeOffset).

export interface Facility {
  id: string;
  name: string;
  icon: string;
}

export interface HotelPhoto {
  id: string;
  url: string;
  sortOrder: number;
}

export interface RoomType {
  id: string;
  name: string;
  capacity: number;
  basePrice: number;
  availableUnits: number | null;
  stayTotal: number | null;
  nights: number | null;
}

export interface HotelSummary {
  id: string;
  name: string;
  city: string;
  address: string;
  starRating: number;
  averageRating: number;
  reviewCount: number;
  thumbnailUrl: string | null;
  fromPricePerNight: number | null;
  available: boolean;
  facilities: Facility[];
}

export interface HotelDetail {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  starRating: number;
  averageRating: number;
  reviewCount: number;
  photos: HotelPhoto[];
  facilities: Facility[];
  roomTypes: RoomType[];
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ----- Auth -----

export type UserRole = 'User' | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  user: User;
}

// ----- Bookings -----

export interface NightlyPrice {
  date: string;
  price: number;
}

export interface PriceSummary {
  currency: string;
  nights: number;
  rooms: number;
  nightlyAverage: number;
  subtotal: number;
  taxAmount: number;
  totalPrice: number;
  breakdown: NightlyPrice[];
}

export interface PaymentInfo {
  id: string;
  provider: string;
  reference: string;
  status: string;
  amount: number;
  paidAt: string | null;
  paymentUrl: string;
}

export type BookingStatus =
  | 'PendingPayment'
  | 'Confirmed'
  | 'Expired'
  | 'Cancelled'
  | 'Completed';

export interface Booking {
  id: string;
  code: string;
  hotelId: string;
  hotelName: string;
  city: string;
  roomTypeId: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  subtotal: number;
  taxAmount: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  paymentDeadline: string;
  confirmedAt: string | null;
  cancellationReason: string | null;
  canBeCancelled: boolean;
  canReview: boolean;
  payment: PaymentInfo | null;
}

export interface CreateBookingInput {
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
}

// ----- Reviews -----

export interface Review {
  id: string;
  bookingId: string;
  hotelId: string;
  hotelName: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  createdAt: string;
}

// ----- Payments -----

export interface PaymentResult {
  bookingCode: string;
  bookingStatus: string;
  paymentStatus: string;
  alreadyProcessed: boolean;
  message: string | null;
}

// ----- Admin -----

export interface AdminRoomType {
  id: string;
  name: string;
  capacity: number;
  basePrice: number;
}

export interface AdminHotel {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  starRating: number;
  averageRating: number;
  reviewCount: number;
  photos: HotelPhoto[];
  facilities: Facility[];
  roomTypes: AdminRoomType[];
}

export interface AdminBooking {
  id: string;
  code: string;
  hotelName: string;
  roomTypeName: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: string;
  createdAt: string;
  paymentDeadline: string;
}

export interface AdminStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  expiredBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalHotels: number;
  totalRoomTypes: number;
  totalUsers: number;
  occupancyRate: number;
}

export interface InventoryDay {
  id: string;
  roomTypeId: string;
  date: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
  price: number;
}

// ----- Request payloads -----

export interface HotelSearchParams {
  city?: string;
  name?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  stars?: number;
  facilityIds?: string[];
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface HotelUpsertInput {
  name: string;
  city: string;
  address: string;
  description: string;
  starRating: number;
  photoUrls?: string[];
  facilityIds?: string[];
}

export interface RoomTypeUpsertInput {
  name: string;
  capacity: number;
  basePrice: number;
}

export interface InventoryUpdateInput {
  roomTypeId: string;
  startDate: string;
  endDate: string;
  totalUnits: number;
  price: number;
}

// ----- Error envelope returned by ExceptionHandlingMiddleware -----

export interface ApiProblem {
  status: number;
  error: string;
  details?: unknown;
  traceId?: string;
}
