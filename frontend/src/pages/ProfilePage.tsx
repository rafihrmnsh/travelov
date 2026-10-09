import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Field, SectionHeading } from '@/components/ui';
import { UserIcon } from '@/components/icons';
import { useAuth } from '@/auth/AuthContext';
import { authApi } from '@/lib/queries';
import { getFieldErrors } from '@/lib/api';
import { formatDate } from '@/lib/format';

export function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});
  const [passwordSaved, setPasswordSaved] = useState(false);

  if (!user) return null;

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileFieldErrors({});
    setProfileSaved(false);
    try {
      await updateProfile(name.trim());
      setProfileSaved(true);
    } catch (err) {
      setProfileFieldErrors(getFieldErrors(err));
      setProfileError(err instanceof Error ? err.message : 'Gagal menyimpan profil.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordFieldErrors({});
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordFieldErrors({ newPassword: 'Password baru minimal 8 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFieldErrors({ confirmPassword: 'Konfirmasi password tidak cocok.' });
      return;
    }

    setPasswordSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordFieldErrors(getFieldErrors(err));
      setPasswordError(err instanceof Error ? err.message : 'Gagal mengubah password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="bg-canvas">
      <div className="container-page py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
              {user.name.trim().charAt(0).toUpperCase() || 'U'}
            </span>
            <div>
              <h1 className="text-headline-lg text-ink">{user.name}</h1>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
            <span className="ml-auto">
              <Badge tone={user.role === 'Admin' ? 'info' : 'neutral'}>{user.role === 'Admin' ? 'Admin' : 'Tamu'}</Badge>
            </span>
          </div>

          <div className="grid gap-6">
            <section className="card p-6">
              <SectionHeading title="Informasi akun" subtitle="Perbarui nama tampilanmu." />
              <form onSubmit={saveProfile} className="space-y-4">
                <Field label="Nama lengkap" htmlFor="profile-name" error={profileFieldErrors.name} required>
                  <input
                    id="profile-name"
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={100}
                    required
                  />
                </Field>

                <div>
                  <span className="label">Email</span>
                  <input className="input" value={user.email} disabled />
                </div>

                <div>
                  <span className="label">Bergabung</span>
                  <p className="flex items-center gap-1.5 text-sm text-ink">
                    <UserIcon className="h-4 w-4 text-muted" />
                    {formatDate(user.createdAt)}
                  </p>
                </div>

                {profileError && <Alert tone="danger">{profileError}</Alert>}
                {profileSaved && <Alert tone="success">Profil berhasil disimpan.</Alert>}

                <button type="submit" className="btn-primary" disabled={profileSaving}>
                  {profileSaving ? 'Menyimpan…' : 'Simpan perubahan'}
                </button>
              </form>
            </section>

            <section className="card p-6">
              <SectionHeading title="Ubah password" subtitle="Gunakan kombinasi yang kuat dan mudah diingat." />
              <form onSubmit={savePassword} className="space-y-4">
                <Field label="Password saat ini" htmlFor="current-password" error={passwordFieldErrors.currentPassword} required>
                  <input
                    id="current-password"
                    type="password"
                    className="input"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Password baru"
                    htmlFor="new-password"
                    error={passwordFieldErrors.newPassword}
                    hint="Minimal 8 karakter."
                    required
                  >
                    <input
                      id="new-password"
                      type="password"
                      className="input"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </Field>

                  <Field
                    label="Konfirmasi password"
                    htmlFor="confirm-password"
                    error={passwordFieldErrors.confirmPassword}
                    required
                  >
                    <input
                      id="confirm-password"
                      type="password"
                      className="input"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                </div>

                {passwordError && <Alert tone="danger">{passwordError}</Alert>}
                {passwordSaved && <Alert tone="success">Password berhasil diubah.</Alert>}

                <button type="submit" className="btn-primary" disabled={passwordSaving}>
                  {passwordSaving ? 'Menyimpan…' : 'Ubah password'}
                </button>
              </form>
            </section>

            <section className="card p-6">
              <SectionHeading title="Aktivitas" />
              <Link to="/bookings" className="btn-neutral">
                Lihat pesanan saya
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
