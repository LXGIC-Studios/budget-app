import { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, fonts } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { formatCurrency, formatMonthLabel, shiftMonth, getMonthlyAmount } from "../../src/utils";

// ─── HORIZONTAL BAR ────────────────────────────────────────────────
function Bar({ label, amount, max, color, budget }: {
  label: string; amount: number; max: number; color: string; budget?: number;
}) {
  const pct = max > 0 ? Math.min(amount / max, 1) : 0;
  const isOver = budget != null && budget > 0 && amount > budget;
  const budgetPct = budget && max > 0 ? Math.min(budget / max, 1) : 0;
  return (
    <View style={bs.row}>
      <View style={bs.header}>
        <Text style={bs.label}>{label}</Text>
        <Text style={[bs.amt, isOver && { color: colors.red }]}>
          {formatCurrency(amount)}
          {budget != null && budget > 0 && <Text style={bs.budget}> / {formatCurrency(budget)}</Text>}
        </Text>
      </View>
      <View style={bs.track}>
        {budgetPct > 0 && <View style={[bs.budgetMark, { left: `${budgetPct * 100}%` as any }]} />}
        <View style={[bs.fill, { width: `${pct * 100}%` as any, backgroundColor: isOver ? colors.red : color }]} />
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  row: { gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.white, fontSize: 14, fontWeight: "800", letterSpacing: 1, fontFamily: fonts.mono as any, textTransform: "uppercase" },
  amt: { color: colors.white, fontSize: 16, fontWeight: "900", fontFamily: fonts.mono as any },
  budget: { color: "#aaa", fontWeight: "400", fontSize: 13 },
  track: { height: 16, backgroundColor: "#1a1a1a", position: "relative" },
  fill: { height: 16, position: "absolute", left: 0, top: 0 },
  budgetMark: { position: "absolute", top: -3, width: 2, height: 22, backgroundColor: "rgba(255,255,255,0.4)", zIndex: 1 },
});

// ─── VERTICAL BAR GROUP (income vs expenses side by side) ──────────
function VerticalBars({ income, expenses }: { income: number; expenses: number }) {
  const max = Math.max(income, expenses, 1);
  const incPct = (income / max) * 100;
  const expPct = (expenses / max) * 100;
  const remaining = income - expenses;
  return (
    <View style={vs.container}>
      <View style={vs.barsRow}>
        <View style={vs.barCol}>
          <Text style={[vs.amt, { color: colors.primary }]}>{formatCurrency(income)}</Text>
          <View style={vs.barTrack}>
            <View style={[vs.barFill, { height: `${incPct}%` as any, backgroundColor: colors.primary }]} />
          </View>
          <Text style={vs.barLabel}>BUDGET</Text>
        </View>
        <View style={vs.barCol}>
          <Text style={[vs.amt, { color: colors.red }]}>{formatCurrency(expenses)}</Text>
          <View style={vs.barTrack}>
            <View style={[vs.barFill, { height: `${expPct}%` as any, backgroundColor: colors.red }]} />
          </View>
          <Text style={vs.barLabel}>SPENT</Text>
        </View>
      </View>
      <View style={vs.netRow}>
        <Text style={vs.netLabel}>REMAINING</Text>
        <Text style={[vs.netVal, { color: remaining >= 0 ? colors.primary : colors.red }]}>
          {remaining >= 0 ? "+" : ""}{formatCurrency(remaining)}
        </Text>
      </View>
    </View>
  );
}

const vs = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingVertical: 16, gap: 12 },
  barsRow: { flexDirection: "row", gap: 12, height: 180 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  amt: { fontSize: 18, fontWeight: "900", fontFamily: fonts.mono as any },
  barTrack: { flex: 1, width: "100%", backgroundColor: "#1a1a1a", justifyContent: "flex-end" },
  barFill: { width: "100%" },
  barLabel: { color: "#bbb", fontSize: 12, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },
  netRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 2, borderTopColor: colors.primary },
  netLabel: { color: "#bbb", fontSize: 14, fontWeight: "800", letterSpacing: 3, fontFamily: fonts.mono as any },
  netVal: { fontSize: 24, fontWeight: "900", fontFamily: fonts.mono as any },
});

function parseInputDate(text: string): Date | null {
  const digits = text.replace(/\D/g, "");
  if (digits.length === 8) {
    const m = parseInt(digits.slice(0, 2), 10);
    const d = parseInt(digits.slice(2, 4), 10);
    const y = parseInt(digits.slice(4, 8), 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000) {
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
}

function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, "");
  let formatted = digits;
  if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2);
  if (digits.length > 4) formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
  return formatted;
}

function formatDateShort(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export default function OverviewScreen() {
  const { transactions, currentMonth, setCurrentMonth, currentBudget, profile } = useApp();
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [mode, setMode] = useState<"month" | "custom">("month");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const handleStartInput = (text: string) => {
    const formatted = formatDateInput(text);
    setStartInput(formatted);
    const d = parseInputDate(text);
    if (d) setCustomStart(d);
  };

  const handleEndInput = (text: string) => {
    const formatted = formatDateInput(text);
    setEndInput(formatted);
    const d = parseInputDate(text);
    if (d) setCustomEnd(d);
  };

  const flexCats = useMemo(() => currentBudget?.categories.filter((c) => c.type === "flexible") ?? [], [currentBudget]);
  const flexBudgets = useMemo(() => {
    const map: Record<string, number> = {};
    flexCats.forEach((c) => { map[c.name.toLowerCase()] = getMonthlyAmount(c.allocated, c.frequency || "monthly"); });
    return map;
  }, [flexCats]);

  // Filter transactions by month or custom date range
  const filteredTxns = useMemo(() =>
    transactions.filter((t) => {
      if (t.type === "transfer") return false;
      if (accountFilter && t.accountTag !== accountFilter) return false;
      if (mode === "custom" && customStart && customEnd) {
        const d = new Date(t.date);
        const start = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate());
        const end = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59);
        return d >= start && d <= end;
      }
      return t.date.startsWith(currentMonth);
    }),
    [transactions, currentMonth, accountFilter, mode, customStart, customEnd]
  );

  const actualIncome = useMemo(() => filteredTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [filteredTxns]);
  const actualExpenses = useMemo(() => filteredTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [filteredTxns]);

  const catSpend = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTxns.filter((t) => t.type === "expense").forEach((t) => {
      if (t.note?.startsWith("Paid:") || t.note?.endsWith("- marked paid") || t.note?.endsWith("- paid")) return;
      if (t.category.toLowerCase() === "bills") return;
      const k = t.category.toLowerCase();
      map[k] = (map[k] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredTxns]);

  const maxCatSpend = catSpend.length > 0 ? Math.max(catSpend[0][1], ...catSpend.map(([k]) => flexBudgets[k] ?? 0)) : 0;

  const navigate = (delta: number) => { impact("Light"); setCurrentMonth(shiftMonth(currentMonth, delta)); };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        <View style={s.topBar}>
          <Text style={s.logo}>CHARTS</Text>
        </View>

        {/* Mode toggle: Month vs Custom */}
        <View style={s.modeRow}>
          <Pressable
            onPress={() => { impact("Light"); setMode("month"); }}
            style={[s.modeBtn, mode === "month" && s.modeBtnActive]}
          >
            <Text style={[s.modeBtnText, mode === "month" && s.modeBtnTextActive]}>MONTH</Text>
          </Pressable>
          <Pressable
            onPress={() => { impact("Light"); setMode("custom"); }}
            style={[s.modeBtn, mode === "custom" && s.modeBtnActive]}
          >
            <Text style={[s.modeBtnText, mode === "custom" && s.modeBtnTextActive]}>CUSTOM</Text>
          </Pressable>
        </View>

        {/* Month nav or date range inputs */}
        {mode === "month" ? (
          <View style={s.monthNav}>
            <Pressable onPress={() => navigate(-1)} hitSlop={16}><ChevronLeft size={20} color={colors.white} /></Pressable>
            <Text style={s.monthLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
            <Pressable onPress={() => navigate(1)} hitSlop={16}><ChevronRight size={20} color={colors.white} /></Pressable>
          </View>
        ) : (
          <View style={s.dateRangeRow}>
            <View style={s.dateInputWrap}>
              <Text style={s.dateInputLabel}>FROM</Text>
              <TextInput
                style={s.dateInput}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#666"
                value={startInput}
                onChangeText={handleStartInput}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            <Text style={s.dateRangeDash}>-</Text>
            <View style={s.dateInputWrap}>
              <Text style={s.dateInputLabel}>TO</Text>
              <TextInput
                style={s.dateInput}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#666"
                value={endInput}
                onChangeText={handleEndInput}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>
        )}

        {/* Period label for custom */}
        {mode === "custom" && customStart && customEnd && (
          <View style={s.customLabel}>
            <Text style={s.customLabelText}>
              {formatDateShort(customStart)} - {formatDateShort(customEnd)}
            </Text>
          </View>
        )}

        {/* ── CASH FLOW ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionText}>// CASH FLOW</Text>
        </View>
        <VerticalBars income={actualIncome} expenses={actualExpenses} />

        {/* ── SPENDING BY CATEGORY ── */}
        {catSpend.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionText}>// SPENDING BY CATEGORY</Text>
              <Text style={s.sectionRight}>{formatCurrency(catSpend.reduce((s, [, a]) => s + a, 0))}</Text>
            </View>
            {catSpend.map(([cat, amt]) => (
              <Bar
                key={cat}
                label={cat}
                amount={amt}
                max={maxCatSpend}
                color={colors.yellow}
                budget={flexBudgets[cat]}
              />
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  topBar: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,255,204,0.15)",
  },
  logo: { color: colors.primary, fontSize: 26, fontWeight: "900", letterSpacing: 8, fontFamily: fonts.heading as any },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)",
  },
  monthLabel: { color: colors.white, fontSize: 16, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(0,255,204,0.15)",
    backgroundColor: "rgba(0,255,204,0.03)", marginTop: 2,
  },
  sectionText: { color: colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 3, fontFamily: fonts.mono as any },
  sectionRight: { color: "#bbb", fontSize: 15, fontWeight: "700", fontFamily: fonts.mono as any },

  // Mode toggle
  modeRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)",
  },
  modeBtn: {
    flex: 1, alignItems: "center", paddingVertical: 12, backgroundColor: "#080808",
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    color: "#bbb", fontSize: 13, fontWeight: "900", letterSpacing: 3, fontFamily: fonts.mono as any,
  },
  modeBtnTextActive: {
    color: "#000",
  },

  // Date range
  dateRangeRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)",
  },
  dateInputWrap: { flex: 1, gap: 4 },
  dateInputLabel: {
    color: "#bbb", fontSize: 11, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any,
  },
  dateInput: {
    backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1a1a1a",
    paddingVertical: 10, paddingHorizontal: 12, color: colors.white,
    fontSize: 16, fontWeight: "700", fontFamily: fonts.mono as any, textAlign: "center",
  },
  dateRangeDash: {
    color: colors.primary, fontSize: 20, fontWeight: "900", marginTop: 18,
  },
  customLabel: {
    alignItems: "center", paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)",
  },
  customLabelText: {
    color: colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 1, fontFamily: fonts.mono as any,
  },
});
