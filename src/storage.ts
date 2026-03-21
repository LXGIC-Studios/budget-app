import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  Transaction,
  UserProfile,
  MonthlyBudget,
} from "./types";

const KEYS = {
  profile: "@stackd/profile",
  transactions: "@stackd/transactions",
  budgets: "@stackd/budgets",
} as const;

// Profile
export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.profile);
  return raw ? JSON.parse(raw) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

// Transactions
export async function getTransactions(): Promise<Transaction[]> {
  const raw = await AsyncStorage.getItem(KEYS.transactions);
  return raw ? JSON.parse(raw) : [];
}

export async function saveTransactions(txns: Transaction[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.transactions, JSON.stringify(txns));
}

export async function addTransaction(txn: Transaction): Promise<void> {
  const txns = await getTransactions();
  txns.unshift(txn);
  await saveTransactions(txns);
}

export async function deleteTransaction(id: string): Promise<void> {
  const txns = await getTransactions();
  await saveTransactions(txns.filter((t) => t.id !== id));
}

// Budgets
export async function getBudgets(): Promise<MonthlyBudget[]> {
  const raw = await AsyncStorage.getItem(KEYS.budgets);
  return raw ? JSON.parse(raw) : [];
}

export async function saveBudgets(budgets: MonthlyBudget[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.budgets, JSON.stringify(budgets));
}

export async function getBudgetForMonth(
  month: string
): Promise<MonthlyBudget | null> {
  const budgets = await getBudgets();
  return budgets.find((b) => b.month === month) ?? null;
}

export async function saveBudgetForMonth(
  budget: MonthlyBudget
): Promise<void> {
  const budgets = await getBudgets();
  const idx = budgets.findIndex((b) => b.month === budget.month);
  if (idx >= 0) {
    budgets[idx] = budget;
  } else {
    budgets.push(budget);
  }
  await saveBudgets(budgets);
}

// Reset all data
export async function resetAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.profile,
    KEYS.transactions,
    KEYS.budgets,
  ]);
}
