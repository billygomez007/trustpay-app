'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest, type CustomerDeal } from '../../components/api';
import { DashboardShell } from '../../components/dashboard-shell';

const statusBuckets = [
  { label: 'Needs your action', statuses: ['created', 'awaiting_payment', 'inspection_period', 'buyer_confirmed'] },
  { label: 'Waiting on other party', statuses: ['payment_secured', 'seller_accepted', 'fulfillment_started'] },
  { label: 'Funds protected', statuses: ['payment_secured'] },
  { label: 'In progress', statuses: ['seller_accepted', 'fulfillment_started', 'delivered', 'release_pending'] },
  { label: 'Disputed', statuses: ['disputed'] },
  { label: 'Completed', statuses: ['completed', 'released'] }
];

export default function CustomerDealsPage() {
  const [deals, setDeals] = useState<CustomerDeal[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');

  useEffect(() => {
    void apiRequest<CustomerDeal[]>('/deals')
      .then(setDeals)
      .catch(() => setDeals([]));
  }, []);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return deals.filter((deal) => {
      const otherParty = `${deal.buyer?.profile?.name ?? deal.buyerId} ${deal.seller?.profile?.name ?? deal.sellerId}`.toLowerCase();
      const searchMatch =
        !normalized ||
        deal.reference.toLowerCase().includes(normalized) ||
        deal.title.toLowerCase().includes(normalized) ||
        deal.status.toLowerCase().includes(normalized) ||
        otherParty.includes(normalized);
      const statusMatch = status === 'all' || statusBuckets.find((bucket) => bucket.label === status)?.statuses.includes(deal.status) || deal.status === status;
      return searchMatch && statusMatch;
    });
  }, [deals, search, status]);

  const grouped = useMemo(
    () =>
      statusBuckets.map((bucket) => ({
        ...bucket,
        items: filtered.filter((deal) => bucket.statuses.includes(deal.status))
      })),
    [filtered]
  );

  return (
    <DashboardShell
      area="Customer"
      items={['Home', 'My Deals', 'Invitations', 'Trust Profile', 'Notifications', 'Profile']}
    >
      <p className="eyebrow">TrustPay Protect</p>
      <h1>My protected transactions</h1>
      <p className="lede">Search by reference, title, other party, status, or transaction type.</p>
      <div className="detail-form" style={{ marginBottom: 24 }}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" />
        <div className="filter-row" style={{ flexWrap: 'wrap' }}>
          <button className="filter-button" type="button" onClick={() => setStatus('all')}>
            All
          </button>
          {statusBuckets.map((bucket) => (
            <button className="filter-button" type="button" onClick={() => setStatus(bucket.label)} key={bucket.label}>
              {bucket.label}
            </button>
          ))}
        </div>
      </div>

      {grouped.map((bucket) => (
        <section key={bucket.label} className="seller-orders">
          <div className="section-title">
            <div>
              <span className="market-eyebrow">{bucket.label}</span>
              <h2>{bucket.label}</h2>
            </div>
            <span className="result-count">{bucket.items.length} transactions</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Transaction</th>
                  <th>Other party</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bucket.items.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <Link href={`/portal/deals/${deal.id}`}>{deal.reference}</Link>
                    </td>
                    <td>{deal.title}</td>
                    <td>{deal.buyer?.profile?.name ?? deal.buyerId} / {deal.seller?.profile?.name ?? deal.sellerId}</td>
                    <td>
                      {deal.amount} {deal.currency}
                    </td>
                    <td className={`customer-status ${deal.status}`}>{deal.status.replaceAll('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!bucket.items.length && (
            <div className="customer-empty">
              <strong>No transactions in this group</strong>
              <span>Protected transactions will appear here when their state changes.</span>
            </div>
          )}
        </section>
      ))}
    </DashboardShell>
  );
}
