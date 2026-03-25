-- Household / Shared Budget Migration
-- Adds multi-user household support to the budget app

-- 1. Helper: generate random 6-char alphanumeric invite code
create or replace function generate_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no I/1/O/0 to avoid confusion
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$ language plpgsql;

-- 2. Households table
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default generate_invite_code(),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 3. Household members junction table
create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text check (role in ('owner', 'member')) not null default 'member',
  joined_at timestamptz default now(),
  unique(household_id, user_id)
);

-- 4. Add household_id to profiles (nullable - null means solo budget)
alter table profiles add column if not exists household_id uuid references households(id) on delete set null;

-- 5. RLS on new tables
alter table households enable row level security;
alter table household_members enable row level security;

-- Households: members can see their own household
create policy "Members can view own household"
  on households for select
  using (
    id in (select household_id from household_members where user_id = auth.uid())
  );

-- Household members: can see members in same household
create policy "Members can view household members"
  on household_members for select
  using (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

-- 6. Updated RLS policies for shared data access
-- Drop old single-user policies
drop policy if exists "Users manage own transactions" on transactions;
drop policy if exists "Users manage own budgets" on budget_categories;
drop policy if exists "Users read own profile" on profiles;
drop policy if exists "Users update own profile" on profiles;

-- Profiles: can see own profile + profiles in same household
create policy "Users read own or household profiles"
  on profiles for select
  using (
    auth.uid() = id
    or (
      household_id is not null
      and household_id = (select household_id from profiles where id = auth.uid())
    )
  );

create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Transactions: user's own OR same household members' transactions
create policy "Users manage own transactions"
  on transactions for all
  using (
    auth.uid() = user_id
    or user_id in (
      select hm.user_id from household_members hm
      where hm.household_id = (
        select p.household_id from profiles p where p.id = auth.uid()
      )
    )
  );

-- Budget categories: user's own OR same household members' budgets
create policy "Users manage own budgets"
  on budget_categories for all
  using (
    auth.uid() = user_id
    or user_id in (
      select hm.user_id from household_members hm
      where hm.household_id = (
        select p.household_id from profiles p where p.id = auth.uid()
      )
    )
  );

-- Debts: user's own OR same household members' debts
drop policy if exists "Users manage own debts" on debts;
create policy "Users manage own debts"
  on debts for all
  using (
    auth.uid() = user_id
    or user_id in (
      select hm.user_id from household_members hm
      where hm.household_id = (
        select p.household_id from profiles p where p.id = auth.uid()
      )
    )
  );

-- 7. RPC functions

-- Create a household: creates it, adds caller as owner, sets profile.household_id
create or replace function create_household(household_name text)
returns json as $$
declare
  new_id uuid;
  new_code text;
begin
  -- Ensure user isn't already in a household
  if (select household_id from profiles where id = auth.uid()) is not null then
    raise exception 'Already in a household. Leave your current household first.';
  end if;

  new_id := gen_random_uuid();
  new_code := generate_invite_code();

  insert into households (id, name, invite_code, created_by)
  values (new_id, household_name, new_code, auth.uid());

  insert into household_members (household_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  update profiles set household_id = new_id where id = auth.uid();

  return json_build_object(
    'id', new_id,
    'name', household_name,
    'invite_code', new_code
  );
end;
$$ language plpgsql security definer;

-- Join a household via invite code
create or replace function join_household(code text)
returns json as $$
declare
  hh record;
begin
  -- Ensure user isn't already in a household
  if (select household_id from profiles where id = auth.uid()) is not null then
    raise exception 'Already in a household. Leave your current household first.';
  end if;

  select * into hh from households where invite_code = upper(code);
  if not found then
    raise exception 'Invalid invite code.';
  end if;

  insert into household_members (household_id, user_id, role)
  values (hh.id, auth.uid(), 'member');

  update profiles set household_id = hh.id where id = auth.uid();

  return json_build_object(
    'id', hh.id,
    'name', hh.name,
    'invite_code', hh.invite_code
  );
end;
$$ language plpgsql security definer;

-- Leave household
create or replace function leave_household()
returns void as $$
declare
  hh_id uuid;
  member_count int;
begin
  select household_id into hh_id from profiles where id = auth.uid();
  if hh_id is null then
    raise exception 'Not in a household.';
  end if;

  -- Remove membership
  delete from household_members where household_id = hh_id and user_id = auth.uid();

  -- Clear profile
  update profiles set household_id = null where id = auth.uid();

  -- If no members left, delete the household
  select count(*) into member_count from household_members where household_id = hh_id;
  if member_count = 0 then
    delete from households where id = hh_id;
  end if;
end;
$$ language plpgsql security definer;
