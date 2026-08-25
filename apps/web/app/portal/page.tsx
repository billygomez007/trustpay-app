'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '../components/api';
import { DashboardShell } from '../components/dashboard-shell';

type Deal = { id: string; status: string };
type Notification = { id: string; readAt: string | null };

export default function CustomerPortalPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [unread, setUnread] = useState<number | null>(null);
  useEffect(() => {
    void Promise.all([apiRequest<Deal[]>('/deals'), apiRequest<Notification[]>('/notifications')])
      .then(([items, notifications]) => {
        setDeals(items);
        setUnread(notifications.filter((item) => !item.readAt).length);
      })
      .catch(() => {
        setDeals([]);
        setUnread(null);
      });
  }, []);
  return (
    <DashboardShell
      area="Customer"
      items={['Home', 'My Deals', 'Invitations', 'Trust Profile', 'Notifications', 'Profile']}
    >
      <p className="eyebrow">TrustPay Protect</p>
      <h1>Your protected transactions in one place.</h1>
      <p className="lede">
        Create and follow agreements, review updates from the other party, and keep your Trust
        Profile close at hand.
      </p>
      <div className="cards">
        <article>
          <span>Active Deals</span>
          <strong>{deals.length}</strong>
          <Link href="/portal/deals">View Deals</Link>
        </article>
        <article>
          <span>Invitations</span>
          <strong>None yet</strong>
          <Link href="/portal/deals">View transaction activity</Link>
        </article>
        <article>
          <span>Notifications</span>
          <strong>{unread ?? '—'}</strong>
          <Link href="/portal/notifications">Open notifications</Link>
        </article>
        <article>
          <span>Disputes</span>
          <strong>None active</strong>
          <Link href="/portal/disputes">Open dispute center</Link>
        </article>
        <article>
          <span>Trust Profile</span>
          <strong>Your profile</strong>
          <Link href="/portal/trust">View Trust Profile</Link>
        </article>
        <article>
          <span>Create a Deal</span>
          <strong>Start here</strong>
          <Link href="/portal/deals/create">Start a transaction</Link>
        </article>
      </div>
    </DashboardShell>
  );
}
