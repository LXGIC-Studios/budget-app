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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, X, CheckCircle } from "lucide-react-native";
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
  const months = start.getMonth() === end.getMonth()
    ? [{ y: start.getFullYear(), m: start.getMonth() }]
    : [{ y: start.getFullYear(), m: start.getMonth() }, { y: end.getFullYear(), m: end.getMonth() }];
  return months.some(({ y, m }) => {
    const d = new Date(y, m, dueDay);
    return d >= start && d <= end;
  });
}

function PayBillModal({ bill, onClose, onQuickPay, onCustomPay }: {
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
          <View style={payStyles.topBar}>
            <Text style={payStyles.topBarEmoji}>{bill.emoji}</Text>
            <Text style={payStyles.topBarName}>{bill.name.toUpperCase()}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {mode === "choose" ? (
            <>
              <Pressable style={payStyles.quickPayBtn} onPress={() => onQuickPay(defaultAmount)}>
                <View>
                  <Text style={payStyles.quickPayLabel}>MARK PAID</Text>
                  <Text style={payStyles.quickPaySub}>Exact amount - one tap</Text>
                </View>
                <Text style={payStyles.quickPayAmount}>{formatCurrency(defaultAmount)}</Text>
              </Pressable>
              <Pressable style={payStyles.customBtn} onPress={() => setMode("custom")}>
                <Text style={payStyles.customBtnText}>I PAID A DIFFERENT AMOUNT</Text>
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
                <Pressable style={payStyles.backBtn} onPress={() => setMode("choose")}>
                  <Text style={payStyles.backBtnText}>BACK</Text>
                </Pressable>
                <Pressable style={payStyles.confirmBtn} onPress={() => {
                  const amt = parseFloat(customAmount);
                  if (!isNaN(amt) && amt > 0) onCustomPay(amt);
                }}>
                  <Text style={payStyles.confirmBtnText}>CONFIRM</Text>
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#000",
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    padding: spacing.lg,
    paddingBottom: Platform.OS === "web" ? spacing.lg : 48,
    gap: spacing.md,
  },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  topBarEmoji: { fontSize: 22 },
  topBarName: { color: colors.white, fontSize: 16, fontWeight: "900", letterSpacing: 3, flex: 1 },
  quickPayBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.primary, padding: spacing.lg,
  },
  quickPayLabel: { color: "#000", fontSize: 16, fontWeight: "900", letterSpacing: 2 },
  quickPaySub: { color: "rgba(0,0,0,0.6)", fontSize: 11, marginTop: 2 },
  quickPayAmount: { color: "#000", fontSize: 28, fontWeight: "900" },
  customBtn: {
    borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.md, alignItems: "center",
  },
  customBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  customLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  customInput: {
    backgroundColor: "#0a0a0a", borderWidth: 2, borderColor: colors.primary,
    padding: spacing.md, color: colors.white, fontSize: 32, fontWeight: "900", textAlign: "center",
  },
  customActions: { flexDirection: "row", gap: spacing.sm },
  backBtn: { flex: 1, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.md, alignItems: "center" },
  backBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  confirmBtn: { flex: 2, backgroundColor: colors.primary, padding: spacing.md, alignItems: "center" },
  confirmBtnText: { color: "#000", fontSize: 12, fontWeight: "900", letterSpacing: 2 },
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
    }), [transactions, weekRange]
  );

  const weekIncome = useMemo(() => weekTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [weekTxns]);
  const weekExpenses = useMemo(() => weekTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [weekTxns]);
  const weekNet = weekIncome - weekExpenses;

  const incomeTxns = useMemo(() => weekTxns.filter((t) => t.type === "income").sort((a, b) => a.date.localeCompare(b.date)), [weekTxns]);
  const expenseTxns = useMemo(() => weekTxns.filter((t) => t.type === "expense").sort((a, b) => b.date.localeCompare(a.date)), [weekTxns]);

  const billsDue = useMemo(() => {
    if (!currentBudget) return [];
    return currentBudget.categories.filter(
      (c) => c.type === "fixed" && c.dueDay != null && billsDueInWeek(c.dueDay!, weekRange.start, weekRange.end)
    );
  }, [currentBudget, weekRange]);

  const totalBillsDue = billsDue.reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);

  const paidBillIds = useMemo(() => {
    const ids = new Set<string>();
    expenseTxns.forEach((t) => {
      if (t.note) {
        billsDue.forEach((b) => {
          if (t.note!.toLowerCase().includes(b.name.toLowerCase())) ids.add(b.id);
        });
      }
    });
    return ids;
  }, [expenseTxns, billsDue]);

  const flexCategories = useMemo(() => currentBudget?.categories.filter((c) => c.type === "flexible") ?? [], [currentBudget]);

  const flexSpend = useMemo(() => {
    const map: Record<string, number> = {};
    expenseTxns.forEach((t) => { const k = t.category.toLowerCase(); map[k] = (map[k] ?? 0) + t.amount; });
    return map;
  }, [expenseTxns]);

  const isPaycheckWeek = incomeTxns.length > 0;

  const navigate = (delta: number) => { impact("Light"); setCurrentWeek(shiftWeek(currentWeek, delta)); };

  const handlePayBill = async (bill: BudgetCategory, amount: number) => {
    notification("Success");
    await addTransaction({
      id: generateId(), type: "expense", amount,
      category: "bills", note: `Paid: ${bill.name}`,
      date: new Date().toISOString(), createdAt: new Date().toISOString(),
    });
    setPayingBill(null);
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* TOP BAR */}
        <View style={s.topBar}>
          <Text style={s.logo}>STACKD</Text>
          {isPaycheckWeek && <View style={s.paydayChip}><Text style={s.paydayText}>PAYDAY WEEK</Text></View>}
        </View>

        {/* WEEK NAV */}
        <View style={s.weekNav}>
          <Pressable onPress={() => navigate(-1)} hitSlop={16}><ChevronLeft size={20} color={colors.textSecondary} /></Pressable>
          <Text style={s.weekLabel}>{weekLabel.toUpperCase()}</Text>
          <Pressable onPress={() => navigate(1)} hitSlop={16}><ChevronRight size={20} color={colors.textSecondary} /></Pressable>
        </View>

        {/* HERO - BIG NET NUMBER, full-width colored block */}
        <View style={[s.heroBlock, { backgroundColor: weekNet >= 0 ? colors.primary : colors.red }]}>
          <Text style={s.heroLabel}>WEEK NET</Text>
          <Text style={s.heroNumber}>{weekNet >= 0 ? "+" : ""}{formatCurrency(weekNet)}</Text>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{formatCurrency(weekIncome)}</Text>
              <Text style={s.heroStatLabel}>IN</Text>
            </View>
            <View style={s.heroVertDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{formatCurrency(weekExpenses)}</Text>
              <Text style={s.heroStatLabel}>OUT</Text>
            </View>
            <View style={s.heroVertDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{formatCurrency(totalBillsDue)}</Text>
              <Text style={s.heroStatLabel}>BILLS</Text>
            </View>
          </View>
        </View>

        {/* COMING IN */}
        <View style={s.blockHeader}>
          <Text style={s.blockHeaderText}>// COMING IN</Text>
        </View>
        <View style={s.block}>
          {incomeTxns.length === 0 ? (
            <Text style={s.emptyText}>No income logged this week</Text>
          ) : (
            incomeTxns.map((t) => (
              <Pressable key={t.id} onPress={() => { setEditingTxn(t); setSheetVisible(true); }} style={s.incomeRow}>
                <View style={s.rowDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.incomeNote}>{t.note || t.category}</Text>
                  <Text style={s.rowDate}>{formatShortDate(t.date)}</Text>
                </View>
                <Text style={s.incomeAmt}>+{formatCurrency(t.amount)}</Text>
              </Pressable>
            ))
          )}
        </View>

        {/* BILLS DUE */}
        {billsDue.length > 0 && (
          <>
            <View style={s.blockHeader}>
              <Text style={s.blockHeaderText}>// BILLS DUE</Text>
              <Text style={s.blockHeaderRight}>{formatCurrency(totalBillsDue)}</Text>
            </View>
            <View style={s.block}>
              {billsDue.map((c) => {
                const isPaid = paidBillIds.has(c.id);
                return (
                  <Pressable
                    key={c.id}
                    style={[s.billRow, isPaid && s.billRowPaid]}
                    onPress={() => { if (!isPaid) { impact("Light"); setPayingBill(c); } }}
                  >
                    <Text style={s.billEmoji}>{c.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.billName, isPaid && s.strikethrough]}>{c.name}</Text>
                      <Text style={s.rowDate}>Due {c.dueDay}</Text>
                    </View>
                    {isPaid ? (
                      <View style={s.paidChip}>
                        <CheckCircle size={12} color="#000" />
                        <Text style={s.paidChipText}>PAID</Text>
                      </View>
                    ) : (
                      <View style={s.billAmtBox}>
                        <Text style={s.billAmt}>{formatCurrency(getMonthlyAmount(c.allocated, c.frequency || "monthly"))}</Text>
                        <Text style={s.billTap}>TAP TO PAY</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* FLEX SPENDING */}
        {flexCategories.length > 0 && (
          <>
            <View style={s.blockHeader}>
              <Text style={s.blockHeaderText}>// SPENDING THIS WEEK</Text>
            </View>
            <View style={s.block}>
              {flexCategories.map((c) => {
                const weeklyBudget = getMonthlyAmount(c.allocated, c.frequency || "monthly") / 4.33;
                const spent = flexSpend[c.name.toLowerCase()] ?? 0;
                const pct = weeklyBudget > 0 ? Math.min(spent / weeklyBudget, 1) : 0;
                const isOver = spent > weeklyBudget && weeklyBudget > 0;
                return (
                  <View key={c.id} style={s.flexRow}>
                    <View style={s.flexTop}>
                      <Text style={s.flexEmoji}>{c.emoji}</Text>
                      <Text style={s.flexName}>{c.name.toUpperCase()}</Text>
                      <Text style={[s.flexAmt, isOver && { color: colors.red }]}>
                        {formatCurrency(spent)}<Text style={s.flexOf}> / {formatCurrency(weeklyBudget)}</Text>
                      </Text>
                    </View>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${pct * 100}%` as any, backgroundColor: isOver ? colors.red : colors.primary }]} />
                    </View>
                    {isOver && <Text style={s.overText}>-{formatCurrency(spent - weeklyBudget)} over - earn it back next week</Text>}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* RECENT SPENDING LOG */}
        {expenseTxns.length > 0 && (
          <>
            <View style={s.blockHeader}>
              <Text style={s.blockHeaderText}>// LOGGED</Text>
              <Text style={s.blockHeaderRight}>{expenseTxns.length} transactions</Text>
            </View>
            <View style={s.block}>
              {expenseTxns.map((t) => (
                <Pressable key={t.id} onPress={() => { setEditingTxn(t); setSheetVisible(true); }} style={s.expenseRow}>
                  <View style={[s.rowDot, { backgroundColor: colors.red }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.expenseCat}>{t.category.toUpperCase()}</Text>
                    {t.note && <Text style={s.expenseNote}>{t.note}</Text>}
                    <Text style={s.rowDate}>{formatShortDate(t.date)}</Text>
                  </View>
                  <Text style={s.expenseAmt}>-{formatCurrency(t.amount)}</Text>
                </Pressable>
              ))}
            </View>
          </>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,255,204,0.15)",
  },
  logo: { color: colors.primary, fontSize: 24, fontWeight: "900", letterSpacing: 8 },
  paydayChip: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 5 },
  paydayText: { color: "#000", fontSize: 10, fontWeight: "900", letterSpacing: 2 },

  weekNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  weekLabel: { color: colors.white, fontSize: 13, fontWeight: "700", letterSpacing: 2 },

  // HERO - full bleed colored block like shield-scan
  heroBlock: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  heroLabel: { color: "rgba(0,0,0,0.5)", fontSize: 11, fontWeight: "900", letterSpacing: 4 },
  heroNumber: { color: "#000", fontSize: 64, fontWeight: "900", letterSpacing: -2, lineHeight: 68 },
  heroStats: {
    flexDirection: "row", alignItems: "center",
    marginTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.15)",
    paddingTop: spacing.md, gap: 0, width: "100%", justifyContent: "center",
  },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatNum: { color: "#000", fontSize: 18, fontWeight: "900" },
  heroStatLabel: { color: "rgba(0,0,0,0.5)", fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  heroVertDivider: { width: 1, height: 36, backgroundColor: "rgba(0,0,0,0.2)" },

  // Section headers - shield-scan style label bars
  blockHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: "rgba(0,255,204,0.15)",
    backgroundColor: "rgba(0,255,204,0.03)",
    marginTop: 2,
  },
  blockHeaderText: { color: colors.primary, fontSize: 11, fontWeight: "700", letterSpacing: 3 },
  blockHeaderRight: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },

  block: { borderBottomWidth: 1, borderBottomColor: "rgba(0,255,204,0.08)" },

  emptyText: { color: colors.textSecondary, fontSize: 13, padding: spacing.lg, fontStyle: "italic" },

  // Income rows
  incomeRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  rowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  incomeNote: { color: colors.white, fontSize: 15, fontWeight: "700" },
  incomeAmt: { color: colors.primary, fontSize: 18, fontWeight: "900" },
  rowDate: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },

  // Bill rows
  billRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.lg, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  billRowPaid: { opacity: 0.4 },
  billEmoji: { fontSize: 18, width: 28 },
  billName: { color: colors.white, fontSize: 15, fontWeight: "600" },
  strikethrough: { textDecorationLine: "line-through", color: colors.textSecondary },
  billAmtBox: { alignItems: "flex-end" },
  billAmt: { color: colors.red, fontSize: 16, fontWeight: "900" },
  billTap: { color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  paidChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4,
  },
  paidChipText: { color: "#000", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },

  // Flex spending
  flexRow: {
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", gap: 8,
  },
  flexTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  flexEmoji: { fontSize: 14 },
  flexName: { color: colors.white, fontSize: 12, fontWeight: "800", letterSpacing: 1.5, flex: 1 },
  flexAmt: { color: colors.white, fontSize: 14, fontWeight: "800" },
  flexOf: { color: colors.textSecondary, fontWeight: "400", fontSize: 12 },
  barTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.08)" },
  barFill: { height: 4 },
  overText: { color: colors.red, fontSize: 11, fontStyle: "italic" },

  // Expense rows
  expenseRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  expenseCat: { color: colors.white, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  expenseNote: { color: colors.textSecondary, fontSize: 12 },
  expenseAmt: { color: colors.red, fontSize: 16, fontWeight: "900" },
});
