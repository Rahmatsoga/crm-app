# XYZ Software House — CRM

A role-based Customer Relationship Management (CRM) system built for a software house to manage clients, sales pipeline, projects, invoices, documents, tasks, and support tickets — with real database-level access control by role.

## Overview

This CRM was built to solve real problems software houses face when managing client relationships without a centralized system: lost communication history, unclear project status, undocumented quotes, and no accountability trail. It replaces scattered spreadsheets and email threads with a single, role-aware workspace for Admin, Sales, and Support teams.

## Stack

- React + Vite
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- React Router
- Tailwind CSS

## Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Create a Supabase project
   - Go to https://supabase.com
   - Create a new project
   - Open SQL Editor and run, **in this order**:
     1. `crm_supabase_schema.sql` (base tables)
     2. `crm_rls_hardening.sql` (role-based security policies)
     3. `storage_rls_policies.sql` (document upload permissions)
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

4. Add `http://localhost:5173/reset-password` to Supabase → Authentication → URL Configuration → Redirect URLs (needed for the forgot-password flow)

5. Run the app

   ```bash
   npm run dev
   ```

6. First login flow
   - Sign up with your email
   - New users are created as `sales` by default
   - In Supabase Table Editor, update your row in `public.users` to `admin` if you want admin access

## Current features

- Email/password auth with role-based access, including forgot/reset password
- Client directory with search and filters
- Client detail pages with related records (activity log, deals, tasks, tickets)
- Sales pipeline with stage progression (kanban-style)
- Project tracking for won deals, with milestones, members, and updates
- Task management with due dates and status filtering
- Ticket management for support cases
- Document upload and file storage, scoped per client/project
- Dashboard with KPI and pipeline overview
- Invoicing tied to clients and projects

## Access Control Model

Enforced at the **database level** using PostgreSQL Row-Level Security (RLS) — not just hidden UI buttons. This means access rules hold even if the frontend were bypassed entirely.

| Role        | Access                                                                    |
| ----------- | ------------------------------------------------------------------------- |
| **Admin**   | Full access to all data across every module                               |
| **Sales**   | Only their own assigned clients, deals, and related records               |
| **Support** | Only tickets assigned to them, and clients/projects tied to those tickets |

Built using SQL helper functions (`is_admin()`, `can_access_client()`, `can_access_project()`) so each table's policy stays simple and consistent.

## Production notes

- Role-based RLS is implemented and tested across clients, deals, tasks, tickets, projects, invoices, and documents (including Supabase Storage policies)
- The frontend also includes role-based UI gating (e.g. restricted routes, conditionally shown buttons) as a usability layer on top of the database security
- The app is a working MVP and can be expanded with notifications, analytics, and deeper automation

## Next phase ideas

- Reporting and exports
- Advanced analytics dashboards
- Automation for reminders and follow-ups
- Audit trail (who changed what, when)
- Deployment hardening and CI/CD
