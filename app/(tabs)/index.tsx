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
import { ChevronLeft, ChevronRight, X, Check, Settings, ArrowLeftRight } from "lucide-react-native";
import { useRouter } from "expo-router";
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
  formatDueDay,
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

function PayBillModal({ bill, onClose, onQuickPay, onCustomPay, accounts }: {
  bill: BudgetCategory;
  onClose: () => void;
  onQuickPay: (amount: number, accountTag?: string) => void;
  onCustomPay: (amount: number, accountTag?: string) => void;
  accounts: { id: string; label: string; emoji: string }[];
}) {
  const defaultAmount = getMonthlyAmount(bill.allocated, bill.frequency || "monthly");
  const [customAmount, setCustomAmount] = useState(defaultAmount.toFixed(2));
  const [mode, setMode] = useState<"choose" | "custom">("choose");
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>(bill.defaultAccountTag);

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
                <Text style={ps.headerSub}>{bill.dueDay ? formatDueDay(bill.dueDay).toUpperCase() : "DUE THIS WEEK"}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Account selector */}
          <View>
            <Text style={ps.acctLabel}>PAID FROM</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ps.acctRow}>
              {accounts.map((acct) => (
                <Pressable
                  key={acct.id}
                  onPress={() => { impact("Light"); setSelectedAccount(selectedAccount === acct.id ? undefined : acct.id); }}
                  style={[ps.acctPill, selectedAccount === acct.id && ps.acctPillActive]}
                >
                  <Text style={ps.acctPillEmoji}>{acct.emoji}</Text>
                  <Text style={[ps.acctPillText, selectedAccount === acct.id && ps.acctPillTextActive]}>
                    {acct.label.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {mode === "choose" ? (
            <>
              {/* One-tap pay */}
              <Pressable style={ps.quickBtn} onPress={() => onQuickPay(defaultAmount, selectedAccount)}>
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
                  if (!isNaN(amt) && amt > 0) onCustomPay(amt, selectedAccount);
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
  headerSub: { color: colors.textSecondary, fontSize: 12, letterSpacing: 2, marginTop: 2, fontFamily: fonts.mono as any },
  quickBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.primary, padding: spacing.lg,
  },
  quickLeft: { gap: 2 },
  quickLabel: { color: "#000", fontSize: 15, fontWeight: "900", letterSpacing: 2, fontFamily: fonts.heading as any },
  quickSub: { color: "rgba(0,0,0,0.55)", fontSize: 12, fontFamily: fonts.mono as any },
  quickAmt: { color: "#000", fontSize: 30, fontWeight: "900", fontFamily: fonts.mono as any },
  altBtn: {
    borderWidth: 1, borderColor: "#1c1c1c", padding: 14, alignItems: "center",
  },
  altText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any },
  inputLabel: { color: colors.textSecondary, fontSize: 12, letterSpacing: 3, fontFamily: fonts.mono as any },
  input: {
    backgroundColor: "#000", borderWidth: 2, borderColor: colors.primary,
    padding: spacing.md, color: colors.white, fontSize: 36, fontWeight: "900",
    textAlign: "center", fontFamily: fonts.mono as any,
  },
  btnRow: { flexDirection: "row", gap: 8 },
  backBtn: { flex: 1, borderWidth: 1, borderColor: "#1c1c1c", padding: 14, alignItems: "center" },
  backText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any },
  confirmBtn: { flex: 2, backgroundColor: colors.primary, padding: 14, alignItems: "center" },
  confirmText: { color: "#000", fontSize: 12, fontWeight: "900", letterSpacing: 2, fontFamily: fonts.heading as any },
  acctLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 3, fontFamily: fonts.mono as any, marginBottom: 6 },
  acctRow: { flexDirection: "row" as const, gap: 6 },
  acctPill: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: "#1c1c1c", backgroundColor: "#050505",
  },
  acctPillActive: { borderColor: colors.primary, backgroundColor: "rgba(0,255,204,0.1)" },
  acctPillEmoji: { fontSize: 12 },
  acctPillText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 1.5, fontFamily: fonts.mono as any },
  acctPillTextActive: { color: colors.primary },
});

function TransferModal({ visible, onClose, accounts, onTransfer }: {
  visible: boolean;
  onClose: () => void;
  accounts: { id: string; label: string; emoji: string }[];
  onTransfer: (from: string, to: string, amount: number, note?: string) => void;
}) {
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const handleTransfer = () => {
    const parsed = parseFloat(amount);
    if (!from || !to || !parsed || parsed <= 0) return;
    onTransfer(from, to, parsed, note.trim() || undefined);
    setFrom(undefined);
    setTo(undefined);
    setAmount("");
    setNote("");
  };

  const handleClose = () => {
    setFrom(undefined);
    setTo(undefined);
    setAmount("");
    setNote("");
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={ts.overlay} onPress={handleClose}>
        <Pressable style={ts.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={ts.header}>
            <ArrowLeftRight size={20} color={colors.primary} />
            <Text style={ts.title}>TRANSFER</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Amount */}
          <View style={ts.amountRow}>
            <Text style={ts.dollar}>$</Text>
            <TextInput
              style={ts.amountInput}
              placeholder="0.00"
              placeholderTextColor={colors.dimmed}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          {/* FROM */}
          <Text style={ts.label}>FROM</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ts.pillRow}>
            {accounts.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => { impact("Light"); setFrom(a.id); if (to === a.id) setTo(undefined); }}
                style={[ts.pill, from === a.id && ts.pillFrom]}
              >
                <Text style={ts.pillEmoji}>{a.emoji}</Text>
                <Text style={[ts.pillText, from === a.id && ts.pillTextFrom]}>{a.label.toUpperCase()}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* TO */}
          <Text style={ts.label}>TO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ts.pillRow}>
            {accounts.filter((a) => a.id !== from).map((a) => (
              <Pressable
                key={a.id}
                onPress={() => { impact("Light"); setTo(a.id); }}
                style={[ts.pill, to === a.id && ts.pillTo]}
              >
                <Text style={ts.pillEmoji}>{a.emoji}</Text>
                <Text style={[ts.pillText, to === a.id && ts.pillTextTo]}>{a.label.toUpperCase()}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Note */}
          <TextInput
            style={ts.noteInput}
            placeholder="What's it for? (optional)"
            placeholderTextColor={colors.dimmed}
            value={note}
            onChangeText={setNote}
          />

          {/* Transfer button */}
          <Pressable
            onPress={handleTransfer}
            style={[ts.btn, (!from || !to || !amount) && ts.btnDisabled]}
          >
            <Text style={ts.btnText}>TRANSFER</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const ts = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#050505", borderTopWidth: 2, borderTopColor: "#6366f1",
    padding: spacing.lg, paddingBottom: Platform.OS === "web" ? spacing.xl : 52, gap: 14,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { flex: 1, color: colors.white, fontSize: 16, fontWeight: "900", letterSpacing: 3, marginLeft: 10, fontFamily: fonts.heading as any },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dollar: { color: colors.primary, fontSize: 36, fontWeight: "900", fontFamily: fonts.mono as any },
  amountInput: { flex: 1, color: colors.white, fontSize: 36, fontWeight: "900", fontFamily: fonts.mono as any },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 3, fontFamily: fonts.mono as any },
  pillRow: { gap: 6 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#1c1c1c", backgroundColor: "#0a0a0a",
  },
  pillFrom: { borderColor: colors.red, backgroundColor: "rgba(255,0,60,0.1)" },
  pillTo: { borderColor: colors.primary, backgroundColor: "rgba(0,255,204,0.1)" },
  pillEmoji: { fontSize: 14 },
  pillText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1.5, fontFamily: fonts.mono as any },
  pillTextFrom: { color: colors.red },
  pillTextTo: { color: colors.primary },
  noteInput: {
    backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1c1c1c",
    padding: spacing.md, color: colors.white, fontSize: 14, fontFamily: fonts.body as any,
  },
  btn: { backgroundColor: "#6366f1", paddingVertical: 16, alignItems: "center" },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: colors.white, fontSize: 15, fontWeight: "900", letterSpacing: 3, fontFamily: fonts.heading as any },
});

export default function HomeScreen() {
  const { transactions, currentBudget, addTransaction, updateTransaction, deleteTransaction, userAccounts } = useApp();
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | undefined>(undefined);
  const [payingBill, setPayingBill] = useState<BudgetCategory | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [transferVisible, setTransferVisible] = useState(false);

  const weekRange = useMemo(() => getWeekRange(currentWeek), [currentWeek]);

  // Get unique account tags used this week for the filter bar
  const usedTags = useMemo(() => {
    const tags = new Set<string>();
    transactions.forEach((t) => { if (t.accountTag) tags.add(t.accountTag); });
    return Array.from(tags);
  }, [transactions]);

  const weekTxns = useMemo(() =>
    transactions.filter((t) => {
      const d = new Date(t.date);
      if (!(d >= weekRange.start && d <= weekRange.end)) return false;
      if (accountFilter && t.accountTag !== accountFilter) return false;
      return true;
    }), [transactions, weekRange, accountFilter]
  );

  // CURRENT BALANCE only counts RECEIVED income (received: true OR date in past)
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  const weekIncome = useMemo(() =>
    weekTxns
      .filter((t) => t.type === "income")
      .filter((t) => t.received === true || new Date(t.date) <= today)
      .reduce((s, t) => s + t.amount, 0),
    [weekTxns, today]
  );
  const weekExpenses = useMemo(() => weekTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [weekTxns]);
  const weekNet = weekIncome - weekExpenses;

  // Rollover: net of transactions from PRIOR weeks, but only weeks that start on or after 2026-W14 (Mar 30, 2026)
  // This is the first week accounts/tags were set up - no history before that
  const ROLLOVER_EPOCH = new Date("2026-03-30T00:00:00");
  const weekRollover = useMemo(() => {
    let balance = 0;
    transactions.forEach((t) => {
      if (t.type === "transfer" || t.category === "transfer") return;
      const d = new Date(t.date);
      if (d < ROLLOVER_EPOCH) return; // ignore everything before rollover started
      if (d >= weekRange.start) return; // only count prior weeks
      if (accountFilter && t.accountTag !== accountFilter) return;
      // Only count received income in rollover
      if (t.type === "income" && (t.received === true || d <= today)) balance += t.amount;
      else if (t.type === "expense") balance -= t.amount;
    });
    return balance;
  }, [transactions, weekRange, accountFilter, today]);

  const incomeTxns = useMemo(() => weekTxns.filter((t) => t.type === "income").sort((a, b) => a.date.localeCompare(b.date)), [weekTxns]);
  const expenseTxns = useMemo(() => weekTxns.filter((t) => t.type === "expense").sort((a, b) => b.date.localeCompare(a.date)), [weekTxns]);
  const transferTxns = useMemo(() => weekTxns.filter((t) => t.type === "transfer").sort((a, b) => b.date.localeCompare(a.date)), [weekTxns]);

  // Handler to mark income as received
  const handleMarkReceived = async (txn: Transaction) => {
    const now = new Date().toISOString();
    const updated = { ...txn, received: true, date: now.slice(0, 10) };
    await updateTransaction(updated);
  };

  const billsDue = useMemo(() => {
    if (!currentBudget) return [];
    return currentBudget.categories.filter(
      (c) => c.type === "fixed" && billsDueInWeek(c, weekRange.start, weekRange.end)
    );
  }, [currentBudget, weekRange]);

  const paidBillIds = useMemo(() => {
    const ids = new Set<string>();
    // Check ALL expense transactions this week (not filtered by account)
    const allWeekExpenses = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= weekRange.start && d <= weekRange.end && t.type === "expense";
    });
    allWeekExpenses.forEach((t) => {
      if (t.note) billsDue.forEach((b) => {
        if (t.note!.toLowerCase().includes(b.name.toLowerCase())) ids.add(b.id);
      });
    });
    return ids;
  }, [transactions, weekRange, billsDue]);

  // Bills are ALWAYS global - never filter by account
  const filteredBillsDue = billsDue;

  // Only count UNPAID bills in the total
  const totalBillsDue = filteredBillsDue
    .filter((c) => !paidBillIds.has(c.id))
    .reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);

  const flexCategories = useMemo(() => currentBudget?.categories.filter((c) => c.type === "flexible") ?? [], [currentBudget]);

  // ALL expense transactions this week (ignoring account filter) for global spending + bills
  const allWeekExpenseTxns = useMemo(() =>
    transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= weekRange.start && d <= weekRange.end && t.type === "expense";
    }), [transactions, weekRange]
  );

  const flexSpend = useMemo(() => {
    const map: Record<string, number> = {};
    const fixedNames = new Set(
      (currentBudget?.categories ?? []).filter((c) => c.type === "fixed").map((c) => c.name.toLowerCase())
    );
    // Use ALL week expenses regardless of account filter - spending is global
    allWeekExpenseTxns.forEach((t) => {
      // Exclude transfers from flex spending
      if (t.category.toLowerCase() === "transfer") return;
      // Exclude fixed bill payments from flex spending
      if (t.note?.startsWith("Paid:") || t.note?.endsWith("- marked paid") || t.note?.endsWith("- paid")) return;
      if (t.category.toLowerCase() === "bills") return;
      // Exclude transactions that match a fixed bill name
      if (t.note && fixedNames.has(t.note.toLowerCase())) return;
      const k = t.category.toLowerCase();
      map[k] = (map[k] ?? 0) + t.amount;
    });
    return map;
  }, [allWeekExpenseTxns, currentBudget]);

  const getTagInfo = (tag?: string) => {
    if (!tag) return null;
    const found = userAccounts.find((t) => t.id === tag);
    return found ? { label: found.label, emoji: found.emoji } : null;
  };

  const isPaycheckWeek = incomeTxns.length > 0;

  const navigate = (delta: number) => { impact("Light"); setCurrentWeek(shiftWeek(currentWeek, delta)); };

  const handlePayBill = async (bill: BudgetCategory, amount: number, accountTag?: string) => {
    notification("Success");
    await addTransaction({
      id: generateId(), type: "expense", amount,
      category: "bills", note: `Paid: ${bill.name}`,
      date: new Date().toISOString(), createdAt: new Date().toISOString(),
      ...(accountTag ? { accountTag } : {}),
    });
    setPayingBill(null);
  };

  const handleTransfer = async (fromId: string, toId: string, amount: number, transferNote?: string) => {
    const fromName = userAccounts.find((a) => a.id === fromId)?.label ?? "Account";
    const toName = userAccounts.find((a) => a.id === toId)?.label ?? "Account";
    const amt = Math.round(amount * 100) / 100;
    const now = new Date().toISOString();
    const transferId = generateId();

    notification("Success");
    // Transfer OUT = expense from source account
    await addTransaction({
      id: generateId(), type: "expense", amount: amt,
      category: "transfer", note: transferNote || `Transfer to ${toName}`,
      date: now, createdAt: now, accountTag: fromId,
    });
    // Transfer IN = income to destination account
    await addTransaction({
      id: generateId(), type: "income", amount: amt,
      category: "transfer", note: transferNote || `Transfer from ${fromName}`,
      date: now, createdAt: now, accountTag: toId,
    });
    setTransferVisible(false);
  };

  const available = weekNet + weekRollover;
  const netIsPositive = available >= 0;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── MASTHEAD ── */}
        <View style={s.masthead}>
          <View>
            <Text style={s.logo}>STACKD</Text>
            <Text style={s.logoSub}>HOUSEHOLD BUDGET</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {isPaycheckWeek && (
              <View style={s.paydayChip}>
                <Text style={s.paydayText}>$ PAYDAY</Text>
              </View>
            )}
            {userAccounts.length >= 2 && (
              <Pressable onPress={() => setTransferVisible(true)} style={s.transferBtn}>
                <ArrowLeftRight size={16} color="#6366f1" strokeWidth={2.5} />
              </Pressable>
            )}
            <Pressable onPress={() => router.push("/(tabs)/settings")} style={s.settingsBtn}>
              <Settings size={18} color={colors.primary} strokeWidth={2} />
            </Pressable>
          </View>
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

        {/* ── ACCOUNT FILTER ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterBar}>
          <Pressable
            onPress={() => { impact("Light"); setAccountFilter(null); }}
            style={[s.filterPill, !accountFilter && s.filterPillActive]}
          >
            <Text style={[s.filterPillText, !accountFilter && s.filterPillTextActive]}>ALL</Text>
          </Pressable>
          {userAccounts.map((acct) => (
            <Pressable
              key={acct.id}
              onPress={() => { impact("Light"); setAccountFilter(accountFilter === acct.id ? null : acct.id); }}
              style={[s.filterPill, accountFilter === acct.id && s.filterPillActive]}
            >
              <Text style={s.filterPillEmoji}>{acct.emoji}</Text>
              <Text style={[s.filterPillText, accountFilter === acct.id && s.filterPillTextActive]}>{acct.label.toUpperCase()}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── HERO - full bleed ── */}
        <View style={[s.hero, { backgroundColor: (weekNet + weekRollover) >= 0 ? colors.primary : colors.red }]}>
          <Text style={s.heroEyebrow}>AVAILABLE</Text>
          <Text style={s.heroNum}>{(weekNet + weekRollover) >= 0 ? "+" : ""}{formatCurrency(weekNet + weekRollover)}</Text>
          <View style={s.heroBar}>
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{formatCurrency(weekNet)}</Text>
              <Text style={s.heroStatLabel}>WEEK NET</Text>
            </View>
            <View style={s.heroBarDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{formatCurrency(weekRollover)}</Text>
              <Text style={s.heroStatLabel}>ROLLOVER</Text>
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
          incomeTxns.map((t) => {
            const isReceived = t.received === true || new Date(t.date) <= today;
            const isPending = !isReceived;
            return (
              <Pressable key={t.id} onPress={() => { setEditingTxn(t); setSheetVisible(true); }} style={[s.incomeRow, isPending && s.pendingRow]}>
                <View style={s.incomeLeft}>
                  <View style={[s.greenPip, isPending && { backgroundColor: colors.textSecondary }]} />
                  <View>
                    <Text style={[s.incomeTitle, isPending && s.pendingText]}>{t.note || t.category}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.rowSub}>{formatShortDate(t.date)}</Text>
                      {isPending && <Text style={s.pendingLabel}>PENDING</Text>}
                      {getTagInfo(t.accountTag) && (
                        <View style={s.acctChip}>
                          <Text style={s.acctChipText}>{getTagInfo(t.accountTag)!.emoji} {getTagInfo(t.accountTag)!.label}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {isPending ? (
                  <Pressable style={s.markReceivedBtn} onPress={() => { impact("Medium"); handleMarkReceived(t); }}>
                    <Text style={s.markReceivedText}>MARK RECEIVED</Text>
                  </Pressable>
                ) : (
                  <Text style={s.incomeAmt}>+{formatCurrency(t.amount)}</Text>
                )}
              </Pressable>
            );
          })
        )}

        {/* ── BILLS DUE ── */}
        {filteredBillsDue.length > 0 && (
          <>
            <View style={s.sectionLabel}>
              <View style={[s.sectionLabelAccent, { backgroundColor: colors.red }]} />
              <Text style={s.sectionLabelText}>BILLS DUE</Text>
              <Text style={s.sectionLabelAmt}>{totalBillsDue > 0 ? formatCurrency(totalBillsDue) : "ALL PAID"}</Text>
            </View>
            {filteredBillsDue.map((c) => {
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
                    <Text style={s.rowSub}>{c.dueDay ? formatDueDay(c.dueDay).toUpperCase() : "DUE THIS WEEK"} - {isPaid ? "PAID" : "TAP TO PAY"}</Text>
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
                    {getTagInfo(t.accountTag) && (
                      <View style={s.acctChip}>
                        <Text style={s.acctChipText}>{getTagInfo(t.accountTag)!.emoji} {getTagInfo(t.accountTag)!.label}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={s.expenseAmt}>-{formatCurrency(t.amount)}</Text>
              </Pressable>
            ))}
          </>
        )}

        {/* ── TRANSFERS ── */}
        {transferTxns.length > 0 && (
          <>
            <View style={s.sectionLabel}>
              <View style={[s.sectionLabelAccent, { backgroundColor: colors.textSecondary }]} />
              <Text style={s.sectionLabelText}>TRANSFERS</Text>
              <Text style={s.sectionLabelAmt}>{transferTxns.length} movements</Text>
            </View>
            {transferTxns.map((t) => (
              <Pressable key={t.id} onPress={() => { setEditingTxn(t); setSheetVisible(true); }} style={s.expenseRow}>
                <View style={[s.redPip, { backgroundColor: colors.textSecondary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.expenseCat}>TRANSFER</Text>
                  {t.note ? <Text style={s.expenseNote}>{t.note}</Text> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.rowSub}>{formatShortDate(t.date)}</Text>
                    {getTagInfo(t.accountTag) && (
                      <View style={s.acctChip}>
                        <Text style={s.acctChipText}>{getTagInfo(t.accountTag)!.emoji} {getTagInfo(t.accountTag)!.label}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[s.expenseAmt, { color: colors.textSecondary }]}>{formatCurrency(t.amount)}</Text>
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
      />

      {payingBill && (
        <PayBillModal
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          onQuickPay={(amt, tag) => handlePayBill(payingBill, amt, tag)}
          onCustomPay={(amt, tag) => handlePayBill(payingBill, amt, tag)}
          accounts={userAccounts}
        />
      )}

      <TransferModal
        visible={transferVisible}
        onClose={() => setTransferVisible(false)}
        accounts={userAccounts}
        onTransfer={handleTransfer}
      />

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
    color: colors.textSecondary, fontSize: 12, letterSpacing: 4, marginTop: 1,
    fontFamily: fonts.mono as any,
  },
  transferBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(99,102,241,0.4)", backgroundColor: "rgba(99,102,241,0.08)",
  },
  settingsBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(0,255,204,0.3)",
  },
  paydayChip: {
    backgroundColor: colors.yellow, paddingHorizontal: 10, paddingVertical: 5,
  },
  paydayText: {
    color: "#000", fontSize: 12, fontWeight: "900", letterSpacing: 2,
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
    color: colors.white, fontSize: 14, fontWeight: "700", letterSpacing: 2,
    fontFamily: fonts.mono as any,
  },

  // Rollover bar
  rolloverBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    backgroundColor: "#060606", borderBottomWidth: 1, borderBottomColor: "#111",
  },
  rolloverLabel: {
    color: colors.textSecondary, fontSize: 12, fontWeight: "900", letterSpacing: 3,
    fontFamily: fonts.mono as any,
  },
  rolloverAmt: {
    fontSize: 18, fontWeight: "900", fontFamily: fonts.mono as any,
  },

  // Hero
  hero: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  heroEyebrow: {
    color: "rgba(0,0,0,0.6)", fontSize: 12, fontWeight: "900", letterSpacing: 5,
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
    color: "#000", fontSize: 20, fontWeight: "900",
    fontFamily: fonts.mono as any,
  },
  heroStatLabel: {
    color: "rgba(0,0,0,0.6)", fontSize: 12, fontWeight: "900", letterSpacing: 2,
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
    color: "#ccc", fontSize: 12, fontWeight: "700", letterSpacing: 3, flex: 1,
    fontFamily: fonts.mono as any,
  },
  sectionLabelAmt: {
    color: "#bbb", fontSize: 13, fontWeight: "700",
    fontFamily: fonts.mono as any,
  },

  emptyRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  emptyText: { color: colors.textSecondary, fontSize: 13, fontStyle: "italic", fontFamily: fonts.mono as any },

  // Income
  incomeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#080808",
  },
  incomeLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  greenPip: { width: 3, height: 32, backgroundColor: colors.primary },
  incomeTitle: { color: colors.white, fontSize: 17, fontWeight: "700", fontFamily: fonts.body as any },
  incomeAmt: { color: colors.primary, fontSize: 22, fontWeight: "900", fontFamily: fonts.mono as any },

  // Pending income
  pendingRow: { opacity: 0.5 },
  pendingText: { color: colors.textSecondary },
  pendingLabel: { color: colors.yellow, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  markReceivedBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  markReceivedText: { color: "#000", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  rowSub: { color: "#aaa", fontSize: 12, letterSpacing: 1, marginTop: 2, fontFamily: fonts.mono as any },

  // Bills
  billRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: spacing.lg, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#080808",
  },
  billRowPaid: { opacity: 0.35 },
  billEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  billMid: { flex: 1 },
  billName: { color: colors.white, fontSize: 16, fontWeight: "800", letterSpacing: 1, fontFamily: fonts.body as any },
  strike: { textDecorationLine: "line-through", color: "#888" },
  billAmt: { color: colors.red, fontSize: 18, fontWeight: "900", fontFamily: fonts.mono as any },
  paidPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 5,
  },
  paidPillText: { color: "#000", fontSize: 12, fontWeight: "900", letterSpacing: 2, fontFamily: fonts.mono as any },

  // Flex spending
  flexRow: {
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#080808", gap: 7,
  },
  flexTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  flexEmoji: { fontSize: 14 },
  flexName: { flex: 1, color: colors.white, fontSize: 13, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },
  flexAmt: { color: colors.white, fontSize: 16, fontWeight: "800", fontFamily: fonts.mono as any },
  flexOf: { color: "#aaa", fontWeight: "400", fontSize: 12 },
  barBg: { height: 4, backgroundColor: "#1a1a1a" },
  barFill: { height: 4 },
  overMsg: { color: colors.red, fontSize: 12, fontStyle: "italic", fontFamily: fonts.mono as any },

  // Expenses
  expenseRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#080808",
  },
  redPip: { width: 3, height: 28, backgroundColor: colors.red },
  expenseCat: { color: colors.white, fontSize: 14, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },
  expenseNote: { color: "#bbb", fontSize: 13, marginTop: 1, fontFamily: fonts.body as any },
  expenseAmt: { color: colors.red, fontSize: 18, fontWeight: "900", fontFamily: fonts.mono as any },
  acctChip: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 5, paddingVertical: 1,
  },
  acctChipText: {
    color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1,
    fontFamily: fonts.mono as any,
  },

  // Account filter bar
  filterBar: {
    flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#0a0a0a",
  },
  filterPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: "#1c1c1c", backgroundColor: "#050505",
  },
  filterPillActive: {
    borderColor: colors.primary, backgroundColor: "rgba(0,255,204,0.1)",
  },
  filterPillEmoji: { fontSize: 10 },
  filterPillText: {
    color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1.5,
    fontFamily: fonts.mono as any,
  },
  filterPillTextActive: { color: colors.primary },
});
