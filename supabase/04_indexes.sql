-- 04: Indexes for common lookups.

create index if not exists group_members_group_id_idx
on public.group_members(group_id);

create index if not exists group_members_user_id_idx
on public.group_members(user_id);

create index if not exists step_records_user_date_idx
on public.step_records(user_id, date);
