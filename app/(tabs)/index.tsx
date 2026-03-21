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
import { colors, spacing, radius } from "../../src/theme";
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
    profile,
    transactions,
    currentMonth,
    setCurrentMonth,
    addTransaction,
    deleteTransaction,
  } = useApp();
  const [sheetVisible, setSheetVisible] = useState(false);

  const monthlyIncome = profile?.monthlyIncome ?? 0;

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

  const leftToSpend = monthlyIncome - totalSpent;
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
          <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth)}</Text>
        <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
          <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
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
          emoji={"\uD83D\uDCB5"}
          label="Income"
          value={formatCurrency(monthlyIncome)}
        />
      </View>

      {/* Recent transactions */}
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recent Transactions</Text>
        <Text style={styles.recentCount}>{monthTxns.length} this month</Text>
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
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add one
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
    fontSize: 18,
    fontWeight: "600",
    minWidth: 160,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  recentTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  recentCount: {
    color: colors.textSecondary,
    fontSize: 13,
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
});
