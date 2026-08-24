# TrustPay

TrustPay is an Africa-first trust and protected-payment platform foundation. It is intentionally limited to architecture, navigation shells, shared contracts, and safe financial-domain boundaries; it does not move, custody, or release funds.

## Applications

| Workspace     | Purpose                                                       | Development command                  |
| ------------- | ------------------------------------------------------------- | ------------------------------------ |
| `apps/mobile` | Expo Router mobile client for iOS and Android                 | `pnpm --filter @trustpay/mobile dev` |
| `apps/web`    | Next.js business and internal operations dashboard shells     | `pnpm --filter @trustpay/web dev`    |
| `apps/api`    | NestJS API for clients, provider webhooks, and future workers | `pnpm --filter @trustpay/api dev`    |

## Quick start

1. Install Node.js 22+ and pnpm 10+.
2. Copy `.env.example` to `.env` and replace all placeholder secrets.
3. Run `pnpm install`.
4. Run `pnpm dev`, or run an application command from the table above.

`pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` validate the workspace.

The web and mobile applications require their respective public API base URL variables from
`.env.example`. A physical mobile device cannot use `localhost`; set
`EXPO_PUBLIC_API_BASE_URL` to a reachable development API origin.

## Architecture

Architecture decisions, domain boundaries, security model, operational constraints, environment variables, and roadmap are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
