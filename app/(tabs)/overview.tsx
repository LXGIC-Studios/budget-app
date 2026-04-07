import { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, X, Calendar } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, fonts } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { formatCurrency, formatMonthLabel, shiftMonth, getMonthlyAmount, formatDateShort } from "../../src/utils";

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
          <Text style={vs.barLabel}>INCOME</Text>
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
  const { transactions, currentMonth, setCurrentMonth, currentBudget, profile, debts } = useApp();
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [mode, setMode] = useState<"month" | "custom">("month");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [showStartCal, setShowStartCal] = useState(false);
  const [showEndCal, setShowEndCal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Generate calendar grid days
  const getCalendarDays = (month: string) => {
    const [y, m] = month.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const daysInMonth = lastDay.getDate();
    const startPadding = firstDay.getDay();
    const days: { day: number; date: Date | null; isCurrentMonth: boolean }[] = [];

    // Padding before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push({ day: 0, date: null, isCurrentMonth: false });
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, date: new Date(y, m - 1, i), isCurrentMonth: true });
    }

    return days;
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

  // Only count income/expenses up to TODAY (not future-dated entries)
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const pastTxns = useMemo(() => filteredTxns.filter((t) => new Date(t.date) <= todayEnd), [filteredTxns]);

  const actualIncome = useMemo(() => pastTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [pastTxns]);
  const actualExpenses = useMemo(() => pastTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [pastTxns]);

  // All expense categories (for charts)
  const allExpenseTxns = useMemo(() => pastTxns.filter((t) => t.type === "expense"), [pastTxns]);

  // Spending by flex category (exclude bill payments)
  const catSpend = useMemo(() => {
    const map: Record<string, number> = {};
    allExpenseTxns.forEach((t) => {
      if (t.note?.startsWith("Paid:") || t.note?.endsWith("- marked paid") || t.note?.endsWith("- paid")) return;
      if (t.category.toLowerCase() === "bills") return;
      const k = t.category.toLowerCase();
      map[k] = (map[k] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [allExpenseTxns]);

  const maxCatSpend = catSpend.length > 0 ? Math.max(catSpend[0][1], ...catSpend.map(([k]) => flexBudgets[k] ?? 0)) : 0;

  // ALL spending by category (including bills, for the full breakdown chart)
  const fullSpend = useMemo(() => {
    const map: Record<string, number> = {};
    allExpenseTxns.forEach((t) => {
      const k = t.note?.startsWith("Paid:") ? t.note.replace("Paid: ", "").toLowerCase() : t.category.toLowerCase();
      map[k] = (map[k] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [allExpenseTxns]);
  const maxFullSpend = fullSpend.length > 0 ? fullSpend[0][1] : 0;

  // Daily spending for the last 7 days (mini trend)
  const dailySpend = useMemo(() => {
    const days: { label: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const total = pastTxns
        .filter((t) => t.type === "expense" && t.date.startsWith(key))
        .reduce((s, t) => s + t.amount, 0);
      days.push({ label: dayLabel, amount: total });
    }
    return days;
  }, [pastTxns]);
  const maxDaily = Math.max(...dailySpend.map((d) => d.amount), 1);

  // Budget utilization (how much of each flex budget used)
  const budgetUtil = useMemo(() => {
    return flexCats.map((c) => {
      const budget = getMonthlyAmount(c.allocated, c.frequency || "monthly");
      const spent = catSpend.find(([k]) => k === c.name.toLowerCase())?.[1] ?? 0;
      return { name: c.name, emoji: c.emoji, budget, spent, pct: budget > 0 ? spent / budget : 0 };
    }).sort((a, b) => b.pct - a.pct);
  }, [flexCats, catSpend]);

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
            <Pressable style={s.dateInputWrap} onPress={() => { impact("Light"); setShowStartCal(true); }}>
              <Text style={s.dateInputLabel}>FROM</Text>
              <View style={s.dateInput}>
                <Calendar size={16} color={customStart ? colors.primary : "#666"} />
                <Text style={[s.dateInputText, !customStart && { color: "#666" }]}>
                  {customStart ? formatDateShort(customStart) : "Select date"}
                </Text>
              </View>
            </Pressable>
            <Text style={s.dateRangeDash}>-</Text>
            <Pressable style={s.dateInputWrap} onPress={() => { impact("Light"); setShowEndCal(true); }}>
              <Text style={s.dateInputLabel}>TO</Text>
              <View style={s.dateInput}>
                <Calendar size={16} color={customEnd ? colors.primary : "#666"} />
                <Text style={[s.dateInputText, !customEnd && { color: "#666" }]}>
                  {customEnd ? formatDateShort(customEnd) : "Select date"}
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Calendar Modal for Start Date */}
        <Modal visible={showStartCal} transparent animationType="slide" onRequestClose={() => setShowStartCal(false)}>
          <Pressable style={cal.overlay} onPress={() => setShowStartCal(false)}>
            <Pressable style={cal.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={cal.header}>
                <Pressable onPress={() => setCalendarMonth(prev => shiftMonth(prev, -1))}>
                  <ChevronLeft size={24} color={colors.white} />
                </Pressable>
                <Text style={cal.monthLabel}>{formatMonthLabel(calendarMonth).toUpperCase()}</Text>
                <Pressable onPress={() => setCalendarMonth(prev => shiftMonth(prev, 1))}>
                  <ChevronRight size={24} color={colors.white} />
                </Pressable>
              </View>
              <View style={cal.weekDays}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <Text key={i} style={cal.weekDay}>{d}</Text>
                ))}
              </View>
              <View style={cal.grid}>
                {getCalendarDays(calendarMonth).map((day, i) => (
                  <Pressable
                    key={i}
                    style={[
                      cal.dayBtn,
                      day.isCurrentMonth && cal.dayBtnActive,
                      customStart && day.date && day.date.toDateString() === customStart.toDateString() && cal.dayBtnSelected,
                    ]}
                    onPress={() => {
                      if (day.date) {
                        setCustomStart(day.date);
                        setShowStartCal(false);
                      }
                    }}
                    disabled={!day.isCurrentMonth}
                  >
                    <Text style={[
                      cal.dayText,
                      !day.isCurrentMonth && { color: "#333" },
                      customStart && day.date && day.date.toDateString() === customStart.toDateString() && cal.dayTextSelected,
                    ]}>
                      {day.day || ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={cal.closeBtn} onPress={() => setShowStartCal(false)}>
                <Text style={cal.closeBtnText}>CANCEL</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Calendar Modal for End Date */}
        <Modal visible={showEndCal} transparent animationType="slide" onRequestClose={() => setShowEndCal(false)}>
          <Pressable style={cal.overlay} onPress={() => setShowEndCal(false)}>
            <Pressable style={cal.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={cal.header}>
                <Pressable onPress={() => setCalendarMonth(prev => shiftMonth(prev, -1))}>
                  <ChevronLeft size={24} color={colors.white} />
                </Pressable>
                <Text style={cal.monthLabel}>{formatMonthLabel(calendarMonth).toUpperCase()}</Text>
                <Pressable onPress={() => setCalendarMonth(prev => shiftMonth(prev, 1))}>
                  <ChevronRight size={24} color={colors.white} />
                </Pressable>
              </View>
              <View style={cal.weekDays}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <Text key={i} style={cal.weekDay}>{d}</Text>
                ))}
              </View>
              <View style={cal.grid}>
                {getCalendarDays(calendarMonth).map((day, i) => (
                  <Pressable
                    key={i}
                    style={[
                      cal.dayBtn,
                      day.isCurrentMonth && cal.dayBtnActive,
                      customEnd && day.date && day.date.toDateString() === customEnd.toDateString() && cal.dayBtnSelected,
                    ]}
                    onPress={() => {
                      if (day.date) {
                        setCustomEnd(day.date);
                        setShowEndCal(false);
                      }
                    }}
                    disabled={!day.isCurrentMonth}
                  >
                    <Text style={[
                      cal.dayText,
                      !day.isCurrentMonth && { color: "#333" },
                      customEnd && day.date && day.date.toDateString() === customEnd.toDateString() && cal.dayTextSelected,
                    ]}>
                      {day.day || ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={cal.closeBtn} onPress={() => setShowEndCal(false)}>
                <Text style={cal.closeBtnText}>CANCEL</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

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

        {/* ── 7-DAY SPENDING TREND ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionText}>// LAST 7 DAYS</Text>
        </View>
        <View style={{ flexDirection: "row", paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 4, height: 140, alignItems: "flex-end" }}>
          {dailySpend.map((day, i) => {
            const pct = maxDaily > 0 ? (day.amount / maxDaily) * 100 : 0;
            const isToday = i === 6;
            return (
              <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <Text style={{ color: isToday ? colors.primary : "#bbb", fontSize: 11, fontWeight: "800", fontFamily: fonts.mono as any }}>
                  {day.amount > 0 ? `$${Math.round(day.amount)}` : ""}
                </Text>
                <View style={{ flex: 1, width: "100%", backgroundColor: "#1a1a1a", justifyContent: "flex-end" }}>
                  <View style={{ height: `${Math.max(pct, 2)}%` as any, backgroundColor: isToday ? colors.primary : colors.yellow }} />
                </View>
                <Text style={{ color: isToday ? colors.primary : "#aaa", fontSize: 10, fontWeight: "700", fontFamily: fonts.mono as any }}>{day.label}</Text>
              </View>
            );
          })}
        </View>

        {/* ── WHERE ALL THE MONEY WENT (full breakdown) ── */}
        {fullSpend.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionText}>// ALL EXPENSES</Text>
              <Text style={s.sectionRight}>{formatCurrency(actualExpenses)}</Text>
            </View>
            {fullSpend.slice(0, 10).map(([cat, amt]) => (
              <Bar key={cat} label={cat} amount={amt} max={maxFullSpend} color={colors.red} />
            ))}
          </>
        )}

        {/* ── BUDGET UTILIZATION ── */}
        {budgetUtil.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionText}>// BUDGET HEALTH</Text>
            </View>
            {budgetUtil.map((b) => (
              <View key={b.name} style={{ paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.white, fontSize: 14, fontWeight: "800", fontFamily: fonts.mono as any }}>{b.emoji} {b.name.toUpperCase()}</Text>
                  <Text style={{ color: b.pct > 1 ? colors.red : b.pct > 0.8 ? colors.yellow : colors.primary, fontSize: 15, fontWeight: "900", fontFamily: fonts.mono as any }}>
                    {Math.round(b.pct * 100)}%
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: "#1a1a1a" }}>
                  <View style={{ height: 8, width: `${Math.min(b.pct * 100, 100)}%` as any, backgroundColor: b.pct > 1 ? colors.red : b.pct > 0.8 ? colors.yellow : colors.primary }} />
                </View>
                <Text style={{ color: "#aaa", fontSize: 12, fontFamily: fonts.mono as any }}>
                  {formatCurrency(b.spent)} / {formatCurrency(b.budget)}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* ── DEBT SNOWBALL ── */}
        {debts.length > 0 && (() => {
          const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
          const totalMin = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
          const sorted = [...debts].sort((a, b) => a.balance - b.balance);
          // Simple snowball estimate
          const extra = Math.max(0, actualIncome - actualExpenses - 200);
          let months = 0;
          const remaining = sorted.map((d) => ({ ...d }));
          while (remaining.some((d) => d.balance > 0) && months < 360) {
            months++;
            let snowball = extra;
            for (const d of remaining) {
              const pay = d === remaining.find((r) => r.balance > 0) ? d.minimumPayment + snowball : d.minimumPayment;
              d.balance = Math.max(0, d.balance - pay);
              if (d === remaining.find((r) => r.balance > 0)) snowball = 0;
            }
            // Remove paid off, roll their minimums
            for (let i = 0; i < remaining.length; i++) {
              if (remaining[i].balance <= 0 && i < remaining.length - 1) {
                remaining[i + 1].minimumPayment += remaining[i].minimumPayment;
                remaining[i].minimumPayment = 0;
              }
            }
          }
          const debtFreeDate = new Date();
          debtFreeDate.setMonth(debtFreeDate.getMonth() + months);

          return (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionText}>// DEBT SNOWBALL</Text>
                <Text style={s.sectionRight}>{formatCurrency(totalDebt)}</Text>
              </View>

              {/* Debt progress bar */}
              <View style={{ paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.white, fontSize: 14, fontWeight: "800", fontFamily: fonts.mono as any }}>TOTAL OWED</Text>
                  <Text style={{ color: colors.red, fontSize: 18, fontWeight: "900", fontFamily: fonts.mono as any }}>{formatCurrency(totalDebt)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#bbb", fontSize: 13, fontFamily: fonts.mono as any }}>MIN PAYMENTS</Text>
                  <Text style={{ color: colors.white, fontSize: 15, fontWeight: "800", fontFamily: fonts.mono as any }}>{formatCurrency(totalMin)}/mo</Text>
                </View>
                {months > 0 && months < 360 && (
                  <View style={{ backgroundColor: "rgba(0,255,204,0.08)", padding: 14, borderWidth: 1, borderColor: "rgba(0,255,204,0.2)", marginTop: 4 }}>
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any, textAlign: "center" }}>
                      DEBT FREE: {debtFreeDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
                    </Text>
                    <Text style={{ color: "#bbb", fontSize: 12, fontFamily: fonts.mono as any, textAlign: "center", marginTop: 4 }}>
                      ~{months} months from now
                    </Text>
                  </View>
                )}
              </View>

              {/* Individual debts */}
              {sorted.map((d, i) => {
                const maxBal = sorted[sorted.length - 1].balance || 1;
                const pct = d.balance / maxBal;
                const isFocus = i === 0;
                return (
                  <View key={d.id} style={{ paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", backgroundColor: isFocus ? colors.primary : "#1a1a1a", borderWidth: isFocus ? 0 : 1, borderColor: "#333" }}>
                        <Text style={{ color: isFocus ? "#000" : "#bbb", fontSize: 13, fontWeight: "900", fontFamily: fonts.mono as any }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.white, fontSize: 15, fontWeight: "700", fontFamily: fonts.body as any }}>{d.name}</Text>
                        <Text style={{ color: "#aaa", fontSize: 12, fontFamily: fonts.mono as any }}>
                          min ${d.minimumPayment}/mo  {d.interestRate > 0 ? `${d.interestRate}% APR` : ""}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ color: colors.red, fontSize: 17, fontWeight: "900", fontFamily: fonts.mono as any }}>{formatCurrency(d.balance)}</Text>
                        {isFocus && <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 2, fontFamily: fonts.mono as any }}>TARGET</Text>}
                      </View>
                    </View>
                    <View style={{ height: 8, backgroundColor: "#1a1a1a" }}>
                      <View style={{ height: 8, width: `${pct * 100}%` as any, backgroundColor: isFocus ? colors.primary : colors.red }} />
                    </View>
                  </View>
                );
              })}
            </>
          );
        })()}

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
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1a1a1a",
    paddingVertical: 10, paddingHorizontal: 12,
  },
  dateInputText: {
    color: colors.white, fontSize: 16, fontWeight: "700", fontFamily: fonts.mono as any,
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

  // Date input with calendar icon
  dateInputText: {
    color: colors.white, fontSize: 16, fontWeight: "700", fontFamily: fonts.mono as any,
  },
});

// Calendar modal styles
const cal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#050505", borderTopWidth: 2, borderTopColor: colors.primary,
    padding: spacing.lg, paddingBottom: 52, gap: 12,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8,
  },
  monthLabel: {
    color: colors.white, fontSize: 18, fontWeight: "900", letterSpacing: 3, fontFamily: fonts.heading as any,
  },
  weekDays: {
    flexDirection: "row", justifyContent: "space-around", marginBottom: 4,
  },
  weekDay: {
    color: "#666", fontSize: 12, fontWeight: "700", width: 40, textAlign: "center", fontFamily: fonts.mono as any,
  },
  grid: {
    flexDirection: "row", flexWrap: "wrap", gap: 4,
  },
  dayBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
  },
  dayBtnActive: {
    backgroundColor: "transparent",
  },
  dayBtnSelected: {
    backgroundColor: colors.primary, borderRadius: 4,
  },
  dayText: {
    color: "#666", fontSize: 16, fontWeight: "700", fontFamily: fonts.mono as any,
  },
  dayTextSelected: {
    color: "#000",
  },
  closeBtn: {
    backgroundColor: "#1a1a1a", padding: 14, alignItems: "center", marginTop: 8,
  },
  closeBtnText: {
    color: "#888", fontSize: 14, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any,
  },
});
});
