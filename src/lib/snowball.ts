import type { Debt } from "../types";

export interface SnowballResult {
  debtId: string;
  name: string;
  startingBalance: number;
  estimatedPayoffDate: Date;
  totalInterestPaid: number;
  monthsToPayoff: number;
}

export interface SnowballSummary {
  results: SnowballResult[];
  debtFreeDate: Date;
  totalInterestPaid: number;
  snowballPayment: number;
}

/**
 * Dave Ramsey Debt Snowball Calculator
 *
 * Sorts debts by balance (smallest first).
 * All extra money goes to the smallest debt.
 * When a debt is paid off, its payment rolls into the next smallest.
 */
export function calculateSnowball(
  debts: Debt[],
  monthlyIncome: number,
  monthlyExpenses: number
): SnowballSummary {
  if (debts.length === 0) {
    return {
      results: [],
      debtFreeDate: new Date(),
      totalInterestPaid: 0,
      snowballPayment: 0,
    };
  }

  // Sort by balance ascending (snowball order)
  const sorted = [...debts].sort((a, b) => a.balance - b.balance);

  const totalMinPayments = sorted.reduce((s, d) => s + d.minimumPayment, 0);
  const extraMoney = Math.max(
    0,
    monthlyIncome - monthlyExpenses - totalMinPayments
  );
  const snowballPayment = extraMoney + totalMinPayments;

  // Simulate month-by-month payoff
  const balances = sorted.map((d) => d.balance);
  const minPayments = sorted.map((d) => d.minimumPayment);
  const rates = sorted.map((d) => d.interestRate / 100 / 12);
  const payoffMonths = new Array(sorted.length).fill(0);
  const interestPaid = new Array(sorted.length).fill(0);
  const paidOff = new Array(sorted.length).fill(false);

  let month = 0;
  const maxMonths = 360; // 30 years cap

  while (balances.some((b, i) => !paidOff[i] && b > 0) && month < maxMonths) {
    month++;

    // Apply interest first
    for (let i = 0; i < balances.length; i++) {
      if (paidOff[i]) continue;
      const interest = balances[i] * rates[i];
      balances[i] += interest;
      interestPaid[i] += interest;
    }

    // Calculate available extra money (freed-up payments from paid-off debts)
    let availableExtra = extraMoney;
    for (let i = 0; i < balances.length; i++) {
      if (paidOff[i]) {
        availableExtra += minPayments[i];
      }
    }

    // Apply minimum payments to all debts
    for (let i = 0; i < balances.length; i++) {
      if (paidOff[i]) continue;
      const payment = Math.min(minPayments[i], balances[i]);
      balances[i] -= payment;
      if (balances[i] <= 0.01) {
        balances[i] = 0;
        paidOff[i] = true;
        payoffMonths[i] = month;
      }
    }

    // Apply extra to smallest unpaid debt
    for (let i = 0; i < balances.length; i++) {
      if (paidOff[i] || balances[i] <= 0) continue;
      const extraPayment = Math.min(availableExtra, balances[i]);
      balances[i] -= extraPayment;
      availableExtra -= extraPayment;
      if (balances[i] <= 0.01) {
        balances[i] = 0;
        paidOff[i] = true;
        payoffMonths[i] = month;
      }
      break; // Only apply extra to first unpaid debt
    }
  }

  const now = new Date();
  const results: SnowballResult[] = sorted.map((debt, i) => {
    const payoffDate = new Date(now);
    payoffDate.setMonth(payoffDate.getMonth() + payoffMonths[i]);
    return {
      debtId: debt.id,
      name: debt.name,
      startingBalance: debt.balance,
      estimatedPayoffDate: payoffDate,
      totalInterestPaid: Math.round(interestPaid[i] * 100) / 100,
      monthsToPayoff: payoffMonths[i],
    };
  });

  const maxPayoffMonth = Math.max(...payoffMonths);
  const debtFreeDate = new Date(now);
  debtFreeDate.setMonth(debtFreeDate.getMonth() + maxPayoffMonth);

  return {
    results,
    debtFreeDate,
    totalInterestPaid: Math.round(
      interestPaid.reduce((s: number, v: number) => s + v, 0) * 100
    ) / 100,
    snowballPayment,
  };
}
