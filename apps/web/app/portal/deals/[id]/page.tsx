'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  confirmDelivery,
  getCurrentUser,
  getCustomerDeal,
  openDispute,
  prepareOrderPayment,
  proposeDealAmendment,
  reviewDealAmendment,
  submitDisputeEvidence,
  transitionDeal,
  type CustomerDeal,
  type CurrentUser,
  type DealAmendment
} from '../../../components/api';

const timelineLabels: Record<string, string> = {
  'deal.created': 'Transaction created',
  'deal.invitation.created': 'Invitation sent',
  'deal.invitation.viewed': 'Invitation viewed',
  'deal.invitation.accepted': 'Invitation accepted',
  'deal.invitation.declined': 'Invitation declined',
  'deal.awaiting_payment': 'Payment required',
  'deal.payment_secured': 'Funds protected by TrustPay',
  'deal.parties_accepted': 'Both parties accepted',
  'deal.seller_accepted': 'Seller accepted',
  'deal.fulfillment_started': 'Work in progress',
  'deal.delivered': 'Fulfillment submitted',
  'deal.buyer_confirmed': 'Buyer confirmed',
  'deal.release_pending': 'Release pending',
  'deal.released': 'Funds released',
  'deal.completed': 'Transaction completed',
  'deal.cancelled': 'Transaction cancelled',
  'deal.disputed': 'Dispute opened',
  'deal.dispute.opened': 'Dispute opened',
  'deal.dispute.response_submitted': 'Dispute response submitted',
  'deal.dispute.evidence_submitted': 'Evidence submitted',
  'deal.dispute.resolution_proposed': 'Resolution proposed',
  'deal.dispute.resolution_accepted': 'Resolution accepted',
  'deal.dispute.resolution_rejected': 'Resolution rejected',
  'deal.dispute.decided': 'Decision made',
  'deal.amendment.proposed': 'Agreement amended',
  'deal.amendment.accepted': 'Amendment accepted',
  'deal.amendment.rejected': 'Amendment rejected'
};

const statusLabels: Record<string, string> = {
  created: 'Agreement created',
  awaiting_payment: 'Payment required',
  payment_secured: 'Funds protected by TrustPay',
  seller_accepted: 'Seller accepted',
  fulfillment_started: 'Work in progress',
  delivered: 'Completion submitted',
  inspection_period: 'Inspection period',
  buyer_confirmed: 'Confirmed by customer',
  release_pending: 'Release pending',
  released: 'Funds released',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'In dispute',
  refunded: 'Refunded',
  expired: 'Expired'
};

function formatStatus(status: string) {
  return statusLabels[status] ?? status.replaceAll('_', ' ');
}

function buildTimeline(deal: CustomerDeal) {
  const amendmentEvents = (deal.amendments ?? []).flatMap((amendment) => {
    const changes = amendment.changes as {
      reason?: string;
      reviewedAt?: string;
      reviewedById?: string;
    };
    const base = new Date(amendment.createdAt).toISOString();
    const created = {
      id: amendment.id,
      action: 'deal.amendment.proposed',
      actorId: amendment.actorId,
      createdAt: base
    };
    const reviewedAt = typeof changes.reviewedAt === 'string' ? changes.reviewedAt : null;
    const reviewed =
      reviewedAt && amendment.status !== 'requested'
        ? [
            {
              id: `${amendment.id}-review`,
              action: `deal.amendment.${amendment.status}`,
              actorId: changes.reviewedById ?? null,
              createdAt: reviewedAt
            }
          ]
        : [];
    return [created, ...reviewed];
  });
  const disputeEvents = (deal.disputes ?? []).flatMap((dispute) => [
    {
      id: dispute.id,
      action: 'deal.dispute.opened',
      actorId: null,
      createdAt: dispute.createdAt
    },
    ...(dispute.responseAt
      ? [
          {
            id: `${dispute.id}-response`,
            action: 'deal.dispute.response_submitted',
            actorId: dispute.responseById,
            createdAt: dispute.responseAt
          }
        ]
      : []),
    ...(dispute.resolutionProposal
      ? [
          {
            id: `${dispute.id}-proposal`,
            action: 'deal.dispute.resolution_proposed',
            actorId: dispute.resolutionProposal.proposedById,
            createdAt: dispute.resolutionProposal.proposedAt
          }
        ]
      : []),
    ...(dispute.resolutionDecisionAt && dispute.resolutionDecision
      ? [
          {
            id: `${dispute.id}-decision`,
            action:
              dispute.resolutionDecision === 'accepted'
                ? 'deal.dispute.resolution_accepted'
                : dispute.resolutionDecision === 'rejected'
                  ? 'deal.dispute.resolution_rejected'
                  : 'deal.dispute.decided',
            actorId: dispute.resolutionDecisionById,
            createdAt: dispute.resolutionDecisionAt
          }
        ]
      : []),
    ...dispute.evidence.map((evidence) => ({
      id: evidence.id,
      action: 'deal.dispute.evidence_submitted',
      actorId: null,
      createdAt: evidence.createdAt
    })),
    ...dispute.decisions.map((decision) => ({
      id: decision.id,
      action: 'deal.dispute.decided',
      actorId: null,
      createdAt: decision.createdAt
    }))
  ]);
  return [...(deal.events ?? []), ...amendmentEvents, ...disputeEvents].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [deal, setDeal] = useState<CustomerDeal | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [message, setMessage] = useState('');
  const [amendmentReason, setAmendmentReason] = useState('');
  const [amendmentTitle, setAmendmentTitle] = useState('');
  const [amendmentDescription, setAmendmentDescription] = useState('');
  const [amendmentAmount, setAmendmentAmount] = useState('');
  const [amendmentCurrency, setAmendmentCurrency] = useState('GHS');
  const [amendmentInspectionHours, setAmendmentInspectionHours] = useState('');
  const [amendmentDelivery, setAmendmentDelivery] = useState('');
  const [amendmentCancellation, setAmendmentCancellation] = useState('');
  const [evidenceKind, setEvidenceKind] = useState('document');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [disputeReason, setDisputeReason] = useState('');

  useEffect(() => {
    void getCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    void params
      .then(({ id }) => getCustomerDeal(id))
      .then(setDeal)
      .catch(() => setMessage('This transaction could not be loaded.'));
  }, [params]);

  const role = useMemo(() => {
    if (!deal || !currentUser) return null;
    if (currentUser.id === deal.buyerId) return 'buyer';
    if (currentUser.id === deal.sellerId) return 'seller';
    return null;
  }, [deal, currentUser]);

  const timeline = useMemo(() => (deal ? buildTimeline(deal) : []), [deal]);
  const pendingAmendments = useMemo(
    () => (deal?.amendments ?? []).filter((amendment) => amendment.status === 'requested'),
    [deal]
  );
  const openDisputeEntry = useMemo(
    () =>
      (deal?.disputes ?? []).find(
        (item) => item.status !== 'resolved' && item.status !== 'dismissed'
      ),
    [deal]
  );

  if (!deal) {
    return (
      <main className="customer-page">
        <header className="customer-header">
          <Link href="/portal/deals">← Transactions</Link>
        </header>
        <div className="customer-empty">{message || 'Loading transaction…'}</div>
      </main>
    );
  }

  const isBuyer = role === 'buyer';
  const isSeller = role === 'seller';
  const submitAmendment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await proposeDealAmendment(deal.id, {
        reason: amendmentReason,
        ...(amendmentTitle ? { title: amendmentTitle } : {}),
        ...(amendmentDescription ? { description: amendmentDescription } : {}),
        ...(amendmentAmount
          ? { amount: { amount: amendmentAmount, currency: amendmentCurrency } }
          : {}),
        ...(amendmentInspectionHours
          ? { inspectionPeriodHours: Number(amendmentInspectionHours) }
          : {}),
        ...(amendmentDelivery ? { deliveryExpectations: amendmentDelivery } : {}),
        ...(amendmentCancellation ? { cancellationRules: amendmentCancellation } : {})
      });
      setMessage('Amendment proposed for counterparty review.');
      setAmendmentReason('');
      setAmendmentTitle('');
      setAmendmentDescription('');
      setAmendmentAmount('');
      setAmendmentInspectionHours('');
      setAmendmentDelivery('');
      setAmendmentCancellation('');
    } catch {
      setMessage('The amendment could not be submitted.');
    }
  };

  const submitDispute = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await openDispute({
        dealId: deal.id,
        reason: disputeReason || 'Transaction dispute',
        description: evidenceDescription
      });
      setMessage('Dispute submitted for review.');
      setDisputeReason('');
      setEvidenceDescription('');
    } catch {
      setMessage('Dispute could not be submitted.');
    }
  };

  const submitEvidence = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!openDisputeEntry) {
      setMessage('Open a dispute before adding evidence.');
      return;
    }
    try {
      await submitDisputeEvidence(openDisputeEntry.id, {
        kind: evidenceKind,
        reference: evidenceReference,
        description: evidenceDescription
      });
      setMessage('Evidence added to the dispute.');
      setEvidenceReference('');
      setEvidenceDescription('');
    } catch {
      setMessage('Evidence could not be added.');
    }
  };

  const payNow = async () => {
    if (!deal.order) {
      setMessage('This protected transaction does not use an order payment flow.');
      return;
    }
    try {
      const payment = await prepareOrderPayment(deal.order.id, 'paystack');
      setMessage(`Payment intent created: ${payment.reference}. Continue in the payment flow.`);
    } catch {
      setMessage('Payment could not be prepared right now.');
    }
  };

  const confirmCompletion = async () => {
    try {
      await confirmDelivery(deal.id);
      setDeal({ ...deal, status: 'buyer_confirmed' });
      setMessage('Confirmation recorded.');
    } catch {
      setMessage('Confirmation is not available at this stage.');
    }
  };

  const moveForward = async () => {
    try {
      if (deal.status === 'payment_secured') {
        await transitionDeal(deal.id, 'seller_accepted');
        setDeal({ ...deal, status: 'seller_accepted' });
        setMessage('Transaction accepted.');
        return;
      }
      if (deal.status === 'seller_accepted') {
        await transitionDeal(deal.id, 'fulfillment_started');
        setDeal({ ...deal, status: 'fulfillment_started' });
        setMessage(
          deal.type === 'service'
            ? 'Service marked in progress.'
            : deal.type === 'property' || deal.type === 'rental'
              ? 'Rental or deposit flow marked active.'
              : 'Fulfillment started.'
        );
        return;
      }
      if (deal.status === 'fulfillment_started') {
        await transitionDeal(deal.id, 'delivered');
        setDeal({ ...deal, status: 'delivered' });
        setMessage(
          deal.type === 'service'
            ? 'Service completion submitted.'
            : deal.type === 'property' || deal.type === 'rental'
              ? 'Asset return or deposit review submitted.'
              : 'Fulfillment submitted.'
        );
      }
    } catch {
      setMessage('That action is not available right now.');
    }
  };

  const acceptAmendment = async (amendment: DealAmendment) => {
    try {
      await reviewDealAmendment(deal.id, amendment.id, {
        decision: 'accepted',
        reason: 'Accepted by counterparty'
      });
      setMessage('Amendment accepted.');
    } catch {
      setMessage('The amendment could not be accepted.');
    }
  };

  const rejectAmendment = async (amendment: DealAmendment) => {
    try {
      await reviewDealAmendment(deal.id, amendment.id, {
        decision: 'rejected',
        reason: 'Rejected by counterparty'
      });
      setMessage('Amendment rejected.');
    } catch {
      setMessage('The amendment could not be rejected.');
    }
  };

  return (
    <main className="customer-page detail-page">
      <header className="customer-header">
        <Link href="/portal/deals">← Transactions</Link>
        <span>Protected transaction</span>
        <span className="secure-label">● Secure</span>
      </header>

      <section className="detail-heading">
        <span className="market-eyebrow">{deal.reference}</span>
        <h1>{deal.title}</h1>
        <p>{deal.description || 'Protected transaction with TrustPay protection.'}</p>
        <div className="detail-amount">
          <strong>
            {deal.amount} {deal.currency}
          </strong>
          <span className={`customer-status ${deal.status}`}>{formatStatus(deal.status)}</span>
        </div>
      </section>

      <section className="detail-grid">
        <div className="detail-stack">
          <article className="detail-card">
            <div className="section-title">
              <div>
                <span className="market-eyebrow">AGREEMENT</span>
                <h2>Agreement terms</h2>
              </div>
            </div>
            <div className="detail-list">
              <div>
                <span>Type</span>
                <strong>{deal.type.replaceAll('_', ' ')}</strong>
              </div>
              <div>
                <span>Parties</span>
                <strong>
                  {deal.buyer?.profile?.name ?? deal.buyerId.slice(0, 8)} ·{' '}
                  {deal.seller?.profile?.name ?? deal.sellerId.slice(0, 8)}
                </strong>
              </div>
              <div>
                <span>Created</span>
                <strong>{new Date(deal.createdAt).toLocaleDateString('en-GH')}</strong>
              </div>
              <div>
                <span>Accepted</span>
                <strong>
                  {deal.terms?.acceptedAt
                    ? new Date(deal.terms.acceptedAt).toLocaleDateString('en-GH')
                    : 'Pending'}
                </strong>
              </div>
            </div>
            <div className="agreement-copy">
              <p>
                <strong>Description:</strong>{' '}
                {deal.description || 'No additional description provided.'}
              </p>
              <p>
                <strong>Release conditions:</strong>{' '}
                {deal.terms?.completionRequirements ||
                  'Release follows the protected transaction process.'}
              </p>
              <p>
                <strong>Return / deduction conditions:</strong>{' '}
                {deal.terms?.cancellationRules || 'Not specified yet.'}
              </p>
              <p>
                <strong>Additional notes:</strong> {deal.terms?.additionalNotes || 'None'}
              </p>
            </div>
          </article>

          <article className="detail-card">
            <div className="section-title">
              <div>
                <span className="market-eyebrow">TIMELINE</span>
                <h2>Transaction history</h2>
              </div>
            </div>
            <div className="timeline-panel-inner">
              {timeline.map((event, index) => (
                <div className="timeline-row" key={`${event.id}-${event.createdAt}`}>
                  <span
                    className={
                      index === timeline.length - 1 ? 'timeline-dot current' : 'timeline-dot'
                    }
                  />
                  <div>
                    <strong>
                      {timelineLabels[event.action] ?? event.action.replaceAll('.', ' ')}
                    </strong>
                    <span>{new Date(event.createdAt).toLocaleString('en-GH')}</span>
                  </div>
                </div>
              ))}
              {!timeline.length && (
                <div className="empty">
                  <strong>No transaction history yet</strong>
                  <span>Events will appear here as the protected transaction progresses.</span>
                </div>
              )}
            </div>
          </article>

          <article className="detail-card">
            <div className="section-title">
              <div>
                <span className="market-eyebrow">AMENDMENTS</span>
                <h2>Agreement amendments</h2>
              </div>
            </div>
            <div className="agreement-copy">
              <form className="detail-form" onSubmit={submitAmendment}>
                <label>
                  Reason
                  <input
                    value={amendmentReason}
                    onChange={(event) => setAmendmentReason(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Title
                  <input
                    value={amendmentTitle}
                    onChange={(event) => setAmendmentTitle(event.target.value)}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={amendmentDescription}
                    onChange={(event) => setAmendmentDescription(event.target.value)}
                    rows={3}
                  />
                </label>
                <div className="form-split">
                  <label>
                    Amount
                    <input
                      inputMode="decimal"
                      value={amendmentAmount}
                      onChange={(event) => setAmendmentAmount(event.target.value)}
                    />
                  </label>
                  <label>
                    Currency
                    <input
                      value={amendmentCurrency}
                      onChange={(event) => setAmendmentCurrency(event.target.value.toUpperCase())}
                    />
                  </label>
                </div>
                <label>
                  Inspection period hours
                  <input
                    inputMode="numeric"
                    value={amendmentInspectionHours}
                    onChange={(event) => setAmendmentInspectionHours(event.target.value)}
                  />
                </label>
                <label>
                  Delivery expectations
                  <textarea
                    value={amendmentDelivery}
                    onChange={(event) => setAmendmentDelivery(event.target.value)}
                    rows={3}
                  />
                </label>
                <label>
                  Return or deduction conditions
                  <textarea
                    value={amendmentCancellation}
                    onChange={(event) => setAmendmentCancellation(event.target.value)}
                    rows={3}
                  />
                </label>
                <button type="submit">Propose amendment</button>
              </form>

              <div className="amendment-list">
                {pendingAmendments.map((amendment) =>
                  (() => {
                    const changes = amendment.changes as { reason?: string };
                    return (
                      <article className="amendment-card" key={amendment.id}>
                        <strong>Pending amendment</strong>
                        <p>{changes.reason || 'Agreement change proposed.'}</p>
                        <small>
                          Submitted {new Date(amendment.createdAt).toLocaleString('en-GH')}
                        </small>
                        {(isBuyer || isSeller) && currentUser?.id !== amendment.actorId ? (
                          <div className="amendment-actions">
                            <button type="button" onClick={() => acceptAmendment(amendment)}>
                              Accept
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => rejectAmendment(amendment)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : null}
                      </article>
                    );
                  })()
                )}
                {!pendingAmendments.length && (
                  <div className="empty">
                    <strong>No pending amendments</strong>
                    <span>
                      Accepted agreement history is preserved here once a change is proposed.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </article>

          <article className="detail-card">
            <div className="section-title">
              <div>
                <span className="market-eyebrow">EVIDENCE</span>
                <h2>Evidence and dispute records</h2>
              </div>
            </div>
            <div className="agreement-copy">
              {deal.disputes?.map((dispute) => (
                <article className="support-card" key={dispute.id}>
                  <strong>{dispute.reason}</strong>
                  <p>{dispute.description}</p>
                  <span className={`customer-status ${dispute.status}`}>
                    {formatStatus(dispute.status)}
                  </span>
                  {dispute.evidence.map((evidence) => (
                    <div className="evidence-row" key={evidence.id}>
                      <span>{evidence.kind}</span>
                      <strong>{evidence.reference}</strong>
                    </div>
                  ))}
                </article>
              ))}
              {!deal.disputes?.length && (
                <div className="empty">
                  <strong>No disputes yet</strong>
                  <span>
                    Evidence and dispute records will appear here if the transaction is challenged.
                  </span>
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="protection-panel">
          <span className="shield">✓</span>
          <h2>Action center</h2>
          <p>Only valid next actions are shown for the current party and transaction state.</p>

          <div className="action-group">
            <div className="protection-rule">
              <span>Current status</span>
              <strong>{formatStatus(deal.status)}</strong>
            </div>
            {isBuyer && deal.order && ['created', 'awaiting_payment'].includes(deal.status) && (
              <button className="confirm-delivery" onClick={payNow}>
                Pay now <span>→</span>
              </button>
            )}
            {isSeller &&
              ['payment_secured', 'seller_accepted', 'fulfillment_started'].includes(
                deal.status
              ) && (
                <button className="confirm-delivery" onClick={moveForward}>
                  {deal.status === 'payment_secured'
                    ? 'Accept transaction'
                    : deal.status === 'seller_accepted'
                      ? 'Mark service in progress'
                      : deal.type === 'service'
                        ? 'Submit service completion'
                        : 'Confirm asset returned'}{' '}
                  <span>→</span>
                </button>
              )}
            {isBuyer && ['delivered', 'inspection_period'].includes(deal.status) && (
              <button className="confirm-delivery" onClick={confirmCompletion}>
                {deal.type === 'service' ? 'Confirm service completion' : 'Confirm receipt'}{' '}
                <span>→</span>
              </button>
            )}
            <details>
              <summary>Open dispute</summary>
              <form onSubmit={submitDispute}>
                <input
                  required
                  value={disputeReason}
                  onChange={(event) => setDisputeReason(event.target.value)}
                  placeholder="Issue title"
                />
                <textarea
                  required
                  value={evidenceDescription}
                  onChange={(event) => setEvidenceDescription(event.target.value)}
                  placeholder="Explain what happened"
                  rows={4}
                />
                <button type="submit">Open dispute</button>
              </form>
            </details>
            {openDisputeEntry && (
              <details>
                <summary>Upload evidence</summary>
                <form onSubmit={submitEvidence}>
                  <label>
                    Evidence type
                    <input
                      value={evidenceKind}
                      onChange={(event) => setEvidenceKind(event.target.value)}
                    />
                  </label>
                  <label>
                    Reference
                    <input
                      value={evidenceReference}
                      onChange={(event) => setEvidenceReference(event.target.value)}
                    />
                  </label>
                  <label>
                    Notes
                    <textarea
                      value={evidenceDescription}
                      onChange={(event) => setEvidenceDescription(event.target.value)}
                      rows={4}
                    />
                  </label>
                  <button type="submit">Add evidence</button>
                </form>
                <Link href={`/portal/disputes/${openDisputeEntry.id}`}>Open dispute case →</Link>
              </details>
            )}
          </div>

          <div className="party-summary">
            <div>
              <span>Buyer / customer</span>
              <strong>{deal.buyer?.profile?.name ?? deal.buyerId}</strong>
            </div>
            <div>
              <span>Seller / provider</span>
              <strong>{deal.seller?.profile?.name ?? deal.sellerId}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>{role || 'Participant'}</strong>
            </div>
          </div>

          {message && <small>{message}</small>}
        </aside>
      </section>
    </main>
  );
}
