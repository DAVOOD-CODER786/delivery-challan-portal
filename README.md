# Delivery Challan Portal

A React + Vite + Supabase starter for shared multi-user Delivery Challan records, searchable history, and PDF export.

## Included
- Email/password sign-up and sign-in using Supabase Auth
- Shared DC history across authorized users
- Challan form with multiple material rows and validation
- Search across DC number, vehicle, receiver, addresses, and materials; filter by date
- PDF download with `jsPDF` and `jspdf-autotable`
- Postgres schema, indexes, and row-level security policies

## Setup
1. Create a Supabase project at https://supabase.com.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project API settings. Never use the service-role key in frontend code.
4. Install Node.js (LTS), then run:
   ```bash
   npm install
   npm run dev
   ```
5. For deployment, build with `npm run build` and deploy the `dist` folder to a static host (e.g. Vercel or Netlify). Add the same environment variables to the hosting project and configure the Supabase Auth site URL / redirect URLs to match your deployed domain.

## Important production notes
- Enable email confirmation in Supabase Auth if desired, and configure SMTP for reliable delivery.
- The sample policy lets any authenticated portal member read shared challans and insert records attributed to their own user ID. Records are immutable from the UI by design. If you need admin editing/deletion, add a role table and restrictive RLS policies first.
- Automatic DC numbering in this starter is a client-side suggestion protected by a unique constraint; simultaneous users could race for the same number. For high-volume or audit-sensitive use, implement numbering via a Postgres sequence or a database RPC/trigger before production.
- Search currently loads the newest 1,000 rows to the browser. For larger datasets, use server-side pagination and database search.
- This is a starter project, not a hosted live service. You must configure the Supabase project and deploy it for access across devices.
