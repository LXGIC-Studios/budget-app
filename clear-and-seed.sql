-- ============================================================
-- Stackd Budget App: Clear + Seed for nathopp@gmail.com
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

do $$
declare
  v_user_id uuid;
begin
  -- Get user ID
  select id into v_user_id from auth.users where email = 'nathopp@gmail.com';
  if v_user_id is null then
    raise exception 'User nathopp@gmail.com not found. Make sure they have logged in at least once.';
  end if;

  raise notice 'Found user: %', v_user_id;

  -- ============================================================
  -- CLEAR ALL DATA
  -- ============================================================
  delete from transactions where user_id = v_user_id;
  delete from budget_categories where user_id = v_user_id;
  delete from debts where user_id = v_user_id;

  -- Reset profile
  update profiles set
    monthly_income = 14158,
    onboarding_complete = true,
    emergency_fund_goal = 1000,
    emergency_fund_current = 0,
    baby_step = 2
  where id = v_user_id;

  raise notice 'Cleared all data.';

  -- ============================================================
  -- APRIL 2026 BUDGET CATEGORIES
  -- ============================================================

  -- Fixed bills
  insert into budget_categories (user_id, name, emoji, allocated, type, frequency, due_day, month) values
    (v_user_id, 'Mortgage',       '🏠', 3157.03, 'fixed', 'monthly', 1,  '2026-04'),
    (v_user_id, 'Apple Card',     '💳', 870.48,  'fixed', 'monthly', 3,  '2026-04'),
    (v_user_id, 'Discover',       '💳', 88.00,   'fixed', 'monthly', 2,  '2026-04'),
    (v_user_id, 'Capital One',    '💳', 218.15,  'fixed', 'monthly', 2,  '2026-04'),
    (v_user_id, 'Orkin',          '🐛', 1122.00, 'fixed', 'monthly', 15, '2026-04'),
    (v_user_id, 'Netflix',        '📺', 27.36,   'fixed', 'monthly', 12, '2026-04'),
    (v_user_id, 'HBO Max',        '📺', 20.24,   'fixed', 'monthly', 2,  '2026-04'),
    (v_user_id, 'Crunchyroll',    '📺', 8.74,    'fixed', 'monthly', 14, '2026-04'),
    (v_user_id, 'Roku / Disney',  '📺', 14.22,   'fixed', 'monthly', 5,  '2026-04'),
    (v_user_id, 'DashPass',       '🛵', 9.99,    'fixed', 'monthly', 19, '2026-04'),
    (v_user_id, 'Format Magic',   '🔧', 4.95,    'fixed', 'monthly', 16, '2026-04');

  -- Flexible budget targets
  insert into budget_categories (user_id, name, emoji, allocated, type, frequency, month) values
    (v_user_id, 'Groceries',    '🛒', 800,  'flexible', 'monthly', '2026-04'),
    (v_user_id, 'Eating Out',   '🍔', 400,  'flexible', 'monthly', '2026-04'),
    (v_user_id, 'Gas',          '⛽', 200,  'flexible', 'monthly', '2026-04'),
    (v_user_id, 'Nanny',        '👧', 1040, 'flexible', 'monthly', '2026-04'),
    (v_user_id, 'Shopping',     '🛍️', 200,  'flexible', 'monthly', '2026-04'),
    (v_user_id, 'Kids',         '🧒', 150,  'flexible', 'monthly', '2026-04'),
    (v_user_id, 'Health',       '💊', 100,  'flexible', 'monthly', '2026-04'),
    (v_user_id, 'Subscriptions','🎮', 100,  'flexible', 'monthly', '2026-04'),
    (v_user_id, 'Misc',         '📦', 200,  'flexible', 'monthly', '2026-04');

  raise notice 'Budget categories inserted.';

  -- ============================================================
  -- APRIL 2026 INCOME TRANSACTIONS
  -- Week 1 (Mar 30 - Apr 5):  Nathan Pro Pool raise check
  -- Week 2 (Apr 6 - Apr 12):  Ashley Designwor + Child Support
  -- Week 3 (Apr 13 - Apr 19): Nathan Pro Pool
  -- Week 4 (Apr 20 - Apr 26): Ashley Designwor + Child Support
  -- ============================================================

  -- Apr 3: Nathan Pro Pool RAISE CHECK (new salary $75k, net ~$2,664)
  insert into transactions (user_id, type, amount, category, note, date) values
    (v_user_id, 'income', 2664.00, 'salary', 'Pro Pool Payroll - Nathan', '2026-04-03T12:00:00Z');

  -- Apr 10: Ashley Designwor payroll + child support
  insert into transactions (user_id, type, amount, category, note, date) values
    (v_user_id, 'income', 858.21, 'salary', 'Designwor Payroll - Ashley', '2026-04-10T12:00:00Z'),
    (v_user_id, 'income', 222.00, 'salary', 'BofA Payroll - Ashley', '2026-04-10T12:00:00Z'),
    (v_user_id, 'income', 300.00, 'other_income', 'Child Support', '2026-04-10T12:00:00Z');

  -- Apr 17: Nathan Pro Pool
  insert into transactions (user_id, type, amount, category, note, date) values
    (v_user_id, 'income', 2664.00, 'salary', 'Pro Pool Payroll - Nathan', '2026-04-17T12:00:00Z');

  -- Apr 24: Ashley Designwor + child support + Cash App debt due
  insert into transactions (user_id, type, amount, category, note, date) values
    (v_user_id, 'income', 858.21, 'salary', 'Designwor Payroll - Ashley', '2026-04-24T12:00:00Z'),
    (v_user_id, 'income', 222.00, 'salary', 'BofA Payroll - Ashley', '2026-04-24T12:00:00Z'),
    (v_user_id, 'income', 300.00, 'other_income', 'Child Support', '2026-04-24T12:00:00Z');

  raise notice 'April income transactions inserted.';

  -- ============================================================
  -- DEBTS (Dave Ramsey snowball order: smallest to largest)
  -- ============================================================
  insert into debts (user_id, name, balance, minimum_payment, interest_rate, type) values
    (v_user_id, 'Apple Card',  599.00,   25.00,  24.99, 'credit_card'),
    (v_user_id, 'Cash App',    600.00,   600.00, 0,     'other'),
    (v_user_id, 'Capital One', 1200.00,  35.00,  22.99, 'credit_card'),
    (v_user_id, 'Amazon',      2729.00,  55.00,  28.99, 'credit_card'),
    (v_user_id, 'Affirm',      2863.00,  0,      0,     'other'),
    (v_user_id, 'Discover',    2977.00,  88.00,  21.99, 'credit_card');

  raise notice 'Debts inserted. Total: $10,968';
  raise notice 'Seed complete for nathopp@gmail.com (user_id: %)', v_user_id;
end;
$$;
