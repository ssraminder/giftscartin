# Gifts Cart India

> **Brand:** Gifts Cart India | **Entity:** Cital Enterprises | **Domain:** giftscart.in | **FSSAI:** 12726011000025

Online gifting platform by Cital Enterprises, connecting customers with local vendors for fresh cakes, flowers, and gifts delivery across India. Starting with Chandigarh as the pilot city.

## Tech Stack

- **Framework:** Next.js 14 (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** Supabase PostgreSQL via Prisma ORM
- **Auth:** NextAuth.js v4 with email + OTP via Brevo (custom credentials provider)
- **Payments:** Razorpay
- **Email:** Brevo (Sendinblue)
- **Storage:** Supabase Storage (product images, vendor logos)
- **State Management:** Zustand (cart and UI state)
- **Hosting:** Netlify

## Local Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   - `DATABASE_URL` — Supabase pooler connection (port 6543)
   - `DIRECT_URL` — Supabase direct connection (port 5432, for migrations)
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
   - `NEXTAUTH_SECRET` — Random secret for NextAuth session encryption
   - `NEXTAUTH_URL` — `http://localhost:3000` for local dev
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — Razorpay credentials
   - `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` — Email service

3. **Set up the database:**

   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Seed sample data (optional):**

   ```bash
   npx prisma db seed
   ```

5. **Start the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy

Push to GitHub and connect the repository to Netlify. Netlify auto-deploys using the configuration in `netlify.toml`.

Set all environment variables from `.env.example` in Netlify's site settings.

## Phase 1 Features

- **Homepage:** Hero banner, category grid, trending products, occasion navigation
- **Product Browsing:** Category listing with filters, product detail with image gallery
- **Delivery Slots:** Standard, fixed-slot, midnight, early morning, and express delivery options
- **Cart & Checkout:** Add to cart, delivery date/slot selection, address entry, Razorpay payment
- **Authentication:** Phone + OTP login via NextAuth.js
- **Order Tracking:** Order history and status tracking
- **City Selection:** Pincode-based serviceability check (Chandigarh, Mohali, Panchkula)
- **Vendor Dashboard:** Shell layout (full implementation in Phase 3)
- **Admin Panel:** Shell layout (full implementation in Phase 3)
- **API Routes:** Products, categories, cart, orders, payments, serviceability, file upload
- **Mobile-First Design:** Responsive UI optimized for mobile devices
