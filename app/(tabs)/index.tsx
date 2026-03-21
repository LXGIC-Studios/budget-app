import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { impact, notification } from "../../src/lib/haptics";
import { colors, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { StatCard } from "../../src/components/StatCard";
import { TransactionItem } from "../../src/components/TransactionItem";
import { FAB } from "../../src/components/FAB";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import {
  formatCurrency,
  formatMonthLabel,
  shiftMonth,
} from "../../src/utils";

export default function Dashboard() {
  const {
    transactions,
    currentBudget,
    currentMonth,
    setCurrentMonth,
    addTransaction,
    deleteTransaction,
  } = useApp();
  const [sheetVisible, setSheetVisible] = useState(false);

  // Filter transactions for current month
  const monthTxns = useMemo(
    () =>
      transactions.filter((t) => t.date.startsWith(currentMonth)),
    [transactions, currentMonth]
  );

  const totalSpent = useMemo(
    () =>
      monthTxns
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [monthTxns]
  );

  const totalBudget = useMemo(
    () =>
      currentBudget?.categories.reduce((s, c) => s + c.allocated, 0) ?? 0,
    [currentBudget]
  );

  const leftToSpend = totalBudget - totalSpent;
  const isOver = leftToSpend < 0;

  const recentTxns = monthTxns.slice(0, 15);

  const navigateMonth = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  const handleDeleteTxn = (id: string) => {
    notification("Warning");
    deleteTransaction(id);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Month selector */}
      <View style={styles.monthRow}>
        <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
          <ChevronLeft size={26} color={colors.white} strokeWidth={3} />
        </Pressable>
        <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
        <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
          <ChevronRight size={26} color={colors.white} strokeWidth={3} />
        </Pressable>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <StatCard
          emoji={"\uD83D\uDCB0"}
          label="Left to Spend"
          value={formatCurrency(Math.abs(leftToSpend))}
          color={isOver ? colors.red : colors.primary}
        />
        <StatCard
          emoji={"\uD83D\uDCCA"}
          label="Spent"
          value={formatCurrency(totalSpent)}
        />
        <StatCard
          emoji={"\uD83C\uDFAF"}
          label="Budget"
          value={formatCurrency(totalBudget)}
        />
      </View>

      {/* Recent transactions */}
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>RECENT</Text>
        <View style={styles.accentLine} />
        <Text style={styles.recentCount}>{monthTxns.length} THIS MONTH</Text>
      </View>

      <FlatList
        data={recentTxns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onLongPress={() => handleDeleteTxn(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyDot} />
            <Text style={styles.emptyText}>NO TRANSACTIONS YET</Text>
            <Text style={styles.emptySubtext}>
              TAP THE + BUTTON TO ADD ONE
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      {/* FAB */}
      <FAB onPress={() => setSheetVisible(true)} />

      {/* Quick Add Sheet */}
      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={addTransaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    fontSize: 20,
    fontWeight: "900",
    minWidth: 180,
    textAlign: "center",
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  recentTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },
  accentLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cyan,
  },
  recentCount: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
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
  emptyDot: {
    width: 12,
    height: 12,
    backgroundColor: colors.dimmed,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
  },
  emptySubtext: {
    color: colors.dimmed,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
