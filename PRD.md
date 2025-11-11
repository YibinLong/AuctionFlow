# Product Requirements Document (PRD) — AuctionFlow

This PRD is designed so an AI coding assistant can build, test, and run the app locally with minimal back-and-forth. It preserves the existing Next.js frontend and AWS deployment approach already working in this repo.


## 1. Project Summary
Build a modern, reliable auction checkout system to achieve accurate, fast, and auditable post‑auction settlements. MVP scope: real-time invoice display, buyer’s premium and tax calculations, and secure payment initiation with audit logging.

- Project Name: AuctionFlow
- App Type / Goal: Post‑auction checkout flow with invoices and payment
- Platform: WEB
- Constraints: Keep existing Next.js App Router + static export and AWS deployment as-is
- Special Notes: Payment via Stripe; legacy systems mocked in MVP; CDK used for infra when needed


## 2. Core Goals
- Users can view a real-time invoice with line items and calculated totals.
- Users can see buyer’s premium and taxes calculated accurately and transparently.
- Users can complete payment through a secure payment provider.
- Admins can log in and view a simple admin area to test the auction flow.
- The system logs essential audit events for compliance (view, calculate, attempt payment).


## 3. Non-Goals
- Full legacy (FoxPro/SQL Server) integration in MVP (use mocks/local JSON/API stubs).
- Complex reporting dashboards (basic admin/test view only for MVP).
- Multi-language UX (defer).
- AI insights/recommendations (defer).
- Rewriting the working frontend or deployment strategy.


## 4. Tech Stack (Solo-AI Friendly)
- Next.js 16 (App Router, static export): Familiar, well-documented, excellent DX for AI assistants.
- React 19 + Tailwind CSS: Common patterns; easy to scaffold and style quickly.
- Stripe (payments): Simple, robust SDKs; easy to test with keys.
- AWS Amplify (hosting static export) + AWS CDK (infra as code): Already present; zero rework to keep.
- TypeScript: Safer refactors, better AI codegen.
- Zod + react-hook-form: Simple schema validation; reduces errors on inputs.

Rationale: These choices are mainstream, stable, have great docs and libraries that LLMs know well. We preserve your current working setup.


## 5. Feature Breakdown — Vertical Slices

### Feature: Invoice Display (Public)
- User Story: As a buyer, I want to open my invoice and see items, fees, and totals so I can understand what I owe.
- Acceptance Criteria:
  - Navigating to `/invoice/[id]` shows: lot items, quantities, unit prices.
  - Buyer's premium and taxes are shown as separate rows with amounts and rates.
  - Subtotal, fees, tax, and grand total are accurate and clearly labeled.
  - Loading/empty/error states are visible and helpful.
- Data Model Notes:
  - Invoice: `id`, `buyerId`, `items[]` (lotId, title, qty, price), `buyerPremiumRate`, `taxRate`, `subtotal`, `buyerPremiumAmount`, `taxAmount`, `grandTotal`.
  - In MVP, fetch from mock JSON or a simple API stub (`NEXT_PUBLIC_API_BASE_URL`).
  - Existing page: `app/invoice/[id]/page.tsx` and `components/invoice/invoice-content.tsx`.
- Edge Cases & Errors:
  - Invalid `id` → show not found with a link back.
  - Missing rates → default to 0 and show a warning banner.
  - Rounding to 2 decimals; avoid floating-point errors (use integer cents or toFixed carefully).

### Feature: Buyer’s Premium Calculation
- User Story: As a buyer, I want premiums to be calculated automatically so totals are accurate.
- Acceptance Criteria:
  - Premium is computed as `subtotal * buyerPremiumRate` and displayed clearly.
  - Rate is formatted as a percentage (e.g., “BP 10%”).
  - Calculation re-derives whenever `items` or `rates` change.
- Data Model Notes:
  - Use derived values in UI; optionally persist computed values for auditing if backend exists.
  - Put calc utilities in a shared helper (e.g., `lib/calculations.ts`) for reuse.
- Edge Cases & Errors:
  - Rate missing or 0 → premium is 0 with annotation “No premium.”
  - Extremely large subtotals → confirm no overflow; cap display sensibly.

### Feature: Tax Calculation
- User Story: As a buyer, I want taxes to be computed accurately so I’m charged correctly.
- Acceptance Criteria:
  - Taxes computed as `(subtotal + premium) * taxRate`.
  - Rate and amount shown with proper currency formatting.
  - Compliant rounding to nearest cent.
- Data Model Notes:
  - Support a single tax rate in MVP; multi-rate later.
  - Add `taxJurisdiction` string (optional) to display context.
- Edge Cases & Errors:
  - Negative or invalid rates → treat as 0 and warn in logs.
  - Exempt cases (future): allow `taxExempt=true` to bypass in calc.

### Feature: Secure Payment Initiation (Stripe)
- User Story: As a buyer, I want to pay my invoice securely so my card data stays safe.
- Acceptance Criteria:
  - A “Pay Now” button on invoice navigates to `/payment`.
  - In MVP, use Stripe Checkout (redirect) or mock mode if no server-side function.
  - Show success/failure feedback and update invoice status locally (mock) or via API.
- Data Model Notes:
  - `paymentStatus`: `unpaid | pending | paid | failed`.
  - Store `paymentIntentId` if using server-side integration later (via CDK Lambda).
  - Env vars: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for client, `STRIPE_SECRET_KEY` for serverless.
- Edge Cases & Errors:
  - Network errors → retry UI and log.
  - Payment canceled → remain `unpaid`, display non-intrusive notice.
  - Double submit → disable button while redirecting.

### Feature: Admin Test Area (Login/Signup + Test Auction)
- User Story: As an admin, I want a simple area to validate invoice flows so I can verify calculations and payments.
- Acceptance Criteria:
  - Existing routes kept: `/admin`, `/admin/login`, `/admin/signup`, `/admin/test-auction`.
  - Demo-only auth in MVP (local state or mock); production can integrate Cognito later.
  - Admin can load a sample invoice and trigger calculations/payment in test.
- Data Model Notes:
  - Minimal admin profile persisted in localStorage for demo; or mock provider.
  - Future: use Cognito; add envs for user pool.
- Edge Cases & Errors:
  - Bad credentials → friendly error, no PII leakage.
  - Session expiry (mock) → auto-logout after refresh.

### Feature: Audit Logging (MVP)
- User Story: As compliance, I want key events recorded so we can audit payments later.
- Acceptance Criteria:
  - Log events to console in dev; prepare a shape for CloudWatch in prod.
  - Events: invoice_viewed, totals_calculated, payment_attempted, payment_result.
- Data Model Notes:
  - Event: `type`, `timestamp`, `invoiceId`, `userId?`, `metadata`.
  - Add `LOG_LEVEL` to control verbosity.
- Edge Cases & Errors:
  - PII in logs → never include full card data or sensitive info.
  - Large payloads → truncate safely.


## 8. .env Setup
Why: These variables let the app know how to behave locally and in the cloud (API URLs, keys, debug flags).

Create `.env.local` for local dev (not committed). If you later add serverless functions via CDK, also create `.env` files for those functions.

```bash
# Environment
NEXT_PUBLIC_ENV=local
LOG_LEVEL=debug

# Public API base for fetching invoices (mock or real). For static export, this must be publicly reachable.
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api-mock

# Stripe (client)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Stripe (serverless only; not used by static client)
STRIPE_SECRET_KEY=sk_test_xxx

# Optional AWS (future Cognito/region/integration)
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
```


## 9. .gitignore
Why: Prevent committing build outputs, local envs, and caches.

```bash
# Node/Next
node_modules
.next
out
.vercel
.env
.env.*
.DS_Store

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# AWS/CDK/Amplify Artifacts
cdk.out
amplify/\#current-cloud-backend
amplify/.config/local-*
```


## 10. Debugging & Logging
Why: Consistent logs make it easy to diagnose issues locally and in the cloud.

- Client (Next.js):
  - Use `console.log`/`console.error` gated by `LOG_LEVEL` and `NEXT_PUBLIC_ENV`.
  - Wrap logs in a helper (e.g., `lib/logger.ts`) that no-ops in production unless critical.
- Serverless (if/when added via CDK):
  - Use `console.log` with structured JSON; CloudWatch ingests automatically.
  - Never log secrets or sensitive PII.
- Toggle:
  - `LOG_LEVEL=debug|info|warn|error`.
  - In dev: verbose; in prod: info or warn.


## 11. External Setup Instructions (Manual)
Only perform steps relevant to your deployment path.

1) Stripe (Payments)
  - What: Create API keys; enable test mode.
  - Where: Stripe Dashboard → Developers → API keys.
  - Why: Needed for payment initiation and testing.
  - Manual steps:
    - Copy Publishable Key to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
    - If adding a serverless payment function (later), copy Secret Key to `STRIPE_SECRET_KEY`.
    - Add test cards (e.g., 4242 4242 4242 4242) for validation.

2) AWS Amplify (Static Hosting for Next.js Export)
  - What: Connect repo and use the existing `amplify.yml` for build.
  - Where: AWS Amplify Console.
  - Why: Host static export from `out/` reliably with CI/CD.
  - Manual steps:
    - Connect GitHub repo.
    - Ensure Amplify build uses `npm ci && npm run build` (the `amplify.yml` in repo should already match).
    - Add required environment variables in Amplify app settings (`NEXT_PUBLIC_*` vars).

3) AWS CDK (Optional: Backend/API/Lambda when needed)
  - What: Bootstrap and deploy infra to support APIs or Stripe server-side.
  - Where: Local terminal with AWS credentials (`aws configure`), using this repo’s CDK setup.
  - Why: Provision API Gateway/Lambda if moving beyond mocks.
  - Manual steps:
    - `npm run cdk:bootstrap` (one-time per account/region).
    - `npm run cdk:synth` to validate template.
    - `npm run deploy` or `npm run deploy:full` for scripted deploys.
    - After deploy, set `NEXT_PUBLIC_API_BASE_URL` to the API Gateway URL (if created).


## 12. Deployment Plan

- Local development:
  - Prereqs: Node 18+ LTS, npm 10+.
  - Commands:
    - Install: `npm ci`
    - Run dev: `npm run dev` (Next.js dev server)
    - Build (static export): `npm run build` (outputs to `out/` per `next.config.ts`)
    - Preview static export: `npx serve out`

- CI/CD:
  - Amplify picks up main branch and runs `amplify.yml`.
  - Ensure env vars in Amplify match `.env.local` equivalents where needed (public vars).

- Infra (optional, when adding backend):
  - `npm run cdk:synth` → validate
  - `npm run deploy` → deploy CDK stack


## 🧱 TASK_LIST.md STRUCTURE
Use Epics → Stories → Tasks. Prioritize vertical slices that go end-to-end.

- Epic: Invoice & Totals
  - Story: Display invoice by ID
    - Tasks:
      - Wire `/invoice/[id]` to mock fetch using `NEXT_PUBLIC_API_BASE_URL`.
      - Render items, premiums, taxes, totals.
      - Implement error/loading/empty states.
  - Story: Accurate premium & tax calc
    - Tasks:
      - Create `lib/calculations.ts` with pure functions for totals.
      - Add unit tests for rounding and edge cases.

- Epic: Payment Initiation
  - Story: Stripe Checkout redirect
    - Tasks:
      - Add “Pay Now” on invoice view → `/payment`.
      - Implement client-side redirect (publishable key).
      - Add success/cancel flows and UI feedback.

- Epic: Admin Area (MVP)
  - Story: Admin can test flow
    - Tasks:
      - Keep existing `/admin/*` routes functional.
      - Add “Load sample invoice” in `/admin/test-auction`.

- Epic: Audit Logging
  - Story: Capture key events
    - Tasks:
      - Add `lib/logger.ts` with level gating.
      - Emit events: invoice_viewed, totals_calculated, payment_attempted, payment_result.


## 🧩 SOLO-DEV GUARDRAILS
- Single repo; keep secrets in `.env` only.
- Preserve current Next.js + Amplify/CDK setup; avoid rewrites.
- Ship vertical slices (invoice display → calc → pay).
- Strict TypeScript; no `any` in exported APIs.
- Keep utilities pure and tested (`lib/calculations.ts`).
- Avoid overengineering; use mocks until backend exists.


## Appendix: Concrete Pointers to Existing Code
Why: So an AI assistant knows entry points and what to keep stable.

- Next.js config: `next.config.ts` (static export to `out/` is intentional).
- App routes: `app/` (App Router).
- Invoice page: `app/invoice/[id]/page.tsx` with `components/invoice/invoice-content.tsx`.
- Payment page: `app/payment/page.tsx` with `components/payment/payment-content.tsx`.
- Admin area: `app/admin/*` with matching components.
- Styling: `app/globals.css`, Tailwind.
- AWS Infra (optional): `bin/auction-flow.ts`, `lib/auction-flow-stack.ts`, `cdk.json`.
- Amplify: `amplify.yml` (keep).


## Assumptions (Called Out)
- Although the original requirements mentioned Vue/Nuxt, we explicitly standardize on the existing Next.js frontend and AWS deployment in this repo.
- Legacy systems (FoxPro/SQL Server) are mocked in MVP via `NEXT_PUBLIC_API_BASE_URL`, to be replaced with CDK-provisioned APIs later.
- Payments use Stripe test mode in MVP; serverless secret usage comes when backend exists.


