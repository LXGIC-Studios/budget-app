import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import { FAB } from "../../src/components/FAB";
import {
  formatCurrency,
  getWeekKey,
  getWeekRange,
  formatWeekLabel,
  shiftWeek,
  formatShortDate,
  getMonthlyAmount,
} from "../../src/utils";
import type { Transaction } from "../../src/types";

// Determine if a bill's due_day falls within [start, end]
function billsDueInWeek(dueDay: number, start: Date, end: Date): boolean {
  const startY = start.getFullYear();
  const endY = end.getFullYear();
  const startM = start.getMonth();
  const endM = end.getMonth();
  const monthsToCheck = startM === endM
    ? [{ y: startY, m: startM }]
    : [{ y: startY, m: startM }, { y: endY, m: endM }];
  return monthsToCheck.some(({ y, m }) => {
    const d = new Date(y, m, dueDay);
    return d >= start && d <= end;
  });
}

export default function HomeScreen() {
  const { transactions, currentBudget, addTransaction, updateTransaction, deleteTransaction } = useApp();
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | undefined>(undefined);

  const weekRange = useMemo(() => getWeekRange(currentWeek), [currentWeek]);
  const weekLabel = formatWeekLabel(currentWeek);

  // Transactions in current week (exclude transfers)
  const weekTxns = useMemo(() =>
    transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= weekRange.start && d <= weekRange.end && t.type !== "transfer";
    }),
    [transactions, weekRange]
  );

  const weekIncome = useMemo(() =>
    weekTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [weekTxns]
  );
  const weekExpenses = useMemo(() =>
    weekTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [weekTxns]
  );
  const weekNet = weekIncome - weekExpenses;

  // Paychecks this week
  const incomeTxns = useMemo(() =>
    weekTxns.filter((t) => t.type === "income").sort((a, b) => a.date.localeCompare(b.date)),
    [weekTxns]
  );

  // Expense transactions this week
  const expenseTxns = useMemo(() =>
    weekTxns.filter((t) => t.type === "expense").sort((a, b) => b.date.localeCompare(a.date)),
    [weekTxns]
  );

  // Fixed bills due this week (from budget plan)
  const billsDue = useMemo(() => {
    if (!currentBudget) return [];
    return currentBudget.categories.filter(
      (c) => c.type === "fixed" && c.dueDay != null && billsDueInWeek(c.dueDay, weekRange.start, weekRange.end)
    );
  }, [currentBudget, weekRange]);

  const totalBillsDue = billsDue.reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);

  // Check if this is a paycheck week (has income transactions)
  const isPaycheckWeek = incomeTxns.length > 0;

  const navigate = (delta: number) => {
    impact("Light");
    setCurrentWeek(shiftWeek(currentWeek, delta));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>STACKD</Text>
          {isPaycheckWeek && (
            <View style={styles.paycheckBadge}>
              <Text style={styles.paycheckBadgeText}>PAYDAY</Text>
            </View>
          )}
        </View>

        {/* Week navigation */}
        <View style={styles.weekNav}>
          <Pressable onPress={() => navigate(-1)} hitSlop={16} style={styles.navBtn}>
            <ChevronLeft size={22} color={colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.weekLabel}>{weekLabel.toUpperCase()}</Text>
          <Pressable onPress={() => navigate(1)} hitSlop={16} style={styles.navBtn}>
            <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Net cash flow hero */}
        <View style={[styles.heroCard, { borderColor: weekNet >= 0 ? colors.primary : colors.red }]}>
          <Text style={styles.heroLabel}>WEEK NET</Text>
          <Text style={[styles.heroAmount, { color: weekNet >= 0 ? colors.primary : colors.red }]}>
            {weekNet >= 0 ? "+" : ""}{formatCurrency(weekNet)}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <TrendingUp size={14} color={colors.primary} />
              <Text style={styles.heroStatLabel}>IN</Text>
              <Text style={[styles.heroStatValue, { color: colors.primary }]}>{formatCurrency(weekIncome)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <TrendingDown size={14} color={colors.red} />
              <Text style={styles.heroStatLabel}>OUT</Text>
              <Text style={[styles.heroStatValue, { color: colors.red }]}>{formatCurrency(weekExpenses)}</Text>
            </View>
          </View>
        </View>

        {/* COMING IN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMING IN</Text>
          {incomeTxns.length === 0 ? (
            <Text style={styles.emptyLine}>No income logged this week</Text>
          ) : (
            incomeTxns.map((t) => (
              <Pressable key={t.id} onPress={() => { setEditingTxn(t); setSheetVisible(true); }} style={styles.incomeRow}>
                <View style={styles.rowLeft}>
                  <Text style={styles.incomeNote}>{t.note || t.category}</Text>
                  <Text style={styles.rowDate}>{formatShortDate(t.date)}</Text>
                </View>
                <Text style={styles.incomeAmount}>+{formatCurrency(t.amount)}</Text>
              </Pressable>
            ))
          )}
        </View>

        {/* BILLS DUE */}
        {billsDue.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>BILLS DUE</Text>
              <Text style={styles.sectionTotal}>{formatCurrency(totalBillsDue)}</Text>
            </View>
            {billsDue.map((c) => (
              <View key={c.id} style={styles.billRow}>
                <Text style={styles.billEmoji}>{c.emoji}</Text>
                <View style={styles.rowLeft}>
                  <Text style={styles.billName}>{c.name}</Text>
                  {c.dueDay && <Text style={styles.rowDate}>Due {c.dueDay}</Text>}
                </View>
                <Text style={styles.billAmount}>{formatCurrency(getMonthlyAmount(c.allocated, c.frequency || "monthly"))}</Text>
              </View>
            ))}
          </View>
        )}

        {/* SPENDING THIS WEEK */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>SPENDING</Text>
            {expenseTxns.length > 0 && (
              <Text style={styles.sectionTotal}>{formatCurrency(weekExpenses)}</Text>
            )}
          </View>
          {expenseTxns.length === 0 ? (
            <Text style={styles.emptyLine}>No expenses logged yet - tap + to add</Text>
          ) : (
            expenseTxns.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => { setEditingTxn(t); setSheetVisible(true); }}
                style={styles.expenseRow}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.expenseCategory}>{t.category}</Text>
                  {t.note && <Text style={styles.expenseNote}>{t.note}</Text>}
                  <Text style={styles.rowDate}>{formatShortDate(t.date)}</Text>
                </View>
                <Text style={styles.expenseAmount}>-{formatCurrency(t.amount)}</Text>
              </Pressable>
            ))
          )}
        </View>

      </ScrollView>

      <FAB onPress={() => { setEditingTxn(undefined); setSheetVisible(true); }} />

      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); setEditingTxn(undefined); }}
        onSave={addTransaction}
        editTransaction={editingTxn}
        onUpdate={updateTransaction}
        onDelete={(id) => { deleteTransaction(id); setSheetVisible(false); setEditingTxn(undefined); }}
        initialMode={editingTxn ? undefined : "expense"}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  appTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 6,
  },
  paycheckBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  paycheckBadgeText: {
    color: colors.primaryText,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  navBtn: {
    padding: 4,
  },
  weekLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.5,
    flex: 1,
    textAlign: "center",
  },
  heroCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 2,
    backgroundColor: colors.card,
    padding: spacing.lg,
    alignItems: "center",
  },
  heroLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: spacing.xs,
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1,
    marginBottom: spacing.md,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroStatLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  heroDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.cardBorder,
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionTotal: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyLine: {
    color: colors.textSecondary,
    fontSize: 13,
    padding: spacing.md,
    fontStyle: "italic",
  },
  incomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  incomeNote: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  incomeAmount: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "800",
  },
  rowDate: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  billEmoji: {
    fontSize: 16,
  },
  billName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "500",
  },
  billAmount: {
    color: colors.red,
    fontSize: 15,
    fontWeight: "700",
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  expenseCategory: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  expenseNote: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  expenseAmount: {
    color: colors.red,
    fontSize: 15,
    fontWeight: "700",
  },
});
