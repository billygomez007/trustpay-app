'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '../../components/api';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next?.startsWith('/') && !next.startsWith('//') ? next : '/portal');
    } catch (error) {
      setError(
        error instanceof Error && error.message.includes('pre-launch')
          ? 'Sign-in is currently unavailable while TrustPay is in pre-launch.'
          : 'Unable to sign in. Check your credentials and try again.'
      );
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <Link className="market-brand auth-brand" href="/">
          <span>T</span> TrustPay
        </Link>
        <h1>Sign in securely.</h1>
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
