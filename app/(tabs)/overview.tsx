import { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, TrendingUp, Flame } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, fonts } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { formatCurrency, formatMonthLabel, shiftMonth, getMonthlyAmount, formatDateShort } from "../../src/utils";

// ─── CONSTANTS ──────────────────────────────────────────────────────

const WASTEFUL_CATEGORIES = ["Eating Out", "Gaming/Entertainment", "Misc", "Shopping", "Nathan AI Tools"];

// ─── HELPERS ────────────────────────────────────────────────────────

function cleanMerchantNote(note: string): string {
  let n = (note || "").trim();
  n = n.replace(/^Card Purchase\s+/i, "");
  n = n.replace(/^With Pin\s+/i, "");
  n = n.replace(/^[Dd]{2}\s*\*\s*/i, "");
  n = n.replace(/^SQ\s*\*\s*/i, "");
  n = n.replace(/^TST\s*\*\s*/i, "");
  n = n.replace(/^SPO\s*\*\s*/i, "");
  n = n.replace(/\s+(Whse|Store|Str|Ste)\s*#?\s*\d+/i, "");
  n = n.replace(/\s*#\d+\s*$/, "");
  n = n.replace(/\s+[A-Z][a-zA-Z.*\/]+\s+[A-Z]{2}$/, "");
  n = n.replace(/\s+[A-Z]{2}$/, "");
  return n.trim() || note;
}

// ─── ENHANCED BUDGET BAR - Shows budget marker + overspend ──────────

function BudgetBar({ label, emoji, amount, max, color, budget, rank }: {
  label: string;
  emoji?: string;
  amount: number;
  max: number;
  color: string;
  budget?: number;
  rank?: number;
}) {
  const pct = max > 0 ? Math.min(amount / max, 1) : 0;
  const isOver = budget != null && budget > 0 && amount > budget;
  const overAmt = budget != null ? Math.max(0, amount - budget) : 0;
  const overPct = budget != null && budget > 0 ? ((amount - budget) / budget) * 100 : 0;
  const budgetPct = budget && max > 0 ? Math.min(budget / max, 1) : 0;
  const utilPct = budget != null && budget > 0 ? (amount / budget) * 100 : 0;

  return (
    <View style={[bs.row, isOver && { backgroundColor: "rgba(255,0,60,0.04)" }]}>
      <View style={bs.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {rank && <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", fontFamily: fonts.mono as any }}>{rank}.</Text>}
          <Text style={bs.label}>{emoji ? `${emoji} ` : ""}{label.toUpperCase()}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isOver && (
            <View style={bs.overBadge}>
              <Text style={bs.overBadgeText}>+{Math.round(overPct)}% OVER</Text>
            </View>
          )}
          <Text style={[bs.amt, isOver && { color: colors.red }]}>
            {formatCurrency(amount)}
            {budget != null && budget > 0 && <Text style={bs.budget}> / {formatCurrency(budget)}</Text>}
          </Text>
        </View>
      </View>
      <View style={bs.track}>
        {budgetPct > 0 && (
          <View style={[bs.budgetMark, { left: `${budgetPct * 100}%` as any }]} />
        )}
        <View
          style={[
            bs.fill,
            {
              width: `${Math.min(pct * 100, 100)}%` as any,
              backgroundColor: isOver ? colors.red : utilPct > 80 ? "#FF9500" : color,
            },
          ]}
        />
        {/* Overspend overflow bar */}
        {isOver && budget != null && max > 0 && (
          <View
            style={[
              bs.overFill,
              {
                left: `${budgetPct * 100}%` as any,
                width: `${Math.min(((amount - budget) / max) * 100, 100 - budgetPct * 100)}%` as any,
              },
            ]}
          />
        )}
      </View>
      {isOver && (
        <Text style={bs.overLabel}>
          {formatCurrency(overAmt)} wasted over budget
        </Text>
      )}
    </View>
  );
}

const bs = StyleSheet.create({
  row: {
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: fonts.mono as any,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  amt: { color: colors.white, fontSize: 15, fontWeight: "900", fontFamily: fonts.mono as any },
  budget: { color: "#aaa", fontWeight: "400", fontSize: 12 },
  track: { height: 14, backgroundColor: "#1a1a1a", position: "relative", overflow: "hidden" },
  fill: { height: 14, position: "absolute", left: 0, top: 0 },
  overFill: {
    height: 14,
    position: "absolute",
    top: 0,
    backgroundColor: "rgba(255,0,60,0.5)",
    borderLeftWidth: 1,
    borderLeftColor: colors.red,
  },
  budgetMark: {
    position: "absolute",
    top: -2,
    width: 2,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.6)",
    zIndex: 2,
  },
  overBadge: {
    backgroundColor: colors.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  overBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: fonts.mono as any,
  },
  overLabel: {
    color: colors.red,
    fontSize: 11,
    fontFamily: fonts.mono as any,
    letterSpacing: 0.5,
  },
});

// ─── VERTICAL BAR GROUP ─────────────────────────────────────────────

function VerticalBars({ income, expenses }: { income: number; expenses: number }) {
  const max = Math.max(income, expenses, 1);
  const incPct = (income / max) * 100;
  const expPct = (expenses / max) * 100;
  const remaining = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
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
          <Text style={[vs.amt, { color: expPct > incPct ? colors.red : "#FF9500" }]}>{formatCurrency(expenses)}</Text>
          <View style={vs.barTrack}>
            <View style={[vs.barFill, { height: `${expPct}%` as any, backgroundColor: expPct >= 100 ? colors.red : expPct > 80 ? "#FF9500" : colors.yellow }]} />
          </View>
          <Text style={vs.barLabel}>SPENT</Text>
        </View>
      </View>
      <View style={vs.netRow}>
        <View>
          <Text style={vs.netLabel}>REMAINING</Text>
          {income > 0 && (
            <Text style={{ color: savingsRate >= 0 ? "#aaa" : colors.red, fontSize: 11, fontFamily: fonts.mono as any }}>
              {savingsRate >= 0 ? "SAVED" : "DEFICIT"}: {Math.abs(savingsRate).toFixed(0)}% of income
            </Text>
          )}
        </View>
        <Text style={[vs.netVal, { color: remaining >= 0 ? colors.primary : colors.red }]}>
          {remaining >= 0 ? "+" : ""}{formatCurrency(remaining)}
        </Text>
      </View>
    </View>
  );
}

const vs = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingVertical: 16, gap: 12 },
  barsRow: { flexDirection: "row", gap: 12, height: 160 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  amt: { fontSize: 17, fontWeight: "900", fontFamily: fonts.mono as any },
  barTrack: { flex: 1, width: "100%", backgroundColor: "#1a1a1a", justifyContent: "flex-end" },
  barFill: { width: "100%" },
  barLabel: { color: "#bbb", fontSize: 11, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  netLabel: { color: "#bbb", fontSize: 13, fontWeight: "800", letterSpacing: 3, fontFamily: fonts.mono as any },
  netVal: { fontSize: 22, fontWeight: "900", fontFamily: fonts.mono as any },
});

// ─── WASTE SCORECARD ────────────────────────────────────────────────

function WasteScorecard({ items }: {
  items: { label: string; amount: number; count?: number; severity: "critical" | "warning" | "info" }[];
}) {
  if (items.length === 0) {
    return (
      <View style={wc.emptyRow}>
        <Text style={{ fontSize: 18 }}>✅</Text>
        <Text style={wc.emptyText}>No major waste patterns detected</Text>
      </View>
    );
  }
  const total = items.reduce((s, i) => s + i.amount, 0);
  return (
    <View style={{ gap: 0 }}>
      {/* Total waste callout */}
      <View style={wc.totalRow}>
        <Text style={wc.totalLabel}>TOTAL MONEY WASTED</Text>
        <Text style={wc.totalAmt}>{formatCurrency(total)}</Text>
      </View>
      {items.map((item, i) => {
        const barColor = item.severity === "critical" ? colors.red : item.severity === "warning" ? "#FF9500" : "#BFFF00";
        return (
          <View key={i} style={[wc.row, { borderLeftColor: barColor }]}>
            <View style={{ flex: 1 }}>
              <Text style={wc.label}>{item.label}</Text>
              {item.count != null && (
                <Text style={wc.sub}>{item.count} transactions</Text>
              )}
            </View>
            <Text style={[wc.amt, { color: barColor }]}>{formatCurrency(item.amount)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const wc = StyleSheet.create({
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: "rgba(255,0,60,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,0,60,0.2)",
  },
  totalLabel: {
    color: colors.red,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 3,
    fontFamily: fonts.mono as any,
  },
  totalAmt: {
    color: colors.red,
    fontSize: 20,
    fontWeight: "900",
    fontFamily: fonts.mono as any,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    borderLeftWidth: 3,
    gap: 12,
  },
  label: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: fonts.mono as any,
  },
  sub: {
    color: "#666",
    fontSize: 11,
    fontFamily: fonts.mono as any,
    marginTop: 2,
  },
  amt: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: fonts.mono as any,
  },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
  },
  emptyText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: fonts.mono as any,
  },
});

// ─── DEATH BY 1000 CUTS ─────────────────────────────────────────────

function SmallPurchasesChart({ items }: {
  items: { merchant: string; count: number; total: number; avg: number }[];
}) {
  if (items.length === 0) {
    return (
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: 16 }}>
        <Text style={{ color: "#666", fontSize: 13, fontFamily: fonts.mono as any }}>No frequent small purchases found</Text>
      </View>
    );
  }
  const maxTotal = Math.max(...items.map((i) => i.total), 1);
  return (
    <View style={{ gap: 0 }}>
      {items.map((item, i) => (
        <View key={i} style={sp.row}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={sp.merchant} numberOfLines={1}>{item.merchant}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={sp.countBadge}>{item.count}x</Text>
                <Text style={sp.total}>{formatCurrency(item.total)}</Text>
              </View>
            </View>
            <View style={sp.track}>
              <View style={[sp.fill, { width: `${(item.total / maxTotal) * 100}%` as any }]} />
            </View>
            <Text style={sp.avg}>{formatCurrency(item.avg)} avg per visit</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const sp = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  merchant: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: fonts.mono as any,
    flex: 1,
    marginRight: 8,
  },
  countBadge: {
    color: "#FF9500",
    fontSize: 12,
    fontWeight: "900",
    fontFamily: fonts.mono as any,
    backgroundColor: "rgba(255,149,0,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  total: {
    color: colors.red,
    fontSize: 14,
    fontWeight: "900",
    fontFamily: fonts.mono as any,
  },
  track: {
    height: 6,
    backgroundColor: "#1a1a1a",
  },
  fill: {
    height: 6,
    backgroundColor: "#FF9500",
  },
  avg: {
    color: "#666",
    fontSize: 11,
    fontFamily: fonts.mono as any,
  },
});

// ─── BUDGET HEALTH SUMMARY ───────────────────────────────────────────

function BudgetHealthSummary({ over, onTrack, under }: { over: number; onTrack: number; under: number }) {
  const total = over + onTrack + under;
  if (total === 0) return null;
  return (
    <View style={bh.container}>
      <View style={bh.item}>
        <Text style={[bh.count, { color: colors.red }]}>{over}</Text>
        <Text style={bh.label}>OVER BUDGET</Text>
      </View>
      <View style={bh.divider} />
      <View style={bh.item}>
        <Text style={[bh.count, { color: "#FF9500" }]}>{onTrack}</Text>
        <Text style={bh.label}>AT RISK</Text>
      </View>
      <View style={bh.divider} />
      <View style={bh.item}>
        <Text style={[bh.count, { color: colors.primary }]}>{under}</Text>
        <Text style={bh.label}>HEALTHY</Text>
      </View>
    </View>
  );
}

const bh = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 0,
  },
  item: { flex: 1, alignItems: "center", gap: 4 },
  count: { fontSize: 28, fontWeight: "900", fontFamily: fonts.mono as any },
  label: { color: "#666", fontSize: 10, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any },
  divider: { width: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 4 },
});

// ─── CALENDAR HELPERS ────────────────────────────────────────────────

function getCalendarDays(month: string) {
  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const daysInMonth = lastDay.getDate();
  const startPadding = firstDay.getDay();
  const days: { day: number; date: Date | null; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < startPadding; i++) {
    days.push({ day: 0, date: null, isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, date: new Date(y, m - 1, i), isCurrentMonth: true });
  }
  return days;
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────

export default function OverviewScreen() {
  const { transactions, currentMonth, setCurrentMonth, currentBudget, profile, debts } = useApp();
  const [mode, setMode] = useState<"month" | "custom">("month");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [showStartCal, setShowStartCal] = useState(false);
  const [showEndCal, setShowEndCal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const flexCats = useMemo(() => currentBudget?.categories.filter((c) => c.type === "flexible") ?? [], [currentBudget]);
  const flexBudgets = useMemo(() => {
    const map: Record<string, number> = {};
    flexCats.forEach((c) => { map[c.name.toLowerCase()] = getMonthlyAmount(c.allocated, c.frequency || "monthly"); });
    return map;
  }, [flexCats]);

  // Filter transactions
  const filteredTxns = useMemo(() =>
    transactions.filter((t) => {
      if (t.type === "transfer" || t.category === "transfer") return false;
      if (mode === "custom" && customStart && customEnd) {
        const d = new Date(t.date);
        const start = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate());
        const end = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59);
        return d >= start && d <= end;
      }
      return t.date.startsWith(currentMonth);
    }),
    [transactions, currentMonth, mode, customStart, customEnd]
  );

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const pastTxns = useMemo(() => filteredTxns.filter((t) => new Date(t.date) <= todayEnd), [filteredTxns]);

  const actualIncome = useMemo(() => pastTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [pastTxns]);
  const actualExpenses = useMemo(() => pastTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [pastTxns]);
  const allExpenseTxns = useMemo(() => pastTxns.filter((t) => t.type === "expense"), [pastTxns]);

  // ── SPENDING BY FLEX CATEGORY ─────────────────────────────────────
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

  const maxCatSpend = useMemo(() => {
    const amounts = catSpend.map(([k, a]) => Math.max(a, flexBudgets[k] ?? 0));
    return amounts.length > 0 ? Math.max(...amounts) : 0;
  }, [catSpend, flexBudgets]);

  // ── BUDGET VS ACTUAL WITH OVERSPEND ──────────────────────────────
  const budgetUtil = useMemo(() => {
    return flexCats.map((c) => {
      const budget = getMonthlyAmount(c.allocated, c.frequency || "monthly");
      const spent = catSpend.find(([k]) => k === c.name.toLowerCase())?.[1] ?? 0;
      const pct = budget > 0 ? spent / budget : 0;
      const status: "over" | "risk" | "ok" = pct > 1 ? "over" : pct > 0.8 ? "risk" : "ok";
      return { name: c.name, emoji: c.emoji, budget, spent, pct, status };
    }).sort((a, b) => b.pct - a.pct);
  }, [flexCats, catSpend]);

  const budgetSummary = useMemo(() => ({
    over: budgetUtil.filter((b) => b.status === "over").length,
    onTrack: budgetUtil.filter((b) => b.status === "risk").length,
    under: budgetUtil.filter((b) => b.status === "ok").length,
  }), [budgetUtil]);

  const maxBudgetBar = useMemo(() => {
    if (budgetUtil.length === 0) return 1;
    return Math.max(...budgetUtil.map((b) => Math.max(b.spent, b.budget)), 1);
  }, [budgetUtil]);

  // ── WASTE ANALYSIS ─────────────────────────────────────────────────
  const wasteItems = useMemo(() => {
    const items: { label: string; amount: number; count?: number; severity: "critical" | "warning" | "info" }[] = [];

    // 1. Budget overruns - each over-budget category
    budgetUtil
      .filter((b) => b.status === "over")
      .forEach((b) => {
        const over = b.spent - b.budget;
        items.push({
          label: `${b.emoji} ${b.name} – over budget`,
          amount: over,
          severity: over > 200 ? "critical" : "warning",
        });
      });

    // 2. Food delivery / DoorDash
    const deliveryTxns = allExpenseTxns.filter((t) => {
      const note = (t.note || "").toLowerCase();
      return note.includes("doordash") || note.includes("dd *") || note.includes("ubereats") || note.includes("uber eat") || note.includes("grubhub") || note.includes("postmates");
    });
    if (deliveryTxns.length > 0) {
      const total = deliveryTxns.reduce((s, t) => s + t.amount, 0);
      items.push({
        label: "Food delivery (DoorDash/UberEats)",
        amount: total,
        count: deliveryTxns.length,
        severity: total > 150 ? "critical" : "warning",
      });
    }

    // 3. Coffee shops
    const coffeeTxns = allExpenseTxns.filter((t) => {
      const note = (t.note || "").toLowerCase();
      return note.includes("dutch bros") || note.includes("starbucks") || note.includes("dunkin") || note.includes("7 brew") || note.includes("kaveexpress") || note.includes("coffee");
    });
    if (coffeeTxns.length >= 3) {
      const total = coffeeTxns.reduce((s, t) => s + t.amount, 0);
      items.push({
        label: `Coffee shops (${coffeeTxns.length} visits)`,
        amount: total,
        count: coffeeTxns.length,
        severity: total > 60 ? "warning" : "info",
      });
    }

    // 4. Amazon / impulse online shopping
    const amazonTxns = allExpenseTxns.filter((t) => {
      const note = (t.note || "").toLowerCase();
      return note.includes("amazon") || note.includes("amzn");
    });
    if (amazonTxns.length >= 3) {
      const total = amazonTxns.reduce((s, t) => s + t.amount, 0);
      items.push({
        label: `Amazon purchases (${amazonTxns.length} orders)`,
        amount: total,
        count: amazonTxns.length,
        severity: total > 200 ? "critical" : "warning",
      });
    }

    // 5. Eating out / restaurants (non-delivery, non-grocery food)
    const eatingOutTxns = allExpenseTxns.filter((t) => {
      const cat = t.category.toLowerCase();
      const note = (t.note || "").toLowerCase();
      // Include "Eating Out" category and food that isn't grocery/delivery/coffee
      return cat === "eating out" ||
        (cat === "food" &&
          !note.includes("doordash") &&
          !note.includes("ubereats") &&
          !note.includes("uber eat") &&
          !note.includes("grubhub") &&
          !note.includes("dutch bros") &&
          !note.includes("starbucks") &&
          !note.includes("dunkin") &&
          !note.includes("7 brew") &&
          !note.includes("kroger") &&
          !note.includes("walmart") &&
          !note.includes("publix") &&
          !note.includes("costco") &&
          !note.includes("aldi") &&
          !note.includes("grocery") &&
          !note.includes("instacart"));
    });
    if (eatingOutTxns.length > 0) {
      const total = eatingOutTxns.reduce((s, t) => s + t.amount, 0);
      items.push({
        label: `Restaurants / eating out`,
        amount: total,
        count: eatingOutTxns.length,
        severity: total > 300 ? "critical" : total > 150 ? "warning" : "info",
      });
    }

    // 6. Misc / uncategorized spending
    const miscTxns = allExpenseTxns.filter((t) => t.category.toLowerCase() === "misc");
    if (miscTxns.length >= 3) {
      const total = miscTxns.reduce((s, t) => s + t.amount, 0);
      items.push({
        label: "Misc / uncategorized spending",
        amount: total,
        count: miscTxns.length,
        severity: total > 100 ? "warning" : "info",
      });
    }

    // 7. Subscriptions/recurring
    const subTxns = allExpenseTxns.filter((t) => {
      const note = (t.note || "").toLowerCase();
      return note.includes("netflix") || note.includes("hulu") || note.includes("disney") ||
        note.includes("spotify") || note.includes("apple") || note.includes("google") ||
        note.includes("microsoft") || note.includes("subscription") || note.includes("prime");
    });
    if (subTxns.length > 0) {
      const total = subTxns.reduce((s, t) => s + t.amount, 0);
      items.push({
        label: "Subscriptions (streaming, apps)",
        amount: total,
        count: subTxns.length,
        severity: total > 100 ? "warning" : "info",
      });
    }

    return items.sort((a, b) => b.amount - a.amount);
  }, [allExpenseTxns, budgetUtil]);

  // ── DEATH BY 1000 CUTS - frequent small purchases ─────────────────
  const smallPurchases = useMemo(() => {
    const merchantMap: Record<string, { total: number; count: number }> = {};
    allExpenseTxns.forEach((t) => {
      if (t.amount > 75) return; // Only count small purchases
      const merchant = cleanMerchantNote(t.note || t.category || "Unknown");
      if (!merchantMap[merchant]) merchantMap[merchant] = { total: 0, count: 0 };
      merchantMap[merchant].total += t.amount;
      merchantMap[merchant].count += 1;
    });
    return Object.entries(merchantMap)
      .filter(([, d]) => d.count >= 2)
      .map(([merchant, d]) => ({
        merchant,
        count: d.count,
        total: d.total,
        avg: d.total / d.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [allExpenseTxns]);

  // ── 7-DAY TREND ───────────────────────────────────────────────────
  const dailySpend = useMemo(() => {
    const days: { label: string; amount: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const total = pastTxns
        .filter((t) => t.type === "expense" && t.date.startsWith(key))
        .reduce((s, t) => s + t.amount, 0);
      days.push({ label: dayLabel, amount: total, isToday: i === 0 });
    }
    return days;
  }, [pastTxns]);
  const maxDaily = Math.max(...dailySpend.map((d) => d.amount), 1);
  const avgDaily = dailySpend.reduce((s, d) => s + d.amount, 0) / 7;

  // ── ALL EXPENSES ──────────────────────────────────────────────────
  const fullSpend = useMemo(() => {
    const map: Record<string, number> = {};
    allExpenseTxns.forEach((t) => {
      const k = t.note?.startsWith("Paid:") ? t.note.replace("Paid: ", "").toLowerCase() : t.category.toLowerCase();
      map[k] = (map[k] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [allExpenseTxns]);
  const maxFullSpend = fullSpend.length > 0 ? fullSpend[0][1] : 0;

  // ── DEBT SNOWBALL ─────────────────────────────────────────────────
  const debtSnowball = useMemo(() => {
    if (debts.length === 0) return null;
    const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
    const totalMin = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
    const sorted = [...debts].sort((a, b) => a.balance - b.balance);
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
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].balance <= 0 && i < remaining.length - 1) {
          remaining[i + 1].minimumPayment += remaining[i].minimumPayment;
          remaining[i].minimumPayment = 0;
        }
      }
    }
    const debtFreeDate = new Date();
    debtFreeDate.setMonth(debtFreeDate.getMonth() + months);
    return { totalDebt, totalMin, sorted, months, debtFreeDate };
  }, [debts, actualIncome, actualExpenses]);

  const navigate = (delta: number) => { impact("Light"); setCurrentMonth(shiftMonth(currentMonth, delta)); };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        <View style={s.topBar}>
          <Text style={s.logo}>CHARTS</Text>
        </View>

        {/* Mode toggle */}
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
            <Text style={s.dateRangeDash}>—</Text>
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

        {/* Calendar Modals */}
        {[
          { visible: showStartCal, onClose: () => setShowStartCal(false), selected: customStart, onSelect: (d: Date) => { setCustomStart(d); setShowStartCal(false); } },
          { visible: showEndCal, onClose: () => setShowEndCal(false), selected: customEnd, onSelect: (d: Date) => { setCustomEnd(d); setShowEndCal(false); } },
        ].map((modal, mi) => (
          <Modal key={mi} visible={modal.visible} transparent animationType="slide" onRequestClose={modal.onClose}>
            <Pressable style={cal.overlay} onPress={modal.onClose}>
              <Pressable style={cal.sheet} onPress={(e) => e.stopPropagation()}>
                <View style={cal.header}>
                  <Pressable onPress={() => setCalendarMonth((prev) => shiftMonth(prev, -1))}>
                    <ChevronLeft size={24} color={colors.white} />
                  </Pressable>
                  <Text style={cal.monthLabel}>{formatMonthLabel(calendarMonth).toUpperCase()}</Text>
                  <Pressable onPress={() => setCalendarMonth((prev) => shiftMonth(prev, 1))}>
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
                        modal.selected && day.date && day.date.toDateString() === modal.selected.toDateString() && cal.dayBtnSelected,
                      ]}
                      onPress={() => { if (day.date) modal.onSelect(day.date); }}
                      disabled={!day.isCurrentMonth}
                    >
                      <Text style={[
                        cal.dayText,
                        !day.isCurrentMonth && { color: "#333" },
                        modal.selected && day.date && day.date.toDateString() === modal.selected.toDateString() && cal.dayTextSelected,
                      ]}>
                        {day.day || ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={cal.closeBtn} onPress={modal.onClose}>
                  <Text style={cal.closeBtnText}>CANCEL</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        ))}

        {/* Custom range label */}
        {mode === "custom" && customStart && customEnd && (
          <View style={s.customLabel}>
            <Text style={s.customLabelText}>
              {formatDateShort(customStart)} — {formatDateShort(customEnd)}
            </Text>
          </View>
        )}

        {/* ── CASH FLOW ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionText}>// CASH FLOW</Text>
        </View>
        <VerticalBars income={actualIncome} expenses={actualExpenses} />

        {/* ── WASTE SCORECARD ── */}
        <View style={[s.sectionHeader, { borderTopColor: "rgba(255,0,60,0.3)", backgroundColor: "rgba(255,0,60,0.04)" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} color={colors.red} />
            <Text style={[s.sectionText, { color: colors.red }]}>// MONEY WASTED</Text>
          </View>
          {wasteItems.length > 0 && (
            <Text style={[s.sectionRight, { color: colors.red }]}>
              {formatCurrency(wasteItems.reduce((s, i) => s + i.amount, 0))}
            </Text>
          )}
        </View>
        <WasteScorecard items={wasteItems} />

        {/* ── BUDGET HEALTH ── */}
        {budgetUtil.length > 0 && (
          <>
            <View style={[s.sectionHeader, {
              borderTopColor: budgetSummary.over > 0 ? "rgba(255,0,60,0.3)" : "rgba(0,255,204,0.15)",
              backgroundColor: budgetSummary.over > 0 ? "rgba(255,0,60,0.04)" : "rgba(0,255,204,0.03)",
            }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {budgetSummary.over > 0 && <Flame size={14} color={colors.red} />}
                <Text style={[s.sectionText, { color: budgetSummary.over > 0 ? colors.red : colors.primary }]}>
                  // BUDGET VS ACTUAL
                </Text>
              </View>
            </View>
            <BudgetHealthSummary
              over={budgetSummary.over}
              onTrack={budgetSummary.onTrack}
              under={budgetSummary.under}
            />
            {budgetUtil.map((b, i) => (
              <BudgetBar
                key={b.name}
                label={b.name}
                emoji={b.emoji}
                amount={b.spent}
                max={maxBudgetBar}
                color={colors.primary}
                budget={b.budget}
                rank={i + 1}
              />
            ))}
          </>
        )}

        {/* ── SPENDING BY CATEGORY ── */}
        {catSpend.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionText}>// SPENDING BY CATEGORY</Text>
              <Text style={s.sectionRight}>{formatCurrency(catSpend.reduce((s, [, a]) => s + a, 0))}</Text>
            </View>
            {catSpend.map(([cat, amt]) => {
              // Find emoji from budget categories
              const budgetCat = currentBudget?.categories.find((c) => c.name.toLowerCase() === cat);
              return (
                <BudgetBar
                  key={cat}
                  label={cat}
                  emoji={budgetCat?.emoji}
                  amount={amt}
                  max={maxCatSpend}
                  color={colors.yellow}
                  budget={flexBudgets[cat]}
                />
              );
            })}
          </>
        )}

        {/* ── DEATH BY 1000 CUTS ── */}
        {smallPurchases.length > 0 && (
          <>
            <View style={[s.sectionHeader, { backgroundColor: "rgba(255,149,0,0.04)", borderTopColor: "rgba(255,149,0,0.3)" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TrendingUp size={14} color="#FF9500" />
                <Text style={[s.sectionText, { color: "#FF9500" }]}>// DEATH BY 1000 CUTS</Text>
              </View>
              <Text style={[s.sectionRight, { color: "#FF9500" }]}>
                {formatCurrency(smallPurchases.reduce((s, i) => s + i.total, 0))}
              </Text>
            </View>
            {/* Explainer */}
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" }}>
              <Text style={{ color: "#666", fontSize: 11, fontFamily: fonts.mono as any, letterSpacing: 0.5 }}>
                Merchants you repeatedly buy from — small amounts that add up fast
              </Text>
            </View>
            <SmallPurchasesChart items={smallPurchases} />
          </>
        )}

        {/* ── 7-DAY TREND ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionText}>// LAST 7 DAYS</Text>
          <Text style={s.sectionRight}>{formatCurrency(avgDaily)}/day avg</Text>
        </View>
        <View style={{ flexDirection: "row", paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 4, height: 140, alignItems: "flex-end" }}>
          {dailySpend.map((day, i) => {
            const pct = maxDaily > 0 ? (day.amount / maxDaily) * 100 : 0;
            const isAboveAvg = day.amount > avgDaily * 1.5 && day.amount > 0;
            const barColor = day.isToday ? colors.primary : isAboveAvg ? colors.red : colors.yellow;
            return (
              <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <Text style={{
                  color: isAboveAvg ? colors.red : day.isToday ? colors.primary : "#bbb",
                  fontSize: 10,
                  fontWeight: "800",
                  fontFamily: fonts.mono as any,
                }}>
                  {day.amount > 0 ? `$${Math.round(day.amount)}` : ""}
                </Text>
                <View style={{ flex: 1, width: "100%", backgroundColor: "#1a1a1a", justifyContent: "flex-end" }}>
                  <View style={{ height: `${Math.max(pct, 2)}%` as any, backgroundColor: barColor }} />
                </View>
                <Text style={{ color: day.isToday ? colors.primary : "#aaa", fontSize: 10, fontWeight: "700", fontFamily: fonts.mono as any }}>
                  {day.label}
                </Text>
              </View>
            );
          })}
        </View>
        {/* Avg line label */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: 8 }}>
          <Text style={{ color: "#555", fontSize: 11, fontFamily: fonts.mono as any }}>
            RED = 50%+ above your daily average
          </Text>
        </View>

        {/* ── ALL EXPENSES BREAKDOWN ── */}
        {fullSpend.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionText}>// ALL EXPENSES</Text>
              <Text style={s.sectionRight}>{formatCurrency(actualExpenses)}</Text>
            </View>
            {fullSpend.slice(0, 12).map(([cat, amt], i) => {
              const budgetCat = currentBudget?.categories.find((c) => c.name.toLowerCase() === cat);
              const isWasteful = WASTEFUL_CATEGORIES.some((wc) => cat.toLowerCase().includes(wc.toLowerCase()));
              return (
                <BudgetBar
                  key={cat}
                  label={cat}
                  emoji={budgetCat?.emoji}
                  amount={amt}
                  max={maxFullSpend}
                  color={isWasteful ? "#FF9500" : colors.red}
                  rank={i + 1}
                />
              );
            })}
          </>
        )}

        {/* ── DEBT SNOWBALL ── */}
        {debtSnowball && (() => {
          const { totalDebt, totalMin, sorted, months, debtFreeDate } = debtSnowball;
          return (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionText}>// DEBT SNOWBALL</Text>
                <Text style={[s.sectionRight, { color: colors.red }]}>{formatCurrency(totalDebt)}</Text>
              </View>

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
                        <Text style={{ color: colors.white, fontSize: 15, fontWeight: "700", fontFamily: fonts.mono as any }}>{d.name}</Text>
                        <Text style={{ color: "#aaa", fontSize: 12, fontFamily: fonts.mono as any }}>
                          min ${d.minimumPayment}/mo{d.interestRate > 0 ? `  ${d.interestRate}% APR` : ""}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,255,204,0.15)",
  },
  logo: { color: colors.primary, fontSize: 26, fontWeight: "900", letterSpacing: 8, fontFamily: fonts.heading as any },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  monthLabel: { color: colors.white, fontSize: 16, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(0,255,204,0.15)",
    backgroundColor: "rgba(0,255,204,0.03)",
    marginTop: 2,
  },
  sectionText: { color: colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 3, fontFamily: fonts.mono as any },
  sectionRight: { color: "#bbb", fontSize: 15, fontWeight: "700", fontFamily: fonts.mono as any },
  modeRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  modeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#080808",
  },
  modeBtnActive: { backgroundColor: colors.primary },
  modeBtnText: { color: "#bbb", fontSize: 13, fontWeight: "900", letterSpacing: 3, fontFamily: fonts.mono as any },
  modeBtnTextActive: { color: "#000" },
  dateRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  dateInputWrap: { flex: 1, gap: 4 },
  dateInputLabel: { color: "#bbb", fontSize: 11, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateInputText: { color: colors.white, fontSize: 16, fontWeight: "700", fontFamily: fonts.mono as any },
  dateRangeDash: { color: colors.primary, fontSize: 20, fontWeight: "900", marginTop: 18 },
  customLabel: {
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  customLabelText: { color: colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 1, fontFamily: fonts.mono as any },
});

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#050505",
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    padding: spacing.lg,
    paddingBottom: 52,
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  monthLabel: { color: colors.white, fontSize: 18, fontWeight: "900", letterSpacing: 3, fontFamily: fonts.heading as any },
  weekDays: { flexDirection: "row", justifyContent: "space-around", marginBottom: 4 },
  weekDay: { color: "#666", fontSize: 12, fontWeight: "700", width: 40, textAlign: "center", fontFamily: fonts.mono as any },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  dayBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  dayBtnActive: { backgroundColor: "transparent" },
  dayBtnSelected: { backgroundColor: colors.primary, borderRadius: 4 },
  dayText: { color: "#666", fontSize: 16, fontWeight: "700", fontFamily: fonts.mono as any },
  dayTextSelected: { color: "#000" },
  closeBtn: { backgroundColor: "#1a1a1a", padding: 14, alignItems: "center", marginTop: 8 },
  closeBtnText: { color: "#888", fontSize: 14, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any },
});
