'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, type CustomerDeal } from '../../components/api';

export default function PurchasesPage() {
  const [deals, setDeals] = useState<CustomerDeal[]>([]);
  useEffect(() => { void apiRequest<CustomerDeal[]>('/deals').then(setDeals).catch(() => setDeals([])); }, []);
  return <main className="customer-page"><header className="customer-header"><Link href="/portal">← TrustPay</Link><span>Buyer dashboard</span><Link className="header-action" href="/marketplace">Explore sellers</Link></header><section className="customer-intro"><span className="market-eyebrow">YOUR PROTECTED COMMERCE</span><h1>My purchases</h1><p>Every payment stays protected until you confirm the work is complete.</p></section><div className="purchase-tabs"><span className="selected">All transactions</span><span>Active</span><span>Completed</span><span>Disputed</span></div><section className="purchase-list">{deals.map((deal) => <Link className="purchase-row" href={`/portal/deals/${deal.id}`} key={deal.id}><div className="purchase-symbol">↗</div><div className="purchase-main"><strong>{deal.title}</strong><span>{deal.reference} · {new Date(deal.createdAt).toLocaleDateString('en-GH')}</span></div><div className="purchase-amount"><strong>{deal.amount} {deal.currency}</strong><span className={`customer-status ${deal.status}`}>{deal.status.replaceAll('_', ' ')}</span></div><span className="row-arrow">→</span></Link>)}{!deals.length && <div className="customer-empty"><strong>No purchases yet</strong><span>When you create a protected Deal, its timeline will appear here.</span><Link href="/marketplace">Browse trusted sellers →</Link></div>}</section></main>;
}