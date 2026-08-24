'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  getCurrentUser,
  getDispute,
  proposeDisputeResolution,
  reviewDisputeResolution,
  submitDisputeEvidence,
  submitDisputeResponse,
  type CurrentUser,
  type DisputeCase
} from '../../../components/api';

function formatStatus(status: string) {
  return status.replaceAll('_', ' ');
}

export default function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [dispute, setDispute] = useState<DisputeCase | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionOutcome, setResolutionOutcome] = useState<'release' | 'refund' | 'partial_refund' | 'partial_release' | 'amend_terms'>('refund');
  const [evidenceKind, setEvidenceKind] = useState('document');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');

  useEffect(() => {
    void getCurrentUser().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    void params
      .then(({ id }) => getDispute(id))
      .then(setDispute)
      .catch(() => setMessage('This dispute could not be loaded.'));
  }, [params]);

  const role = useMemo(() => {
    if (!dispute || !currentUser) return null;
    if (currentUser.id === dispute.deal.buyerId) return 'buyer';
    if (currentUser.id === dispute.deal.sellerId) return 'seller';
    return null;
  }, [currentUser, dispute]);

  if (!dispute) {
    return (
      <main className="customer-page">
        <header className="customer-header">
          <Link href="/portal/disputes">← Disputes</Link>
        </header>
        <div className="customer-empty">{message || 'Loading dispute…'}</div>
      </main>
    );
  }

  const canRespond = Boolean(
    currentUser?.id &&
      role &&
      currentUser.id !== dispute.responseById &&
      currentUser.id !== dispute.openedById
  );
  const canReviewProposal = Boolean(
    currentUser?.id && dispute.resolutionProposal && currentUser.id !== dispute.resolutionProposal.proposedById
  );
  const canPropose = Boolean(
    currentUser?.id && role && dispute.status !== 'resolved' && currentUser.id !== dispute.resolutionDecisionById
  );

  const submitResponse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await submitDisputeResponse(dispute.id, response);
      setDispute(await getDispute(dispute.id));
      setMessage('Response submitted.');
      setResponse('');
    } catch {
      setMessage('The response could not be submitted.');
    }
  };

  const submitProposal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await proposeDisputeResolution(dispute.id, { outcome: resolutionOutcome, notes: resolutionNotes });
      setDispute(await getDispute(dispute.id));
      setMessage('Resolution proposal submitted.');
      setResolutionNotes('');
    } catch {
      setMessage('The proposal could not be submitted.');
    }
  };

  const submitDecision = async (decision: 'accepted' | 'rejected') => {
    try {
      await reviewDisputeResolution(dispute.id, { decision, reason: decision === 'accepted' ? 'Accepted by counterparty' : 'Rejected by counterparty' });
      setDispute(await getDispute(dispute.id));
      setMessage(decision === 'accepted' ? 'Resolution accepted.' : 'Resolution rejected.');
    } catch {
      setMessage('The resolution decision could not be submitted.');
    }
  };

  const submitEvidence = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await submitDisputeEvidence(dispute.id, {
        kind: evidenceKind,
        reference: evidenceReference,
        ...(evidenceDescription ? { description: evidenceDescription } : {})
      });
      setDispute(await getDispute(dispute.id));
      setMessage('Evidence added.');
      setEvidenceReference('');
      setEvidenceDescription('');
    } catch {
      setMessage('The evidence could not be added.');
    }
  };

  return (
    <main className="customer-page dispute-page">
      <header className="customer-header">
        <Link href="/portal/disputes">← Disputes</Link>
        <span>Case workspace</span>
        <span className="secure-label">● Secure</span>
      </header>

      <section className="detail-heading">
        <span className="market-eyebrow">{dispute.deal.reference}</span>
        <h1>{dispute.reason}</h1>
        <p>{dispute.description}</p>
        <div className="detail-amount">
          <strong>{formatStatus(dispute.status)}</strong>
          <span>Opened {new Date(dispute.createdAt).toLocaleDateString('en-GH')}</span>
        </div>
      </section>

      <section className="detail-grid">
        <div className="detail-stack">
          <article className="detail-card">
            <div className="section-title">
              <div>
                <span className="market-eyebrow">CLAIM</span>
                <h2>Transaction under review</h2>
              </div>
            </div>
            <div className="detail-list">
              <div>
                <span>Transaction</span>
                <strong>{dispute.deal.title}</strong>
              </div>
              <div>
                <span>Parties</span>
                <strong>
                  {dispute.deal.buyer?.profile?.name ?? dispute.deal.buyerId.slice(0, 8)} ·{' '}
                  {dispute.deal.seller?.profile?.name ?? dispute.deal.sellerId.slice(0, 8)}
                </strong>
              </div>
              <div>
                <span>Current status</span>
                <strong>{formatStatus(dispute.status)}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{role || 'Viewer'}</strong>
              </div>
            </div>
          </article>

          <article className="detail-card">
            <div className="section-title">
              <div>
                <span className="market-eyebrow">RESPONSE</span>
                <h2>Counterparty response</h2>
              </div>
            </div>
            {dispute.responseSummary ? (
              <div className="agreement-copy">
                <p>{dispute.responseSummary}</p>
                <p>
                  <strong>Submitted:</strong> {dispute.responseAt ? new Date(dispute.responseAt).toLocaleString('en-GH') : '—'}
                </p>
              </div>
            ) : (
              <div className="customer-empty">
                <strong>No response yet</strong>
                <span>The other party can answer the claim here.</span>
              </div>
            )}
            {canRespond && (
              <form className="detail-form" onSubmit={submitResponse}>
                <label>
                  Response
                  <textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={4} required />
                </label>
                <button type="submit">Submit response</button>
              </form>
            )}
          </article>

          <article className="detail-card">
            <div className="section-title">
              <div>
                <span className="market-eyebrow">RESOLUTION</span>
                <h2>Proposed outcome</h2>
              </div>
            </div>
            {dispute.resolutionProposal ? (
              <div className="agreement-copy">
                <p>
                  <strong>Outcome:</strong> {formatStatus(dispute.resolutionProposal.outcome)}
                </p>
                <p>{dispute.resolutionProposal.notes}</p>
                <p>
                  <strong>Decision:</strong> {formatStatus(dispute.resolutionDecision ?? 'pending')}
                </p>
              </div>
            ) : (
              <div className="customer-empty">
                <strong>No proposal yet</strong>
                <span>Either party can suggest a mutual resolution.</span>
              </div>
            )}
            {canPropose && (
              <form className="detail-form" onSubmit={submitProposal}>
                <label>
                  Outcome
                  <select value={resolutionOutcome} onChange={(event) => setResolutionOutcome(event.target.value as typeof resolutionOutcome)}>
                    <option value="refund">Refund</option>
                    <option value="release">Release funds</option>
                    <option value="partial_refund">Partial refund</option>
                    <option value="partial_release">Partial release</option>
                    <option value="amend_terms">Amend terms</option>
                  </select>
                </label>
                <label>
                  Notes
                  <textarea value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} rows={4} required />
                </label>
                <button type="submit">Propose resolution</button>
              </form>
            )}
            {canReviewProposal && dispute.resolutionProposal && (
              <div className="action-row">
                <button type="button" onClick={() => void submitDecision('accepted')}>
                  Accept
                </button>
                <button type="button" onClick={() => void submitDecision('rejected')}>
                  Dispute
                </button>
              </div>
            )}
          </article>
        </div>

        <aside className="protection-panel">
          <span className="shield">⚑</span>
          <h2>Evidence and audit trail</h2>
          <p>Submit supporting materials and review the history of the case.</p>
          <div className="action-group">
            <form className="detail-form" onSubmit={submitEvidence}>
              <label>
                Evidence type
                <input value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value)} />
              </label>
              <label>
                Reference
                <input value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} required />
              </label>
              <label>
                Notes
                <textarea value={evidenceDescription} onChange={(event) => setEvidenceDescription(event.target.value)} rows={4} />
              </label>
              <button type="submit">Add evidence</button>
            </form>
          </div>

          <div className="party-summary">
            <div>
              <span>Evidence</span>
              <strong>{dispute.evidence.length}</strong>
            </div>
            <div>
              <span>Staff decisions</span>
              <strong>{dispute.decisions.length}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>{role || 'Participant'}</strong>
            </div>
          </div>

          {dispute.evidence.map((item) => (
            <div className="support-card" key={item.id}>
              <strong>{item.kind}</strong>
              <span>{item.reference}</span>
              <small>{item.description || 'No notes provided.'}</small>
            </div>
          ))}

          {message && <small>{message}</small>}
        </aside>
      </section>
    </main>
  );
}
