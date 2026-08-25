'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../components/api';
import { DashboardShell } from '../../components/dashboard-shell';
type TrustProfile = {
  verificationLevel: string;
  score: number;
  completedDeals: number;
  averageRating: string | null;
};
export default function CustomerTrustPage() {
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  useEffect(() => {
    void apiRequest<TrustProfile>('/trust/my-profile')
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);
  return (
    <DashboardShell
      area="Customer"
      items={['Home', 'My Deals', 'Invitations', 'Trust Profile', 'Notifications', 'Profile']}
    >
      <p className="eyebrow">Trust identity</p>
      <h1>Your Trust Profile</h1>
      <div className="cards">
        <article>
          <span>Verification</span>
          <strong>{profile?.verificationLevel ?? 'Not started'}</strong>
        </article>
        <article>
          <span>Trust score</span>
          <strong>{profile?.score ?? 'Available after activity'}</strong>
        </article>
        <article>
          <span>Completed Deals</span>
          <strong>{profile?.completedDeals ?? 'No completed transactions yet'}</strong>
        </article>
        <article>
          <span>Ratings</span>
          <strong>{profile?.averageRating ?? 'No ratings yet'}</strong>
        </article>
      </div>
    </DashboardShell>
  );
}
