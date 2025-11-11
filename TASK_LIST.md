# AuctionFlow — Task List

**Status Legend:** ⬜ Not Started | 🟦 In Progress | ✅ Done | ❌ Blocked

---

## PHASE 1: FOUNDATION (Existing) ✅

### Epic 1.1: Frontend & Styling Baseline ✅

**Story:** Ensure base Next.js app with App Router and Tailwind is ready

- ✅ Task 1.1.1: Confirm Next.js App Router structure in `app/` (pages exist)
- ✅ Task 1.1.2: Confirm Tailwind setup and global styles in `app/globals.css`
- ✅ Task 1.1.3: Confirm static export configured in `next.config.ts` (`output: 'export'`, `distDir: 'out'`)
- ✅ Task 1.1.4: Verify component library and utilities exist (`components/ui/*`, `lib/utils.ts`)

**Acceptance:** `npm run dev` starts locally; UI renders without errors.


### Epic 1.2: Hosting & CI/CD (Amplify) ✅

**Story:** Keep existing Amplify static hosting working

- ✅ Task 1.2.1: Keep `amplify.yml` as source of truth for CI/CD
- ✅ Task 1.2.2: Keep build command `npm run build` and artifact `out/`
- ✅ Task 1.2.3: Ensure public env vars (`NEXT_PUBLIC_*`) are set in Amplify when needed

**Acceptance:** Merges to main produce a deployed static site via Amplify.


### Epic 1.3: Infra Scaffolding (CDK) ⬜

**Story:** Maintain CDK project for future backend

- ⬜ Task 1.3.1: Validate CDK app compiles (`bin/auction-flow.ts`, `lib/auction-flow-stack.ts`)
- ⬜ Task 1.3.2: (Optional) `npm run cdk:synth` to confirm template correctness
- ⬜ Task 1.3.3: (Optional) `npm run cdk:bootstrap` if deploying infra in this account/region

**Acceptance:** CDK synth completes without errors (when used).


---

## PHASE 2: INVOICE & CALCULATIONS (MVP Core) 🟦

### Epic 2.1: Invoice Display

**Story:** Display invoice by ID at `/invoice/[id]`

- 🟦 Task 2.1.1: Wire `/invoice/[id]` to fetch invoice via `NEXT_PUBLIC_API_BASE_URL` (mock OK)
- ⬜ Task 2.1.2: Render items (title, qty, unit price), subtotal
- ⬜ Task 2.1.3: Show buyer’s premium, tax, and grand total in a clear summary
- ⬜ Task 2.1.4: Loading, empty, and error UI states

**Acceptance:** Navigating to `/invoice/sample1` shows a fully calculated invoice with states.


### Epic 2.2: Accurate Premium & Tax Calculations

**Story:** Compute buyer’s premium and taxes consistently

- ⬜ Task 2.2.1: Add `lib/calculations.ts` with pure functions:
  - `calculateSubtotal(items)`
  - `calculateBuyersPremium(subtotal, rate)`
  - `calculateTax(subtotalPlusPremium, rate)`
  - `calculateGrandTotal(subtotal, premium, tax)`
- ⬜ Task 2.2.2: Use integer cents or safe rounding (2 decimals) to avoid float errors
- ⬜ Task 2.2.3: Unit tests for rounding and rates (0, invalid, large numbers)
- ⬜ Task 2.2.4: Integrate functions in UI so totals re-derive on data changes

**Acceptance:** All unit tests pass; UI totals match expected values for sample data.


### Epic 2.3: Edge & Error Handling

**Story:** Handle invalid IDs, missing rates, and formatting

- ⬜ Task 2.3.1: Invalid invoice ID → Not found view with return link
- ⬜ Task 2.3.2: Missing/invalid rates → default to 0; show non-intrusive notice
- ⬜ Task 2.3.3: Currency and percentage formatting utilities

**Acceptance:** Manual tests confirm graceful states; no crashes or NaN renders.


---

## PHASE 3: PAYMENTS (Stripe) ⬜

### Epic 3.1: Stripe Checkout (Client)

**Story:** Start a secure payment flow from invoice view

- ⬜ Task 3.1.1: Add “Pay Now” button on invoice → navigate to `/payment`
- ⬜ Task 3.1.2: On `/payment`, implement Stripe Checkout redirect (client-only mock acceptable)
- ⬜ Task 3.1.3: Disable button during redirect (prevent double submit)

**Acceptance:** Test mode redirect occurs; cancel returns gracefully.


### Epic 3.2: Payment Result UX

**Story:** Show success/cancel feedback and update local state

- ⬜ Task 3.2.1: Show success/cancel result UI after redirect
- ⬜ Task 3.2.2: Update invoice `paymentStatus` locally (mock) or via API when available
- ⬜ Task 3.2.3: Log `payment_attempted` and `payment_result` events

**Acceptance:** Clear feedback on result; logs are emitted at appropriate level.


### Epic 3.3: Serverless Payment Backend (Optional, later)

**Story:** Use API Gateway + Lambda for Stripe secret operations

- ⬜ Task 3.3.1: Create Lambda with Stripe secret (`STRIPE_SECRET_KEY`)
- ⬜ Task 3.3.2: Expose endpoint via API Gateway; return Checkout Session URL
- ⬜ Task 3.3.3: Switch client to call this endpoint instead of mock

**Acceptance:** End-to-end payment succeeds in test mode via backend.


---

## PHASE 4: ADMIN AREA (MVP) ⬜

### Epic 4.1: Admin Test Auction Flow

**Story:** Validate flow via `/admin/*` routes

- ⬜ Task 4.1.1: Keep existing routes `/admin`, `/admin/login`, `/admin/signup`, `/admin/test-auction`
- ⬜ Task 4.1.2: Add “Load sample invoice” action in `/admin/test-auction`
- ⬜ Task 4.1.3: Demo-only auth (local state); no backend secrets

**Acceptance:** Admin can load sample invoice and reach payment flow.


---

## PHASE 5: AUDIT LOGGING ⬜

### Epic 5.1: Client-Side Logging (MVP)

**Story:** Capture key events with level gating

- ⬜ Task 5.1.1: Add `lib/logger.ts` with `LOG_LEVEL` and environment gating
- ⬜ Task 5.1.2: Emit events: `invoice_viewed`, `totals_calculated`, `payment_attempted`, `payment_result`
- ⬜ Task 5.1.3: Ensure no PII or secrets are logged

**Acceptance:** Dev console shows structured logs in debug; minimal logs in prod.


---

## PHASE 6: TESTING & QA ⬜

### Epic 6.1: Unit Tests

**Story:** Validate calculations and helpers

- ⬜ Task 6.1.1: Add tests for `lib/calculations.ts`
- ⬜ Task 6.1.2: Add tests for formatting utilities

**Acceptance:** `npm test` passes; edge cases covered (0, invalid, large).


### Epic 6.2: Manual E2E Smoke

**Story:** Verify main flows in local and static export

- ⬜ Task 6.2.1: Local dev smoke: invoice → totals → payment redirect
- ⬜ Task 6.2.2: Static export preview via `npx serve out`
- ⬜ Task 6.2.3: Amplify-deployed smoke (public env vars configured)

**Acceptance:** No console errors; core flows complete.


---

## PHASE 7: ENV & DEPLOYMENT ⬜

### Epic 7.1: Environment Variables

**Story:** Configure `.env.local` and Amplify envs

- ⬜ Task 7.1.1: Create `.env.local` with:
  - `NEXT_PUBLIC_ENV=local`
  - `LOG_LEVEL=debug`
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api-mock`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx`
- ⬜ Task 7.1.2: (Amplify) Add needed `NEXT_PUBLIC_*` env vars in App Settings

**Acceptance:** Local and deployed builds read correct values.


### Epic 7.2: Scripts & Commands

**Story:** Ensure developer commands are consistent

- ⬜ Task 7.2.1: `npm run dev` for local development
- ⬜ Task 7.2.2: `npm run build` produces static export in `out/`
- ⬜ Task 7.2.3: `npx serve out` previews the export locally

**Acceptance:** Commands complete successfully without errors.


---

## Notes
- Preserve existing frontend and Amplify/CDK deployment. No rewrites.
- Use mocks for legacy systems in MVP; replace with API when ready.
- Stripe test mode first; add backend only when needed.


