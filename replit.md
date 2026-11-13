# وَصل – WASL

Arabic RTL marketplace connecting customers with independent home, personal and technical service providers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- Managed frontend workflow: `artifacts/wasl: web`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- `pnpm --filter @workspace/scripts seed:demo` — idempotent, explicitly labeled development demo catalog; never run on publish.
- `pnpm --filter @workspace/scripts admin:grant --email <verified-owner-email>` — owner-operated first-admin grant in the target environment, after that account signs up and completes onboarding. There is no public admin bootstrap and no default password. The grant is recorded once so a rerun cannot restore revoked privileges.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/wasl/` — Arabic React frontend.
- `artifacts/api-server/src/routes/` — account, catalog, order, billing, admin and file-upload endpoints.
- `lib/api-spec/openapi.yaml` — API contract; regenerate client and validators after edits.
- `lib/db/src/schema/marketplace.ts` — PostgreSQL tables.

## Architecture decisions

- All payments are **simulations**, including service orders. Never collect real card details or imply money was charged.
- Money uses integer halalas, with an explicitly disclosed 10% customer surcharge rounded to the nearest halala. Providers receive the base price; the surcharge is not deducted from their fee.
- Secure managed email/password authentication is separate from application onboarding. Customer/provider role is immutable through self-service.
- Service deletion archives the service to preserve order history and accounting. Expired subscriptions hide published services and block new orders without deleting historical data.
- Uploaded raster images are public marketplace assets by design, not private documents.

## Product

- Catalog discovery, profile pages, ordering and verified-order reviews.
- Provider profile/service management, order transitions and simulated monthly subscriptions.
- Basic: SAR39/month, 5 services. Professional: SAR79/month, 15 services.
- Admin account review, provider activation, category management and real database totals.

## User preferences

- Brand: وَصل – WASL. Official slogan: اطلب خدمتك، واعرض مهارتك.
- Arabic-first RTL; responsive desktop, tablet and mobile.
- First version: one account type per account, customer or provider.
- Demo content must be visibly labeled; never present it as real customer activity.

## Gotchas

- Clerk development and production identities are separate. Grant admin access independently in each intended environment after ownership verification.
- Use browser Clerk session cookies, not bearer-token handling.
- Managed Publish owns production schema migration; never create tables at API startup.
- Do not run broad browser/e2e tests for the first build. Initial verification is static checking, API requests, logs and a public screenshot.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
