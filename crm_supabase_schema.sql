-- ============================================
-- SOFTWARE HOUSE CRM — SUPABASE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor (Project > SQL Editor > New Query)

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. USERS (internal team members)
-- ============================================
-- Note: Supabase Auth already creates auth.users automatically on signup.
-- This table extends it with role/profile info.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role text not null check (role in ('admin', 'sales', 'support')),
  created_at timestamp with time zone default now()
);

-- ============================================
-- 2. CLIENTS
-- ============================================
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  company_name text,
  status text not null default 'lead' check (status in ('lead', 'active', 'inactive')),
  assigned_rep_id uuid references public.users(id),
  created_at timestamp with time zone default now()
);

-- ============================================
-- 3. DEALS (sales pipeline)
-- ============================================
create table public.deals (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  value numeric default 0,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'proposal', 'negotiation', 'won', 'lost')),
  assigned_rep_id uuid references public.users(id),
  created_at timestamp with time zone default now()
);

-- ============================================
-- 4. PROJECTS (delivery work created from won deals)
-- ============================================
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'planning' check (status in ('planning', 'in-progress', 'on-hold', 'completed', 'cancelled')),
  budget numeric default 0,
  start_date date,
  due_date date,
  created_by uuid references public.users(id),
  created_at timestamp with time zone default now()
);

-- ============================================
-- 5. PROJECT MILESTONES
-- ============================================
create table public.project_milestones (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamp with time zone default now()
);

-- ============================================
-- 6. INTERACTIONS (activity log)
-- ============================================
create table public.interactions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  user_id uuid references public.users(id),
  type text not null check (type in ('call', 'email', 'meeting', 'note')),
  notes text,
  created_at timestamp with time zone default now()
);

-- ============================================
-- 7. TASKS (follow-up reminders)
-- ============================================
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  assigned_to uuid references public.users(id),
  title text not null,
  due_date timestamp with time zone,
  status text not null default 'pending' check (status in ('pending', 'done')),
  created_at timestamp with time zone default now()
);

-- ============================================
-- 8. DOCUMENTS
-- ============================================
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  file_url text not null,
  uploaded_by uuid references public.users(id),
  uploaded_at timestamp with time zone default now()
);

-- ============================================
-- 9. TICKETS (support system)
-- ============================================
create table public.tickets (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  assigned_to uuid references public.users(id),
  subject text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'in-progress', 'closed')),
  created_at timestamp with time zone default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.deals enable row level security;
alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.interactions enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.tickets enable row level security;

-- Basic policy: any logged-in user can read/write (simplest version for a student project)
-- You can tighten these later per-role once the app works end-to-end.

create policy "Authenticated users can view users" on public.users
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can manage clients" on public.clients
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users can manage deals" on public.deals
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users can manage projects" on public.projects
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users can manage project milestones" on public.project_milestones
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users can manage interactions" on public.interactions
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users can manage tasks" on public.tasks
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users can manage documents" on public.documents
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users can manage tickets" on public.tickets
  for all using (auth.role() = 'authenticated');

-- ============================================
-- OPTIONAL: Auto-create a public.users row when someone signs up via Supabase Auth
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email, 'sales');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
