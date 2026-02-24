# Gifts Cart India — Project Specification
**Business Entity:** Cital Enterprises
**Live Site:** https://giftscart.netlify.app | https://giftscart.in
**Supabase:** https://saeditdtacprxcnlgips.supabase.co

## Tech Stack
- **Framework:** Next.js 14 (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** Supabase PostgreSQL — queried directly via `@supabase/supabase-js` (service role key on server, anon key on client)
- **Auth:** Custom JWT (httpOnly cookie `giftscart_session`, 30-day expiry, signed with HS256 via `jose`) + Email OTP via Brevo
- **Email/OTP:** Brevo API (transactional email + OTP delivery)
- **Payments:** Razorpay (India) + Stripe + PayPal (international) — geo-selected
- **Storage:** Supabase Storage (buckets: `products` public, `order-uploads` private)
- **Hosting:** Netlify (auto-deploy from GitHub, Pro plan)
- **State Management:** Zustand (cart + UI state)

## What Was Removed (Do NOT Reintroduce)
- Prisma ORM — removed, do not import or use `@prisma/client`
- NextAuth.js — removed, do not use `next-auth` or `getServerSession`
- DATABASE_URL / DIRECT_URL — removed (Prisma connection strings)
- NEXTAUTH_SECRET / NEXTAUTH_URL — removed
- MSG91 — never implemented, do not add

## Architecture Decisions
- **All DB queries use Supabase JS client** — import `createClient` from `@supabase/supabase-js`. Use `SUPABASE_SERVICE_ROLE_KEY` in server/API routes, `NEXT_PUBLIC_SUPABASE_ANON_KEY` in client components.
- **Auth is custom JWT** — on login, sign a JWT with `jose` containing `{ id, email, role, name }`, set as httpOnly cookie named `giftscart_session`. Read and verify this cookie in middleware and API routes.
- **Middleware is edge-compatible** — `src/middleware.ts` uses only `jose` (no Prisma, no NextAuth). Protects `/checkout`, `/orders`, `/vendor/*`, `/admin/*`.
- **Auth hooks** — use `useAuth()` from `src/hooks/use-auth.ts` (calls `GET /api/auth/me`). Do NOT use `useSession()`.
- **No Prisma schema** — the `prisma/` directory may still exist for reference but is not used. All schema reference is in `SQL_REFERENCE.md`.
- **Column naming** — PostgreSQL tables use a mix. Most business-logic columns are camelCase (e.g., `"isActive"`, `"cityId"`, `"basePrice"`). Always double-quote column names in raw SQL. Check `SQL_REFERENCE.md` for exact column names per table.
- **All env vars via `process.env`** — never hardcode secrets.

## Environment Variables Required
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Server-only — never expose to client

# Auth
JWT_SECRET=                        # HS256 signing secret for custom JWT
NEXT_PUBLIC_SITE_URL=https://giftscart.netlify.app

# Email / OTP
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# AI (for image/content generation)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

## Netlify Configuration
```toml
[build]
  command = "npx prisma@5.22.0 generate && next build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## How Auth Works
1. User enters email → `POST /api/auth/otp/send` → Brevo sends 6-digit OTP
2. User enters OTP → `POST /api/auth/otp/verify` → verifies against `otp_verifications` table
3. On success → sign JWT with `jose`, set as httpOnly cookie `giftscart_session`
4. Subsequent requests → middleware reads cookie, verifies JWT, injects user into request headers
5. API routes read user from `request.headers.get('x-user-id')` etc. (set by middleware)
6. Client components call `GET /api/auth/me` → returns current user from cookie
7. Logout → `POST /api/auth/logout` → clears cookie

## How to Query the Database
```typescript
// In API routes (server-side) — use service role key
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('isActive', true)

// In client components — use anon key (already set up in src/lib/supabase.ts)
import { supabase } from '@/lib/supabase'
```

## Key Files Reference
| File | Purpose |
|------|---------|
| `src/middleware.ts` | Edge-compatible JWT verification + route protection |
| `src/lib/supabase.ts` | Supabase client (anon key, for client-side + storage) |
| `src/lib/supabase-server.ts` | Supabase client (service role, for API routes) |
| `src/lib/jwt.ts` | JWT sign/verify helpers using `jose` |
| `src/lib/brevo.ts` | Email OTP sending via Brevo |
| `src/lib/razorpay.ts` | Razorpay order creation + signature verification |
| `src/lib/stripe.ts` | Stripe Checkout Sessions + webhook verification |
| `src/lib/paypal.ts` | PayPal REST API v2 |
| `src/lib/geo.ts` | IP-based geo-detection for payment gateway selection |
| `src/lib/utils.ts` | cn(), formatPrice(), generateOrderNumber() |
| `src/hooks/use-auth.ts` | useAuth() hook — replaces useSession() |
| `src/hooks/use-cart.ts` | Zustand cart store with localStorage persist |
| `src/types/index.ts` | All TypeScript interfaces |
| `SQL_REFERENCE.md` | Complete DB schema reference (use instead of Prisma schema) |
| `PROGRESS.md` | Current build status — READ THIS before every session |

## Database Schema Reference
See `SQL_REFERENCE.md` for complete table list, column names, and DDL.
Total: 48 tables. Key tables: users, otp_verifications, cities, vendors, products, orders, order_items, payments, partners, cart_items, delivery_slots, vendor_pincodes.

## API Response Format
```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: "Human readable error message" }

// List with pagination
{ success: true, data: { items: [...], total: 100, page: 1, pageSize: 20 } }
```

## Important Rules
1. NEVER use Prisma — all queries go through Supabase JS client
2. NEVER use NextAuth or getServerSession — auth is custom JWT via jose
3. NEVER expose SUPABASE_SERVICE_ROLE_KEY to the client
4. All API inputs validated with Zod schemas
5. All prices stored as numbers in DB, displayed with formatPrice() for ₹
6. Use server components by default, "use client" only when needed
7. Mobile-first design — Indian locale (₹, 10-digit phones, 6-digit pincodes)
8. Always handle loading and error states in UI
9. Column names in Supabase queries must match exact DB column names — check SQL_REFERENCE.md

## Design System
- **Primary:** #E91E63 (Pink)
- **Primary Dark:** #C2185B
- **Secondary:** #9C27B0 (Purple)
- **Accent:** #FF9800 (Orange)
- **Background:** #FAFAFA | **Surface:** #FFFFFF
- **Typography:** Inter (headings bold, body regular)
- **Components:** rounded-xl cards, pink primary buttons, mobile-first
- **References:** winni.in (layout), fnp.com (vendor/branding)
