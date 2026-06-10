-- 02: Triggers and helper functions.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_step_records_updated_at on public.step_records;
create trigger set_step_records_updated_at
before update on public.step_records
for each row execute function public.set_updated_at();

create or replace function public.is_group_member(
  target_group_id uuid,
  target_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = target_user_id
  );
$$;

create or replace function public.shares_group_with(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user_id
  );
$$;

-- Invite-code join flow keeps group lookup inside a controlled RPC.
create or replace function public.join_group_by_invite_code(
  invite_code_input text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です。';
  end if;

  select id
  into found_group_id
  from public.groups
  where invite_code = upper(trim(invite_code_input));

  if found_group_id is null then
    raise exception '招待コードが存在しません。';
  end if;

  if public.is_group_member(found_group_id, auth.uid()) then
    raise exception 'すでに参加済みのグループです。';
  end if;

  insert into public.group_members (group_id, user_id)
  values (found_group_id, auth.uid());

  return found_group_id;
end;
$$;
