'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../components/api';
import { DashboardShell } from '../../components/dashboard-shell';
type Notification = { id: string; title: string; body: string; readAt: string | null };
export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  useEffect(() => {
    void apiRequest<Notification[]>('/notifications')
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);
  return (
    <DashboardShell
      area="Customer"
      items={['Home', 'My Deals', 'Invitations', 'Trust Profile', 'Notifications', 'Profile']}
    >
      <p className="eyebrow">Updates</p>
      <h1>Notifications</h1>
      <div className="cards">
        {notifications.map((item) => (
          <article key={item.id}>
            <span>{item.readAt ? 'Read' : 'New'}</span>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
