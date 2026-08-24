# Trust Identity

Trust Identity separates verification evidence, public trust signals, and internal risk controls. Identity and business verification requests retain sensitive document metadata privately. Public Trust Profiles expose only opted-in aggregate data.

Trust scores are server-calculated, bounded, and explainable through persisted score factors. Completed Deals, verification level, ratings, cancellations, disputes, and risk signals affect the calculation. Users cannot edit scores or reviews. Reviews require completed Deals and a participant relationship.

Fraud cases and risk signals are internal records. KYC, fraud, trust-analysis, and onboarding AI may summarize or recommend actions but never make final verification, suspension, payout, or compliance decisions.

# Trust operations

## Trust Operations architecture

`/admin/trust` is a distinct internal dashboard surface. It obtains its queues only from protected
`/v1/admin/trust/*` endpoints; a business membership is never sufficient for those endpoints.
The API resolves global staff roles from `StaffRoleAssignment` and enforces the least-privilege
Trust permissions for each action.

## Document security model

Verification documents retain metadata and a private storage reference only. The application never
returns a public object URL or document binary. A user may register metadata only against a
verification case they own; a staff member must hold `trust.documents.view` to retrieve document
metadata. Each staff access is recorded in both a document-access log and the audit log. Storage
encryption, object-provider uploads, signed retrieval URLs, malware scanning, and retention jobs
remain future infrastructure concerns.

## Reviewer workflow

Reviewers work a queue, inspect a case, then make a reasoned decision through the API. Decisions
require explicit Trust permissions, persist reviewer identity and status history, and create audit
records. AI summaries remain advisory input only and cannot make any decision.

## Internal verification workflow

Business verification submissions begin as `submitted`. Authorized TrustPay staff may make an
audited, reasoned transition to `verified`, `rejected`, or `more_information_required`. The
service stores the reviewer, decision reason, and an immutable status-history entry. Public and
business-facing surfaces never expose document metadata or review notes.

## Fraud and risk operations

Fraud analysts create and manage human-review cases with the lifecycle `open`, `investigating`,
`resolved`, and `dismissed`. Creation and updates require `trust.fraud.manage` and write audit
records. `RiskEvaluationService` records advisory risk signals from account, verification, Deal,
dispute, and transaction observations. It does not suspend accounts, reject verifications, ban
users, or change trust scores.

## Provider contracts

Identity and business verification integrations implement a common submit, status, and result
contract. Development mock implementations return non-authoritative workflow states only; no
external identity provider is connected.

## AI assistance boundary

KYC, fraud, and trust analyst interfaces return advisory summaries and recommendations only.
They have no API that can approve or reject verification, modify trust scores, close fraud cases,
or suspend accounts. A qualified TrustPay staff member must make every operational decision.
