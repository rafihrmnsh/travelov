import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Field } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { getFieldErrors } from '@/lib/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();

  const rawRedirect = searchParams.get('redirect') ?? '';
  const redirect = rawRedirect.startsWith('/') ? rawRedirect : '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password.length < 8) {
      setFieldErrors({ password: 'Password minimal 8 karakter.' });
      return;
    }
    if (password !== confirm) {
      setFieldErrors({ confirm: 'Konfirmasi password tidak cocok.' });
      return;
    }

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate(redirect, { replace: true });
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-headline-xl text-ink">Buat akun Travelov</h1>
          <p className="mt-1 text-sm text-muted">Gratis, cepat, dan tanpa biaya tersembunyi.</p>
        </div>

        <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
          {error && <Alert tone="danger" title="Pendaftaran gagal">{error}</Alert>}

          <Field label="Nama lengkap" htmlFor="name" error={fieldErrors.name} required>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama kamu"
              autoComplete="name"
              maxLength={100}
              required
            />
          </Field>

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

          <Field label="Password" htmlFor="password" error={fieldErrors.password} hint="Minimal 8 karakter." required>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </Field>

          <Field label="Konfirmasi password" htmlFor="confirm" error={fieldErrors.confirm} required>
            <input
              id="confirm"
              type="password"
              className="input"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </Field>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Mendaftar…' : 'Daftar'}
          </button>

          <p className="text-center text-sm text-muted">
            Sudah punya akun?{' '}
            <Link to={`/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="link">
              Masuk
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
