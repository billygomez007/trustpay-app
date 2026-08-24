'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { listDisputes, type DisputeCase } from '../../components/api';

function formatStatus(status: string) {
  return status.replaceAll('_', ' ');
}

export default function DisputesPage() {
  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listDisputes()
      .then((items) => mounted && setCases(items))
      .catch(() => mounted && setCases([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(
    () => ({
      open: cases.filter((item) => ['open', 'under_review', 'resolution_proposed'].includes(item.status)).length,
      resolved: cases.filter((item) => ['resolved', 'decided'].includes(item.status)).length,
      waiting: cases.filter((item) => item.status === 'resolution_proposed').length
    }),
    [cases]
  );

  return (
    <main className="customer-page dispute-page">
      <header className="customer-header">
        <Link href="/portal">← TrustPay</Link>
        <span>Dispute center</span>
        <Link className="header-action" href="/portal/deals">
          Open transactions
        </Link>
      </header>

      <section className="customer-intro">
        <span className="market-eyebrow">YOUR PROTECTED CASES</span>
        <h1>Disputes and resolutions</h1>
        <p>Track open cases, counterparty responses, and agreed outcomes in one place.</p>
      </section>

      <div className="seller-metric-grid">
        <div>
          <span>Open cases</span>
          <strong>{metrics.open}</strong>
        </div>
        <div>
          <span>Waiting on response</span>
          <strong>{metrics.waiting}</strong>
        </div>
        <div>
          <span>Resolved</span>
          <strong>{metrics.resolved}</strong>
        </div>
      </div>

      <section className="seller-orders">
        <div className="section-title">
          <div>
            <span className="market-eyebrow">CASE LIST</span>
            <h2>Recent disputes</h2>
          </div>
        </div>
        {cases.map((item) => (
          <Link className="purchase-row" href={`/portal/disputes/${item.id}`} key={item.id}>
            <div className="purchase-symbol dispute-symbol">!</div>
            <div className="purchase-main">
              <strong>{item.reason}</strong>
              <span>
                {item.deal.reference} · {item.deal.title}
              </span>
            </div>
            <div className="purchase-amount">
              <strong>{formatStatus(item.status)}</strong>
              <span>{new Date(item.createdAt).toLocaleDateString('en-GH')}</span>
            </div>
            <span className="row-arrow">→</span>
          </Link>
        ))}
        {!cases.length && !loading && (
          <div className="customer-empty">
            <strong>No disputes yet</strong>
            <span>When a protected transaction needs review, the case will appear here.</span>
            <Link href="/portal/deals">View transactions →</Link>
          </div>
        )}
      </section>
    </main>
  );
}
