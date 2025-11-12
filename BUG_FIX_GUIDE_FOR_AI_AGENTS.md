# 🚨 AuctionFlow Bug Fix Guide for AI Agents

## 📋 QUICK OVERVIEW

**Status**: Application builds successfully but has 12 critical runtime bugs preventing production deployment.
**Root Cause**: Database schema mismatches and Next.js 16 compatibility issues.
**Priority**: Fix P0 issues first, then P1.

---

## 🎯 CRITICAL BUGS (P0 - Must Fix)

### 1. DATABASE SCHEMA ISSUES (Critical)
**Problem**: Multiple missing database columns causing widespread API failures.

**Missing Columns:**
- `invoice_items.auction_item_id` → Should be `item_id`
- `invoices.auction_item_id` → Should be `item_id`
- `users.first_name`, `users.last_name`, `users.phone` → Missing user profile fields
- `auction_results.auction_item_id` → Should reference correct column

**Fix Strategy:**
```sql
-- Step 1: Check current schema
SELECT column_name FROM information_schema.columns WHERE table_name = 'invoice_items';

-- Step 2: Add missing columns if needed
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS item_id INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS item_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
```

### 2. SQL SYNTAX COMPATIBILITY (Critical)
**Problem**: Using MySQL `DATE_SUB` syntax in PostgreSQL.

**Files to Fix:**
- `app/api/reports/revenue/route.ts` (lines ~150-160)

**Fix Strategy:**
```typescript
// Replace MySQL DATE_SUB with PostgreSQL syntax:
// OLD: DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
// NEW: CURRENT_DATE - INTERVAL '30 days'
```

### 3. NEXT.JS 16 ROUTE PARAMETERS (Critical)
**Problem**: `params.id` needs to be awaited in dynamic routes.

**Files to Fix:**
- `app/invoice/[id]/page.tsx` (line 19)
- `app/api/invoices/[id]/route.ts` (line 9)
- `app/api/audit/invoices/[id]/route.ts` (line 9)
- `app/api/audit/transactions/[id]/route.ts` (line 9)
- `app/api/payments/session/[id]/route.ts` (line 12)

**Fix Pattern:**
```typescript
// OLD: { params }: { params: { id: string } }
// NEW: { params }: { params: Promise<{ id: string }> }

// OLD: const id = params.id;
// NEW: const { id } = await params;
```

### 4. ADMIN DASHBOARD DATA STRUCTURE (Critical)
**Problem**: `settlementData.summary.settlementRate` undefined.

**File:** `components/admin/admin-dashboard-content.tsx` (line 565)

**Fix Strategy:**
```typescript
// Add null check or default value:
settlementRate={settlementData.summary?.settlementRate || 0}
```

---

## ⚠️ MODERATE BUGS (P1 - Should Fix)

### 5. AUTHENTICATION SYSTEM
**Problem:** Cognito JWT verification incomplete.

**File:** `lib/auth.ts`

**Fix Strategy:**
```typescript
// Replace mock implementation with proper JWT verification
// Install: npm install jsonwebtoken @types/jsonwebtoken
```

### 6. INTERNATIONALIZATION
**Problem:** react-i18next not initialized.

**Fix Strategy:**
```typescript
// Add to app/layout.tsx:
import { initReactI18next } from 'react-i18next';
import i18n from './i18n'; // Create this file
```

---

## 🔧 STEP-BY-STEP FIX PROCESS

### Phase 1: Database Fixes (Start Here)
1. **Check database connection:**
   ```bash
   # Test with psql if using PostgreSQL
   psql -h localhost -U username -d database_name
   ```

2. **Examine current schema:**
   ```sql
   \d invoice_items
   \d invoices
   \d users
   ```

3. **Add missing columns systematically**
4. **Update SQL queries in affected files**

### Phase 2: Next.js 16 Compatibility
1. **Update all dynamic route files** to await params
2. **Test each endpoint individually**

### Phase 3: API Testing
1. **Test critical endpoints:**
   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:3000/api/calculations/rates
   ```

2. **Verify admin dashboard loads without crashes**

### Phase 4: Final Verification
1. **Run full test suite:** `npm test`
2. **Build production version:** `npm run build`
3. **Test key user flows end-to-end**

---

## 📁 KEY FILES TO MODIFY

### Database Schema Files:
- [ ] Any migration files in `lib/migrations/`
- [ ] SQL queries in `app/api/reports/`
- [ ] Database queries in `app/api/invoices/`

### Route Parameter Files:
- [ ] `app/invoice/[id]/page.tsx`
- [ ] `app/api/invoices/[id]/route.ts`
- [ ] `app/api/audit/*/route.ts`
- [ ] `app/api/payments/session/[id]/route.ts`

### Component Files:
- [ ] `components/admin/admin-dashboard-content.tsx`

### Configuration:
- [ ] `lib/auth.ts` (JWT verification)
- [ ] `app/layout.tsx` (i18n initialization)

---

## ✅ SUCCESS CRITERIA

**P0 Complete When:**
- [ ] All API endpoints return 200 status
- [ ] Admin dashboard loads without runtime errors
- [ ] Invoice generation works for sample IDs
- [ ] Database queries execute without column errors

**P1 Complete When:**
- [ ] Authentication properly validates tokens
- [ ] Multi-language support initialized
- [ ] All TypeScript compilation errors resolved

**Production Ready When:**
- [ ] `npm run build` completes successfully
- [ ] All critical user flows work end-to-end
- [ ] No 500 errors in production logs

---

## 🛠️ TESTING COMMANDS

```bash
# Start development server
npm run dev

# Test specific endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/calculations/rates

# Run tests
npm test

# Build production
npm run build

# Type checking
npm run lint
```

---

## 📚 REFERENCE

**Next.js 16 Route Changes:** https://nextjs.org/docs/messages/sync-dynamic-apis
**PostgreSQL Date Functions:** https://www.postgresql.org/docs/current/functions-datetime.html
**React i18next Setup:** https://react.i18next.com/getting-started

**Remember:** Fix database issues first, then API compatibility, then UI components. Test each fix individually!