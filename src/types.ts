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
  { id: "Groceries", name: "Groceries", emoji: "🛒" },
  { id: "Household Supplies", name: "Household Supplies", emoji: "🧻" },
  { id: "Non-Food Monthly", name: "Non-Food Monthly", emoji: "🧴" },
  { id: "Subscriptions", name: "Subscriptions", emoji: "📺" },
  { id: "Gas/Transport", name: "Gas/Transport", emoji: "⛽" },
  { id: "Prescriptions", name: "Prescriptions", emoji: "💊" },
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
