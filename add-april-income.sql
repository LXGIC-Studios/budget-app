-- Add April 2026 income transactions for nathopp@gmail.com
-- Does NOT delete existing data

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'nathopp@gmail.com';
  if v_user_id is null then
    raise exception 'User nathopp@gmail.com not found.';
  end if;

  -- Remove any existing April income to avoid duplicates
  delete from transactions
  where user_id = v_user_id
    and type = 'income'
    and date >= '2026-04-01'
    and date < '2026-05-01';

  -- Week 1: Apr 3 - Nathan Pro Pool RAISE CHECK
  insert into transactions (user_id, type, amount, category, note, date) values
    (v_user_id, 'income', 2664.00, 'salary', 'Pro Pool Payroll - Nathan', '2026-04-03T12:00:00Z');

  -- Week 2: Apr 10 - Ashley + Child Support
  insert into transactions (user_id, type, amount, category, note, date) values
    (v_user_id, 'income', 858.21, 'salary', 'Designwor Payroll - Ashley', '2026-04-10T12:00:00Z'),
    (v_user_id, 'income', 222.00, 'salary', 'BofA Payroll - Ashley', '2026-04-10T12:00:00Z'),
    (v_user_id, 'income', 300.00, 'other_income', 'Child Support', '2026-04-10T12:00:00Z');

  -- Week 3: Apr 17 - Nathan Pro Pool
  insert into transactions (user_id, type, amount, category, note, date) values
    (v_user_id, 'income', 2664.00, 'salary', 'Pro Pool Payroll - Nathan', '2026-04-17T12:00:00Z');

  -- Week 4: Apr 24 - Ashley + Child Support
  insert into transactions (user_id, type, amount, category, note, date) values
    (v_user_id, 'income', 858.21, 'salary', 'Designwor Payroll - Ashley', '2026-04-24T12:00:00Z'),
    (v_user_id, 'income', 222.00, 'salary', 'BofA Payroll - Ashley', '2026-04-24T12:00:00Z'),
    (v_user_id, 'income', 300.00, 'other_income', 'Child Support', '2026-04-24T12:00:00Z');

  raise notice 'April income loaded for %', v_user_id;
end;
$$;
