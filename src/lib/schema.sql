-- Stackd Budget App Schema (complete)

-- Profiles
create table profiles (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  monthly_income numeric default 0,
  currency text default 'USD',
  onboarding_complete boolean default false,
  emergency_fund_goal numeric default 1000,
  emergency_fund_current numeric default 0,
  baby_step integer default 1,
  household_id uuid,
  created_at timestamptz default now()
);

-- Transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text check (type in ('expense', 'income', 'transfer')) not null,
  amount numeric not null,
  category text not null,
  note text,
  date timestamptz default now(),
  created_at timestamptz default now()
);

-- Budget categories
create table budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  emoji text,
  allocated numeric default 0,
  type text check (type in ('fixed', 'flexible')) default 'flexible',
  frequency text default 'monthly',
  due_day integer,
  month text not null, -- "2026-03" format
  created_at timestamptz default now()
);

-- Debts (for snowball calculator)
create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  balance numeric not null,
  minimum_payment numeric not null,
  interest_rate numeric default 0,
  type text check (type in ('credit_card', 'student_loan', 'car_loan', 'mortgage', 'medical', 'personal', 'other')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Households
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Household members
create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text check (role in ('owner', 'member')) default 'member',
  joined_at timestamptz default now(),
  unique(household_id, user_id)
);

-- Add FK for household_id on profiles
alter table profiles add constraint profiles_household_fk
  foreign key (household_id) references households(id) on delete set null;

-- RLS
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table budget_categories enable row level security;
alter table debts enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;

-- Profile policies
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- Transaction policies
create policy "Users manage own transactions" on transactions for all using (auth.uid() = user_id);

-- Budget policies
create policy "Users manage own budgets" on budget_categories for all using (auth.uid() = user_id);

-- Debt policies
create policy "Users manage own debts" on debts for all using (auth.uid() = user_id);

-- Household policies
create policy "Members read household" on households for select using (
  id in (select household_id from household_members where user_id = auth.uid())
);
create policy "Members read household members" on household_members for select using (
  household_id in (select household_id from household_members where user_id = auth.uid())
);

-- Household RPC: create
create or replace function create_household(household_name text)
returns households as $$
declare
  new_household households;
begin
  insert into households (name, created_by)
  values (household_name, auth.uid())
  returning * into new_household;

  insert into household_members (household_id, user_id, role)
  values (new_household.id, auth.uid(), 'owner');

  update profiles set household_id = new_household.id where id = auth.uid();

  return new_household;
end;
$$ language plpgsql security definer;

-- Household RPC: join
create or replace function join_household(code text)
returns households as $$
declare
  target households;
begin
  select * into target from households where invite_code = upper(code);
  if not found then
    raise exception 'Invalid invite code';
  end if;

  insert into household_members (household_id, user_id, role)
  values (target.id, auth.uid(), 'member')
  on conflict do nothing;

  update profiles set household_id = target.id where id = auth.uid();

  return target;
end;
$$ language plpgsql security definer;

-- Household RPC: leave
create or replace function leave_household()
returns void as $$
begin
  delete from household_members where user_id = auth.uid();
  update profiles set household_id = null where id = auth.uid();
end;
$$ language plpgsql security definer;

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
