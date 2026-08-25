'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../components/api';

type Deal = {
  id: string;
  reference: string;
  title: string;
  amount: string | number;
  currency: string;
  status: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
};

type Payment = {
  id: string;
  reference: string;
  amount: string | number;
  currency: string;
  status: string;
  deal: { reference: string; title: string; status: string };
};

type Settlement = {
  id: string;
  reference: string;
  amount: string | number;
  currency: string;
  status: string;
  beneficiaryId: string;
};

type Dispute = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  deal: { reference: string; title: string; buyerId: string; sellerId: string };
};

type Metrics = {
  totalVolume: number;
  active: number;
  completed: number;
  confirmations: number;
  pendingSettlements: number;
  failedPayments: number;
  fees: number;
};

const navigation = [
  'Overview',
  'Transactions',
  'Escrow',
  'Settlements',
  'Disputes',
  'Trust & Safety',
  'Ledger',
  'Users'
];

export default function OperationsDashboardPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeView, setActiveView] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiRequest<Deal[]>('/deals'),
      apiRequest<Payment[]>('/financial/payment-intents'),
      apiRequest<Settlement[]>('/financial/settlements'),
      apiRequest<Dispute[]>('/admin/trust/disputes')
    ])
      .then(([nextDeals, nextPayments, nextSettlements, nextDisputes]) => {
        if (!mounted) return;
        setDeals(nextDeals);
        setPayments(nextPayments);
        setSettlements(nextSettlements);
        setDisputes(nextDisputes);
      })
      .catch(() => {
        if (mounted)
          setError(
            'Operations data could not be loaded. Confirm your staff session and API connection.'
          );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const totalVolume = deals.reduce((sum, deal) => sum + Number(deal.amount), 0);
    return {
      totalVolume,
      active: deals.filter(
        (deal) => !['completed', 'cancelled', 'released', 'refunded'].includes(deal.status)
      ).length,
      completed: deals.filter((deal) => ['completed', 'released'].includes(deal.status)).length,
      confirmations: deals.filter((deal) =>
        ['delivered', 'inspection_period', 'buyer_confirmed'].includes(deal.status)
      ).length,
      pendingSettlements: settlements.filter((settlement) =>
        ['created', 'processing'].includes(settlement.status)
      ).length,
      failedPayments: payments.filter((payment) => payment.status === 'failed').length,
      fees: deals.reduce((sum, deal) => sum + Number(deal.amount) * 0.015, 0)
    };
  }, [deals, payments, settlements]);

  const visibleDeals =
    activeView === 'Escrow'
      ? deals.filter((deal) =>
          [
            'payment_secured',
            'seller_accepted',
            'fulfillment_started',
            'delivered',
            'inspection_period',
            'buyer_confirmed'
          ].includes(deal.status)
        )
      : deals;

  return (
    <main className="ops-app">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <span className="brand-mark">T</span>
          <span>TrustPay</span>
        </div>
        <div className="ops-sidebar-label">Operations</div>
        <nav className="ops-nav" aria-label="Operations navigation">
          {navigation.map((item, index) => (
            <button
              className={activeView === item ? 'ops-nav-item active' : 'ops-nav-item'}
              key={item}
              onClick={() => setActiveView(item)}
            >
              <span className="nav-glyph">{['◈', '↗', '◌', '⌁', '!', '≡', '○'][index]}</span>
              {item}
              {item === 'Disputes' && <span className="nav-badge">—</span>}
            </button>
          ))}
        </nav>
        <div className="ops-sidebar-footer">
          <span className="status-dot" />
          Protected environment<span>v0.1 foundation</span>
        </div>
      </aside>

      <section className="ops-main">
        <header className="ops-topbar">
          <div>
            <span className="crumb">TRUSTPAY / INTERNAL OPERATIONS</span>
            <h1>{activeView === 'Overview' ? 'Good morning, operator' : activeView}</h1>
          </div>
          <div className="operator-chip">
            <span className="avatar">OP</span>
            <span>Operations desk</span>
            <span className="chevron">⌄</span>
          </div>
        </header>
        <div className="ops-content">
          {error && <div className="ops-alert">{error}</div>}
          {activeView === 'Overview' && (
            <Overview metrics={metrics} loading={loading} deals={deals} settlements={settlements} />
          )}
          {activeView === 'Transactions' && <Transactions deals={deals} loading={loading} />}
          {activeView === 'Escrow' && (
            <Transactions deals={visibleDeals} loading={loading} escrow />
          )}
          {activeView === 'Settlements' && (
            <Settlements settlements={settlements} loading={loading} />
          )}
          {activeView === 'Disputes' && <Disputes disputes={disputes} loading={loading} />}
          {activeView === 'Trust & Safety' && (
            <TrustSafetyOverview
              deals={deals}
              disputes={disputes}
              settlements={settlements}
              loading={loading}
            />
          )}
          {activeView === 'Ledger' && (
            <Unavailable
              title="Financial ledger"
              detail="Ledger detail reads are intentionally withheld until a read-only ledger endpoint is available."
            />
          )}
          {activeView === 'Users' && (
            <Unavailable
              title="Buyer and seller directory"
              detail="User directory data is protected behind the existing identity boundary and is not yet available to this console."
            />
          )}
        </div>
      </section>
    </main>
  );
}

function Overview({
  metrics,
  loading,
  deals,
  settlements
}: {
  metrics: Metrics;
  loading: boolean;
  deals: Deal[];
  settlements: Settlement[];
}) {
  const cards = [
    ['Escrow volume', formatMoney(metrics.totalVolume), 'Across visible Deals', 'green'],
    ['Active escrow', String(metrics.active), 'Awaiting a next action', 'blue'],
    ['Completed', String(metrics.completed), 'Released or completed Deals', 'purple'],
    ['Pending confirmation', String(metrics.confirmations), 'Delivery and inspection', 'orange'],
    ['Pending settlements', String(metrics.pendingSettlements), 'Payables in progress', 'blue'],
    ['Platform fees', formatMoney(metrics.fees), 'Planning estimate only', 'green']
  ];
  return (
    <>
      <div className="ops-section-heading">
        <div>
          <span className="section-kicker">LIVE CONTROL ROOM</span>
          <h2>TrustPay overview</h2>
        </div>
        <span className="last-sync">
          <span className="status-dot" />
          Connected to API
        </span>
      </div>
      <div className="metric-grid">
        {cards.map(([label, value, note, tone]) => (
          <article className={`metric-card ${tone}`} key={label}>
            <span className="metric-label">{label}</span>
            <strong>{loading ? '—' : value}</strong>
            <span className="metric-note">{note}</span>
          </article>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">FLOW OVER TIME</span>
              <h3>Transaction volume</h3>
            </div>
            <span className="period-pill">Last 30 days⌄</span>
          </div>
          <div className="fake-chart">
            <div className="chart-y">
              <span>100k</span>
              <span>75k</span>
              <span>50k</span>
              <span>25k</span>
              <span>0</span>
            </div>
            <div className="chart-area">
              <div className="chart-line" />
              <div className="chart-fill" />
              <div className="chart-x">
                <span>01 Aug</span>
                <span>08 Aug</span>
                <span>15 Aug</span>
                <span>22 Aug</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">CURRENT MIX</span>
              <h3>Escrow status</h3>
            </div>
            <span className="mini-total">{deals.length} total</span>
          </div>
          <StatusMix deals={deals} />
        </section>
      </div>
      <div className="overview-grid lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">LATEST ACTIVITY</span>
              <h3>Recent transactions</h3>
            </div>
            <span className="view-link">View all →</span>
          </div>
          <TransactionRows deals={deals.slice(0, 5)} />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">SETTLEMENT HEALTH</span>
              <h3>Seller settlements</h3>
            </div>
          </div>
          <SettlementRows settlements={settlements.slice(0, 4)} />
        </section>
      </div>
    </>
  );
}

function Transactions({
  deals,
  loading,
  escrow = false
}: {
  deals: Deal[];
  loading: boolean;
  escrow?: boolean;
}) {
  return (
    <>
      <div className="ops-section-heading">
        <div>
          <span className="section-kicker">
            {escrow ? 'FUNDS IN MOTION' : 'ALL COMMERCIAL ACTIVITY'}
          </span>
          <h2>{escrow ? 'Escrow monitoring' : 'Transactions'}</h2>
        </div>
        <div className="filter-row">
          <button className="filter-button">All statuses⌄</button>
          <button className="filter-button">Search transactions</button>
        </div>
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <span>{loading ? 'Loading records…' : `${deals.length} records`}</span>
          <span className="read-only">READ ONLY</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Transaction</th>
                <th>Parties</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td className="mono">{deal.reference}</td>
                  <td>
                    <strong>{deal.title}</strong>
                    <span className="subtle">{deal.id.slice(0, 8)}…</span>
                  </td>
                  <td>
                    <span className="subtle">Buyer {deal.buyerId.slice(0, 6)}…</span>
                    <span className="subtle">Seller {deal.sellerId.slice(0, 6)}…</span>
                  </td>
                  <td className="amount">{formatMoney(Number(deal.amount), deal.currency)}</td>
                  <td>
                    <Status status={deal.status} />
                  </td>
                  <td className="subtle">{formatDate(deal.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!deals.length && (
            <Empty
              title="No transactions yet"
              detail="Transactions will appear here once the API returns visible Deals."
            />
          )}
        </div>
      </section>
    </>
  );
}

function Settlements({ settlements, loading }: { settlements: Settlement[]; loading: boolean }) {
  return (
    <>
      <div className="ops-section-heading">
        <div>
          <span className="section-kicker">PAYOUT OPERATIONS</span>
          <h2>Settlements</h2>
        </div>
        <span className="read-only">READ ONLY</span>
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <span>{loading ? 'Loading records…' : `${settlements.length} settlement records`}</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Seller</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((settlement) => (
                <tr key={settlement.id}>
                  <td className="mono">{settlement.reference}</td>
                  <td className="subtle">{settlement.beneficiaryId.slice(0, 12)}…</td>
                  <td className="amount">
                    {formatMoney(Number(settlement.amount), settlement.currency)}
                  </td>
                  <td>
                    <Status status={settlement.status} />
                  </td>
                  <td className="subtle">—</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!settlements.length && (
            <Empty
              title="No settlement records"
              detail="Settlement records will appear after an authorized payable is created."
            />
          )}
        </div>
      </section>
    </>
  );
}

function Disputes({ disputes, loading }: { disputes: Dispute[]; loading: boolean }) {
  return (
    <>
      <div className="ops-section-heading">
        <div>
          <span className="section-kicker">CASE REVIEW</span>
          <h2>Dispute queue</h2>
        </div>
        <span className="read-only">READ ONLY</span>
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <span>{loading ? 'Loading records…' : `${disputes.length} dispute records`}</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Reason</th>
                <th>Transaction</th>
                <th>Parties</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => (
                <tr key={dispute.id}>
                  <td>
                    <strong>{dispute.reason}</strong>
                    <span className="subtle">{dispute.id.slice(0, 8)}…</span>
                  </td>
                  <td>
                    <strong>{dispute.deal.reference}</strong>
                    <span className="subtle">{dispute.deal.title}</span>
                  </td>
                  <td>
                    <span className="subtle">Buyer {dispute.deal.buyerId.slice(0, 6)}…</span>
                    <span className="subtle">Seller {dispute.deal.sellerId.slice(0, 6)}…</span>
                  </td>
                  <td>
                    <Status status={dispute.status} />
                  </td>
                  <td className="subtle">{formatDate(dispute.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!disputes.length && (
            <Empty
              title="No dispute records"
              detail="Dispute cases will appear here once participants open a case."
            />
          )}
        </div>
      </section>
    </>
  );
}

function TrustSafetyOverview({
  deals,
  disputes,
  settlements,
  loading
}: {
  deals: Deal[];
  disputes: Dispute[];
  settlements: Settlement[];
  loading: boolean;
}) {
  const metrics = useMemo(
    () => ({
      openRisk: disputes.filter((dispute) =>
        ['open', 'under_review', 'resolution_proposed'].includes(dispute.status)
      ).length,
      highPriority: deals.filter((deal) =>
        ['disputed', 'cancelled', 'refunded'].includes(deal.status)
      ).length,
      verificationFailures: settlements.filter((settlement) => settlement.status === 'failed')
        .length,
      refundAnomalies: deals.filter((deal) => ['refunded', 'cancelled'].includes(deal.status))
        .length
    }),
    [deals, disputes, settlements]
  );

  return (
    <>
      <div className="ops-section-heading">
        <div>
          <span className="section-kicker">TRUST & SAFETY</span>
          <h2>Risk command center</h2>
        </div>
        <Link href="/operations/risk" className="view-link">
          Open risk queue →
        </Link>
      </div>
      <div className="metric-grid">
        <article className="metric-card blue">
          <span className="metric-label">Open risk cases</span>
          <strong>{loading ? '—' : String(metrics.openRisk)}</strong>
          <span className="metric-note">Human review queue</span>
        </article>
        <article className="metric-card orange">
          <span className="metric-label">High priority</span>
          <strong>{loading ? '—' : String(metrics.highPriority)}</strong>
          <span className="metric-note">Escalation candidates</span>
        </article>
        <article className="metric-card purple">
          <span className="metric-label">Verification issues</span>
          <strong>{loading ? '—' : String(metrics.verificationFailures)}</strong>
          <span className="metric-note">Review or follow-up</span>
        </article>
        <article className="metric-card green">
          <span className="metric-label">Refund anomalies</span>
          <strong>{loading ? '—' : String(metrics.refundAnomalies)}</strong>
          <span className="metric-note">Protected transaction review</span>
        </article>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">ADVISORY</span>
            <h3>Safety operating model</h3>
          </div>
        </div>
        <p className="subtle">
          Risk signals remain explainable and advisory. Human reviewers remain the authority for
          operational decisions, and no frontend interface is allowed to freeze funds or suspend
          accounts.
        </p>
      </section>
    </>
  );
}

function StatusMix({ deals }: { deals: Deal[] }) {
  const groups = [
    ['Awaiting payment', ['awaiting_payment', 'created'], '#ef9c52'],
    ['Escrow holding', ['payment_secured', 'seller_accepted'], '#5a8df6'],
    [
      'In fulfillment',
      ['fulfillment_started', 'delivered', 'inspection_period', 'buyer_confirmed'],
      '#8d78e6'
    ],
    ['Released', ['released', 'completed'], '#4cb58a']
  ];
  return (
    <div className="status-mix">
      {groups.map(([label, states, color]) => {
        const count = deals.filter((deal) => (states as string[]).includes(deal.status)).length;
        const width = deals.length ? Math.max(6, (count / deals.length) * 100) : 6;
        return (
          <div className="mix-row" key={label as string}>
            <div>
              <span className="mix-dot" style={{ background: color as string }} />
              {label}
              <strong>{count}</strong>
            </div>
            <div className="mix-track">
              <span style={{ width: `${width}%`, background: color as string }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TransactionRows({ deals }: { deals: Deal[] }) {
  return (
    <div className="compact-list">
      {deals.map((deal) => (
        <div className="compact-row" key={deal.id}>
          <span className="row-icon">↗</span>
          <div>
            <strong>{deal.title}</strong>
            <span className="subtle">
              {deal.reference} · {formatDate(deal.createdAt)}
            </span>
          </div>
          <div className="row-right">
            <strong>{formatMoney(Number(deal.amount), deal.currency)}</strong>
            <Status status={deal.status} />
          </div>
        </div>
      ))}
      {!deals.length && (
        <Empty title="No recent activity" detail="The latest activity feed is empty." />
      )}
    </div>
  );
}
function SettlementRows({ settlements }: { settlements: Settlement[] }) {
  return (
    <div className="compact-list">
      {settlements.map((settlement) => (
        <div className="compact-row" key={settlement.id}>
          <span className="row-icon payout">⌁</span>
          <div>
            <strong>{settlement.reference}</strong>
            <span className="subtle">Seller {settlement.beneficiaryId.slice(0, 8)}…</span>
          </div>
          <div className="row-right">
            <strong>{formatMoney(Number(settlement.amount), settlement.currency)}</strong>
            <Status status={settlement.status} />
          </div>
        </div>
      ))}
      {!settlements.length && (
        <Empty title="No settlement activity" detail="Settlement activity will appear here." />
      )}
    </div>
  );
}
function Status({ status }: { status: string }) {
  const clean = status.replaceAll('_', ' ');
  return <span className={`status status-${status}`}>{clean}</span>;
}
function Unavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <div className="ops-section-heading">
        <div>
          <span className="section-kicker">ACCESS CONTROLLED</span>
          <h2>{title}</h2>
        </div>
        <span className="read-only">NO DATA SOURCE</span>
      </div>
      <section className="panel unavailable">
        <span className="unavailable-mark">—</span>
        <h3>Awaiting an authorized read endpoint</h3>
        <p>{detail}</p>
      </section>
    </>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}
function formatMoney(value: number, currency = 'GHS') {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value || 0);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}
