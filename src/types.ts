export interface Transaction {
  id: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  category: string;
  note?: string;
  date: string;
  createdAt: string;
  userName?: string;
  accountTag?: string;
}

// Default account tags - users can add their own via Settings
export const DEFAULT_ACCOUNT_TAGS = [
  { id: "checking", label: "Checking", emoji: "🏦" },
  { id: "savings", label: "Savings", emoji: "💰" },
  { id: "credit", label: "Credit Card", emoji: "💳" },
  { id: "cash", label: "Cash", emoji: "💵" },
] as const;

export interface AccountTag {
  id: string;
  label: string;
  emoji: string;
}

// Keep ACCOUNT_TAGS as alias for backward compat
export const ACCOUNT_TAGS = DEFAULT_ACCOUNT_TAGS;

export type BillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';

export interface BudgetCategory {
  id: string;
  name: string;
  emoji: string;
  allocated: number;
  type: "fixed" | "flexible";
  frequency?: BillFrequency;
  dueDay?: number;
  defaultAccountTag?: string;
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
  { id: "Eating Out", name: "Eating Out", emoji: "🍔" },
  { id: "Shopping", name: "Shopping", emoji: "🛍️" },
  { id: "Nathan AI Tools", name: "Nathan AI Tools", emoji: "🤖" },
  { id: "Gaming/Entertainment", name: "Gaming/Entertainment", emoji: "🎮" },
  { id: "Gas/Transport", name: "Gas/Transport", emoji: "⛽" },
  { id: "Kids/Activities", name: "Kids/Activities", emoji: "👶" },
  { id: "Health/Beauty", name: "Health/Beauty", emoji: "💊" },
  { id: "Misc", name: "Misc", emoji: "📦" },
] as const;

export const INCOME_CATEGORIES = [
  { id: "salary", name: "Salary/Payroll", emoji: "💼" },
  { id: "freelance", name: "Freelance/Business", emoji: "💸" },
  { id: "other_income", name: "Other Income", emoji: "📦" },
] as const;

export const BILL_PRESETS: Bill[] = [
  { name: "Rent", amount: 0, emoji: "\uD83C\uDFE0" },
  { name: "Car", amount: 0, emoji: "\uD83D\uDE97" },
  { name: "Insurance", amount: 0, emoji: "\uD83D\uDEE1\uFE0F" },
  { name: "Phone", amount: 0, emoji: "\uD83D\uDCF1" },
  { name: "Subscriptions", amount: 0, emoji: "\uD83D\uDCFA" },
  { name: "Utilities", amount: 0, emoji: "\uD83D\uDCA1" },
];
