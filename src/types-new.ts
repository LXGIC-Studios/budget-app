// NEW STACKD - Simplified Cash Flow Types

export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface IncomeSource {
  id: string;
  name: string; // "Nathan Salary", "Ashley Freelance"
  amount: number;
  frequency: Frequency;
  dayOfWeek?: number; // For weekly (0=Monday, 6=Sunday)
  dayOfMonth?: number; // For monthly (1-31)
  startDate?: string; // For biweekly anchor (ISO date)
  active: boolean;
  householdId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FixedExpense {
  id: string;
  name: string; // "Rent", "Electric", "Spotify"
  amount: number;
  frequency: Frequency;
  dueDay: number; // Day of month for monthly, day of week for weekly
  autoDeducted: boolean; // True = auto-pay, False = manual payment
  category: 'housing' | 'utilities' | 'subscriptions' | 'insurance' | 'transportation' | 'other';
  emoji: string;
  active: boolean;
  householdId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'auto-paid';

export interface Payment {
  id: string;
  expenseId: string; // Links to FixedExpense
  dueDate: string; // "2026-05-15"
  paidDate?: string; // When marked as paid
  amount: number; // Can override default expense amount
  status: PaymentStatus;
  householdId: string;
  paidBy?: string; // User ID who marked it paid
  notes?: string;
  createdAt: string;
}

export interface HouseholdSettings {
  id: string;
  householdId: string;
  savingsTargetWeekly?: number;
  savingsTargetMonthly?: number;
  viewMode: 'weekly' | 'monthly';
  currency: string;
  timezone: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Category presets for fixed expenses
export const EXPENSE_CATEGORIES = [
  { id: 'housing', name: 'Housing', emoji: '🏠' },
  { id: 'utilities', name: 'Utilities', emoji: '💡' },
  { id: 'subscriptions', name: 'Subscriptions', emoji: '📺' },
  { id: 'insurance', name: 'Insurance', emoji: '🛡️' },
  { id: 'transportation', name: 'Transportation', emoji: '🚗' },
  { id: 'other', name: 'Other', emoji: '📦' },
] as const;

// Common bill presets
export const BILL_PRESETS = [
  { name: 'Rent/Mortgage', category: 'housing', emoji: '🏠' },
  { name: 'Electric', category: 'utilities', emoji: '⚡' },
  { name: 'Gas', category: 'utilities', emoji: '🔥' },
  { name: 'Water', category: 'utilities', emoji: '💧' },
  { name: 'Internet', category: 'utilities', emoji: '🌐' },
  { name: 'Phone', category: 'utilities', emoji: '📱' },
  { name: 'Car Payment', category: 'transportation', emoji: '🚗' },
  { name: 'Car Insurance', category: 'insurance', emoji: '🛡️' },
  { name: 'Health Insurance', category: 'insurance', emoji: '🏥' },
  { name: 'Netflix', category: 'subscriptions', emoji: '📺' },
  { name: 'Spotify', category: 'subscriptions', emoji: '🎵' },
  { name: 'Amazon Prime', category: 'subscriptions', emoji: '📦' },
] as const;

// Weekly view calculations
export interface WeeklyView {
  weekStart: string; // ISO date (Monday)
  weekEnd: string; // ISO date (Sunday)
  totalIncome: number;
  totalFixedExpenses: number;
  availableAmount: number;
  upcomingPayments: Payment[];
  overduePayments: Payment[];
}

// Monthly view calculations  
export interface MonthlyView {
  month: string; // "2026-05"
  totalIncome: number;
  totalFixedExpenses: number;
  availableAmount: number;
  upcomingPayments: Payment[];
  overduePayments: Payment[];
}

// Keep existing household types for compatibility
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