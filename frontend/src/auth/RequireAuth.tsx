import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { LoadingBlock } from '@/components/ui';

interface RequireAuthProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function RequireAuth({ children, requireAdmin = false }: RequireAuthProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="container-page py-20">
        <LoadingBlock label="Memeriksa sesi…" />
      </div>
    );
  }

  if (status === 'anonymous') {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (requireAdmin && user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
