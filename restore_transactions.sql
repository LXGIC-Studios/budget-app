-- RESTORE TRANSACTION DATA BATCH 1
-- Temporarily disable RLS
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Insert transactions
INSERT INTO transactions (id, user_id, type, amount, category, note, date, created_at, account_tag, received) VALUES
('a7cb66f3-e89b-4cf5-a0ea-da2f7dd5c475', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 3157, 'Mortgage', 'AmeriHome', '2026-01-03', '2026-03-31T00:47:08.255911+00:00', null, null),
('33858b47-200e-4c67-8b2f-7bdfbe84f43b', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 1105, 'Groceries', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null),
('555b35b5-6a9f-4edf-87dc-65bce69ffacf', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 750, 'Eating Out', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null),
('f03d8ed5-baf3-464e-87d3-36b1f56c164a', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 900, 'Shopping', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null),
('9d318592-9278-4dc6-b12c-5db2a788242d', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 450, 'Subscriptions', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null),
('01912f34-ca02-43c5-9fcc-addbc8001c50', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 760, 'Nanny (Laura)', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null),
('a89cb272-e3ac-4356-a67a-23562afc5046', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 80, 'Gas/Transport', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null),
('f32c7616-6d91-4a38-bfec-89b0fa25d18b', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 200, 'Health/Beauty', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null),
('42740a99-3824-419f-96fc-25d63d1bcc52', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 480, 'Nathan AI Tools', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null),
('66bf4d12-b611-4ca7-b119-9908ced44988', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 210, 'Gaming/Entertainment', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null);

-- Re-enable RLS  
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT COUNT(*) as restored_count FROM transactions;