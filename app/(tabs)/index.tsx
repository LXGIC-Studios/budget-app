import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react-native";
import { impact, notification } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { StatCard } from "../../src/components/StatCard";
import { TransactionItem } from "../../src/components/TransactionItem";
import { FAB } from "../../src/components/FAB";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import { CSVImportSheet } from "../../src/components/CSVImportSheet";
import {
  formatCurrency,
  formatMonthLabel,
  shiftMonth,
  getWeekKey,
  getWeekRange,
  formatWeekLabel,
  shiftWeek,
  generateId,
} from "../../src/utils";
import type { Transaction } from "../../src/types";

export default function Dashboard() {
  const {
    profile,
    transactions,
    currentMonth,
    setCurrentMonth,
    addTransaction,
    addTransactions,
    deleteTransaction,
    updateTransaction,
  } = useApp();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());
  const [editingTxn, setEditingTxn] = useState<typeof transactions[0] | undefined>(undefined);
  const [sheetInitialMode, setSheetInitialMode] = useState<"expense" | "income" | undefined>(undefined);
  const [csvImportVisible, setCsvImportVisible] = useState(false);

  const monthlyIncome = profile?.monthlyIncome ?? 0;

  // Filter transactions for current month
  const monthTxns = useMemo(
    () =>
      transactions.filter((t) => t.date.startsWith(currentMonth)),
    [transactions, currentMonth]
  );

  // Filter transactions for current week
  const weekRange = useMemo(() => getWeekRange(currentWeek), [currentWeek]);
  const weekTxns = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= weekRange.start && d <= weekRange.end;
      }),
    [transactions, weekRange]
  );

  const activeTxns = viewMode === "weekly" ? weekTxns : monthTxns;

  const totalSpent = useMemo(
    () =>
      activeTxns
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [activeTxns]
  );

  // Use REAL income from transactions, not averages
  const actualIncome = useMemo(
    () =>
      activeTxns
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [activeTxns]
  );

  // For monthly: use real income if we have any, otherwise fall back to profile
  // For weekly: always use real income from that week's transactions
  const displayIncome = viewMode === "weekly"
    ? actualIncome
    : (actualIncome > 0 ? actualIncome : monthlyIncome);
  const leftToSpend = displayIncome - totalSpent;
  const isOver = leftToSpend < 0;

  const recentTxns = activeTxns.slice(0, 15);

  const navigateMonth = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  const navigateWeek = (delta: number) => {
    impact("Light");
    setCurrentWeek(shiftWeek(currentWeek, delta));
  };

  const switchViewMode = (mode: "monthly" | "weekly") => {
    setViewMode(mode);
    impact("Light");
  };

  const handleDeleteTxn = (id: string) => {
    notification("Warning");
    deleteTransaction(id);
  };

  const handleSplit = async (original: Transaction, splits: { category: string; amount: number }[]) => {
    // Delete the original transaction, then create split children
    await deleteTransaction(original.id);

    const splitTxns: Transaction[] = splits.map((s) => ({
      id: generateId(),
      type: original.type,
      amount: s.amount,
      category: s.category,
      note: `[split] ${original.note ?? ""}`.trim(),
      date: original.date,
      createdAt: new Date().toISOString(),
    }));

    await addTransactions(splitTxns);

    const msg = `Split into ${splits.length} transactions.`;
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert("Split Complete", msg);
    }
  };

  const handleCSVImport = async (txns: Transaction[]) => {
    await addTransactions(txns);
    const msg = `Successfully imported ${txns.length} transaction${txns.length !== 1 ? "s" : ""}.`;
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert("Import Complete", msg);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>STACKD</Text>
        <Text style={styles.headerSubtitle}>Your financial command center</Text>
      </View>

      {/* Period selector */}
      {viewMode === "monthly" ? (
        <View style={styles.monthRow}>
          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
            <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
          <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
            <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.monthRow}>
          <Pressable onPress={() => navigateWeek(-1)} hitSlop={12}>
            <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatWeekLabel(currentWeek).toUpperCase()}</Text>
          <Pressable onPress={() => navigateWeek(1)} hitSlop={12}>
            <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>
      )}

      {/* View mode toggle */}
      <View style={styles.viewToggleRow}>
        <Pressable
          onPress={() => switchViewMode("monthly")}
          style={[styles.viewToggleBtn, viewMode === "monthly" && styles.viewToggleBtnActive]}
        >
          <Text style={[styles.viewToggleText, viewMode === "monthly" && styles.viewToggleTextActive]}>
            MONTHLY
          </Text>
        </Pressable>
        <Pressable
          onPress={() => switchViewMode("weekly")}
          style={[styles.viewToggleBtn, viewMode === "weekly" && styles.viewToggleBtnActive]}
        >
          <Text style={[styles.viewToggleText, viewMode === "weekly" && styles.viewToggleTextActive]}>
            WEEKLY
          </Text>
        </Pressable>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <StatCard
          emoji={"\uD83D\uDCB0"}
          label="Left to Spend"
          value={formatCurrency(Math.abs(leftToSpend))}
          color={isOver ? colors.red : colors.primary}
          accentColor={isOver ? colors.red : colors.primary}
          variant={isOver ? "negative" : "positive"}
        />
        <StatCard
          emoji={"\uD83D\uDCCA"}
          label="Spent"
          value={formatCurrency(totalSpent)}
          accentColor={colors.red}
          variant="neutral"
        />
        <Pressable
          onPress={() => {
            setEditingTxn(undefined);
            setSheetInitialMode("income");
            setSheetVisible(true);
            impact("Light");
          }}
          style={{ flex: 1 }}
        >
          <StatCard
            emoji={"\uD83D\uDCB5"}
            label={viewMode === "weekly" ? "Wk Income" : "Income"}
            value={formatCurrency(displayIncome)}
            accentColor={colors.primary}
            variant="positive"
          />
          <View style={styles.incomeAddHint}>
            <Text style={styles.incomeAddHintText}>+ ADD</Text>
          </View>
        </Pressable>
      </View>

      {/* Import CSV button */}
      <Pressable
        onPress={() => {
          impact("Light");
          setCsvImportVisible(true);
        }}
        style={styles.importBtn}
      >
        <Upload size={14} color={colors.primaryText} strokeWidth={2.5} />
        <Text style={styles.importBtnText}>IMPORT CSV</Text>
      </Pressable>

      {/* Recent transactions */}
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>RECENT TRANSACTIONS</Text>
        <Text style={styles.recentCount}>
          {activeTxns.length} this {viewMode === "weekly" ? "week" : "month"}
        </Text>
      </View>

      <FlatList
        data={recentTxns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={() => {
              setEditingTxn(item);
              setSheetInitialMode(undefined);
              setSheetVisible(true);
            }}
            onLongPress={() => handleDeleteTxn(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add one
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      {/* FAB */}
      <FAB onPress={() => {
        setEditingTxn(undefined);
        setSheetInitialMode(undefined);
        setSheetVisible(true);
      }} />

      {/* Quick Add Sheet */}
      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingTxn(undefined);
          setSheetInitialMode(undefined);
        }}
        onSave={addTransaction}
        editTransaction={editingTxn}
        onUpdate={updateTransaction}
        onDelete={(id) => {
          deleteTransaction(id);
          setSheetVisible(false);
          setEditingTxn(undefined);
        }}
        onSplit={(original, splits) => {
          setSheetVisible(false);
          setEditingTxn(undefined);
          handleSplit(original, splits);
        }}
        initialMode={sheetInitialMode}
      />

      {/* CSV Import Sheet */}
      <CSVImportSheet
        visible={csvImportVisible}
        onClose={() => setCsvImportVisible(false)}
        onImport={handleCSVImport}
        existingTransactions={transactions}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  monthLabel: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    minWidth: 200,
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  viewToggleRow: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    padding: 3,
    marginBottom: spacing.md,
  },
  viewToggleBtn: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 2,
  },
  viewToggleBtnActive: {
    backgroundColor: colors.primarySolid,
  },
  viewToggleText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  viewToggleTextActive: {
    color: colors.primaryText,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primarySolid,
    paddingVertical: 10,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 2,
  },
  importBtnText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  recentTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  recentCount: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  list: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },
  emptySubtext: {
    color: colors.dimmed,
    fontSize: 14,
  },
  incomeAddHint: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: colors.primarySolid,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  incomeAddHintText: {
    color: colors.primaryText,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
