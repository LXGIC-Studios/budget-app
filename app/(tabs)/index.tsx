import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CheckCircle, X } from "lucide-react-native";
import { impact, notification } from "../../src/lib/haptics";
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
  generateId,
} from "../../src/utils";
import type { Transaction, BudgetCategory } from "../../src/types";

function billsDueInWeek(dueDay: number, start: Date, end: Date): boolean {
  const startM = start.getMonth();
  const endM = end.getMonth();
  const startY = start.getFullYear();
  const endY = end.getFullYear();
  const months = startM === endM
    ? [{ y: startY, m: startM }]
    : [{ y: startY, m: startM }, { y: endY, m: endM }];
  return months.some(({ y, m }) => {
    const d = new Date(y, m, dueDay);
    return d >= start && d <= end;
  });
}

// Modal for paying a bill
function PayBillModal({
  bill,
  onClose,
  onQuickPay,
  onCustomPay,
}: {
  bill: BudgetCategory;
  onClose: () => void;
  onQuickPay: (amount: number) => void;
  onCustomPay: (amount: number) => void;
}) {
  const defaultAmount = getMonthlyAmount(bill.allocated, bill.frequency || "monthly");
  const [customAmount, setCustomAmount] = useState(defaultAmount.toFixed(2));
  const [mode, setMode] = useState<"choose" | "custom">("choose");

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={payStyles.overlay} onPress={onClose}>
        <Pressable style={payStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={payStyles.handle} />

          <View style={payStyles.header}>
            <Text style={payStyles.emoji}>{bill.emoji}</Text>
            <Text style={payStyles.name}>{bill.name}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {mode === "choose" ? (
            <>
              {/* Quick pay exact amount */}
              <Pressable
                style={payStyles.quickPayBtn}
                onPress={() => onQuickPay(defaultAmount)}
              >
                <View>
                  <Text style={payStyles.quickPayLabel}>MARK PAID</Text>
                  <Text style={payStyles.quickPaySub}>Exact amount</Text>
                </View>
                <Text style={payStyles.quickPayAmount}>{formatCurrency(defaultAmount)}</Text>
              </Pressable>

              {/* Custom amount */}
              <Pressable
                style={payStyles.customBtn}
                onPress={() => setMode("custom")}
              >
                <Text style={payStyles.customBtnText}>ENTER DIFFERENT AMOUNT</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={payStyles.customLabel}>ACTUAL AMOUNT PAID</Text>
              <TextInput
                style={payStyles.customInput}
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
              />
              <View style={payStyles.customActions}>
                <Pressable style={payStyles.cancelBtn} onPress={() => setMode("choose")}>
                  <Text style={payStyles.cancelBtnText}>BACK</Text>
                </Pressable>
                <Pressable
                  style={payStyles.confirmBtn}
                  onPress={() => {
                    const amt = parseFloat(customAmount);
                    if (!isNaN(amt) && amt > 0) onCustomPay(amt);
                  }}
                >
                  <Text style={payStyles.confirmBtnText}>CONFIRM PAID</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const payStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0a0a0a",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,255,204,0.2)",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: spacing.lg,
    paddingBottom: Platform.OS === "web" ? spacing.lg : 48,
    gap: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  emoji: { fontSize: 24 },
  name: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
    letterSpacing: 1,
  },
  quickPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    borderRadius: 2,
    padding: spacing.md,
  },
  quickPayLabel: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
  },
  quickPaySub: {
    color: colors.primaryText,
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  quickPayAmount: {
    color: colors.primaryText,
    fontSize: 20,
    fontWeight: "900",
  },
  customBtn: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    padding: spacing.md,
    alignItems: "center",
  },
  customBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  customLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  customInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 2,
    padding: spacing.md,
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  customActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    padding: spacing.md,
    alignItems: "center",
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 2,
    padding: spacing.md,
    alignItems: "center",
  },
  confirmBtnText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
});

export default function HomeScreen() {
  const { transactions, currentBudget, addTransaction, updateTransaction, deleteTransaction } = useApp();
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | undefined>(undefined);
  const [payingBill, setPayingBill] = useState<BudgetCategory | null>(null);

  const weekRange = useMemo(() => getWeekRange(currentWeek), [currentWeek]);
  const weekLabel = formatWeekLabel(currentWeek);

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

  const incomeTxns = useMemo(() =>
    weekTxns.filter((t) => t.type === "income").sort((a, b) => a.date.localeCompare(b.date)),
    [weekTxns]
  );
  const expenseTxns = useMemo(() =>
    weekTxns.filter((t) => t.type === "expense").sort((a, b) => b.date.localeCompare(a.date)),
    [weekTxns]
  );

  // Bills due this week
  const billsDue = useMemo(() => {
    if (!currentBudget) return [];
    return currentBudget.categories.filter(
      (c) => c.type === "fixed" && c.dueDay != null && billsDueInWeek(c.dueDay!, weekRange.start, weekRange.end)
    );
  }, [currentBudget, weekRange]);

  const totalBillsDue = billsDue.reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);

  // Which bills have already been paid this week (matching expense note)
  const paidBillNames = useMemo(() => {
    const names = new Set<string>();
    expenseTxns.forEach((t) => {
      if (t.note) {
        const noteLower = t.note.toLowerCase();
        billsDue.forEach((b) => {
          if (noteLower.includes(b.name.toLowerCase()) || noteLower.includes("paid: " + b.name.toLowerCase())) {
            names.add(b.id);
          }
        });
      }
    });
    return names;
  }, [expenseTxns, billsDue]);

  // Flex category spending this week vs monthly budget
  const flexCategories = useMemo(() => {
    if (!currentBudget) return [];
    return currentBudget.categories.filter((c) => c.type === "flexible");
  }, [currentBudget]);

  const flexSpend = useMemo(() => {
    const map: Record<string, number> = {};
    expenseTxns.forEach((t) => {
      const key = t.category.toLowerCase();
      map[key] = (map[key] ?? 0) + t.amount;
    });
    return map;
  }, [expenseTxns]);

  const isPaycheckWeek = incomeTxns.length > 0;

  const navigate = (delta: number) => {
    impact("Light");
    setCurrentWeek(shiftWeek(currentWeek, delta));
  };

  const handlePayBill = async (bill: BudgetCategory, amount: number) => {
    notification("Success");
    const txn: Transaction = {
      id: generateId(),
      type: "expense",
      amount,
      category: "bills",
      note: `Paid: ${bill.name}`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await addTransaction(txn);
    setPayingBill(null);
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

        {/* Net hero */}
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

        {/* BILLS DUE - tap to pay */}
        {billsDue.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>BILLS DUE</Text>
              <Text style={styles.sectionTotal}>{formatCurrency(totalBillsDue)}</Text>
            </View>
            {billsDue.map((c) => {
              const isPaid = paidBillNames.has(c.id);
              return (
                <Pressable
                  key={c.id}
                  style={[styles.billRow, isPaid && styles.billRowPaid]}
                  onPress={() => { if (!isPaid) { impact("Light"); setPayingBill(c); } }}
                >
                  <Text style={styles.billEmoji}>{c.emoji}</Text>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.billName, isPaid && styles.billNamePaid]}>{c.name}</Text>
                    {c.dueDay && <Text style={styles.rowDate}>Due {c.dueDay}</Text>}
                  </View>
                  {isPaid ? (
                    <View style={styles.paidBadge}>
                      <CheckCircle size={14} color={colors.primary} />
                      <Text style={styles.paidText}>PAID</Text>
                    </View>
                  ) : (
                    <Text style={styles.billAmount}>{formatCurrency(getMonthlyAmount(c.allocated, c.frequency || "monthly"))}</Text>
                  )}
                </Pressable>
              );
            })}
            <Text style={styles.billTapHint}>Tap a bill to mark it paid</Text>
          </View>
        )}

        {/* FLEX SPENDING this week */}
        {flexCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>SPENDING THIS WEEK</Text>
              <Text style={styles.sectionTotal}>{formatCurrency(weekExpenses)}</Text>
            </View>
            {flexCategories.map((c) => {
              const weeklyBudget = getMonthlyAmount(c.allocated, c.frequency || "monthly") / 4.33;
              const spent = flexSpend[c.name.toLowerCase()] ?? 0;
              const pct = weeklyBudget > 0 ? Math.min(spent / weeklyBudget, 1) : 0;
              const isOver = spent > weeklyBudget && weeklyBudget > 0;
              return (
                <View key={c.id} style={styles.flexRow}>
                  <View style={styles.flexLabelRow}>
                    <Text style={styles.flexEmoji}>{c.emoji}</Text>
                    <Text style={styles.flexName}>{c.name}</Text>
                    <Text style={[styles.flexSpent, isOver && { color: colors.red }]}>
                      {formatCurrency(spent)}
                      <Text style={styles.flexBudget}> / {formatCurrency(weeklyBudget)}</Text>
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[
                      styles.progressFill,
                      { width: `${pct * 100}%` as any, backgroundColor: isOver ? colors.red : colors.primary }
                    ]} />
                  </View>
                  {isOver && (
                    <Text style={styles.overBudgetText}>
                      {formatCurrency(spent - weeklyBudget)} over - make it up next week
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* SPENDING LOG this week */}
        {expenseTxns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>LOGGED</Text>
              <Text style={styles.sectionTotal}>{expenseTxns.length} transactions</Text>
            </View>
            {expenseTxns.map((t) => (
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
            ))}
          </View>
        )}

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

      {payingBill && (
        <PayBillModal
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          onQuickPay={(amt) => handlePayBill(payingBill, amt)}
          onCustomPay={(amt) => handlePayBill(payingBill, amt)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  appTitle: { color: colors.white, fontSize: 28, fontWeight: "900", letterSpacing: 6 },
  paycheckBadge: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 2 },
  paycheckBadgeText: { color: colors.primaryText, fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  weekNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
  },
  navBtn: { padding: 4 },
  weekLabel: { color: colors.white, fontSize: 14, fontWeight: "700", letterSpacing: 1.5, flex: 1, textAlign: "center" },
  heroCard: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderRadius: 2, backgroundColor: colors.card,
    padding: spacing.lg, alignItems: "center",
  },
  heroLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 3, marginBottom: spacing.xs },
  heroAmount: { fontSize: 48, fontWeight: "900", letterSpacing: -1, marginBottom: spacing.md },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  heroStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroStatLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  heroStatValue: { fontSize: 16, fontWeight: "800" },
  heroDivider: { width: 1, height: 20, backgroundColor: colors.cardBorder },
  section: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 2,
    backgroundColor: colors.card, overflow: "hidden",
  },
  sectionTitle: {
    color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 3,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  sectionHeaderRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  sectionTotal: { color: colors.textSecondary, fontSize: 13, fontWeight: "700", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  emptyLine: { color: colors.textSecondary, fontSize: 13, padding: spacing.md, fontStyle: "italic" },
  incomeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  rowLeft: { flex: 1, gap: 2 },
  incomeNote: { color: colors.white, fontSize: 15, fontWeight: "600" },
  incomeAmount: { color: colors.primary, fontSize: 17, fontWeight: "800" },
  rowDate: { color: colors.textSecondary, fontSize: 12 },
  billRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  billRowPaid: { opacity: 0.5 },
  billEmoji: { fontSize: 16 },
  billName: { color: colors.white, fontSize: 15, fontWeight: "500" },
  billNamePaid: { textDecorationLine: "line-through" },
  billAmount: { color: colors.red, fontSize: 15, fontWeight: "700" },
  paidBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  paidText: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  billTapHint: { color: colors.textSecondary, fontSize: 11, textAlign: "center", paddingVertical: 8, fontStyle: "italic" },
  flexRow: {
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder, gap: 6,
  },
  flexLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  flexEmoji: { fontSize: 14 },
  flexName: { color: colors.white, fontSize: 14, fontWeight: "500", flex: 1 },
  flexSpent: { color: colors.white, fontSize: 14, fontWeight: "700" },
  flexBudget: { color: colors.textSecondary, fontWeight: "400", fontSize: 12 },
  progressTrack: { height: 6, backgroundColor: colors.cardBorder, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  overBudgetText: { color: colors.red, fontSize: 11, fontStyle: "italic" },
  expenseRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  expenseCategory: { color: colors.white, fontSize: 14, fontWeight: "600", textTransform: "capitalize" },
  expenseNote: { color: colors.textSecondary, fontSize: 12 },
  expenseAmount: { color: colors.red, fontSize: 15, fontWeight: "700" },
});
