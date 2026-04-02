import { supabase } from "./lib/supabase";
import type {
  Transaction,
  UserProfile,
  MonthlyBudget,
  BudgetCategory,
  Debt,
  Household,
  HouseholdMember,
  Account,
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
    householdId: data.household_id || null,
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

  // Check if user is in a household
  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  const householdId = profile?.household_id;

  if (householdId) {
    // Fetch household member IDs
    const { data: members } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId);

    const memberIds = members?.map((m) => m.user_id) ?? [user.id];

    // Fetch all profiles for name lookup
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", memberIds);

    const nameMap = new Map<string, string>();
    memberProfiles?.forEach((p) => {
      nameMap.set(p.id, p.full_name || p.email?.split("@")[0] || "Unknown");
    });

    // Only fetch last 4 months of transactions for performance
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    const startDate = fourMonthsAgo.toISOString().slice(0, 10);

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .in("user_id", memberIds)
      .gte("date", startDate)
      .order("date", { ascending: false });

    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      type: row.type as "expense" | "income" | "transfer",
      amount: Number(row.amount),
      category: row.category,
      note: row.note || undefined,
      date: row.date,
      createdAt: row.created_at,
      userName: nameMap.get(row.user_id),
      accountId: row.account_id || null,
    }));
  }

  // Solo user - original behavior
  const fourMonthsAgoSolo = new Date();
  fourMonthsAgoSolo.setMonth(fourMonthsAgoSolo.getMonth() - 4);
  const startDateSolo = fourMonthsAgoSolo.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDateSolo)
    .order("date", { ascending: false });

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    type: row.type as "expense" | "income" | "transfer",
    amount: Number(row.amount),
    category: row.category,
    note: row.note || undefined,
    date: row.date,
    createdAt: row.created_at,
    accountId: row.account_id || null,
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
    account_id: txn.accountId || null,
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
    account_id: txn.accountId || null,
  }));

  await supabase.from("transactions").insert(rows);
}

export async function deleteTransaction(id: string): Promise<void> {
  await supabase.from("transactions").delete().eq("id", id);
}

export async function updateTransaction(
  id: string,
  updates: Partial<Omit<Transaction, "id" | "createdAt">>
): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.note !== undefined) updateData.note = updates.note;
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.accountId !== undefined) updateData.account_id = updates.accountId;
  await supabase.from("transactions").update(updateData).eq("id", id);
}

// Budgets
export async function getBudgetForMonth(
  month: string
): Promise<MonthlyBudget | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if user is in a household
  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  const householdId = profile?.household_id;

  let query = supabase
    .from("budget_categories")
    .select("*")
    .eq("month", month)
    .order("created_at", { ascending: true });

  if (householdId) {
    // Fetch household member IDs
    const { data: members } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId);
    const memberIds = members?.map((m) => m.user_id) ?? [user.id];
    query = query.in("user_id", memberIds);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data } = await query;

  if (!data || data.length === 0) return null;

  const categories: BudgetCategory[] = data.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji || "",
    allocated: Number(row.allocated),
    type: row.type as "fixed" | "flexible",
    frequency: row.frequency || "monthly",
    dueDay: row.due_day ? Number(row.due_day) : undefined,
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
    frequency: cat.frequency || "monthly",
    due_day: cat.dueDay || null,
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

  // Check if user is in a household
  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  const householdId = profile?.household_id;

  let query = supabase
    .from("debts")
    .select("*")
    .order("balance", { ascending: true });

  if (householdId) {
    const { data: members } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId);
    const memberIds = members?.map((m) => m.user_id) ?? [user.id];
    query = query.in("user_id", memberIds);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data } = await query;

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

// Households
export async function createHousehold(name: string): Promise<Household | null> {
  const { data, error } = await supabase.rpc("create_household", {
    household_name: name,
  });
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    createdBy: "",
    createdAt: new Date().toISOString(),
  };
}

export async function joinHousehold(code: string): Promise<Household | null> {
  const { data, error } = await supabase.rpc("join_household", {
    code: code.toUpperCase(),
  });
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    createdBy: "",
    createdAt: new Date().toISOString(),
  };
}

export async function leaveHousehold(): Promise<void> {
  await supabase.rpc("leave_household");
}

export async function getHousehold(): Promise<Household | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) return null;

  const { data } = await supabase
    .from("households")
    .select("*")
    .eq("id", profile.household_id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}

export async function getHouseholdMembers(): Promise<HouseholdMember[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) return [];

  const { data } = await supabase
    .from("household_members")
    .select("*, profiles(email, full_name)")
    .eq("household_id", profile.household_id)
    .order("joined_at", { ascending: true });

  if (!data) return [];

  return data.map((row: any) => ({
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    email: row.profiles?.email,
    fullName: row.profiles?.full_name,
  }));
}

// Accounts
export async function getAccounts(): Promise<Account[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    balance: Number(row.balance),
    createdAt: row.created_at,
  }));
}

export async function addAccount(account: Account): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("accounts").insert({
    id: account.id,
    user_id: user.id,
    name: account.name,
    type: account.type,
    icon: account.icon,
    color: account.color,
    balance: account.balance,
    created_at: account.createdAt,
  });
}

export async function updateAccount(
  id: string,
  updates: Partial<Omit<Account, "id" | "createdAt">>
): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.balance !== undefined) updateData.balance = updates.balance;
  await supabase.from("accounts").update(updateData).eq("id", id);
}

export async function deleteAccount(id: string): Promise<void> {
  await supabase.from("accounts").delete().eq("id", id);
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
    supabase.from("accounts").delete().eq("user_id", user.id),
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
