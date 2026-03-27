export interface Transaction {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  note?: string;
  date: string;
  createdAt: string;
  userName?: string;
}

export type BillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';

export interface BudgetCategory {
  id: string;
  name: string;
  emoji: string;
  allocated: number;
  type: "fixed" | "flexible";
  frequency?: BillFrequency;
  dueDay?: number;
}

export interface UserProfile {
  monthlyIncome: number;
  currency: string;
  onboardingComplete: boolean;
  emergencyFundGoal: number;
  emergencyFundCurrent: number;
  babyStep: number;
  createdAt: string;
  householdId?: string | null;
}

export type DebtType = 'credit_card' | 'student_loan' | 'car_loan' | 'mortgage' | 'medical' | 'personal' | 'other';

export interface Debt {
  id: string;
  name: string;
  balance: number;
  minimumPayment: number;
  interestRate: number;
  type: DebtType;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBudget {
  month: string;
  categories: BudgetCategory[];
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
}

export type HouseholdRole = 'owner' | 'member';

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  joinedAt: string;
  email?: string;
  fullName?: string;
}

export interface Bill {
  name: string;
  amount: number;
  emoji: string;
  frequency?: BillFrequency;
}

export const EXPENSE_CATEGORIES = [
  { id: "Eating Out", name: "Eating Out", emoji: "🍔" },
  { id: "Groceries", name: "Groceries", emoji: "🛒" },
  { id: "Amazon", name: "Amazon", emoji: "📦" },
  { id: "Subscriptions", name: "Subscriptions", emoji: "📺" },
  { id: "Gas/Car", name: "Gas/Car", emoji: "⛽" },
  { id: "Laura", name: "Laura", emoji: "👶" },
  { id: "Venmo", name: "Venmo", emoji: "💸" },
  { id: "Credit Card Payments", name: "Credit Card Payments", emoji: "💳" },
  { id: "Mortgage", name: "Mortgage", emoji: "🏠" },
  { id: "AT&T", name: "AT&T", emoji: "📱" },
  { id: "NES Electric", name: "NES Electric", emoji: "💡" },
  { id: "Hville Utility", name: "Hville Utility", emoji: "💧" },
  { id: "Car Insurance", name: "Car Insurance", emoji: "🚗" },
  { id: "Orkin Pest", name: "Orkin Pest", emoji: "🐛" },
  { id: "Car Wash", name: "Car Wash", emoji: "🧼" },
  { id: "Other", name: "Other", emoji: "📦" },
] as const;

export const INCOME_CATEGORIES = [
  { id: "salary", name: "Salary", emoji: "\uD83D\uDCBC" },
  { id: "freelance", name: "Freelance", emoji: "\uD83D\uDCB8" },
  { id: "transfer", name: "Transfer", emoji: "\uD83C\uDFE6" },
  { id: "other", name: "Other", emoji: "\uD83D\uDCE6" },
] as const;

export const BILL_PRESETS: Bill[] = [
  { name: "Rent", amount: 0, emoji: "\uD83C\uDFE0" },
  { name: "Car", amount: 0, emoji: "\uD83D\uDE97" },
  { name: "Insurance", amount: 0, emoji: "\uD83D\uDEE1\uFE0F" },
  { name: "Phone", amount: 0, emoji: "\uD83D\uDCF1" },
  { name: "Subscriptions", amount: 0, emoji: "\uD83D\uDCFA" },
  { name: "Utilities", amount: 0, emoji: "\uD83D\uDCA1" },
];
