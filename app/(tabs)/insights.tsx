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
import { EXPENSE_CATEGORIES } from "../../src/types";

const CHART_PADDING = spacing.md * 2;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING * 2;

const CATEGORY_COLORS: Record<string, string> = {
  food: "#FF9500",
  shopping: "#FF00FF",
  transport: "#00FFFF",
  bills: "#FF003C",
  fun: "#CCFF00",
  health: "#00FFCC",
  other: "#707070",
};

function getCategoryColor(categoryId: string): string {
  return CATEGORY_COLORS[categoryId] || colors.primary;
}

function getCategoryMeta(name: string) {
  const lower = name.toLowerCase();
  const found = EXPENSE_CATEGORIES.find((c) => c.id === lower || c.name.toLowerCase() === lower);
  return found || { id: lower, name, emoji: "\uD83D\uDCE6" };
}

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
          {topCategory ? topCategory.name : "\u2014"}
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

// --- Spending by Category (Horizontal Bar) ---

function SpendingByCategoryChart({
  data,
}: {
  data: { id: string; name: string; emoji: string; amount: number }[];
}) {
  if (data.length === 0) return <EmptyState message="No expenses yet this month" />;

  const maxAmount = Math.max(...data.map((d) => d.amount));
  const barHeight = 28;
  const rowGap = 10;
  const leftLabelWidth = 100;
  const rightLabelWidth = 70;
  const barAreaWidth = CHART_WIDTH - leftLabelWidth - rightLabelWidth;
  const chartHeight = data.length * (barHeight + rowGap) - rowGap + 10;

  return (
    <Svg width={CHART_WIDTH} height={chartHeight}>
      {data.map((item, i) => {
        const y = i * (barHeight + rowGap);
        const barW = maxAmount > 0 ? (item.amount / maxAmount) * barAreaWidth : 0;
        return (
          <G key={item.id}>
            <SvgText
              x={0}
              y={y + barHeight / 2 + 5}
              fill={colors.white}
              fontSize={12}
              fontWeight="600"
            >
              {item.name}
            </SvgText>
            <Rect
              x={leftLabelWidth}
              y={y + 2}
              width={Math.max(barW, 2)}
              height={barHeight - 4}
              rx={4}
              fill={getCategoryColor(item.id)}
            />
            <SvgText
              x={CHART_WIDTH}
              y={y + barHeight / 2 + 5}
              fill={colors.textSecondary}
              fontSize={12}
              fontWeight="600"
              textAnchor="end"
            >
              {formatCurrency(item.amount)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
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
      {/* Grid lines */}
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

      {/* X-axis labels */}
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

      {/* Line */}
      <Path d={linePath} stroke={colors.primary} strokeWidth={2} fill="none" />

      {/* Dots on non-zero days */}
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

  const chartH = 200;
  const padTop = 20;
  const padBottom = 40;
  const padLeft = 10;
  const padRight = 10;
  const plotW = CHART_WIDTH - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxVal = Math.max(...data.flatMap((d) => [d.allocated, d.spent]), 1);
  const groupWidth = plotW / data.length;
  const barWidth = Math.min(groupWidth * 0.3, 24);
  const barGap = 4;

  const gridLines = 4;

  return (
    <Svg width={CHART_WIDTH} height={chartH}>
      {/* Grid lines */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padTop + (i / gridLines) * plotH;
        return (
          <Line
            key={`grid-${i}`}
            x1={padLeft}
            y1={y}
            x2={CHART_WIDTH - padRight}
            y2={y}
            stroke={colors.cardBorder}
            strokeWidth={1}
          />
        );
      })}

      {data.map((item, i) => {
        const centerX = padLeft + groupWidth * i + groupWidth / 2;
        const allocH = (item.allocated / maxVal) * plotH;
        const spentH = (item.spent / maxVal) * plotH;
        const isOver = item.spent > item.allocated;

        return (
          <G key={`group-${i}`}>
            {/* Allocated bar */}
            <Rect
              x={centerX - barWidth - barGap / 2}
              y={padTop + plotH - allocH}
              width={barWidth}
              height={allocH}
              rx={4}
              fill={colors.textSecondary}
              opacity={0.4}
            />
            {/* Spent bar */}
            <Rect
              x={centerX + barGap / 2}
              y={padTop + plotH - spentH}
              width={barWidth}
              height={spentH}
              rx={4}
              fill={isOver ? colors.red : colors.primary}
            />
            {/* Label */}
            <SvgText
              x={centerX}
              y={chartH - 8}
              fill={colors.textSecondary}
              fontSize={10}
              textAnchor="middle"
            >
              {item.emoji}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// --- Monthly Comparison ---

function MonthlyComparisonChart({
  data,
}: {
  data: { label: string; total: number }[];
}) {
  if (data.length === 0 || data.every((d) => d.total === 0))
    return <EmptyState message="No spending history yet" />;

  const chartH = 180;
  const padTop = 20;
  const padBottom = 40;
  const padLeft = 50;
  const padRight = 10;
  const plotW = CHART_WIDTH - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const barWidth = Math.min(plotW / data.length * 0.5, 48);
  const gridLines = 4;

  return (
    <Svg width={CHART_WIDTH} height={chartH}>
      {/* Grid lines */}
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

      {data.map((item, i) => {
        const groupW = plotW / data.length;
        const centerX = padLeft + groupW * i + groupW / 2;
        const barH = (item.total / maxVal) * plotH;

        return (
          <G key={`month-${i}`}>
            <Rect
              x={centerX - barWidth / 2}
              y={padTop + plotH - barH}
              width={barWidth}
              height={barH}
              rx={6}
              fill={colors.primary}
              opacity={0.4 + (i / data.length) * 0.6}
            />
            <SvgText
              x={centerX}
              y={chartH - 10}
              fill={colors.textSecondary}
              fontSize={10}
              textAnchor="middle"
              fontWeight="600"
            >
              {item.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// --- Legend ---

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

  // Top Stats
  const topStatsData = useMemo(() => {
    const now = new Date();
    const [y, m] = currentMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = now.getFullYear() === y && now.getMonth() + 1 === m ? now.getDate() : daysInMonth;
    const daysLeft = daysInMonth - today;
    const totalSpent = monthExpenses.reduce((s, t) => s + t.amount, 0);
    const avgDaily = today > 0 ? totalSpent / today : 0;

    const biggest =
      monthExpenses.length > 0
        ? monthExpenses.reduce((max, t) => (t.amount > max.amount ? t : max), monthExpenses[0])
        : null;

    // Top category
    const catMap: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      const key = t.category.toLowerCase();
      catMap[key] = (catMap[key] || 0) + t.amount;
    });
    const topCatEntry = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    const topCategory = topCatEntry
      ? { ...getCategoryMeta(topCatEntry[0]), amount: topCatEntry[1] }
      : null;

    return { avgDaily, biggest, topCategory, daysLeft };
  }, [monthExpenses, currentMonth]);

  // Spending by Category
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      const key = t.category.toLowerCase();
      map[key] = (map[key] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([key, amount]) => {
        const meta = getCategoryMeta(key);
        return { id: meta.id, name: meta.name, emoji: meta.emoji, amount };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

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

  // Budget vs Actual
  const budgetVsActual = useMemo(() => {
    if (!currentBudget) return [];
    const spentMap: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      const key = t.category.toLowerCase();
      spentMap[key] = (spentMap[key] || 0) + t.amount;
    });
    return currentBudget.categories.map((cat) => ({
      name: cat.name,
      emoji: cat.emoji,
      allocated: cat.allocated,
      spent: spentMap[cat.name.toLowerCase()] || 0,
    }));
  }, [currentBudget, monthExpenses]);

  // Monthly Comparison (last 3 months)
  const monthlyComparison = useMemo(() => {
    const months = [
      shiftMonth(currentMonth, -2),
      shiftMonth(currentMonth, -1),
      currentMonth,
    ];
    return months.map((mk) => {
      const total = transactions
        .filter((t) => t.date.startsWith(mk) && t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
      const label = formatMonthLabel(mk).split(" ")[0]; // just the month name
      return { label, total };
    });
  }, [transactions, currentMonth]);

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

        {/* Spending by Category */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending by Category</Text>
          <SpendingByCategoryChart data={categorySpending} />
        </View>

        {/* Daily Spending Trend */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Spending</Text>
          <DailySpendingChart dailyData={dailyData} daysInMonth={daysInMonth} />
        </View>

        {/* Budget vs Actual */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Budget vs Actual</Text>
          <ChartLegend
            items={[
              { color: colors.textSecondary, label: "Budget" },
              { color: colors.primary, label: "Spent" },
              { color: colors.red, label: "Over" },
            ]}
          />
          <BudgetVsActualChart data={budgetVsActual} />
        </View>

        {/* Monthly Comparison */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Monthly Comparison</Text>
          <MonthlyComparisonChart data={monthlyComparison} />
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
