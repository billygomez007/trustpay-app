'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../components/api';
import { DashboardShell } from '../../components/dashboard-shell';

type IdentityVerification = {
  id: string;
  fullName: string;
  status: string;
  createdAt: string;
  reviewerId: string | null;
};
type BusinessVerification = {
  id: string;
  registeredName: string | null;
  status: string;
  createdAt: string;
  reviewerId: string | null;
  business: { name: string };
};

export default function TrustOperationsPage() {
  const [identity, setIdentity] = useState<IdentityVerification[]>([]);
  const [business, setBusiness] = useState<BusinessVerification[]>([]);
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    void Promise.all([
      apiRequest<IdentityVerification[]>('/admin/trust/verifications'),
      apiRequest<BusinessVerification[]>('/admin/trust/business-verifications')
    ])
      .then(([identityQueue, businessQueue]) => {
        setIdentity(identityQueue);
        setBusiness(businessQueue);
      })
      .catch(() => setAllowed(false));
  }, []);
  return (
    <DashboardShell
      area="Operations"
      items={[
        'Verification Queue',
        'Identity Reviews',
        'Business Reviews',
        'Fraud Cases',
        'Risk Signals',
        'Trust Profiles',
        'Audit Logs'
      ]}
    >
      <p className="eyebrow">Internal access only</p>
      <h1>Trust Operations</h1>
      {!allowed ? (
        <p className="lede">Your staff role does not have access to Trust Operations.</p>
      ) : (
        <>
          <div className="cards">
            <article>
              <span>Identity queue</span>
              <strong>{identity.length}</strong>
            </article>
            <article>
              <span>Business queue</span>
              <strong>{business.length}</strong>
            </article>
            <article>
              <span>Fraud</span>
              <Link href="/admin/trust/fraud">Open fraud cases</Link>
            </article>
          </div>
          <h2>Verification Queue</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Reviewer</th>
                </tr>
              </thead>
              <tbody>
                {identity.map((item) => (
                  <tr key={item.id}>
                    <td>{item.fullName}</td>
                    <td>Identity</td>
                    <td>{item.status}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td>{item.reviewerId ?? 'Unassigned'}</td>
                  </tr>
                ))}
                {business.map((item) => (
                  <tr key={item.id}>
                    <td>{item.registeredName ?? item.business.name}</td>
                    <td>Business</td>
                    <td>{item.status}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td>{item.reviewerId ?? 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
