# TrustPay Protect

## User journey

Users create a protected Deal, identify the other party, agree to structured terms, track immutable
events, and complete delivery and inspection. A participant can open a dispute with an explanation
and evidence references. TrustPay does not expose Deal details to an invitation recipient before
they accept.

## Lifecycle and security

The intended lifecycle is draft, invited, parties accepted, awaiting payment, payment secured,
fulfillment, delivered, inspection period, completed, disputed, or cancelled. State changes are
validated on the backend. Only a payment-provider callback may secure payment. Deal access is
limited to authorized participants and applicable business members.

## AI boundary

Transaction Assistant, Deal Coordinator, and Customer Support AI are advisory. They may explain
states, guide users, and issue reminders, but cannot change a Deal, resolve a dispute, release
funds, or access unauthorized Deal data.
