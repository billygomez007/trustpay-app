'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../../components/api';
import { DashboardShell } from '../../../components/dashboard-shell';

type FraudCase = {
  id: string;
  reason: string;
  riskLevel: string;
  status: string;
  assignedReviewerId: string | null;
};
export default function FraudOperationsPage() {
  const [cases, setCases] = useState<FraudCase[]>([]);
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    void apiRequest<FraudCase[]>('/admin/trust/fraud-cases')
      .then(setCases)
      .catch(() => setAllowed(false));
  }, []);
  return (
    <DashboardShell
      area="Operations"
      items={['Verification Queue', 'Fraud Cases', 'Risk Signals', 'Audit Logs']}
    >
      <p className="eyebrow">Internal access only</p>
      <h1>Fraud Cases</h1>
      {allowed ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reason</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Reviewer</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>{item.reason}</td>
                  <td>{item.riskLevel}</td>
                  <td>{item.status}</td>
                  <td>{item.assignedReviewerId ?? 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="lede">Your staff role does not have fraud-management access.</p>
      )}
    </DashboardShell>
  );
}
