'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../components/api';
import { DashboardShell } from '../../components/dashboard-shell';

type BusinessMembership = { business: { id: string; name: string } };
type Deal = { id: string };
type Notification = { id: string; readAt: string | null };

const navigation = ['Overview', 'Business Profile', 'Members', 'Deals', 'Settings'];

export function BusinessDashboard() {
  const [businesses, setBusinesses] = useState<BusinessMembership[]>([]);
  const [dealCount, setDealCount] = useState<number | null>(null);
  const [pendingActions, setPendingActions] = useState<number | null>(null);

  useEffect(() => {
    void Promise.all([
      apiRequest<BusinessMembership[]>('/businesses'),
      apiRequest<Deal[]>('/deals'),
      apiRequest<Notification[]>('/notifications')
    ])
      .then(([businessData, deals, notifications]) => {
        setBusinesses(businessData);
        setDealCount(deals.length);
        setPendingActions(notifications.filter((notification) => !notification.readAt).length);
      })
      .catch(() => {
        setBusinesses([]);
        setDealCount(null);
        setPendingActions(null);
      });
  }, []);

  return (
    <DashboardShell area="Business" items={navigation}>
      <p className="eyebrow">Business dashboard</p>
      <h1>{businesses[0]?.business.name ?? 'Set up your TrustPay business.'}</h1>
      <p className="lede">
        Your protected Deals and business workflows are scoped to your authenticated membership.
      </p>
      <div className="cards">
        <article>
          <span>Protected Deals</span>
          <strong>{dealCount ?? '—'}</strong>
          <Link href="/business/deals">View Deal activity</Link>
        </article>
        <article>
          <span>Pending actions</span>
          <strong>{pendingActions ?? '—'}</strong>
          <Link href="/business/members">Manage your team</Link>
        </article>
        <article>
          <span>Business profile</span>
          <strong>{businesses.length > 0 ? 'Active' : 'Required'}</strong>
          <Link href="/business/profile">Complete onboarding</Link>
        </article>
      </div>
    </DashboardShell>
  );
}
