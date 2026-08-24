# TrustPay Financial Engine

## Boundary

The financial engine is independent from the Deal engine. A Deal defines commercial terms; immutable provider events and balanced ledger journals define financial facts. TrustPay does not custody money: licensed PSPs, banks, and mobile-money partners will collect, safeguard, settle, and pay out funds.

## Payment flow

1. A buyer creates an idempotent Payment Intent for a Deal in `awaiting_payment`.
2. A provider adapter creates a payment request; the intent remains `pending`.
3. A signed provider webhook is persisted once by `(providerCode, providerEventId)`.
4. A verified confirmation creates a FinancialEvent, posts a balanced journal, and moves the Deal to `payment_secured`.

Clients cannot set `payment_secured`; only verified provider events can do so. The bundled mock provider is development-only.

## Ledger

Journal entries contain immutable debit and credit lines. The ledger service rejects unbalanced entries before persistence, using integer minor-unit comparison. Payment confirmation debits Customer Payment Clearing and credits Protected Transaction Liability for the same currency and amount. Balances are future projections over posted lines, not mutable fields.

## Financial workflows

Payment intents support created, pending, authorized, confirmed, failed, cancelled, and refunded states. Settlements are created only for completed Deals and do not execute payouts. Refund requests are persisted with immutable financial events; provider execution is deferred. Reconciliation models external transactions and review outcomes without assuming provider reports are authoritative.

## Security

Financial operations require authenticated authorization, Deal ownership, idempotency keys, immutable event records, references, audit entries, and webhook signature verification. AI configurations may summarize or detect anomalies but cannot post journals, execute payouts, modify accounts, or bypass provider verification.
