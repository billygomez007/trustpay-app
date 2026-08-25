'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest, type CustomerDeal } from '../../components/api';

export default function SellerDashboardPage() {
  const [deals, setDeals] = useState<CustomerDeal[]>([]);
  useEffect(() => {
    void apiRequest<CustomerDeal[]>('/deals')
      .then(setDeals)
      .catch(() => setDeals([]));
  }, []);
  const active = useMemo(
    () =>
      deals.filter(
        (deal) => !['completed', 'released', 'cancelled', 'refunded'].includes(deal.status)
      ),
    [deals]
  );
  return (
    <main className="customer-page">
      <header className="customer-header">
        <Link href="/portal">← TrustPay</Link>
        <span>Seller dashboard</span>
        <Link className="header-action" href="/portal">
          Buyer view
        </Link>
      </header>
      <section className="customer-intro">
        <span className="market-eyebrow">SELL WITH PROTECTION</span>
        <h1>Your seller desk</h1>
        <p>Track orders, fulfillment, and protected funds in one place.</p>
      </section>
      <div className="seller-metric-grid">
        <div>
          <span>Active orders</span>
          <strong>{active.length}</strong>
        </div>
        <div>
          <span>Completed sales</span>
          <strong>
            {deals.filter((deal) => ['completed', 'released'].includes(deal.status)).length}
          </strong>
        </div>
        <div>
          <span>Pending action</span>
          <strong>
            {
              deals.filter((deal) =>
                ['payment_secured', 'seller_accepted', 'fulfillment_started'].includes(deal.status)
              ).length
            }
          </strong>
        </div>
      </div>
      <section className="seller-orders">
        <div className="section-title">
          <div>
            <span className="market-eyebrow">ORDER QUEUE</span>
            <h2>Seller orders</h2>
          </div>
        </div>
        {active.map((deal) => (
          <Link className="purchase-row" href={`/portal/deals/${deal.id}`} key={deal.id}>
            <div className="purchase-symbol seller-symbol">□</div>
            <div className="purchase-main">
              <strong>{deal.title}</strong>
              <span>
                {deal.reference} · Buyer {deal.buyerId.slice(0, 8)}…
              </span>
            </div>
            <div className="purchase-amount">
              <strong>
                {deal.amount} {deal.currency}
              </strong>
              <span className={`customer-status ${deal.status}`}>
                {deal.status.replaceAll('_', ' ')}
              </span>
            </div>
            <span className="row-arrow">→</span>
          </Link>
        ))}
        {!active.length && (
          <div className="customer-empty">
            <strong>No active orders</strong>
            <span>Orders assigned to you will appear here.</span>
          </div>
        )}
      </section>
    </main>
  );
}
