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
-- 6. INVOICES
-- ============================================
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text not null unique,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date date default current_date,
  due_date date,
  notes text,
  created_by uuid references public.users(id),
  created_at timestamp with time zone default now()
);

-- ============================================
-- 7. PROJECT MEMBERS
-- ============================================
create table public.project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'developer'
    check (role in ('project-manager', 'developer', 'designer', 'qa', 'support')),
  created_at timestamp with time zone default now(),
  unique (project_id, user_id)
);

-- ============================================
-- 8. PROJECT UPDATES
-- ============================================
create table public.project_updates (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.users(id),
  type text not null default 'update'
    check (type in ('update', 'meeting', 'decision', 'blocker')),
  message text not null,
  created_at timestamp with time zone default now()
);

-- ============================================
-- 9. INTERACTIONS (activity log)
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
-- 10. TASKS (follow-up reminders)
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
-- 11. DOCUMENTS
-- ============================================
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  file_name text not null,
  storage_path text,
  file_url text not null,
  uploaded_by uuid references public.users(id),
  uploaded_at timestamp with time zone default now()
);

-- ============================================
-- 12. TICKETS (support system)
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
-- Role helper for consistent access checks
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.deals enable row level security;
alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.invoices enable row level security;
alter table public.project_members enable row level security;
alter table public.project_updates enable row level security;
alter table public.interactions enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.tickets enable row level security;

-- Profile access
create policy "Users can view their own profile" on public.users
  for select using (id = auth.uid());

create policy "Admins can manage all profiles" on public.users
  for all using (public.current_user_role() = 'admin');

-- Shared read access for authenticated users
create policy "Authenticated users can read clients" on public.clients
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage clients" on public.clients
  for insert with check (public.current_user_role() in ('admin', 'sales'));

create policy "Admins and sales can update clients" on public.clients
  for update using (public.current_user_role() in ('admin', 'sales'));

create policy "Admins and sales can delete clients" on public.clients
  for delete using (public.current_user_role() in ('admin', 'sales'));

create policy "Authenticated users can read deals" on public.deals
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage deals" on public.deals
  for all using (public.current_user_role() in ('admin', 'sales'));

create policy "Authenticated users can read projects" on public.projects
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage projects" on public.projects
  for all using (public.current_user_role() in ('admin', 'sales'));

create policy "Authenticated users can read project milestones" on public.project_milestones
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage milestones" on public.project_milestones
  for all using (public.current_user_role() in ('admin', 'sales'));

create policy "Authenticated users can read invoices" on public.invoices
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage invoices" on public.invoices
  for all using (public.current_user_role() in ('admin', 'sales'));

create policy "Authenticated users can read project members" on public.project_members
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage project members" on public.project_members
  for all using (public.current_user_role() in ('admin', 'sales'));

create policy "Authenticated users can read project updates" on public.project_updates
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage project updates" on public.project_updates
  for all using (public.current_user_role() in ('admin', 'sales'));

create policy "Authenticated users can read interactions" on public.interactions
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage interactions" on public.interactions
  for all using (public.current_user_role() in ('admin', 'sales'));

create policy "Authenticated users can read tasks" on public.tasks
  for select using (auth.role() = 'authenticated');

create policy "Team members can manage tasks" on public.tasks
  for insert with check (public.current_user_role() in ('admin', 'sales', 'support'));

create policy "Team members can update tasks" on public.tasks
  for update using (public.current_user_role() in ('admin', 'sales', 'support'));

create policy "Admins can delete tasks" on public.tasks
  for delete using (public.current_user_role() = 'admin');

create policy "Authenticated users can read documents" on public.documents
  for select using (auth.role() = 'authenticated');

create policy "Admins and sales can manage documents" on public.documents
  for all using (public.current_user_role() in ('admin', 'sales'));

create policy "Authenticated users can read tickets" on public.tickets
  for select using (auth.role() = 'authenticated');

create policy "Team members can manage tickets" on public.tickets
  for insert with check (public.current_user_role() in ('admin', 'sales', 'support'));

create policy "Team members can update tickets" on public.tickets
  for update using (public.current_user_role() in ('admin', 'sales', 'support'));

create policy "Admins can delete tickets" on public.tickets
  for delete using (public.current_user_role() = 'admin');

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload project documents"
on storage.objects for insert
to authenticated
with check (bucket_id = 'project-documents');

create policy "Authenticated users can view project documents"
on storage.objects for select
to authenticated
using (bucket_id = 'project-documents');

create policy "Authenticated users can delete project documents"
on storage.objects for delete
to authenticated
using (bucket_id = 'project-documents');

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
