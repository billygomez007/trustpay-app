'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../components/api';
import { DashboardShell } from '../../components/dashboard-shell';

type TrustProfile = {
  verificationLevel: string;
  score: number;
  completedDeals: number;
  successfulDeals: number;
  disputes: number;
  averageRating: string | null;
};

export default function TrustDashboardPage() {
  const [profile, setProfile] = useState<TrustProfile | null>(null);

  useEffect(() => {
    void apiRequest<TrustProfile>('/trust/my-profile')
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  return (
    <DashboardShell
      area="Business"
      items={['Overview', 'Trust Profile', 'Verification', 'Reviews']}
    >
      <p className="eyebrow">Trust operations</p>
      <h1>Trust profile</h1>
      <p className="lede">Your verification, reputation, and protected-transaction standing.</p>
      <div className="cards">
        <article>
          <span>Verification</span>
          <strong>{profile?.verificationLevel ?? 'Not started'}</strong>
        </article>
        <article>
          <span>Trust score</span>
          <strong>{profile?.score ?? '—'}</strong>
        </article>
        <article>
          <span>Completed Deals</span>
          <strong>{profile?.completedDeals ?? '—'}</strong>
        </article>
        <article>
          <span>Successful Deals</span>
          <strong>{profile?.successfulDeals ?? '—'}</strong>
        </article>
        <article>
          <span>Disputes</span>
          <strong>{profile?.disputes ?? '—'}</strong>
        </article>
        <article>
          <span>Ratings</span>
          <strong>{profile?.averageRating ?? '—'}</strong>
        </article>
      </div>
    </DashboardShell>
  );
}
