import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Rect,
  Line,
  Circle,
  Path,
  Text as SvgText,
  G,
} from "react-native-svg";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import {
  formatCurrency,
  getMonthKey,
  shiftMonth,
  formatMonthLabel,
} from "../../src/utils";

const CHART_PADDING = spacing.md * 2;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING * 2;

const PALETTE = [
  "#00FFCC", // mint
  "#FF003C", // red
  "#FF00FF", // pink
  "#00FFFF", // cyan
  "#CCFF00", // yellow
  "#FF9500", // orange
  "#8B5CF6", // purple
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F43F5E", // rose
  "#F59E0B", // amber
  "#6366F1", // indigo
  "#EC4899", // hot pink
  "#14B8A6", // teal
  "#EF4444", // red2
  "#A855F7", // violet
  "#22D3EE", // sky
  "#84CC16", // lime
  "#F97316", // orange2
  "#06B6D4", // cyan2
];

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// --- Top Stats ---

function TopStats({
  avgDaily,
  biggestExpense,
  topCategory,
  daysLeft,
}: {
  avgDaily: number;
  biggestExpense: { amount: number; note?: string; category: string } | null;
  topCategory: { name: string; emoji: string; amount: number } | null;
  daysLeft: number;
}) {
  return (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>AVG DAILY SPEND</Text>
        <Text style={styles.statValue}>{formatCurrency(avgDaily)}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>BIGGEST EXPENSE</Text>
        <Text style={styles.statValue} numberOfLines={1}>
          {biggestExpense ? formatCurrency(biggestExpense.amount) : "\u2014"}
        </Text>
        {biggestExpense && (
          <Text style={styles.statSub} numberOfLines={1}>
            {biggestExpense.note || biggestExpense.category}
          </Text>
        )}
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>TOP CATEGORY</Text>
        <Text style={styles.statValue} numberOfLines={1}>
          {topCategory ? `${topCategory.emoji} ${topCategory.name}` : "\u2014"}
        </Text>
        {topCategory && (
          <Text style={styles.statSub}>{formatCurrency(topCategory.amount)}</Text>
        )}
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>DAYS LEFT</Text>
        <Text style={styles.statValue}>{daysLeft}</Text>
      </View>
    </View>
  );
}

// --- Spending by Category (Horizontal Bar Chart) ---

function SpendingByCategoryChart({
  data,
}: {
  data: { name: string; emoji: string; amount: number; percent: number; color: string }[];
}) {
  if (data.length === 0) return <EmptyState message="No expenses yet this month" />;

  return (
    <View style={{ gap: 8 }}>
      {data.map((item, i) => (
        <View key={`${item.name}-${i}`}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ color: colors.white, fontSize: 13, fontWeight: "600" }}>
              {item.emoji} {item.name}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              {formatCurrency(item.amount)} ({item.percent.toFixed(1)}%)
            </Text>
          </View>
          <View style={{ height: 20, backgroundColor: colors.dimmed, borderRadius: 4, overflow: "hidden" }}>
            <View
              style={{
                height: "100%",
                width: `${Math.max(item.percent, 1)}%`,
                backgroundColor: item.color,
                borderRadius: 4,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// --- Monthly Spending Trend (Vertical Bar Chart) ---

function MonthlySpendingTrend({
  data,
}: {
  data: { label: string; total: number; isCurrent: boolean }[];
}) {
  if (data.length === 0 || data.every((d) => d.total === 0))
    return <EmptyState message="No spending history yet" />;

  const maxVal = Math.max(...data.map((d) => d.total), 1);

  return (
    <View style={{ gap: 8 }}>
      {data.map((item, i) => (
        <View key={`${item.label}-${i}`}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ color: item.isCurrent ? colors.primary : colors.white, fontSize: 13, fontWeight: item.isCurrent ? "700" : "500" }}>
              {item.label}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              {formatCurrency(item.total)}
            </Text>
          </View>
          <View style={{ height: 24, backgroundColor: colors.dimmed, borderRadius: 6, overflow: "hidden" }}>
            <View
              style={{
                height: "100%",
                width: `${(item.total / maxVal) * 100}%`,
                backgroundColor: item.isCurrent ? colors.primary : colors.primaryDark,
                borderRadius: 6,
                opacity: item.isCurrent ? 1 : 0.6,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// --- Top Merchants ---

function TopMerchants({
  data,
}: {
  data: { name: string; amount: number; count: number }[];
}) {
  if (data.length === 0) return <EmptyState message="No merchant data available" />;

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <View style={{ gap: 6 }}>
      {data.map((item, i) => (
        <View key={`${item.name}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, width: 20, textAlign: "right" }}>
            {i + 1}.
          </Text>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {formatCurrency(item.amount)} ({item.count}x)
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.dimmed, borderRadius: 3, overflow: "hidden" }}>
              <View
                style={{
                  height: "100%",
                  width: `${(item.amount / maxAmount) * 100}%`,
                  backgroundColor: PALETTE[i % PALETTE.length],
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// --- Income vs Expenses ---

function IncomeVsExpenses({
  income,
  expenses,
}: {
  income: number;
  expenses: number;
}) {
  const maxVal = Math.max(income, expenses, 1);
  const net = income - expenses;
  const isPositive = net >= 0;

  return (
    <View style={{ gap: 12 }}>
      {/* Income bar */}
      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>
            💰 Income
          </Text>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>
            {formatCurrency(income)}
          </Text>
        </View>
        <View style={{ height: 28, backgroundColor: colors.dimmed, borderRadius: 6, overflow: "hidden" }}>
          <View
            style={{
              height: "100%",
              width: `${(income / maxVal) * 100}%`,
              backgroundColor: colors.primary,
              borderRadius: 6,
              opacity: 0.8,
            }}
          />
        </View>
      </View>

      {/* Expenses bar */}
      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ color: colors.red, fontSize: 14, fontWeight: "700" }}>
            💸 Expenses
          </Text>
          <Text style={{ color: colors.red, fontSize: 14, fontWeight: "700" }}>
            {formatCurrency(expenses)}
          </Text>
        </View>
        <View style={{ height: 28, backgroundColor: colors.dimmed, borderRadius: 6, overflow: "hidden" }}>
          <View
            style={{
              height: "100%",
              width: `${(expenses / maxVal) * 100}%`,
              backgroundColor: colors.red,
              borderRadius: 6,
              opacity: 0.8,
            }}
          />
        </View>
      </View>

      {/* Net */}
      <View style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.cardBorder,
      }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "600" }}>
          Net {isPositive ? "Surplus" : "Deficit"}
        </Text>
        <Text style={{ color: isPositive ? colors.primary : colors.red, fontSize: 16, fontWeight: "800" }}>
          {isPositive ? "+" : ""}{formatCurrency(net)}
        </Text>
      </View>
    </View>
  );
}

// --- Daily Spending Trend (Line Chart) ---

function DailySpendingChart({
  dailyData,
  daysInMonth,
}: {
  dailyData: number[];
  daysInMonth: number;
}) {
  const hasData = dailyData.some((d) => d > 0);
  if (!hasData) return <EmptyState message="No spending data yet" />;

  const chartH = 180;
  const padTop = 20;
  const padBottom = 30;
  const padLeft = 50;
  const padRight = 10;
  const plotW = CHART_WIDTH - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxVal = Math.max(...dailyData, 1);
  const gridLines = 4;

  const points = dailyData.map((val, i) => ({
    x: padLeft + (i / Math.max(daysInMonth - 1, 1)) * plotW,
    y: padTop + plotH - (val / maxVal) * plotH,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <Svg width={CHART_WIDTH} height={chartH}>
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padTop + (i / gridLines) * plotH;
        const val = maxVal - (i / gridLines) * maxVal;
        return (
          <G key={`grid-${i}`}>
            <Line
              x1={padLeft}
              y1={y}
              x2={CHART_WIDTH - padRight}
              y2={y}
              stroke={colors.cardBorder}
              strokeWidth={1}
            />
            <SvgText
              x={padLeft - 6}
              y={y + 4}
              fill={colors.textSecondary}
              fontSize={10}
              textAnchor="end"
            >
              ${Math.round(val)}
            </SvgText>
          </G>
        );
      })}

      {[1, Math.ceil(daysInMonth / 4), Math.ceil(daysInMonth / 2), Math.ceil((daysInMonth * 3) / 4), daysInMonth].map(
        (day) => {
          const idx = day - 1;
          if (idx >= daysInMonth) return null;
          const x = padLeft + (idx / Math.max(daysInMonth - 1, 1)) * plotW;
          return (
            <SvgText
              key={`xlabel-${day}`}
              x={x}
              y={chartH - 5}
              fill={colors.textSecondary}
              fontSize={10}
              textAnchor="middle"
            >
              {day}
            </SvgText>
          );
        }
      )}

      <Path d={linePath} stroke={colors.primary} strokeWidth={2} fill="none" />

      {points.map(
        (p, i) =>
          dailyData[i] > 0 && (
            <Circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={colors.primary}
            />
          )
      )}
    </Svg>
  );
}

// --- Budget vs Actual ---

function BudgetVsActualChart({
  data,
}: {
  data: { name: string; emoji: string; allocated: number; spent: number }[];
}) {
  if (data.length === 0) return <EmptyState message="No budget categories set up" />;

  return (
    <View style={{ gap: 8 }}>
      {data.slice(0, 10).map((item, i) => {
        const pctSpent = item.allocated > 0 ? (item.spent / item.allocated) * 100 : 0;
        const isOver = item.spent > item.allocated;
        const barPct = Math.min(pctSpent, 100);
        return (
          <View key={`${item.name}-${i}`}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: "600" }}>
                {item.emoji} {item.name}
              </Text>
              <Text style={{ color: isOver ? colors.red : colors.textSecondary, fontSize: 12 }}>
                {formatCurrency(item.spent)} / {formatCurrency(item.allocated)}
              </Text>
            </View>
            <View style={{ height: 12, backgroundColor: colors.dimmed, borderRadius: 4, overflow: "hidden" }}>
              <View
                style={{
                  height: "100%",
                  width: `${Math.max(barPct, 1)}%`,
                  backgroundColor: isOver ? colors.red : colors.primary,
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// --- ChartLegend ---

function ChartLegend({
  items,
}: {
  items: { color: string; label: string }[];
}) {
  return (
    <View style={styles.legendRow}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// --- Main Screen ---

export default function InsightsScreen() {
  const { transactions, currentBudget, currentMonth } = useApp();

  const monthExpenses = useMemo(
    () =>
      transactions.filter(
        (t) => t.date.startsWith(currentMonth) && t.type === "expense"
      ),
    [transactions, currentMonth]
  );

  const monthIncome = useMemo(
    () =>
      transactions.filter(
        (t) => t.date.startsWith(currentMonth) && t.type === "income"
      ),
    [transactions, currentMonth]
  );

  // Top Stats
  const topStatsData = useMemo(() => {
    const now = new Date();
    const [y, m] = currentMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = now.getFullYear() === y && now.getMonth() + 1 === m ? now.getDate() : daysInMonth;
    const daysLeft = Math.max(daysInMonth - today, 0);
    const totalSpent = monthExpenses.reduce((s, t) => s + t.amount, 0);
    const avgDaily = today > 0 ? totalSpent / today : 0;

    const biggest =
      monthExpenses.length > 0
        ? monthExpenses.reduce((max, t) => (t.amount > max.amount ? t : max), monthExpenses[0])
        : null;

    const catMap: Record<string, { amount: number; name: string; emoji: string }> = {};
    monthExpenses.forEach((t) => {
      const key = t.category;
      if (!catMap[key]) {
        catMap[key] = { amount: 0, name: key, emoji: "📦" };
      }
      catMap[key].amount += t.amount;
    });
    // Try to match budget category for emoji
    if (currentBudget) {
      currentBudget.categories.forEach((bc) => {
        const key = bc.name;
        if (catMap[key]) {
          catMap[key].emoji = bc.emoji;
          catMap[key].name = bc.name;
        }
      });
    }
    const topCatEntry = Object.values(catMap).sort((a, b) => b.amount - a.amount)[0];

    return { avgDaily, biggest, topCategory: topCatEntry || null, daysLeft };
  }, [monthExpenses, currentMonth, currentBudget]);

  // Spending by Category
  const categorySpending = useMemo(() => {
    const map: Record<string, { amount: number; name: string; emoji: string }> = {};
    monthExpenses.forEach((t) => {
      const key = t.category;
      if (!map[key]) {
        map[key] = { amount: 0, name: key, emoji: "📦" };
      }
      map[key].amount += t.amount;
    });
    // Match budget category emojis
    if (currentBudget) {
      currentBudget.categories.forEach((bc) => {
        if (map[bc.name]) {
          map[bc.name].emoji = bc.emoji;
        }
      });
    }
    const total = Object.values(map).reduce((s, v) => s + v.amount, 0);
    return Object.values(map)
      .map((item, i) => ({
        ...item,
        percent: total > 0 ? (item.amount / total) * 100 : 0,
        color: PALETTE[i % PALETTE.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses, currentBudget]);

  // Daily Spending
  const { dailyData, daysInMonth } = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    const daily = new Array(dim).fill(0);
    monthExpenses.forEach((t) => {
      const day = parseInt(t.date.split("-")[2], 10);
      if (day >= 1 && day <= dim) daily[day - 1] += t.amount;
    });
    return { dailyData: daily, daysInMonth: dim };
  }, [monthExpenses, currentMonth]);

  // Monthly Spending Trend (Dec, Jan, Feb, Mar or relative to current)
  const monthlyTrend = useMemo(() => {
    const months = [
      shiftMonth(currentMonth, -3),
      shiftMonth(currentMonth, -2),
      shiftMonth(currentMonth, -1),
      currentMonth,
    ];
    return months.map((mk) => {
      const total = transactions
        .filter((t) => t.date.startsWith(mk) && t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
      const label = formatMonthLabel(mk).split(" ")[0];
      return { label, total, isCurrent: mk === currentMonth };
    });
  }, [transactions, currentMonth]);

  // Top Merchants (parse from note field)
  const topMerchants = useMemo(() => {
    const merchantMap: Record<string, { amount: number; count: number }> = {};
    monthExpenses.forEach((t) => {
      const name = (t.note || t.category || "Unknown").trim();
      if (!name) return;
      if (!merchantMap[name]) {
        merchantMap[name] = { amount: 0, count: 0 };
      }
      merchantMap[name].amount += t.amount;
      merchantMap[name].count += 1;
    });
    return Object.entries(merchantMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [monthExpenses]);

  // Income vs Expenses
  const incomeTotal = useMemo(
    () => monthIncome.reduce((s, t) => s + t.amount, 0),
    [monthIncome]
  );
  const expenseTotal = useMemo(
    () => monthExpenses.reduce((s, t) => s + t.amount, 0),
    [monthExpenses]
  );

  // Budget vs Actual
  const budgetVsActual = useMemo(() => {
    if (!currentBudget) return [];
    const spentMap: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      const key = t.category;
      spentMap[key] = (spentMap[key] || 0) + t.amount;
    });
    return currentBudget.categories.map((cat) => ({
      name: cat.name,
      emoji: cat.emoji,
      allocated: cat.allocated,
      spent: spentMap[cat.name] || 0,
    }));
  }, [currentBudget, monthExpenses]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Insights</Text>

        {/* Top Stats */}
        <TopStats
          avgDaily={topStatsData.avgDaily}
          biggestExpense={topStatsData.biggest}
          topCategory={topStatsData.topCategory}
          daysLeft={topStatsData.daysLeft}
        />

        {/* Income vs Expenses */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Income vs Expenses</Text>
          <IncomeVsExpenses income={incomeTotal} expenses={expenseTotal} />
        </View>

        {/* Spending by Category */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending by Category</Text>
          <SpendingByCategoryChart data={categorySpending} />
        </View>

        {/* Monthly Spending Trend */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Monthly Spending Trend</Text>
          <MonthlySpendingTrend data={monthlyTrend} />
        </View>

        {/* Top Merchants */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Top Merchants</Text>
          <TopMerchants data={topMerchants} />
        </View>

        {/* Daily Spending */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Spending</Text>
          <DailySpendingChart dailyData={dailyData} daysInMonth={daysInMonth} />
        </View>

        {/* Budget vs Actual */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Budget vs Actual</Text>
          <ChartLegend
            items={[
              { color: colors.primary, label: "On Track" },
              { color: colors.red, label: "Over Budget" },
            ]}
          />
          <BudgetVsActualChart data={budgetVsActual} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  header: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    letterSpacing: -0.5,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  statValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  statSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  // Chart cards
  chartCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  chartTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },

  // Legend
  legendRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  // Empty state
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
