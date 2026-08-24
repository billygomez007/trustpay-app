'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getFraudCase, type FraudCase, updateFraudCase } from '../../../../components/api';

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-GH');
}

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function RiskCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [caseData, setCaseData] = useState<FraudCase | null>(null);
  const [status, setStatus] = useState('open');
  const [reviewer, setReviewer] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void params
      .then(({ id }) => getFraudCase(id))
      .then((item) => {
        if (!mounted) return;
        setCaseData(item);
        setStatus(item.status);
        setReviewer(item.assignedReviewerId ?? '');
        setNote(item.investigationNotes ?? '');
      })
      .catch(() => {
        if (mounted) setError('This risk case could not be loaded.');
      });
    return () => {
      mounted = false;
    };
  }, [params]);

  const accountLabel = useMemo(() => caseData?.business?.name ?? caseData?.user?.email ?? 'Unassigned subject', [caseData]);

  const submitAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caseData) return;
    const payload: {
      status: 'open' | 'investigating' | 'under_review' | 'more_information_required' | 'resolved' | 'cleared' | 'action_required' | 'dismissed' | 'closed';
      assignedReviewerId: string | null;
      investigationNotes?: string;
    } = {
      status: status as 'open' | 'investigating' | 'under_review' | 'more_information_required' | 'resolved' | 'cleared' | 'action_required' | 'dismissed' | 'closed',
      assignedReviewerId: reviewer || null
    };
    if (note.trim()) payload.investigationNotes = note.trim();
    try {
      await updateFraudCase(caseData.id, payload);
      const refreshed = await getFraudCase(caseData.id);
      setCaseData(refreshed);
      setStatus(refreshed.status);
      setReviewer(refreshed.assignedReviewerId ?? '');
      setNote(refreshed.investigationNotes ?? '');
      setError(null);
    } catch {
      setError('The review update could not be saved.');
    }
  };

  if (!caseData) {
    return (
      <main className="ops-app">
        <div className="ops-main">
          <header className="ops-topbar">
            <div>
              <span className="crumb">TRUSTPAY / CASE WORKSPACE</span>
              <h1>Risk case</h1>
            </div>
          </header>
          <div className="ops-content">
            <div className="panel customer-empty">{error ?? 'Loading risk case…'}</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ops-app">
      <aside className="ops-sidebar">
        <div className="ops-brand"><span className="brand-mark">T</span><span>TrustPay</span></div>
        <div className="ops-sidebar-label">Case</div>
        <nav className="ops-nav" aria-label="Case navigation">
          <Link className="ops-nav-item" href="/operations/risk">← Risk queue</Link>
          <Link className="ops-nav-item active" href="#">Case workspace</Link>
        </nav>
      </aside>

      <section className="ops-main">
        <header className="ops-topbar">
          <div>
            <span className="crumb">RISK / CASE WORKSPACE</span>
            <h1>{caseData.reason}</h1>
          </div>
          <div className="operator-chip"><span className="avatar">RS</span><span>{titleCase(caseData.riskLevel)}</span></div>
        </header>

        <div className="ops-content">
          {error && <div className="ops-alert">{error}</div>}

          <div className="metric-grid">
            <article className="metric-card blue">
              <span className="metric-label">Account</span>
              <strong>{accountLabel}</strong>
              <span className="metric-note">{caseData.user ? 'Customer account' : 'Business account'}</span>
            </article>
            <article className="metric-card orange">
              <span className="metric-label">Status</span>
              <strong>{titleCase(caseData.status)}</strong>
              <span className="metric-note">Current review state</span>
            </article>
            <article className="metric-card purple">
              <span className="metric-label">Opened</span>
              <strong>{formatDate(caseData.createdAt)}</strong>
              <span className="metric-note">Case created</span>
            </article>
            <article className="metric-card green">
              <span className="metric-label">Reviewer</span>
              <strong>{caseData.assignedReviewerId ? caseData.assignedReviewerId.slice(0, 12) : 'Unassigned'}</strong>
              <span className="metric-note">Assigned operator</span>
            </article>
          </div>

          <div className="overview-grid lower">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">ACCOUNT CONTEXT</span>
                  <h3>Trust and verification status</h3>
                </div>
              </div>
              <div className="detail-list">
                <div><span>Subject</span><strong>{accountLabel}</strong></div>
                <div><span>Risk level</span><strong>{titleCase(caseData.riskLevel)}</strong></div>
                <div><span>Case status</span><strong>{titleCase(caseData.status)}</strong></div>
                <div><span>Review notes</span><strong>{caseData.investigationNotes ?? 'No notes yet'}</strong></div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">HUMAN REVIEW</span>
                  <h3>Internal actions</h3>
                </div>
              </div>
              <form className="detail-form" onSubmit={submitAction}>
                <label>
                  Status
                  <select value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="under_review">Under review</option>
                    <option value="more_information_required">More information required</option>
                    <option value="action_required">Action required</option>
                    <option value="cleared">Cleared</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <label>
                  Assigned reviewer
                  <input value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="Reviewer ID" />
                </label>
                <label>
                  Internal note
                  <textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain findings and next steps." />
                </label>
                <button type="submit">Save review update</button>
              </form>
            </section>
          </div>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">SIGNALS</span>
                <h3>Explainable risk signals</h3>
              </div>
            </div>
            <div className="detail-stack">
              {(caseData.signals ?? []).map((signal) => (
                <article className="detail-card" key={signal.id}>
                  <div className="section-title">
                    <div>
                      <span className="market-eyebrow">{titleCase(signal.signalType)}</span>
                      <h2>{titleCase(signal.severity)}</h2>
                    </div>
                  </div>
                  <p>{signal.explanation}</p>
                  <div className="detail-list">
                    <div><span>Source</span><strong>{String((signal.metadata as Record<string, unknown> | null)?.source ?? 'risk-evaluation')}</strong></div>
                    <div><span>Created</span><strong>{formatDate(signal.createdAt)}</strong></div>
                  </div>
                </article>
              ))}
              {!caseData.signals?.length && <div className="customer-empty"><strong>No signals recorded.</strong><span>This case has no connected risk-signal records.</span></div>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
