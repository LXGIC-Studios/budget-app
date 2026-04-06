import { supabase } from "./lib/supabase";
import type {
  Transaction,
  UserProfile,
  MonthlyBudget,
  BudgetCategory,
  Debt,
  Household,
  HouseholdMember,
} from "./types";

// Cached auth/household context to avoid redundant DB round trips
let cachedContext: { userId: string; householdId: string | null; memberIds: string[] } | null = null;
let cacheExpiry = 0;

async function getAuthContext() {
  if (cachedContext && Date.now() < cacheExpiry) return cachedContext;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("household_id").eq("id", user.id).single();
  const householdId = profile?.household_id;
  let memberIds = [user.id];
  if (householdId) {
    const { data: members } = await supabase.from("household_members").select("user_id").eq("household_id", householdId);
    memberIds = members?.map(m => m.user_id) ?? [user.id];
  }
  cachedContext = { userId: user.id, householdId, memberIds };
  cacheExpiry = Date.now() + 30000;
  return cachedContext;
}

export function invalidateAuthCache() {
  cachedContext = null;
  cacheExpiry = 0;
}

// Profile
export async function getProfile(): Promise<UserProfile | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", ctx.userId)
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
  const ctx = await getAuthContext();
  if (!ctx) return;

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
    .eq("id", ctx.userId);
}

// Transactions
export async function getTransactions(): Promise<Transaction[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];

  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
  const startDate = fourMonthsAgo.toISOString().slice(0, 10);

  if (ctx.householdId) {
    // Fetch all profiles for name lookup
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ctx.memberIds);

    const nameMap = new Map<string, string>();
    memberProfiles?.forEach((p) => {
      nameMap.set(p.id, p.full_name || p.email?.split("@")[0] || "Unknown");
    });

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .in("user_id", ctx.memberIds)
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
      accountTag: row.account_tag || undefined,
      received: row.received ?? undefined,
    }));
  }

  // Solo user
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", ctx.userId)
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
    accountTag: row.account_tag || undefined,
    received: row.received ?? undefined,
  }));
}

export async function addTransaction(txn: Transaction): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) return;

  const { error } = await supabase.from("transactions").insert({
    id: txn.id,
    user_id: ctx.userId,
    type: txn.type,
    amount: txn.amount,
    category: txn.category,
    note: txn.note || null,
    date: txn.date,
    created_at: txn.createdAt,
    account_tag: txn.accountTag || null,
    received: txn.received ?? null,
  });
  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }
}

export async function addTransactions(txns: Transaction[]): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx || txns.length === 0) return;

  const rows = txns.map((txn) => ({
    id: txn.id,
    user_id: ctx.userId,
    type: txn.type,
    amount: txn.amount,
    category: txn.category,
    note: txn.note || null,
    date: txn.date,
    created_at: txn.createdAt,
    account_tag: txn.accountTag || null,
    received: txn.received ?? null,
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
  if (updates.accountTag !== undefined) updateData.account_tag = updates.accountTag;
  if (updates.received !== undefined) updateData.received = updates.received;
  await supabase.from("transactions").update(updateData).eq("id", id);
}

// Budgets
export async function getBudgetForMonth(
  month: string
): Promise<MonthlyBudget | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  let query = supabase
    .from("budget_categories")
    .select("*")
    .eq("month", month)
    .order("created_at", { ascending: true });

  if (ctx.householdId) {
    query = query.in("user_id", ctx.memberIds);
  } else {
    query = query.eq("user_id", ctx.userId);
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
    defaultAccountTag: row.default_account_tag || undefined,
  }));

  return { month, categories };
}

export async function saveBudgetForMonth(
  budget: MonthlyBudget
): Promise<MonthlyBudget> {
  const ctx = await getAuthContext();
  if (!ctx) return budget;

  // Delete existing categories for this month for ALL household members
  // (budget is shared, so we need to clear everyone's rows before re-inserting)
  if (ctx.memberIds.length > 1) {
    await supabase
      .from("budget_categories")
      .delete()
      .in("user_id", ctx.memberIds)
      .eq("month", budget.month);
  } else {
    await supabase
      .from("budget_categories")
      .delete()
      .eq("user_id", ctx.userId)
      .eq("month", budget.month);
  }

  const rows = budget.categories.map((cat) => ({
    user_id: ctx.userId,
    name: cat.name,
    emoji: cat.emoji,
    allocated: cat.allocated,
    type: cat.type,
    month: budget.month,
    frequency: cat.frequency || "monthly",
    due_day: cat.dueDay || null,
    default_account_tag: cat.defaultAccountTag || null,
  }));

  if (rows.length > 0) {
    const { data } = await supabase
      .from("budget_categories")
      .insert(rows)
      .select();

    if (data && data.length > 0) {
      // Return budget with DB-assigned IDs so local state stays in sync
      const newCategories: BudgetCategory[] = data.map((row) => ({
        id: row.id,
        name: row.name,
        emoji: row.emoji || "",
        allocated: Number(row.allocated),
        type: row.type as "fixed" | "flexible",
        frequency: row.frequency || "monthly",
        dueDay: row.due_day ? Number(row.due_day) : undefined,
        defaultAccountTag: row.default_account_tag || undefined,
      }));
      return { month: budget.month, categories: newCategories };
    }
  }

  return budget;
}

// Debts
export async function getDebts(): Promise<Debt[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];

  let query = supabase
    .from("debts")
    .select("*")
    .order("balance", { ascending: true });

  if (ctx.householdId) {
    query = query.in("user_id", ctx.memberIds);
  } else {
    query = query.eq("user_id", ctx.userId);
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
  const ctx = await getAuthContext();
  if (!ctx) return;

  await supabase.from("debts").insert({
    id: debt.id,
    user_id: ctx.userId,
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
  const ctx = await getAuthContext();
  if (!ctx) return null;

  if (!ctx.householdId) return null;

  const { data } = await supabase
    .from("households")
    .select("*")
    .eq("id", ctx.householdId)
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
  const ctx = await getAuthContext();
  if (!ctx) return [];

  if (!ctx.householdId) return [];

  const { data } = await supabase
    .from("household_members")
    .select("*, profiles(email, full_name)")
    .eq("household_id", ctx.householdId)
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

// Reset all data
export async function resetAllData(): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) return;

  await Promise.all([
    supabase.from("transactions").delete().eq("user_id", ctx.userId),
    supabase.from("budget_categories").delete().eq("user_id", ctx.userId),
    supabase.from("debts").delete().eq("user_id", ctx.userId),
    // accounts table removed - using account_tag on transactions
    supabase
      .from("profiles")
      .update({
        monthly_income: 0,
        onboarding_complete: false,
        emergency_fund_goal: 1000,
        emergency_fund_current: 0,
        baby_step: 1,
      })
      .eq("id", ctx.userId),
  ]);
  invalidateAuthCache();
}

// User Accounts (custom account tags)
export async function getUserAccounts(): Promise<{ id: string; label: string; emoji: string }[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];

  let query = supabase.from("user_accounts").select("*").order("created_at");

  if (ctx.householdId) {
    query = query.in("user_id", ctx.memberIds);
  } else {
    query = query.eq("user_id", ctx.userId);
  }

  const { data } = await query;
  if (!data) return [];
  return data.map((r) => ({ id: r.id, label: r.label, emoji: r.emoji || "🏦" }));
}

export async function addUserAccount(label: string, emoji: string): Promise<{ id: string; label: string; emoji: string } | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const { data } = await supabase.from("user_accounts").insert({ user_id: ctx.userId, label, emoji }).select().single();
  if (!data) return null;
  return { id: data.id, label: data.label, emoji: data.emoji };
}

export async function deleteUserAccount(id: string): Promise<void> {
  await supabase.from("user_accounts").delete().eq("id", id);
}

// Account starting balances (stored locally - no DB needed)
const STARTING_BALANCES_KEY = "stackd_account_starting_balances";

function getLocalStorage() {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return null;
}

export async function getAccountStartingBalances(): Promise<Record<string, number>> {
  try {
    const { Platform } = require("react-native");
    if (Platform.OS === "web") {
      const ls = getLocalStorage();
      if (!ls) return {};
      const raw = ls.getItem(STARTING_BALANCES_KEY);
      return raw ? JSON.parse(raw) : {};
    } else {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const raw = await AsyncStorage.getItem(STARTING_BALANCES_KEY);
      return raw ? JSON.parse(raw) : {};
    }
  } catch {
    return {};
  }
}

export async function setAccountStartingBalance(accountId: string, balance: number): Promise<void> {
  const balances = await getAccountStartingBalances();
  balances[accountId] = balance;
  const json = JSON.stringify(balances);
  try {
    const { Platform } = require("react-native");
    if (Platform.OS === "web") {
      const ls = getLocalStorage();
      if (ls) ls.setItem(STARTING_BALANCES_KEY, json);
    } else {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.setItem(STARTING_BALANCES_KEY, json);
    }
  } catch {}
}
