# Project Brief: Vault Tracker

## Vision
Personal finance aggregator that consolidates all assets across multiple platforms into a single desktop web app. Solves the fragmentation problem: one clean view of total net worth and historical performance, with a TradeRepublic-grade UI.

## Stack
- **Next.js 16** — SSR, App Router, API routes for data handling
- **TypeScript** — type safety across data models
- **Tailwind 4** — utility-first styling, consistent with existing projects
- **shadcn/ui** — finance-grade component primitives (charts, tables, cards)
- **Supabase** — auth (single user), PostgreSQL for accounts + snapshots, realtime

## Users
Alessandro only. Single-user app, no auth complexity beyond personal login. He is both the developer and the end user.

## Constraints
- No deadline — personal project, iterative delivery
- Solo developer
- No public APIs available for TradeRepublic, Revolut, PayPal — data entry via manual input or CSV import only
- Desktop-first (min 1280px), no mobile requirement

## Non-goals
- AI advisor or investment suggestions
- Executing trades or interacting with platforms
- Mobile native app
- Multi-user support
- Automated notifications or alerts
- Real-time price feeds (v1)

## Integrations
No external APIs in v1. Each account is a generic entity:
- **name** — user-defined (e.g. "TradeRepublic", "Revolut", "Fondo Pensione BCC")
- **type** — enum: `investment` | `cash` | `pension` | `crypto` | `other`
- **currency** — ISO 4217
- **snapshots** — timestamped value entries (manual input or CSV import)

New accounts can be added at any time. No hardcoded platform list.

## Open Questions
- Chart library choice: Recharts (2D, shadcn-native) vs. Tremor vs. D3 for advanced/3D visualizations in future iterations
- CSV format normalization: each platform exports differently — needs a mapping layer per source
