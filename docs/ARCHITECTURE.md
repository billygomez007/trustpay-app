# TrustPay architecture

## Initial decisions

TrustPay is a pnpm/Turborepo TypeScript monorepo. Mobile, web, and API remain independently deployable while sharing contracts and cross-cutting policy packages. The web application contains separate route groups for business and internal operations rather than a separate deployment: this reduces duplicated UI and identity integration while authorization, API endpoints, and audit requirements remain independently enforced. If operational isolation requirements grow, the operations group can move to a dedicated deployment without changing domain contracts.

The API uses NestJS because its modules, dependency injection, guards, and transport adapters fit a regulated, integration-heavy backend. PostgreSQL is the primary system of record, and Prisma is selected for type-safe migrations, transaction support, and a mature TypeScript ecosystem. Redis and a durable queue are intentionally configuration-ready but not provisioned in this phase.

## Repository layout

```text
apps/
  api/       NestJS boundary for HTTP, webhooks, workers, and providers
  mobile/    Expo Router mobile application
  web/       Next.js business and operations dashboard
packages/
  api-client/ typed HTTP client boundary
  auth/       centralized roles and permissions
  config/     validated server configuration
  database/   Prisma schema and persistence conventions
  logging/    structured logging contract
  types/      shared domain vocabulary and provider interfaces
  validation/ shared Zod request/domain validation
```

## Client and API communication

Web and mobile call only versioned API endpoints through `@trustpay/api-client`; they never connect to PostgreSQL, payment providers, or secrets. The API validates all requests, authenticates sessions/tokens, resolves a tenant context, checks a centralized permission, and records sensitive actions. Provider callbacks enter a dedicated webhook boundary where signature verification, idempotency, persistence, and asynchronous processing happen before domain effects.

## Domain boundaries

The API is divided by bounded contexts: identity, businesses, verification, deals, payments, ledger, marketplace, fulfillment, disputes, notifications, audit, and AI workforce. `Deal` is the commercial agreement aggregate. Its lifecycle is state-machine driven and independently records payment, fulfillment, and dispute state. A deal is not a ledger entry and cannot be edited as a substitute for financial history.

## Authentication, authorization, and tenancy

Identity uses email/password registration with bcrypt password hashes, opaque random session tokens stored only as SHA-256 hashes, explicit expiry, and revocation. Web sessions are HttpOnly cookies and mobile sessions use platform secure storage. Password-reset and email-verification token models are present but their delivery and confirmation endpoints await an email provider. Phone, OTP, social login, MFA, device enrollment, and account recovery remain planned extensions.

Authorization uses roles mapped to permissions in `@trustpay/auth`; frontend navigation is advisory only, and API checks are authoritative. Business owners, admins, and staff are persisted as `BusinessMember` records. Business-scoped resources carry a `businessId`; every business API lookup derives membership from the authenticated session and uses tenant predicates, never a client claim alone. Internal staff roles are separate from business roles.

## Deal engine

Deals are durable commercial agreements with a buyer, seller, optional business tenant, type, monetary amount, currency, optional fee amount, and event history. The API creates Deals on behalf of the authenticated buyer; it does not accept a buyer ID from the client. Every create and transition writes a DealEvent and audit entry, and produces in-app notifications for the other party.

The server enforces this lifecycle: `created -> awaiting_payment -> payment_secured -> seller_accepted -> fulfillment_started -> delivered -> inspection_period -> completed`, with controlled `cancelled` and `disputed` exits. A client cannot mark payment secured; only a future verified provider callback can do that. Sellers own fulfillment transitions, buyers own completion, and all transitions are validated against the current state.

## Notifications and AI configuration

Notifications are persisted with channel and delivery status. Phase 2 creates in-app notifications only; email, SMS, WhatsApp, and push adapters are deliberately not connected. `AIEmployee` is a configuration record scoped optionally to a business and requires explicit status, permissions, and configuration. No AI endpoint or autonomous financial permission exists.

## Financial engine

Phase 3 adds a separate financial domain for provider adapters, payment intents, immutable financial events, fees, journal/ledger lines, settlements, refunds, reconciliation, and secure webhook records. Financial events—not frontend Deal mutations—are the only path to `payment_secured`. The complete operational design is in [FINANCIAL_ENGINE.md](FINANCIAL_ENGINE.md).

## Trust identity

The trust domain stores private verification requests, configurable verification levels, opt-in Trust Profiles, score history with explainable factors, completed-Deal reviews, fraud cases, and risk signals. It is isolated from financial posting and does not expose document metadata publicly. [TRUST_IDENTITY.md](TRUST_IDENTITY.md) describes the model and AI boundaries.

## Database and financial architecture

Prisma owns schema migrations and PostgreSQL constraints. Monetary values are decimal strings in request contracts and PostgreSQL `Decimal` values in storage; currency uses ISO 4217 codes and never defaults globally to Ghana. Provider references, idempotency keys, and immutable event records are modeled separately from deals.

The future ledger is append-only and double-entry: each posted journal records balanced debit and credit lines against named accounts. Balances are derived from posted lines or materialized projections, never transaction status fields. Financial mutations must execute in database transactions and preserve provider event/reconciliation references. TrustPay does not claim custody: regulated PSPs, banks, and mobile-money partners perform collection, safeguarding, settlement, and payout.

## Payments and providers

`PaymentProvider` defines an integration boundary for payment-intent creation, status retrieval, webhook verification, refunds, and payouts. Provider implementations are adapters selected by country, currency, and capability. All externally retried operations require an idempotency key and provider callback signature verification. No live provider is wired in this foundation.

## AI workforce

AI employees are typed, specialized configurations with an explicit role, allowed tools, scope, autonomy level, escalation policy, and audit trail. They may recommend or prepare work but cannot directly release funds, change payout accounts, approve high-risk KYC, or decide sensitive compliance outcomes. Those actions require authorized human approval and auditable API workflows.

## Security foundations

Secrets live only in deployment configuration and are validated at API startup. Password hashing, MFA, rate limits, secure sessions, encryption, webhook signature verification, replay/idempotency controls, audit logging, and tenant checks are required implementation points. Sensitive data and verification documents must be separated with least-privilege access and retention policies before production.

## Environment configuration

Copy the root `.env.example` for local development. `NODE_ENV` controls development, test, and production modes. Production must supply unique database, Redis, session, and provider credentials through its secret manager; `.env` files are not committed.

## Roadmap

1. Implement identity, business membership, tenant middleware, and audited authorization.
2. Implement the Deal state machine, versioned API, and protected-deal workflows.
3. Add licensed provider adapters, signed webhooks, reconciliation, and the append-only ledger.
4. Add verification, disputes, fulfillment, and notifications.
5. Add marketplace, public integrations, analytics, and constrained AI employees.

# TrustPay Protect

TrustPay Protect extends the existing Deal engine for transactions whose parties met elsewhere.
Deals retain backend-enforced state transitions, immutable events, participant authorization, audit
records, and in-app notifications. Protect adds participant, invitation, immutable-after-acceptance
terms, amendment, delivery, and dispute persistence as extension points. Provider-confirmed payment
remains the only path to `payment_secured`.
