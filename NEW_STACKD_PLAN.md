# NEW STACKD - Simplified Cash Flow Manager

## Core Concept
Transform from detailed transaction tracker → Simple weekly/monthly cash flow with full CRUD

## Data Models (Full CRUD on Everything)

### 1. Income Sources
```typescript
interface IncomeSource {
  id: string;
  name: string; // "Nathan Salary", "Ashley Freelance"
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: number; // For weekly (0=Monday)
  dayOfMonth?: number; // For monthly
  startDate?: string; // For biweekly anchor
  active: boolean;
  householdId: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2. Fixed Expenses (Bills/Subscriptions)
```typescript
interface FixedExpense {
  id: string;
  name: string; // "Rent", "Electric", "Spotify"
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  dueDay: number; // Day of month for monthly
  autoDeducted: boolean; // True = auto-pay, False = manual
  category: 'housing' | 'utilities' | 'subscriptions' | 'insurance' | 'other';
  emoji: string;
  active: boolean;
  householdId: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3. Payment Tracking
```typescript
interface Payment {
  id: string;
  expenseId: string; // Links to FixedExpense
  dueDate: string; // "2026-05-15"
  paidDate?: string; // When marked as paid
  amount: number; // Can override default expense amount
  status: 'pending' | 'paid' | 'overdue';
  householdId: string;
  paidBy?: string; // User ID who marked it paid
  createdAt: string;
}
```

### 4. Household Settings
```typescript
interface HouseholdSettings {
  id: string;
  householdId: string;
  savingsTargetWeekly?: number;
  savingsTargetMonthly?: number;
  viewMode: 'weekly' | 'monthly';
  currency: string;
  timezone: string;
  updatedAt: string;
}
```

## New UI Structure

### Main Dashboard
- **Top**: Income this week/month (calculated from IncomeSource)
- **Middle**: Fixed expenses due this period (from FixedExpense + Payment status)
- **Bottom**: Available amount (Income - Fixed Expenses)

### Full CRUD Interfaces
1. **Income Management**: Add/Edit/Delete income sources
2. **Bills Management**: Add/Edit/Delete fixed expenses  
3. **Payment Tracking**: Mark bills as paid, edit amounts
4. **Settings**: Household preferences, savings targets

## Keep Ashley + Nathan Together
- Shared `householdId` for all data
- Both users can CRUD everything
- Combined totals in all views

## Implementation Plan
1. Create new simplified types
2. Build new CRUD components
3. Migrate existing data
4. Keep the existing UI design language
5. Remove unused features (accounts, transfers, daily tracking)

Ready to start building?