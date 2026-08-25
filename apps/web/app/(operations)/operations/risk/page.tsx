'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  listFraudCases,
  listRiskSignals,
  type FraudCase,
  type RiskSignal
} from '../../../components/api';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GH');
}

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function TrustRiskQueuePage() {
  const [cases, setCases] = useState<FraudCase[]>([]);
  const [signals, setSignals] = useState<RiskSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [signalFilter, setSignalFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    Promise.all([listFraudCases(), listRiskSignals()])
      .then(([nextCases, nextSignals]) => {
        if (!mounted) return;
        setCases(nextCases);
        setSignals(nextSignals);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const signalTypes = useMemo(
    () => Array.from(new Set(signals.map((signal) => signal.signalType))).sort(),
    [signals]
  );

  const visibleCases = useMemo(() => {
    return cases.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || item.riskLevel === severityFilter;
      const matchesSignal =
        signalFilter === 'all' ||
        item.reason.toLowerCase().includes(signalFilter.toLowerCase()) ||
        item.signals?.some((signal) => signal.signalType === signalFilter);
      return matchesStatus && matchesSeverity && matchesSignal;
    });
  }, [cases, signalFilter, severityFilter, statusFilter]);

  const metrics = useMemo(
    () => ({
      open: cases.filter((item) =>
        [
          'open',
          'investigating',
          'under_review',
          'more_information_required',
          'action_required'
        ].includes(item.status)
      ).length,
      highPriority: cases.filter((item) =>
        ['high', 'critical', 'critical_review'].includes(item.riskLevel)
      ).length,
      disputed: signals.filter((signal) =>
        ['dispute_patterns', 'seller_risk', 'payment_mismatch', 'refund_pattern'].includes(
          signal.signalType
        )
      ).length,
      verificationIssues: signals.filter(
        (signal) =>
          signal.signalType.includes('verification') || signal.signalType.includes('identity')
      ).length
    }),
    [cases, signals]
  );

  return (
    <main className="ops-app">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <span className="brand-mark">T</span>
          <span>TrustPay</span>
        </div>
        <div className="ops-sidebar-label">Safety</div>
        <nav className="ops-nav" aria-label="Safety navigation">
          <Link className="ops-nav-item" href="/operations">
            Overview
          </Link>
          <Link className="ops-nav-item active" href="/operations/risk">
            Risk queue
          </Link>
        </nav>
        <div className="ops-sidebar-footer">
          <span className="status-dot" />
          Internal review only
        </div>
      </aside>

      <section className="ops-main">
        <header className="ops-topbar">
          <div>
            <span className="crumb">TRUSTPAY / RISK COMMAND CENTER</span>
            <h1>Review queue</h1>
          </div>
          <div className="operator-chip">
            <span className="avatar">TS</span>
            <span>Trust & Safety</span>
          </div>
        </header>

        <div className="ops-content">
          <div className="ops-section-heading">
            <div>
              <span className="section-kicker">OPERATIONS INTELLIGENCE</span>
              <h2>Risk overview</h2>
            </div>
          </div>

          <div className="metric-grid">
            <article className="metric-card blue">
              <span className="metric-label">Open cases</span>
              <strong>{loading ? '—' : String(metrics.open)}</strong>
              <span className="metric-note">Waiting for review</span>
            </article>
            <article className="metric-card orange">
              <span className="metric-label">High priority</span>
              <strong>{loading ? '—' : String(metrics.highPriority)}</strong>
              <span className="metric-note">Review escalation</span>
            </article>
            <article className="metric-card purple">
              <span className="metric-label">Disputed transactions</span>
              <strong>{loading ? '—' : String(metrics.disputed)}</strong>
              <span className="metric-note">Signals tied to protected deals</span>
            </article>
            <article className="metric-card green">
              <span className="metric-label">Verification issues</span>
              <strong>{loading ? '—' : String(metrics.verificationIssues)}</strong>
              <span className="metric-note">KYC and verification risk</span>
            </article>
          </div>

          <section className="panel table-panel">
            <div className="table-toolbar">
              <span>
                {loading
                  ? 'Loading risk queue…'
                  : `${visibleCases.length} case${visibleCases.length === 1 ? '' : 's'}`}
              </span>
              <div className="filter-row">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="under_review">Under review</option>
                  <option value="more_information_required">More information required</option>
                  <option value="action_required">Action required</option>
                  <option value="cleared">Cleared</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={severityFilter}
                  onChange={(event) => setSeverityFilter(event.target.value)}
                >
                  <option value="all">All severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                  <option value="critical_review">Critical review</option>
                </select>
                <select
                  value={signalFilter}
                  onChange={(event) => setSignalFilter(event.target.value)}
                >
                  <option value="all">All signal types</option>
                  {signalTypes.map((signalType) => (
                    <option key={signalType} value={signalType}>
                      {titleCase(signalType)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Account / Business</th>
                    <th>Risk level</th>
                    <th>Status</th>
                    <th>Flagged</th>
                    <th>Reviewer</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCases.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href={`/operations/risk/${item.id}`} className="view-link">
                          <strong>{item.reason}</strong>
                        </Link>
                        <span className="subtle">{item.id.slice(0, 8)}…</span>
                      </td>
                      <td>
                        <strong>
                          {item.business?.name ?? item.user?.email ?? 'Unassigned subject'}
                        </strong>
                        <span className="subtle">
                          {item.user?.email ?? item.business?.id ?? 'Internal review'}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge">{titleCase(item.riskLevel)}</span>
                      </td>
                      <td>{titleCase(item.status)}</td>
                      <td className="subtle">{formatDate(item.createdAt)}</td>
                      <td className="subtle">
                        {item.assignedReviewerId
                          ? item.assignedReviewerId.slice(0, 8)
                          : 'Unassigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleCases.length && !loading && (
                <div className="customer-empty">
                  <strong>No matching cases.</strong>
                  <span>Adjust the risk filters or review a new alert once it is created.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
