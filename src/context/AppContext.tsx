import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Transaction, UserProfile, MonthlyBudget, Debt, Household, HouseholdMember } from "../types";
import * as storage from "../storage";
import { getMonthKey } from "../utils";

interface AppState {
  profile: UserProfile | null;
  transactions: Transaction[];
  currentBudget: MonthlyBudget | null;
  currentMonth: string;
  debts: Debt[];
  loading: boolean;
  household: Household | null;
  householdMembers: HouseholdMember[];
}

interface AppContextValue extends AppState {
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
    loading: true,
    household: null,
    householdMembers: [],
  });

  const loadData = useCallback(async (month?: string) => {
    const targetMonth = month ?? getMonthKey();
    const [profile, transactions, budget, debts, household, householdMembers] = await Promise.all([
      storage.getProfile(),
      storage.getTransactions(),
      storage.getBudgetForMonth(targetMonth),
      storage.getDebts(),
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
      household,
      householdMembers,
      loading: false,
    }));
  }, []);

  useEffect(() => {
    loadData();
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
      await storage.addTransaction(txn);
      await reload();
    },
    [reload]
  );

  const addTransactions = useCallback(
    async (txns: Transaction[]) => {
      await storage.addTransactions(txns);
      await reload();
    },
    [reload]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await storage.deleteTransaction(id);
      await reload();
    },
    [reload]
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Omit<Transaction, "id" | "createdAt">>) => {
      await storage.updateTransaction(id, updates);
      await reload();
    },
    [reload]
  );

  const saveBudget = useCallback(
    async (budget: MonthlyBudget) => {
      await storage.saveBudgetForMonth(budget);
      setState((prev) => ({
        ...prev,
        currentBudget:
          budget.month === prev.currentMonth ? budget : prev.currentBudget,
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

  const resetAll = useCallback(async () => {
    await storage.resetAllData();
    setState({
      profile: null,
      transactions: [],
      currentBudget: null,
      currentMonth: getMonthKey(),
      debts: [],
      loading: false,
      household: null,
      householdMembers: [],
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
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
      updateEmergencyFund: async () => {},
      resetAll: async () => {},
      createHousehold: async () => false,
      joinHousehold: async () => false,
      leaveHousehold: async () => {},
    } as AppContextValue;
  }
  return ctx;
}
