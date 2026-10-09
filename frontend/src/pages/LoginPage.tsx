import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Field } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { getFieldErrors } from '@/lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const rawRedirect = searchParams.get('redirect') ?? '';
  const redirect = rawRedirect.startsWith('/') ? rawRedirect : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await login(email.trim(), password);
      navigate(redirect, { replace: true });
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(err instanceof Error ? err.message : 'Email atau password salah.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-headline-xl text-ink">Masuk ke Travelov</h1>
          <p className="mt-1 text-sm text-muted">Lanjutkan pesanan dan kelola riwayat menginapmu.</p>
        </div>

        <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
          {error && <Alert tone="danger" title="Gagal masuk">{error}</Alert>}

          <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Password" htmlFor="password" error={fieldErrors.password} required>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Memproses…' : 'Masuk'}
          </button>

          <p className="text-center text-sm text-muted">
            Belum punya akun?{' '}
            <Link to={`/register${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="link">
              Daftar di sini
            </Link>
          </p>
        </form>

        <div className="mt-4 rounded-lg border border-dashed border-surface-border bg-white p-4 text-xs text-muted">
          <p className="font-semibold text-ink">Akun demo</p>
          <p className="mt-1">Tamu: user@travelov.test · User123!</p>
          <p>Admin: admin@travelov.test · Admin123!</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-neutral btn-sm"
              onClick={() => {
                setEmail('user@travelov.test');
                setPassword('User123!');
              }}
            >
              Isi akun tamu
            </button>
            <button
              type="button"
              className="btn-neutral btn-sm"
              onClick={() => {
                setEmail('admin@travelov.test');
                setPassword('Admin123!');
              }}
            >
              Isi akun admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
