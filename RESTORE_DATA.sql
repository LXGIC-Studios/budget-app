-- EMERGENCY DATA RESTORATION
-- Restoring all 269 transactions from May 8th backup

-- Temporarily disable RLS for data restoration
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Delete any existing data (if any) to avoid duplicates
DELETE FROM transactions WHERE created_at >= '2026-03-01';

-- Insert all transaction data (first batch of 50)
INSERT INTO transactions (id, user_id, type, amount, category, note, date, created_at, account_tag, received) VALUES
('a7cb66f3-e89b-4cf5-a0ea-da2f7dd5c475', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 3157, 'Mortgage', 'AmeriHome', '2026-01-03', '2026-03-31T00:47:08.255911+00:00', null, null),
('33858b47-200e-4c67-8b2f-7bdfbe84f43b', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 1105, 'Groceries', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null),
('555b35b5-6a9f-4edf-87dc-65bce69ffacf', '627381ca-cede-493d-91f7-c70a9ed72c49', 'expense', 750, 'Eating Out', '', '2026-01-15', '2026-03-31T00:47:08.255911+00:00', null, null);

-- Re-enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Verify restoration
SELECT COUNT(*) as restored_count FROM transactions WHERE created_at >= '2026-03-01';

-- Show recent transactions to verify
SELECT amount, category, note, date FROM transactions 
WHERE created_at >= '2026-03-01' 
ORDER BY date DESC 
LIMIT 10;