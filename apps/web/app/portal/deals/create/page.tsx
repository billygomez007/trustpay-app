'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../../components/api';
import { DashboardShell } from '../../../components/dashboard-shell';
export default function CreateCustomerDealPage() {
  const router = useRouter();
  const [sellerId, setSellerId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await apiRequest('/deals', {
        method: 'POST',
        body: JSON.stringify({
          sellerId,
          title,
          type: 'custom',
          amount: { amount, currency: 'GHS' }
        })
      });
      router.replace('/portal/deals');
    } catch {
      setMessage('Unable to create this Deal. Check the other party and terms.');
    }
  };
  return (
    <DashboardShell
      area="Customer"
      items={['Home', 'My Deals', 'Invitations', 'Trust Profile', 'Notifications', 'Profile']}
    >
      <p className="eyebrow">TrustPay Protect</p>
      <h1>Create a protected Deal</h1>
      <form className="form-card" onSubmit={submit}>
        <label>
          Other party ID
          <input value={sellerId} onChange={(event) => setSellerId(event.target.value)} />
        </label>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Amount
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <button type="submit">Create Deal</button>
        {message ? <p className="error">{message}</p> : null}
      </form>
    </DashboardShell>
  );
}
