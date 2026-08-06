'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (step === 'credentials') {
        // First attempt: try with MFA code if provided, otherwise try without
        await login(email, password, mfaCode || undefined);
        router.push('/');
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      if (message.includes('MFA')) {
        setStep('mfa');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, mfaCode);
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Code MFA invalide';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h1>BuildFlow</h1>
          <p>Plateforme Qualité & Sécurité BTP</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        {step === 'credentials' ? (
          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chef@buildflow.io"
                required
                autoFocus
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="login-form">
            <p className="mfa-prompt">Authentification à deux facteurs requise</p>
            <label>
              Code MFA
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="123456"
                required
                autoFocus
                maxLength={6}
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Vérification...' : 'Vérifier le code'}
            </button>
            <button
              type="button"
              className="btn-back"
              onClick={() => { setStep('credentials'); setError(''); }}
            >
              Retour
            </button>
          </form>
        )}

        <div className="login-help">
          <p>Comptes de test :</p>
          <code>chef@buildflow.io / password / 123456</code>
          <code>qse@buildflow.io / password / 123456</code>
          <code>admin@buildflow.io / password / 123456</code>
        </div>
      </div>
    </div>
  );
}
