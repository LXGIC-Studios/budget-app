-- NEW STACKD SCHEMA - Add these tables to existing Supabase
-- Run in: https://supabase.com/dashboard/project/rdptbefetmtjuxtgxlxd/sql

-- Income Sources Table
CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  start_date DATE,
  active BOOLEAN DEFAULT true,
  household_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fixed Expenses Table
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  due_day INTEGER NOT NULL,
  auto_deducted BOOLEAN DEFAULT false,
  category TEXT NOT NULL CHECK (category IN ('housing', 'utilities', 'subscriptions', 'insurance', 'transportation', 'other')),
  emoji TEXT NOT NULL DEFAULT '📦',
  active BOOLEAN DEFAULT true,
  household_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES fixed_expenses(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  paid_date DATE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'auto-paid')),
  household_id UUID NOT NULL,
  paid_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Household Settings Table
CREATE TABLE IF NOT EXISTS household_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL UNIQUE,
  savings_target_weekly DECIMAL(10,2),
  savings_target_monthly DECIMAL(10,2),
  view_mode TEXT NOT NULL DEFAULT 'weekly' CHECK (view_mode IN ('weekly', 'monthly')),
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS income_sources_household_id_idx ON income_sources(household_id);
CREATE INDEX IF NOT EXISTS income_sources_active_idx ON income_sources(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS fixed_expenses_household_id_idx ON fixed_expenses(household_id);
CREATE INDEX IF NOT EXISTS fixed_expenses_active_idx ON fixed_expenses(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS payments_household_id_idx ON payments(household_id);
CREATE INDEX IF NOT EXISTS payments_expense_id_idx ON payments(expense_id);
CREATE INDEX IF NOT EXISTS payments_due_date_idx ON payments(due_date);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);

-- RLS (Row Level Security) Policies
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;

-- Income Sources Policies
CREATE POLICY "Users can view income sources in their household" ON income_sources
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert income sources for their household" ON income_sources
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update income sources in their household" ON income_sources
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete income sources in their household" ON income_sources
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Fixed Expenses Policies
CREATE POLICY "Users can view fixed expenses in their household" ON fixed_expenses
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert fixed expenses for their household" ON fixed_expenses
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update fixed expenses in their household" ON fixed_expenses
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete fixed expenses in their household" ON fixed_expenses
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Payments Policies
CREATE POLICY "Users can view payments in their household" ON payments
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for their household" ON payments
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments in their household" ON payments
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Household Settings Policies
CREATE POLICY "Users can view settings for their household" ON household_settings
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update settings for their household" ON household_settings
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_income_sources_updated_at BEFORE UPDATE ON income_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixed_expenses_updated_at BEFORE UPDATE ON fixed_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_household_settings_updated_at BEFORE UPDATE ON household_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();