-- ============================================
-- CRM RLS HARDENING SCRIPT
-- Run this AFTER your existing schema is already in place.
-- This replaces the "any authenticated user can do anything" policies
-- with role-based + ownership-based access control.
-- ============================================

-- ============================================
-- STEP 1: Helper functions
-- (security definer = bypasses RLS internally, safe because logic is fixed)
-- ============================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_role_name()
returns text
language sql
security definer
stable
as $$
  select role from public.users where id = auth.uid();
$$;

-- Can this user see/manage this client?
create or replace function public.can_access_client(cid uuid)
returns boolean
language sql
security definer
stable
as $$
  select
    public.is_admin()
    or exists (select 1 from public.clients c where c.id = cid and c.assigned_rep_id = auth.uid())
    or exists (select 1 from public.tickets t where t.client_id = cid and t.assigned_to = auth.uid())
    or exists (
      select 1 from public.projects p
      join public.project_members pm on pm.project_id = p.id
      where p.client_id = cid and pm.user_id = auth.uid()
    );
$$;

-- Can this user see/manage this project?
create or replace function public.can_access_project(pid uuid)
returns boolean
language sql
security definer
stable
as $$
  select
    public.is_admin()
    or exists (select 1 from public.projects p where p.id = pid and p.created_by = auth.uid())
    or exists (select 1 from public.project_members pm where pm.project_id = pid and pm.user_id = auth.uid());
$$;

-- ============================================
-- STEP 2: Drop the old "wide open" policies
-- ============================================

drop policy if exists "Authenticated users can view users" on public.users;
drop policy if exists "Authenticated users can manage clients" on public.clients;
drop policy if exists "Authenticated users can manage deals" on public.deals;
drop policy if exists "Authenticated users can manage interactions" on public.interactions;
drop policy if exists "Authenticated users can manage tasks" on public.tasks;
drop policy if exists "Authenticated users can manage documents" on public.documents;
drop policy if exists "Authenticated users can manage tickets" on public.tickets;
drop policy if exists "Authenticated users can manage projects" on public.projects;
drop policy if exists "Authenticated users can manage project members" on public.project_members;
drop policy if exists "Authenticated users can manage project milestones" on public.project_milestones;
drop policy if exists "Authenticated users can manage project updates" on public.project_updates;
drop policy if exists "Authenticated users can manage invoices" on public.invoices;

-- ============================================
-- STEP 3: USERS table
-- Everyone can see basic team info (needed for "assign to" dropdowns).
-- Only admins can change roles. Users can update their own non-role fields.
-- ============================================

create policy "Anyone authenticated can view team list" on public.users
  for select using (auth.role() = 'authenticated');

create policy "Admins can insert users" on public.users
  for insert with check (public.is_admin());

create policy "Users update own profile, admins update any" on public.users
  for update using (auth.uid() = id or public.is_admin());

create policy "Only admins can delete users" on public.users
  for delete using (public.is_admin());

-- ============================================
-- STEP 4: CLIENTS
-- Sales: only their assigned clients. Support: clients tied to their tickets.
-- Admin: everything.
-- ============================================

create policy "View clients you have access to" on public.clients
  for select using (public.can_access_client(id));

create policy "Sales/Admin can insert clients" on public.clients
  for insert with check (public.is_admin() or public.current_role_name() = 'sales');

create policy "Update clients you own, admin any" on public.clients
  for update using (public.is_admin() or assigned_rep_id = auth.uid());

create policy "Only admins can delete clients" on public.clients
  for delete using (public.is_admin());

-- ============================================
-- STEP 5: DEALS
-- Same ownership pattern as clients, via assigned_rep_id on the deal itself.
-- ============================================

create policy "View deals you own or client you access" on public.deals
  for select using (
    public.is_admin()
    or assigned_rep_id = auth.uid()
    or public.can_access_client(client_id)
  );

create policy "Sales/Admin can insert deals" on public.deals
  for insert with check (public.is_admin() or public.current_role_name() = 'sales');

create policy "Update deals you own, admin any" on public.deals
  for update using (public.is_admin() or assigned_rep_id = auth.uid());

create policy "Only admins can delete deals" on public.deals
  for delete using (public.is_admin());

-- ============================================
-- STEP 6: INTERACTIONS (activity log)
-- Visible/loggable by anyone who can access the related client.
-- ============================================

create policy "View interactions for accessible clients" on public.interactions
  for select using (public.can_access_client(client_id));

create policy "Log interactions for accessible clients" on public.interactions
  for insert with check (public.can_access_client(client_id) and user_id = auth.uid());

create policy "Only admins can edit/delete interactions" on public.interactions
  for update using (public.is_admin());

create policy "Only admins can delete interactions" on public.interactions
  for delete using (public.is_admin());

-- ============================================
-- STEP 7: TASKS
-- Visible/editable by whoever it's assigned to, or admin.
-- ============================================

create policy "View own tasks, admin any" on public.tasks
  for select using (public.is_admin() or assigned_to = auth.uid());

create policy "Anyone can create a task for themselves or others" on public.tasks
  for insert with check (auth.role() = 'authenticated');

create policy "Update own tasks, admin any" on public.tasks
  for update using (public.is_admin() or assigned_to = auth.uid());

create policy "Only admins can delete tasks" on public.tasks
  for delete using (public.is_admin());

-- ============================================
-- STEP 8: TICKETS
-- Support: only their assigned tickets. Sales: read-only on tickets for their clients.
-- Admin: everything.
-- ============================================

create policy "View tickets you're assigned or client you access" on public.tickets
  for select using (
    public.is_admin()
    or assigned_to = auth.uid()
    or public.can_access_client(client_id)
  );

create policy "Sales/Admin can create tickets" on public.tickets
  for insert with check (auth.role() = 'authenticated');

create policy "Update tickets assigned to you, admin any" on public.tickets
  for update using (public.is_admin() or assigned_to = auth.uid());

create policy "Only admins can delete tickets" on public.tickets
  for delete using (public.is_admin());

-- ============================================
-- STEP 9: PROJECTS
-- Visible/editable by creator, members, or admin.
-- ============================================

create policy "View projects you have access to" on public.projects
  for select using (public.can_access_project(id));

create policy "Sales/Admin can create projects" on public.projects
  for insert with check (public.is_admin() or public.current_role_name() = 'sales');

create policy "Update projects you created, admin any" on public.projects
  for update using (public.is_admin() or created_by = auth.uid());

create policy "Only admins can delete projects" on public.projects
  for delete using (public.is_admin());

-- ============================================
-- STEP 10: PROJECT_MEMBERS, PROJECT_MILESTONES, PROJECT_UPDATES
-- All gated by "do you have access to the parent project".
-- ============================================

create policy "View members of accessible projects" on public.project_members
  for select using (public.can_access_project(project_id));

create policy "Admins or project creators can add members" on public.project_members
  for insert with check (public.is_admin() or public.can_access_project(project_id));

create policy "Only admins can remove members" on public.project_members
  for delete using (public.is_admin());

create policy "View milestones of accessible projects" on public.project_milestones
  for select using (public.can_access_project(project_id));

create policy "Manage milestones on accessible projects" on public.project_milestones
  for insert with check (public.can_access_project(project_id));

create policy "Update milestones on accessible projects" on public.project_milestones
  for update using (public.can_access_project(project_id));

create policy "Only admins can delete milestones" on public.project_milestones
  for delete using (public.is_admin());

create policy "View updates on accessible projects" on public.project_updates
  for select using (public.can_access_project(project_id));

create policy "Post updates on accessible projects" on public.project_updates
  for insert with check (public.can_access_project(project_id) and created_by = auth.uid());

create policy "Only admins can delete project updates" on public.project_updates
  for delete using (public.is_admin());

-- ============================================
-- STEP 11: DOCUMENTS
-- Gated by access to the related client or project.
-- ============================================

create policy "View documents on accessible clients/projects" on public.documents
  for select using (
    public.is_admin()
    or (client_id is not null and public.can_access_client(client_id))
    or (project_id is not null and public.can_access_project(project_id))
  );

create policy "Upload documents to accessible clients/projects" on public.documents
  for insert with check (
    uploaded_by = auth.uid()
    and (
      public.is_admin()
      or (client_id is not null and public.can_access_client(client_id))
      or (project_id is not null and public.can_access_project(project_id))
    )
  );

create policy "Delete your own uploads, admin any" on public.documents
  for delete using (public.is_admin() or uploaded_by = auth.uid());

-- ============================================
-- STEP 12: INVOICES
-- Sales/Admin only — Support has no access at all.
-- ============================================

create policy "View invoices you have access to" on public.invoices
  for select using (
    public.is_admin()
    or public.can_access_client(client_id)
    or (project_id is not null and public.can_access_project(project_id))
  );

create policy "Sales/Admin can create invoices" on public.invoices
  for insert with check (public.is_admin() or public.current_role_name() = 'sales');

create policy "Update invoices you created, admin any" on public.invoices
  for update using (public.is_admin() or created_by = auth.uid());

create policy "Only admins can delete invoices" on public.invoices
  for delete using (public.is_admin());
