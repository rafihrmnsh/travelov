import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/auth/AuthContext';
import { RequireAuth } from '@/auth/RequireAuth';
import { AdminLayout } from '@/components/AdminLayout';
import { Layout } from '@/components/Layout';

import { HomePage } from '@/pages/HomePage';
import { SearchResultsPage } from '@/pages/SearchResultsPage';
import { HotelDetailPage } from '@/pages/HotelDetailPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { BookingListPage } from '@/pages/BookingListPage';
import { BookingDetailPage } from '@/pages/BookingDetailPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { PaymentPage } from '@/pages/PaymentPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminBookingsPage } from '@/pages/admin/AdminBookingsPage';
import { AdminHotelsPage } from '@/pages/admin/AdminHotelsPage';
import { AdminInventoryPage } from '@/pages/admin/AdminInventoryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/** Reset scroll position whenever the route changes. */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="search" element={<SearchResultsPage />} />
              <Route path="hotels/:id" element={<HotelDetailPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />

              <Route
                path="profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
              <Route
                path="bookings"
                element={
                  <RequireAuth>
                    <BookingListPage />
                  </RequireAuth>
                }
              />
              <Route
                path="bookings/:id"
                element={
                  <RequireAuth>
                    <BookingDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="checkout"
                element={
                  <RequireAuth>
                    <CheckoutPage />
                  </RequireAuth>
                }
              />
              <Route
                path="payments/:id"
                element={
                  <RequireAuth>
                    <PaymentPage />
                  </RequireAuth>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <RequireAuth requireAdmin>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="hotels" element={<AdminHotelsPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
