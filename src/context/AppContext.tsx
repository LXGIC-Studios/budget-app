import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Transaction, UserProfile, MonthlyBudget } from "../types";
import * as storage from "../storage";
import { getMonthKey } from "../utils";

interface AppState {
  profile: UserProfile | null;
  transactions: Transaction[];
  currentBudget: MonthlyBudget | null;
  currentMonth: string;
  loading: boolean;
}

interface AppContextValue extends AppState {
  setCurrentMonth: (month: string) => void;
  reload: () => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  addTransaction: (txn: Transaction) => Promise<void>;
  addTransactions: (txns: Transaction[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveBudget: (budget: MonthlyBudget) => Promise<void>;
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    profile: null,
    transactions: [],
    currentBudget: null,
    currentMonth: getMonthKey(),
    loading: true,
  });

  const loadData = useCallback(async (month?: string) => {
    const targetMonth = month ?? getMonthKey();
    const [profile, transactions, budget] = await Promise.all([
      storage.getProfile(),
      storage.getTransactions(),
      storage.getBudgetForMonth(targetMonth),
    ]);
    setState((prev) => ({
      ...prev,
      profile,
      transactions,
      currentBudget: budget,
      currentMonth: targetMonth,
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

  const resetAll = useCallback(async () => {
    await storage.resetAllData();
    setState({
      profile: null,
      transactions: [],
      currentBudget: null,
      currentMonth: getMonthKey(),
      loading: false,
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
        saveBudget,
        resetAll,
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
      loading: true,
      setCurrentMonth: () => {},
      reload: async () => {},
      saveProfile: async () => {},
      addTransaction: async () => {},
      addTransactions: async () => {},
      deleteTransaction: async () => {},
      saveBudget: async () => {},
      resetAll: async () => {},
    } as AppContextValue;
  }
  return ctx;
}
