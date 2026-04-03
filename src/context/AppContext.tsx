import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { Transaction, UserProfile, MonthlyBudget, Debt, Household, HouseholdMember, AccountTag } from "../types";
import * as storage from "../storage";
import { supabase } from "../lib/supabase";
import { getMonthKey } from "../utils";

// Known ending balance from bank data as of Dec 31, 2025
const DEC_2025_ENDING_BALANCE = 1373;

interface AppState {
  profile: UserProfile | null;
  transactions: Transaction[];
  currentBudget: MonthlyBudget | null;
  currentMonth: string;
  debts: Debt[];
  userAccounts: AccountTag[];
  loading: boolean;
  household: Household | null;
  householdMembers: HouseholdMember[];
}

interface AppContextValue extends AppState {
  monthlyRollover: number;
  setCurrentMonth: (month: string) => void;
  reload: () => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  addTransaction: (txn: Transaction) => Promise<void>;
  addTransactions: (txns: Transaction[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, "id" | "createdAt">>) => Promise<void>;
  saveBudget: (budget: MonthlyBudget) => Promise<void>;
  addDebt: (debt: Debt) => Promise<void>;
  updateDebt: (id: string, updates: Partial<Omit<Debt, "id" | "createdAt">>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addUserAccount: (label: string, emoji: string) => Promise<void>;
  deleteUserAccount: (id: string) => Promise<void>;
  updateEmergencyFund: (amount: number) => Promise<void>;
  resetAll: () => Promise<void>;
  createHousehold: (name: string) => Promise<boolean>;
  joinHousehold: (code: string) => Promise<boolean>;
  leaveHousehold: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    profile: null,
    transactions: [],
    currentBudget: null,
    currentMonth: getMonthKey(),
    debts: [],
    userAccounts: [],
    loading: true,
    household: null,
    householdMembers: [],
  });

  const loadData = useCallback(async (month?: string) => {
    const targetMonth = month ?? getMonthKey();
    const [profile, transactions, budget, debts, userAccounts, household, householdMembers] = await Promise.all([
      storage.getProfile(),
      storage.getTransactions(),
      storage.getBudgetForMonth(targetMonth),
      storage.getDebts(),
      storage.getUserAccounts(),
      storage.getHousehold(),
      storage.getHouseholdMembers(),
    ]);
    setState((prev) => ({
      ...prev,
      profile,
      transactions,
      currentBudget: budget,
      currentMonth: targetMonth,
      debts,
      userAccounts,
      household,
      householdMembers,
      loading: false,
    }));
  }, []);

  useEffect(() => {
    loadData();

    // Re-load data when auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  const setCurrentMonth = useCallback(
    (month: string) => {
      loadData(month);
    },
    [loadData]
  );

  const reload = useCallback(() => loadData(state.currentMonth), [loadData, state.currentMonth]);

  const saveProfile = useCallback(
    async (profile: UserProfile) => {
      await storage.saveProfile(profile);
      setState((prev) => ({ ...prev, profile }));
    },
    []
  );

  const addTransaction = useCallback(
    async (txn: Transaction) => {
      // Optimistic: add to local state immediately
      setState((prev) => ({
        ...prev,
        transactions: [txn, ...prev.transactions],
      }));
      try {
        await storage.addTransaction(txn);
      } catch {
        // Rollback on failure
        setState((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((t) => t.id !== txn.id),
        }));
      }
    },
    []
  );

  const addTransactions = useCallback(
    async (txns: Transaction[]) => {
      const ids = new Set(txns.map((t) => t.id));
      // Optimistic: add all to local state
      setState((prev) => ({
        ...prev,
        transactions: [...txns, ...prev.transactions],
      }));
      try {
        await storage.addTransactions(txns);
      } catch {
        // Rollback on failure
        setState((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((t) => !ids.has(t.id)),
        }));
      }
    },
    []
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      // Save for rollback
      let removed: Transaction | undefined;
      setState((prev) => {
        removed = prev.transactions.find((t) => t.id === id);
        return {
          ...prev,
          transactions: prev.transactions.filter((t) => t.id !== id),
        };
      });
      try {
        await storage.deleteTransaction(id);
      } catch {
        // Rollback on failure
        if (removed) {
          setState((prev) => ({
            ...prev,
            transactions: [removed!, ...prev.transactions],
          }));
        }
      }
    },
    []
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Omit<Transaction, "id" | "createdAt">>) => {
      // Save old version for rollback
      let original: Transaction | undefined;
      setState((prev) => {
        original = prev.transactions.find((t) => t.id === id);
        return {
          ...prev,
          transactions: prev.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        };
      });
      try {
        await storage.updateTransaction(id, updates);
      } catch {
        // Rollback on failure
        if (original) {
          setState((prev) => ({
            ...prev,
            transactions: prev.transactions.map((t) =>
              t.id === id ? original! : t
            ),
          }));
        }
      }
    },
    []
  );

  const saveBudget = useCallback(
    async (budget: MonthlyBudget) => {
      // saveBudgetForMonth returns budget with DB-assigned IDs
      const saved = await storage.saveBudgetForMonth(budget);
      setState((prev) => ({
        ...prev,
        currentBudget:
          saved.month === prev.currentMonth ? saved : prev.currentBudget,
      }));
    },
    []
  );

  const addDebt = useCallback(
    async (debt: Debt) => {
      await storage.addDebt(debt);
      await reload();
    },
    [reload]
  );

  const updateDebt = useCallback(
    async (id: string, updates: Partial<Omit<Debt, "id" | "createdAt">>) => {
      await storage.updateDebt(id, updates);
      await reload();
    },
    [reload]
  );

  const deleteDebt = useCallback(
    async (id: string) => {
      await storage.deleteDebt(id);
      await reload();
    },
    [reload]
  );

  const addUserAccountAction = useCallback(async (label: string, emoji: string) => {
    const result = await storage.addUserAccount(label, emoji);
    if (result) setState((prev) => ({ ...prev, userAccounts: [...prev.userAccounts, result] }));
  }, []);

  const deleteUserAccountAction = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, userAccounts: prev.userAccounts.filter((a) => a.id !== id) }));
    await storage.deleteUserAccount(id);
  }, []);

  const updateEmergencyFund = useCallback(
    async (amount: number) => {
      if (!state.profile) return;
      const updated = { ...state.profile, emergencyFundCurrent: amount };
      // Auto-advance baby step if $1000 reached
      if (amount >= 1000 && state.profile.babyStep === 1) {
        updated.babyStep = 2;
      }
      // Auto-advance to step 3 if no debts and on step 2
      if (updated.babyStep === 2 && state.debts.length === 0) {
        updated.babyStep = 3;
      }
      await storage.saveProfile(updated);
      setState((prev) => ({ ...prev, profile: updated }));
    },
    [state.profile, state.debts]
  );

  const createHouseholdAction = useCallback(
    async (name: string): Promise<boolean> => {
      const result = await storage.createHousehold(name);
      if (result) {
        await reload();
        return true;
      }
      return false;
    },
    [reload]
  );

  const joinHouseholdAction = useCallback(
    async (code: string): Promise<boolean> => {
      const result = await storage.joinHousehold(code);
      if (result) {
        await reload();
        return true;
      }
      return false;
    },
    [reload]
  );

  const leaveHouseholdAction = useCallback(
    async () => {
      await storage.leaveHousehold();
      await reload();
    },
    [reload]
  );

  // Compute rollover balance for the current month.
  // Starting from DEC_2025_ENDING_BALANCE, sum all REAL income and subtract
  // all REAL expenses for every month BEFORE currentMonth.
  // Transfers are excluded - they don't change net worth.
  const monthlyRollover = useMemo(() => {
    let balance = DEC_2025_ENDING_BALANCE;
    for (const t of state.transactions) {
      const txnMonth = t.date.substring(0, 7); // "YYYY-MM"
      if (txnMonth < "2026-01") continue; // before our starting point
      if (txnMonth >= state.currentMonth) continue; // not a prior month
      // Skip transfers - they don't affect net balance
      if (t.type === "transfer" || t.category === "transfer") continue;
      if (t.type === "income") {
        balance += t.amount;
      } else {
        balance -= t.amount;
      }
    }
    return balance;
  }, [state.transactions, state.currentMonth]);

  const resetAll = useCallback(async () => {
    await storage.resetAllData();
    setState({
      profile: null,
      transactions: [],
      currentBudget: null,
      currentMonth: getMonthKey(),
      debts: [],
      userAccounts: [],
      loading: false,
      household: null,
      householdMembers: [],
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        monthlyRollover,
        setCurrentMonth,
        reload,
        saveProfile,
        addTransaction,
        addTransactions,
        deleteTransaction,
        updateTransaction,
        saveBudget,
        addDebt,
        updateDebt,
        deleteDebt,
        addUserAccount: addUserAccountAction,
        deleteUserAccount: deleteUserAccountAction,
        updateEmergencyFund,
        resetAll,
        createHousehold: createHouseholdAction,
        joinHousehold: joinHouseholdAction,
        leaveHousehold: leaveHouseholdAction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    // Return a safe default when outside AppProvider (e.g. login screen on web)
    return {
      profile: null,
      transactions: [],
      currentBudget: null,
      currentMonth: getMonthKey(),
      debts: [],
      loading: true,
      household: null,
      householdMembers: [],
      monthlyRollover: 0,
      setCurrentMonth: () => {},
      reload: async () => {},
      saveProfile: async () => {},
      addTransaction: async () => {},
      addTransactions: async () => {},
      deleteTransaction: async () => {},
      updateTransaction: async () => {},
      saveBudget: async () => {},
      addDebt: async () => {},
      updateDebt: async () => {},
      deleteDebt: async () => {},
      addUserAccount: async () => {},
      deleteUserAccount: async () => {},
      updateEmergencyFund: async () => {},
      resetAll: async () => {},
      createHousehold: async () => false,
      joinHousehold: async () => false,
      leaveHousehold: async () => {},
    } as AppContextValue;
  }
  return ctx;
}
