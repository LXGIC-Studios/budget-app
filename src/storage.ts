import { supabase } from "./lib/supabase";
import type {
  Transaction,
  UserProfile,
  MonthlyBudget,
  BudgetCategory,
  Debt,
} from "./types";

// Profile
export async function getProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) return null;

  return {
    monthlyIncome: Number(data.monthly_income) || 0,
    currency: data.currency || "USD",
    onboardingComplete: data.onboarding_complete ?? false,
    emergencyFundGoal: Number(data.emergency_fund_goal) || 1000,
    emergencyFundCurrent: Number(data.emergency_fund_current) || 0,
    babyStep: Number(data.baby_step) || 1,
    createdAt: data.created_at,
  };
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({
      monthly_income: profile.monthlyIncome,
      currency: profile.currency,
      onboarding_complete: profile.onboardingComplete,
      emergency_fund_goal: profile.emergencyFundGoal,
      emergency_fund_current: profile.emergencyFundCurrent,
      baby_step: profile.babyStep,
    })
    .eq("id", user.id);
}

// Transactions
export async function getTransactions(): Promise<Transaction[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    type: row.type as "expense" | "income",
    amount: Number(row.amount),
    category: row.category,
    note: row.note || undefined,
    date: row.date,
    createdAt: row.created_at,
  }));
}

export async function addTransaction(txn: Transaction): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("transactions").insert({
    id: txn.id,
    user_id: user.id,
    type: txn.type,
    amount: txn.amount,
    category: txn.category,
    note: txn.note || null,
    date: txn.date,
    created_at: txn.createdAt,
  });
}

export async function addTransactions(txns: Transaction[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || txns.length === 0) return;

  const rows = txns.map((txn) => ({
    id: txn.id,
    user_id: user.id,
    type: txn.type,
    amount: txn.amount,
    category: txn.category,
    note: txn.note || null,
    date: txn.date,
    created_at: txn.createdAt,
  }));

  await supabase.from("transactions").insert(rows);
}

export async function deleteTransaction(id: string): Promise<void> {
  await supabase.from("transactions").delete().eq("id", id);
}

// Budgets
export async function getBudgetForMonth(
  month: string
): Promise<MonthlyBudget | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("budget_categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return null;

  const categories: BudgetCategory[] = data.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji || "",
    allocated: Number(row.allocated),
    type: row.type as "fixed" | "flexible",
  }));

  return { month, categories };
}

export async function saveBudgetForMonth(
  budget: MonthlyBudget
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Delete existing categories for this month then insert new ones
  await supabase
    .from("budget_categories")
    .delete()
    .eq("user_id", user.id)
    .eq("month", budget.month);

  const rows = budget.categories.map((cat) => ({
    user_id: user.id,
    name: cat.name,
    emoji: cat.emoji,
    allocated: cat.allocated,
    type: cat.type,
    month: budget.month,
  }));

  if (rows.length > 0) {
    await supabase.from("budget_categories").insert(rows);
  }
}

// Debts
export async function getDebts(): Promise<Debt[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", user.id)
    .order("balance", { ascending: true });

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    balance: Number(row.balance),
    minimumPayment: Number(row.minimum_payment),
    interestRate: Number(row.interest_rate),
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function addDebt(debt: Debt): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("debts").insert({
    id: debt.id,
    user_id: user.id,
    name: debt.name,
    balance: debt.balance,
    minimum_payment: debt.minimumPayment,
    interest_rate: debt.interestRate,
    type: debt.type,
    created_at: debt.createdAt,
    updated_at: debt.updatedAt,
  });
}

export async function updateDebt(
  id: string,
  updates: Partial<Omit<Debt, "id" | "createdAt">>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.balance !== undefined) updateData.balance = updates.balance;
  if (updates.minimumPayment !== undefined)
    updateData.minimum_payment = updates.minimumPayment;
  if (updates.interestRate !== undefined)
    updateData.interest_rate = updates.interestRate;
  if (updates.type !== undefined) updateData.type = updates.type;

  await supabase.from("debts").update(updateData).eq("id", id);
}

export async function deleteDebt(id: string): Promise<void> {
  await supabase.from("debts").delete().eq("id", id);
}

// Reset all data
export async function resetAllData(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await Promise.all([
    supabase.from("transactions").delete().eq("user_id", user.id),
    supabase.from("budget_categories").delete().eq("user_id", user.id),
    supabase.from("debts").delete().eq("user_id", user.id),
    supabase
      .from("profiles")
      .update({
        monthly_income: 0,
        onboarding_complete: false,
        emergency_fund_goal: 1000,
        emergency_fund_current: 0,
        baby_step: 1,
      })
      .eq("id", user.id),
  ]);
}
