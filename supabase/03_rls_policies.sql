-- 03: Row Level Security and policies.

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.step_records enable row level security;

drop policy if exists "profiles_select_own_or_group_members" on public.profiles;
create policy "profiles_select_own_or_group_members"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.shares_group_with(id));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "groups_insert_authenticated" on public.groups;
create policy "groups_insert_authenticated"
on public.groups
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "groups_select_own_or_created" on public.groups;
create policy "groups_select_own_or_created"
on public.groups
for select
to authenticated
using (created_by = auth.uid() or public.is_group_member(id, auth.uid()));

drop policy if exists "group_members_select_same_group" on public.group_members;
create policy "group_members_select_same_group"
on public.group_members
for select
to authenticated
using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "group_members_insert_self" on public.group_members;
create policy "group_members_insert_self"
on public.group_members
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "step_records_select_own_or_group_members" on public.step_records;
create policy "step_records_select_own_or_group_members"
on public.step_records
for select
to authenticated
using (user_id = auth.uid() or public.shares_group_with(user_id));

drop policy if exists "step_records_insert_own" on public.step_records;
create policy "step_records_insert_own"
on public.step_records
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "step_records_update_own" on public.step_records;
create policy "step_records_update_own"
on public.step_records
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
