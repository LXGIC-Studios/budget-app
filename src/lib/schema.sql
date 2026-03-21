-- Stackd Budget App Schema

create table profiles (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  monthly_income numeric default 0,
  currency text default 'USD',
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text check (type in ('expense', 'income')) not null,
  amount numeric not null,
  category text not null,
  note text,
  date timestamptz default now(),
  created_at timestamptz default now()
);

create table budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  emoji text,
  allocated numeric default 0,
  type text check (type in ('fixed', 'flexible')) default 'flexible',
  month text not null, -- "2026-03" format
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table budget_categories enable row level security;

create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Users manage own transactions" on transactions for all using (auth.uid() = user_id);
create policy "Users manage own budgets" on budget_categories for all using (auth.uid() = user_id);

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
