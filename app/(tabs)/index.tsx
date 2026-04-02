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
import { ChevronLeft, ChevronRight, X, Check } from "lucide-react-native";
import { impact, notification } from "../../src/lib/haptics";
import { colors, spacing, fonts } from "../../src/theme";
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

function billsDueInWeek(cat: BudgetCategory, start: Date, end: Date): boolean {
  const freq = cat.frequency || "monthly";

  // Weekly bills are due EVERY week
  if (freq === "weekly") return true;

  // Biweekly bills are due every other week (approximate: show every week, user marks paid)
  if (freq === "biweekly") return true;

  // Monthly+ bills: check if dueDay falls within this week
  const dueDay = cat.dueDay;
  if (dueDay == null) return false;

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
      <Pressable style={ps.overlay} onPress={onClose}>
        <Pressable style={ps.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header bar */}
          <View style={ps.header}>
            <View style={ps.headerLeft}>
              <Text style={ps.headerEmoji}>{bill.emoji}</Text>
              <View>
                <Text style={ps.headerName}>{bill.name.toUpperCase()}</Text>
                <Text style={ps.headerSub}>DUE {bill.dueDay ? `THE ${bill.dueDay}TH` : "THIS WEEK"}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {mode === "choose" ? (
            <>
              {/* One-tap pay */}
              <Pressable style={ps.quickBtn} onPress={() => onQuickPay(defaultAmount)}>
                <View style={ps.quickLeft}>
                  <Text style={ps.quickLabel}>MARK PAID</Text>
                  <Text style={ps.quickSub}>One tap - exact amount</Text>
                </View>
                <Text style={ps.quickAmt}>{formatCurrency(defaultAmount)}</Text>
              </Pressable>

              {/* Custom amount */}
              <Pressable style={ps.altBtn} onPress={() => setMode("custom")}>
                <Text style={ps.altText}>PAID A DIFFERENT AMOUNT</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={ps.inputLabel}>ACTUAL AMOUNT PAID</Text>
              <TextInput
                style={ps.input}
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
              />
              <View style={ps.btnRow}>
                <Pressable style={ps.backBtn} onPress={() => setMode("choose")}>
                  <Text style={ps.backText}>BACK</Text>
                </Pressable>
                <Pressable style={ps.confirmBtn} onPress={() => {
                  const amt = parseFloat(customAmount);
                  if (!isNaN(amt) && amt > 0) onCustomPay(amt);
                }}>
                  <Text style={ps.confirmText}>CONFIRM PAID</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const ps = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#050505",
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    padding: spacing.lg,
    paddingBottom: Platform.OS === "web" ? spacing.xl : 52,
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerEmoji: { fontSize: 26 },
  headerName: { color: colors.white, fontSize: 16, fontWeight: "900", letterSpacing: 3, fontFamily: fonts.heading as any },
  headerSub: { color: colors.textSecondary, fontSize: 10, letterSpacing: 2, marginTop: 2, fontFamily: fonts.mono as any },
  quickBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.primary, padding: spacing.lg,
  },
  quickLeft: { gap: 2 },
  quickLabel: { color: "#000", fontSize: 15, fontWeight: "900", letterSpacing: 2, fontFamily: fonts.heading as any },
  quickSub: { color: "rgba(0,0,0,0.55)", fontSize: 11, fontFamily: fonts.mono as any },
  quickAmt: { color: "#000", fontSize: 30, fontWeight: "900", fontFamily: fonts.mono as any },
  altBtn: {
    borderWidth: 1, borderColor: "#1c1c1c", padding: 14, alignItems: "center",
  },
  altText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any },
  inputLabel: { color: colors.textSecondary, fontSize: 10, letterSpacing: 3, fontFamily: fonts.mono as any },
  input: {
    backgroundColor: "#000", borderWidth: 2, borderColor: colors.primary,
    padding: spacing.md, color: colors.white, fontSize: 36, fontWeight: "900",
    textAlign: "center", fontFamily: fonts.mono as any,
  },
  btnRow: { flexDirection: "row", gap: 8 },
  backBtn: { flex: 1, borderWidth: 1, borderColor: "#1c1c1c", padding: 14, alignItems: "center" },
  backText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any },
  confirmBtn: { flex: 2, backgroundColor: colors.primary, padding: 14, alignItems: "center" },
  confirmText: { color: "#000", fontSize: 12, fontWeight: "900", letterSpacing: 2, fontFamily: fonts.heading as any },
});

export default function HomeScreen() {
  const { transactions, currentBudget, addTransaction, updateTransaction, deleteTransaction, accounts } = useApp();
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | undefined>(undefined);
  const [payingBill, setPayingBill] = useState<BudgetCategory | null>(null);

  const weekRange = useMemo(() => getWeekRange(currentWeek), [currentWeek]);

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
      (c) => c.type === "fixed" && billsDueInWeek(c, weekRange.start, weekRange.end)
    );
  }, [currentBudget, weekRange]);

  const totalBillsDue = billsDue.reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);

  const paidBillIds = useMemo(() => {
    const ids = new Set<string>();
    expenseTxns.forEach((t) => {
      if (t.note) billsDue.forEach((b) => {
        if (t.note!.toLowerCase().includes(b.name.toLowerCase())) ids.add(b.id);
      });
    });
    return ids;
  }, [expenseTxns, billsDue]);

  const flexCategories = useMemo(() => currentBudget?.categories.filter((c) => c.type === "flexible") ?? [], [currentBudget]);

  const flexSpend = useMemo(() => {
    const map: Record<string, number> = {};
    const fixedNames = new Set(
      (currentBudget?.categories ?? []).filter((c) => c.type === "fixed").map((c) => c.name.toLowerCase())
    );
    expenseTxns.forEach((t) => {
      // Exclude fixed bill payments from flex spending
      if (t.note?.startsWith("Paid:") || t.note?.endsWith("- marked paid") || t.note?.endsWith("- paid")) return;
      if (t.category.toLowerCase() === "bills") return;
      // Exclude transactions that match a fixed bill name
      if (t.note && fixedNames.has(t.note.toLowerCase())) return;
      const k = t.category.toLowerCase();
      map[k] = (map[k] ?? 0) + t.amount;
    });
    return map;
  }, [expenseTxns, currentBudget]);

  const accountMap = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string }>();
    accounts.forEach((a) => map.set(a.id, { name: a.name, icon: a.icon, color: a.color }));
    return map;
  }, [accounts]);

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

  const netIsPositive = weekNet >= 0;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── MASTHEAD ── */}
        <View style={s.masthead}>
          <View>
            <Text style={s.logo}>STACKD</Text>
            <Text style={s.logoSub}>HOUSEHOLD BUDGET</Text>
          </View>
          {isPaycheckWeek && (
            <View style={s.paydayChip}>
              <Text style={s.paydayText}>$ PAYDAY</Text>
            </View>
          )}
        </View>

        {/* ── WEEK NAV ── */}
        <View style={s.weekRow}>
          <Pressable onPress={() => navigate(-1)} hitSlop={16} style={s.navArrow}>
            <ChevronLeft size={18} color={colors.primary} strokeWidth={3} />
          </Pressable>
          <Text style={s.weekLabel}>{formatWeekLabel(currentWeek).toUpperCase()}</Text>
          <Pressable onPress={() => navigate(1)} hitSlop={16} style={s.navArrow}>
            <ChevronRight size={18} color={colors.primary} strokeWidth={3} />
          </Pressable>
        </View>

        {/* ── HERO - full bleed ── */}
        <View style={[s.hero, { backgroundColor: netIsPositive ? colors.primary : colors.red }]}>
          <Text style={s.heroEyebrow}>WEEK NET</Text>
          <Text style={s.heroNum}>{netIsPositive ? "+" : ""}{formatCurrency(weekNet)}</Text>
          {/* Three stats across the bottom */}
          <View style={s.heroBar}>
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{formatCurrency(weekIncome)}</Text>
              <Text style={s.heroStatLabel}>INCOME</Text>
            </View>
            <View style={s.heroBarDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{formatCurrency(weekExpenses)}</Text>
              <Text style={s.heroStatLabel}>SPENT</Text>
            </View>
            <View style={s.heroBarDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{formatCurrency(totalBillsDue)}</Text>
              <Text style={s.heroStatLabel}>BILLS DUE</Text>
            </View>
          </View>
        </View>

        {/* ── COMING IN ── */}
        <View style={s.sectionLabel}>
          <View style={s.sectionLabelAccent} />
          <Text style={s.sectionLabelText}>COMING IN</Text>
        </View>
        {incomeTxns.length === 0 ? (
          <View style={s.emptyRow}>
            <Text style={s.emptyText}>No income logged this week</Text>
          </View>
        ) : (
          incomeTxns.map((t) => (
            <Pressable key={t.id} onPress={() => { setEditingTxn(t); setSheetVisible(true); }} style={s.incomeRow}>
              <View style={s.incomeLeft}>
                <View style={s.greenPip} />
                <View>
                  <Text style={s.incomeTitle}>{t.note || t.category}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.rowSub}>{formatShortDate(t.date)}</Text>
                    {t.accountId && accountMap.has(t.accountId) && (
                      <View style={[s.acctChip, { borderColor: accountMap.get(t.accountId)!.color + '44' }]}>
                        <Text style={s.acctChipText}>{accountMap.get(t.accountId)!.icon} {accountMap.get(t.accountId)!.name}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Text style={s.incomeAmt}>+{formatCurrency(t.amount)}</Text>
            </Pressable>
          ))
        )}

        {/* ── BILLS DUE ── */}
        {billsDue.length > 0 && (
          <>
            <View style={s.sectionLabel}>
              <View style={[s.sectionLabelAccent, { backgroundColor: colors.red }]} />
              <Text style={s.sectionLabelText}>BILLS DUE</Text>
              <Text style={s.sectionLabelAmt}>{formatCurrency(totalBillsDue)}</Text>
            </View>
            {billsDue.map((c) => {
              const isPaid = paidBillIds.has(c.id);
              const amt = getMonthlyAmount(c.allocated, c.frequency || "monthly");
              return (
                <Pressable
                  key={c.id}
                  style={[s.billRow, isPaid && s.billRowPaid]}
                  onPress={() => { if (!isPaid) { impact("Light"); setPayingBill(c); } }}
                >
                  <Text style={s.billEmoji}>{c.emoji}</Text>
                  <View style={s.billMid}>
                    <Text style={[s.billName, isPaid && s.strike]}>{c.name.toUpperCase()}</Text>
                    <Text style={s.rowSub}>DUE {c.dueDay} - {isPaid ? "PAID" : "TAP TO PAY"}</Text>
                  </View>
                  {isPaid ? (
                    <View style={s.paidPill}>
                      <Check size={11} color="#000" strokeWidth={3} />
                      <Text style={s.paidPillText}>PAID</Text>
                    </View>
                  ) : (
                    <Text style={s.billAmt}>{formatCurrency(amt)}</Text>
                  )}
                </Pressable>
              );
            })}
          </>
        )}

        {/* ── FLEX SPENDING ── */}
        {flexCategories.length > 0 && (
          <>
            <View style={s.sectionLabel}>
              <View style={[s.sectionLabelAccent, { backgroundColor: colors.yellow }]} />
              <Text style={s.sectionLabelText}>SPENDING THIS WEEK</Text>
            </View>
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
                      {formatCurrency(spent)}
                      <Text style={s.flexOf}> / {formatCurrency(weeklyBudget)}</Text>
                    </Text>
                  </View>
                  <View style={s.barBg}>
                    <View style={[
                      s.barFill,
                      { width: `${pct * 100}%` as any },
                      { backgroundColor: isOver ? colors.red : pct > 0.8 ? colors.yellow : colors.primary }
                    ]} />
                  </View>
                  {isOver && (
                    <Text style={s.overMsg}>
                      {formatCurrency(spent - weeklyBudget)} over budget - make it up next week
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ── LOGGED TRANSACTIONS ── */}
        {expenseTxns.length > 0 && (
          <>
            <View style={s.sectionLabel}>
              <View style={[s.sectionLabelAccent, { backgroundColor: colors.textSecondary }]} />
              <Text style={s.sectionLabelText}>LOGGED</Text>
              <Text style={s.sectionLabelAmt}>{expenseTxns.length} transactions</Text>
            </View>
            {expenseTxns.map((t) => (
              <Pressable key={t.id} onPress={() => { setEditingTxn(t); setSheetVisible(true); }} style={s.expenseRow}>
                <View style={s.redPip} />
                <View style={{ flex: 1 }}>
                  <Text style={s.expenseCat}>{t.category.toUpperCase()}</Text>
                  {t.note ? <Text style={s.expenseNote}>{t.note}</Text> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.rowSub}>{formatShortDate(t.date)}</Text>
                    {t.accountId && accountMap.has(t.accountId) && (
                      <View style={[s.acctChip, { borderColor: accountMap.get(t.accountId)!.color + '44' }]}>
                        <Text style={s.acctChipText}>{accountMap.get(t.accountId)!.icon} {accountMap.get(t.accountId)!.name}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={s.expenseAmt}>-{formatCurrency(t.amount)}</Text>
              </Pressable>
            ))}
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
        accounts={accounts}
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

  // Masthead
  masthead: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: "#111",
  },
  logo: {
    color: colors.primary, fontSize: 28, fontWeight: "900", letterSpacing: 8,
    fontFamily: fonts.heading as any,
  },
  logoSub: {
    color: colors.textSecondary, fontSize: 9, letterSpacing: 4, marginTop: 1,
    fontFamily: fonts.mono as any,
  },
  paydayChip: {
    backgroundColor: colors.yellow, paddingHorizontal: 10, paddingVertical: 5,
  },
  paydayText: {
    color: "#000", fontSize: 10, fontWeight: "900", letterSpacing: 2,
    fontFamily: fonts.mono as any,
  },

  // Week nav
  weekRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#0a0a0a",
  },
  navArrow: { padding: 4 },
  weekLabel: {
    color: colors.white, fontSize: 12, fontWeight: "700", letterSpacing: 2,
    fontFamily: fonts.mono as any,
  },

  // Hero
  hero: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  heroEyebrow: {
    color: "rgba(0,0,0,0.45)", fontSize: 10, fontWeight: "900", letterSpacing: 5,
    fontFamily: fonts.mono as any, marginBottom: 4,
  },
  heroNum: {
    color: "#000", fontSize: 72, fontWeight: "900", letterSpacing: -3, lineHeight: 76,
    fontFamily: fonts.heading as any,
  },
  heroBar: {
    flexDirection: "row", width: "100%", marginTop: spacing.md,
    borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.2)", paddingTop: 12,
  },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatNum: {
    color: "#000", fontSize: 17, fontWeight: "900",
    fontFamily: fonts.mono as any,
  },
  heroStatLabel: {
    color: "rgba(0,0,0,0.45)", fontSize: 8, fontWeight: "900", letterSpacing: 2,
    fontFamily: fonts.mono as any,
  },
  heroBarDivider: { width: 1, backgroundColor: "rgba(0,0,0,0.2)", marginVertical: 2 },

  // Section label bar
  sectionLabel: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#0f0f0f",
    backgroundColor: "#040404", marginTop: 2,
  },
  sectionLabelAccent: { width: 3, height: 14, backgroundColor: colors.primary },
  sectionLabelText: {
    color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 3, flex: 1,
    fontFamily: fonts.mono as any,
  },
  sectionLabelAmt: {
    color: colors.textSecondary, fontSize: 12, fontWeight: "700",
    fontFamily: fonts.mono as any,
  },

  emptyRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  emptyText: { color: "#333", fontSize: 13, fontStyle: "italic", fontFamily: fonts.mono as any },

  // Income
  incomeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#080808",
  },
  incomeLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  greenPip: { width: 3, height: 32, backgroundColor: colors.primary },
  incomeTitle: { color: colors.white, fontSize: 15, fontWeight: "700", fontFamily: fonts.body as any },
  incomeAmt: { color: colors.primary, fontSize: 20, fontWeight: "900", fontFamily: fonts.mono as any },
  rowSub: { color: colors.textSecondary, fontSize: 10, letterSpacing: 1, marginTop: 2, fontFamily: fonts.mono as any },

  // Bills
  billRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: spacing.lg, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#080808",
  },
  billRowPaid: { opacity: 0.35 },
  billEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  billMid: { flex: 1 },
  billName: { color: colors.white, fontSize: 14, fontWeight: "800", letterSpacing: 1, fontFamily: fonts.body as any },
  strike: { textDecorationLine: "line-through", color: colors.textSecondary },
  billAmt: { color: colors.red, fontSize: 17, fontWeight: "900", fontFamily: fonts.mono as any },
  paidPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 5,
  },
  paidPillText: { color: "#000", fontSize: 9, fontWeight: "900", letterSpacing: 2, fontFamily: fonts.mono as any },

  // Flex spending
  flexRow: {
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#080808", gap: 7,
  },
  flexTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  flexEmoji: { fontSize: 14 },
  flexName: { flex: 1, color: colors.white, fontSize: 11, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },
  flexAmt: { color: colors.white, fontSize: 14, fontWeight: "800", fontFamily: fonts.mono as any },
  flexOf: { color: colors.textSecondary, fontWeight: "400", fontSize: 11 },
  barBg: { height: 3, backgroundColor: "#111" },
  barFill: { height: 3 },
  overMsg: { color: colors.red, fontSize: 10, fontStyle: "italic", fontFamily: fonts.mono as any },

  // Expenses
  expenseRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#080808",
  },
  redPip: { width: 3, height: 28, backgroundColor: colors.red },
  expenseCat: { color: colors.white, fontSize: 12, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },
  expenseNote: { color: colors.textSecondary, fontSize: 11, marginTop: 1, fontFamily: fonts.body as any },
  expenseAmt: { color: colors.red, fontSize: 16, fontWeight: "900", fontFamily: fonts.mono as any },
  acctChip: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 5, paddingVertical: 1,
  },
  acctChipText: {
    color: colors.textSecondary, fontSize: 8, fontWeight: "700", letterSpacing: 1,
    fontFamily: fonts.mono as any,
  },
});
