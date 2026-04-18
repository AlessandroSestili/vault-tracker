# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Warning: Next.js 16 Breaking Changes

Next.js 16 has breaking changes from prior versions — APIs, conventions, and file structure differ. **Before writing any code**, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.

## Warning: Base UI, not Radix

shadcn here uses `@base-ui/react`, not `@radix-ui`. There is no `asChild` prop. Use the `render` prop pattern instead:
```tsx
// ✗ Wrong (Radix pattern)
<DialogTrigger asChild><Button /></DialogTrigger>

// ✓ Correct (Base UI pattern)
<DialogTrigger render={<Button />}>Label</DialogTrigger>
```

## Commands

```bash
npm run dev      # dev server
npm run build    # production build (run after any change)
npm run lint     # ESLint
```

No test suite configured.

## Architecture

Personal finance aggregator for a single user (Alessandro). Mobile-first responsive layout (bottom nav on mobile, top nav on desktop). Min desktop width: 1280px.

**Auth**: cookie-based (`vault_auth` cookie checked against `BASIC_AUTH_PASSWORD` env var). Handled in `src/middleware.ts`. Login/logout via `/api/auth/login` and `/api/auth/logout` route handlers.

**Pages**:a
- `/` — portfolio overview: total net worth, historical chart, full asset list
- `/analytics` — allocation donut chart by account type

Both pages are Server Components that fetch all data in parallel (accounts, positions, liabilities, live quotes, EUR/USD rate) then pass everything down to Client Components.

**Data model** (`supabase/migrations/`):
- `accounts` — financial sources (name, type enum, currency ISO 4217, optional logo)
- `snapshots` — timestamped account values (manual input)
- `accounts_with_latest` — DB view: account + most recent snapshot
- `positions` — investment holdings; `is_manual=true` means no ISIN, value stored directly; `is_manual=false` means live price from Yahoo Finance via ISIN
- `position_snapshots` — daily EUR values per position (upserted on page load for live positions)
- `liabilities` — debts and credits with structured amortization fields

**Types**: `src/types/index.ts` — `Account`, `Position`, `Snapshot`, `AccountWithLatestSnapshot`, `Liability`, `LiabilitySubtype`, `AccountType`

**Lib modules** — single source of truth, always import from here:
- `src/lib/account-config.ts` — `ACCOUNT_TYPE_CONFIG` (label + badgeClass per type), `ACCOUNT_TYPE_OPTIONS`. Add new account types here first.
- `src/lib/formats.ts` — `formatCurrency(value, currency?)`, `formatDate(date)`. All Intl formatting lives here.
- `src/lib/actions.ts` — all server actions (accounts, positions, manual positions, liabilities). Each group calls `revalidatePath('/')` and `revalidatePath('/analytics')` after mutation.
- `src/lib/liability-calc.ts` — `liabilityBalance(liability)`: computes live balance using amortization formula for mortgage/installment subtypes.
- `src/lib/yahoo-finance.ts` — `fetchQuotesByIsins(isins[])`, `fetchEurUsdRate()`, `toEur(price, currency, rate)`. All Yahoo Finance calls are cached 5 min via `next: { revalidate: 300 }`.

**Supabase clients** — two separate factories, use the right one:
- `src/lib/supabase/client.ts` — browser client (Client Components only)
- `src/lib/supabase/server.ts` — server client via `cookies()` (Server Components, Route Handlers, Server Actions)

**Image uploads**: `src/components/ui/image-uploader.tsx` uploads directly from the browser to Supabase Storage bucket `logos` using the anon key. Returns a public URL stored in `image_url` on the relevant entity.

**Net worth formula**:
```
total = accountsTotal + livePositionsTotal + manualPositionsTotal + creditsTotal − debtsTotal
```
Liability balances use `liabilityBalance()` which applies amortization for `mortgage`/`installment` subtypes; other subtypes use the stored `amount` directly.

**Liability subtypes** → type mapping (in `actions.ts`):
- `mortgage`, `installment`, `informal_debt` → `type = 'debt'`
- `dated_credit`, `informal_credit` → `type = 'credit'`

**Components**:
- `src/components/ui/` — shadcn primitives (style: `base-nova`, base color: `neutral`)
- `src/components/accounts/` — `AccountsList`, `AddAccountDialog`, `EditAccountDialog`, `UpdateValueDialog`, `RefreshButton`
- `src/components/positions/` — `AddPositionDialog`, `EditPositionDialog`
- `src/components/liabilities/` — `LiabilityDialog` (handles both add and edit)
- `src/components/charts/` — `PortfolioChart` (line chart, historical totals), `AllocationChart` (donut, by type)
- `src/components/layout/` — `TopNav`, `BottomNav`

## shadcn

Config in `components.json`. Add components with:
```bash
npx shadcn add <component>
```
Icon library: lucide-react. CSS variables enabled. RSC mode on.

## Environment Variables

Required in `.env.local` (auto-populated via `vercel env pull`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `BASIC_AUTH_PASSWORD` — cookie-based auth password

## Key Constraints

- Single user, no multi-tenancy
- All data is manual input; only exception is live price quotes fetched from Yahoo Finance (no API key required, 5-min cache)
- No AI features
