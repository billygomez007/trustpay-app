'use client';

import { useState } from 'react';
import { apiRequest } from '../../../components/api';
import { DashboardShell } from '../../../components/dashboard-shell';

export default function BusinessProfilePage() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await apiRequest('/businesses', {
        method: 'POST',
        body: JSON.stringify({ name, type: 'company', country: 'GH', currency: 'GHS' })
      });
      setMessage('Business created. Your owner membership is active.');
    } catch {
      setMessage('Unable to create this business.');
    }
  };

  return (
    <DashboardShell
      area="Business"
      items={['Overview', 'Business Profile', 'Members', 'Deals', 'Settings']}
    >
      <p className="eyebrow">Onboarding</p>
      <h1>Create your business account.</h1>
      <form className="form-card" onSubmit={submit}>
        <label>
          Business name
          <input onChange={(event) => setName(event.target.value)} value={name} />
        </label>
        <button type="submit">Create business</button>
        {message ? <p>{message}</p> : null}
      </form>
    </DashboardShell>
  );
}
