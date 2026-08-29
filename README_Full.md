# XYZ Software House — CRM

A working CRM built with React + Vite + Supabase for client management, sales pipeline tracking, project delivery, tasks, tickets, documents, and dashboard reporting.

## Stack

- React + Vite
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- React Router

## Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Create a Supabase project
   - Go to https://supabase.com
   - Create a new project
   - Open SQL Editor and run the schema from `crm_supabase_schema.sql`
   - Go to Project Settings > API and copy the project URL and anon key

3. Configure environment variables

   ```bash
   cp .env.example .env
   ```

   Then update the file with:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run the app

   ```bash
   npm run dev
   ```

5. First login flow
   - Sign up with your email
   - New users are created as `sales` by default
   - In Supabase Table Editor, update your row in `public.users` to `admin` if you want admin access

## Current features

- Email/password auth with role-based access
- Client directory with search and filters
- Client detail pages with related records
- Sales pipeline with stage progression
- Project tracking for won deals
- Task management with due dates and status filtering
- Ticket management for support cases
- Document upload and file storage
- Dashboard with KPI and pipeline overview

## Role access model

- `admin`: full access
- `sales`: sales and client workflows
- `support`: tasks and tickets workflows

## Production notes

- The frontend now includes role-based UI access gating
- Supabase RLS should be tightened further in production once the project is deployed in a real environment
- The app is designed as a working MVP and can be expanded with notifications, analytics, and deeper automations

## Next phase ideas

- reporting and exports
- advanced analytics dashboards
- automation for reminders and follow-ups
- richer document management
- deployment hardening and CI/CD
