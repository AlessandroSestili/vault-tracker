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

Personal finance aggregator for a single user (Alessandro). Desktop-first, min 1280px.

**Data model** (`supabase/migrations/20260417000000_init.sql`):
- `accounts` — each financial source (name, type enum, currency ISO 4217)
- `snapshots` — timestamped value entries per account (manual input)
- `accounts_with_latest` — DB view: each account + its most recent snapshot

**Types**: `src/types/index.ts` — `Account`, `Snapshot`, `AccountWithLatestSnapshot`, `AccountType`

**Lib modules** — single source of truth, always import from here:
- `src/lib/account-config.ts` — `ACCOUNT_TYPE_CONFIG` (label + badgeClass per type), `ACCOUNT_TYPE_OPTIONS` (for selects). Add types here first.
- `src/lib/formats.ts` — `formatCurrency(value, currency?)`, `formatDate(date)`. All Intl formatting lives here.
- `src/lib/actions.ts` — server actions: `createAccount`, `addSnapshot`, `deleteAccount`

**Supabase clients** — two separate factories, use the right one:
- `src/lib/supabase/client.ts` — browser client (Client Components only)
- `src/lib/supabase/server.ts` — server client via `cookies()` (Server Components, Route Handlers, Server Actions)

**Components**:
- `src/components/ui/` — shadcn primitives (style: `base-nova`, base color: `neutral`)
- `src/components/accounts/` — `AccountsTable`, `AddAccountDialog`, `UpdateValueDialog`
- `src/components/charts/` — data visualization (future)
- `src/components/layout/` — shell/nav (future)

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

Never commit `.env.local` — it contains DB credentials.

## Key Constraints

- No external APIs in v1 — all data is manual input or CSV import
- Single user, no multi-tenancy
- No mobile requirement
- No AI features
