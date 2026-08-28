# XYZ Software House — CRM (Core)

A working CRM built with React + Vite + Supabase, covering the core (must-have) functionalities:
auth, clients, sales pipeline, activity log, tasks, and support tickets.

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Set up Supabase**
   - Create a project at https://supabase.com
   - In the SQL Editor, run the `crm_supabase_schema.sql` file (provided separately) to create all tables + policies
   - Go to Project Settings > API and copy your Project URL and anon public key

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

4. **Run the app**
   ```
   npm run dev
   ```

5. **First login**
   - Sign up with your email — you'll be created with the `sales` role by default
   - In Supabase's Table Editor, open the `users` table and change your row's `role` to `admin`

## What's implemented (core/must-have)

- Email/password auth (Supabase Auth) with role field (admin / sales / support)
- Clients: list, search, filter by status, add, detail view
- Client detail: activity log (calls/emails/meetings/notes), linked deals, tasks, tickets
- Pipeline: kanban-style view of deals across stages (new → contacted → proposal → negotiation → won/lost)
- Tasks: follow-up reminders with due dates, filter by pending/done
- Tickets: support ticket tracking with priority + status

## Not yet built (nice-to-have, next phase)

- Documents/file upload (Supabase Storage)
- Email/SMS notifications
- Analytics dashboard charts
- Role-based row-level restrictions (RLS currently allows any logged-in user full access — see schema notes)
- Client self-service portal
