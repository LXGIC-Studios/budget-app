import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
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
  "#00FFCC", "#FF003C", "#FF00FF", "#00FFFF", "#CCFF00",
  "#FF9500", "#8B5CF6", "#3B82F6", "#10B981", "#F43F5E",
  "#F59E0B", "#6366F1", "#EC4899", "#14B8A6", "#EF4444",
  "#A855F7", "#22D3EE", "#84CC16", "#F97316", "#06B6D4",
];

// --- Text glow for key numbers ---
const CYBER_GLOW = [
  { textShadowColor: 'rgba(0,255,204,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
];

const RED_GLOW = [
  { textShadowColor: 'rgba(255,0,60,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
];

// --- Merchant name cleaning ---

function cleanMerchantName(note: string): string {
  let n = (note || "").trim();
  // Strip "Card Purchase" prefix
  n = n.replace(/^Card Purchase\s+/i, "");
  // Strip "With Pin" prefix
  n = n.replace(/^With Pin\s+/i, "");
  // Strip "Dd *" / "DD *" / "Dd*" prefix (DoorDash)
  n = n.replace(/^[Dd]{2}\s*\*\s*/i, "");
  // Strip "SQ *" prefix (Square)
  n = n.replace(/^SQ\s*\*\s*/i, "");
  // Strip "TST*" prefix (Toast)
  n = n.replace(/^TST\s*\*\s*/i, "");
  // Strip "SPO*" prefix
  n = n.replace(/^SPO\s*\*\s*/i, "");
  // Strip store/warehouse numbers like "#1659", "Whse #1659", "Store #123"
  n = n.replace(/\s+(Whse|Store|Str|Ste)\s*#?\s*\d+/i, "");
  n = n.replace(/\s*#\d+\s*$/, "");
  // Strip trailing city/state like "Hendersonvill TN" or "Nashville TN" or "Amzn.Com/Bill WA"
  // Match: 2+ letter word followed by 2-letter state code at end
  n = n.replace(/\s+[A-Z][a-zA-Z.*\/]+\s+[A-Z]{2}$/, "");
  // Strip trailing lone state code
  n = n.replace(/\s+[A-Z]{2}$/, "");
  // Clean up known brand names
  const lower = n.toLowerCase();
  if (lower.includes("doordash")) n = "DoorDash";
  else if (lower.includes("costco")) n = "Costco";
  else if (lower.includes("walmart")) n = "Walmart";
  else if (lower.includes("kroger")) n = "Kroger";
  else if (lower.includes("target")) n = "Target";
  else if (lower.includes("amazon") || lower.includes("amzn")) n = "Amazon";
  else if (lower.includes("starbucks")) n = "Starbucks";
  else if (lower.includes("publix")) n = "Publix";
  else if (lower.includes("instacart")) n = "Instacart";
  else if (lower.includes("uber eat")) n = "Uber Eats";
  else if (lower.includes("grubhub")) n = "Grubhub";
  else if (lower.includes("dunkin")) n = "Dunkin'";
  else if (lower.includes("chick-fil-a") || lower.includes("chickfila")) n = "Chick-fil-A";
  return n.trim() || note;
}

// --- Food subcategory classification ---

const GROCERY_KEYWORDS = [
  "kroger", "walmart", "publix", "aldi", "costco", "sam's club", "target",
  "whole foods", "trader joe", "piggly", "food lion", "safeway", "heb",
  "meijer", "winco", "sprouts", "grocery", "instacart", "cash saver",
  "bread box",
];

const DELIVERY_KEYWORDS = [
  "doordash", "dd *doordash", "dd *door", "ubereats", "uber eat",
  "grubhub", "postmates", "dashpass", "doordash*",
];

const COFFEE_KEYWORDS = [
  "dutch bros", "dutchbros", "starbucks", "dunkin", "7 brew",
  "kaveexpress", "peet's", "spo*kaveexpress",
];

type FoodSubcategory = "groceries" | "delivery" | "coffee" | "restaurants";

function classifyFood(note: string): FoodSubcategory {
  const lower = (note || "").toLowerCase();
  if (DELIVERY_KEYWORDS.some((kw) => lower.includes(kw))) return "delivery";
  if (GROCERY_KEYWORDS.some((kw) => lower.includes(kw))) return "groceries";
  if (COFFEE_KEYWORDS.some((kw) => lower.includes(kw))) return "coffee";
  return "restaurants";
}

/** Check if a shopping transaction is actually groceries */
function isGroceryMerchant(note: string): boolean {
  const lower = (note || "").toLowerCase();
  return GROCERY_KEYWORDS.some((kw) => lower.includes(kw));
}

const FOOD_SUB_CONFIG: Record<FoodSubcategory, { label: string; emoji: string; color: string }> = {
  groceries:   { label: "Groceries",   emoji: "\u{1F6D2}", color: "#10B981" },
  delivery:    { label: "Delivery",    emoji: "\u{1F4F1}", color: "#FF9500" },
  coffee:      { label: "Coffee",      emoji: "\u{2615}",  color: "#8B5CF6" },
  restaurants: { label: "Restaurants",  emoji: "\u{1F37D}\u{FE0F}",  color: "#F43F5E" },
};

// --- Category config with colors & emojis ---

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  food:      { label: "Food",      emoji: "\u{1F354}", color: "#FF9500" },
  shopping:  { label: "Shopping",  emoji: "\u{1F6D2}", color: "#FF00FF" },
  bills:     { label: "Bills",     emoji: "\u{1F3E0}", color: "#3B82F6" },
  transport: { label: "Transport", emoji: "\u{1F697}", color: "#CCFF00" },
  transfer:  { label: "Transfer",  emoji: "\u{1F3E6}", color: "#00FFFF" },
  other:     { label: "Other",     emoji: "\u{1F4E6}", color: "#707070" },
  fun:       { label: "Fun",       emoji: "\u{1F3AE}", color: "#EC4899" },
  health:    { label: "Health",    emoji: "\u{1F48A}", color: "#14B8A6" },
};

function getCatConfig(cat: string) {
  return CATEGORY_CONFIG[cat] || { label: cat, emoji: "\u{1F4E6}", color: "#707070" };
}

// --- Helpers ---

function normalizeDate(date: string): string {
  return date.replace(/\//, "-");
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

// --- Components ---

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.chartTitle}>{title.toUpperCase()}</Text>
      {subtitle && <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{subtitle}</Text>}
    </View>
  );
}

// --- Delta Badge ---

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const isUp = value > 0;
  const arrow = isUp ? "\u2191" : "\u2193";
  const color = isUp ? colors.red : colors.primary;
  return (
    <Text style={{ color, fontSize: 10, fontWeight: "700" }}>
      {arrow}{Math.abs(value).toFixed(0)}%
    </Text>
  );
}

// --- Top Stats ---

function TopStats({
  avgDaily,
  biggestExpense,
  topCategory,
  daysLeft,
  projectedTotal,
  lastMonthTotal,
}: {
  avgDaily: number;
  biggestExpense: { amount: number; note?: string; category: string } | null;
  topCategory: { name: string; emoji: string; amount: number } | null;
  daysLeft: number;
  projectedTotal: number;
  lastMonthTotal: number;
}) {
  const delta = pctChange(projectedTotal, lastMonthTotal);
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
            {cleanMerchantName(biggestExpense.note || biggestExpense.category)}
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
        <Text style={styles.statLabel}>PROJECTED TOTAL</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={styles.statValue}>{formatCurrency(projectedTotal)}</Text>
          <DeltaBadge value={delta} />
        </View>
        <Text style={styles.statSub}>{daysLeft} days left</Text>
      </View>
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
      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700", letterSpacing: 2 }}>
            INCOME
          </Text>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "800", letterSpacing: -0.5, textShadowColor: 'rgba(0,255,204,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}>
            {formatCurrency(income)}
          </Text>
        </View>
        <View style={{ height: 28, backgroundColor: colors.dimmed, borderRadius: 2, overflow: "hidden" }}>
          <View
            style={{
              height: "100%",
              width: `${(income / maxVal) * 100}%`,
              backgroundColor: colors.primary,
              borderRadius: 2,
              opacity: 0.8,
            }}
          />
        </View>
      </View>

      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ color: colors.red, fontSize: 14, fontWeight: "700", letterSpacing: 2 }}>
            EXPENSES
          </Text>
          <Text style={{ color: colors.red, fontSize: 15, fontWeight: "800", letterSpacing: -0.5, textShadowColor: 'rgba(255,0,60,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}>
            {formatCurrency(expenses)}
          </Text>
        </View>
        <View style={{ height: 28, backgroundColor: colors.dimmed, borderRadius: 2, overflow: "hidden" }}>
          <View
            style={{
              height: "100%",
              width: `${(expenses / maxVal) * 100}%`,
              backgroundColor: colors.red,
              borderRadius: 2,
            }}
          />
        </View>
      </View>

      <View style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.cardBorder,
      }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "600", letterSpacing: 2 }}>
          {isPositive ? "NET SURPLUS" : "NET DEFICIT"}
        </Text>
        <Text style={{
          color: isPositive ? colors.primary : colors.red,
          fontSize: 18,
          fontWeight: "800",
          letterSpacing: -0.5,
          textShadowColor: isPositive ? 'rgba(0,255,204,0.3)' : 'rgba(255,0,60,0.3)',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        }}>
          {isPositive ? "+" : ""}{formatCurrency(net)}
        </Text>
      </View>
    </View>
  );
}

// --- Monthly Income vs Expenses Comparison ---

function MonthlyIncomeExpenseChart({
  data,
}: {
  data: { label: string; income: number; expenses: number; isCurrent: boolean }[];
}) {
  if (data.length === 0) return <EmptyState message="No data yet" />;

  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expenses]), 1);

  return (
    <View style={{ gap: 14 }}>
      {data.map((item, i) => {
        const net = item.income - item.expenses;
        const isPositive = net >= 0;
        return (
          <View key={`${item.label}-${i}`} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{
                color: item.isCurrent ? colors.primary : colors.white,
                fontSize: 13,
                fontWeight: item.isCurrent ? "700" : "500",
                letterSpacing: 2,
              }}>
                {item.label.toUpperCase()}
              </Text>
              <Text style={{
                color: isPositive ? colors.primary : colors.red,
                fontSize: 13,
                fontWeight: "700",
                letterSpacing: -0.5,
              }}>
                {isPositive ? "+" : ""}{formatCurrency(net)}
              </Text>
            </View>
            {/* Income bar */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, width: 12, letterSpacing: 1, textTransform: "uppercase" }}>IN</Text>
              <View style={{ flex: 1, height: 14, backgroundColor: colors.dimmed, borderRadius: 2, overflow: "hidden" }}>
                <View style={{
                  height: "100%",
                  width: `${(item.income / maxVal) * 100}%`,
                  backgroundColor: colors.primary,
                  borderRadius: 2,
                  opacity: item.isCurrent ? 0.9 : 0.5,
                }} />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 10, width: 62, textAlign: "right", fontWeight: "700", letterSpacing: -0.5 }}>
                {formatCurrency(item.income)}
              </Text>
            </View>
            {/* Expense bar */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, width: 12, letterSpacing: 1, textTransform: "uppercase" }}>EX</Text>
              <View style={{ flex: 1, height: 14, backgroundColor: colors.dimmed, borderRadius: 2, overflow: "hidden" }}>
                <View style={{
                  height: "100%",
                  width: `${(item.expenses / maxVal) * 100}%`,
                  backgroundColor: colors.red,
                  borderRadius: 2,
                  opacity: item.isCurrent ? 0.9 : 0.5,
                }} />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 10, width: 62, textAlign: "right", fontWeight: "700", letterSpacing: -0.5 }}>
                {formatCurrency(item.expenses)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// --- Food Breakdown Chart ---

function FoodBreakdownChart({
  data,
  total,
}: {
  data: { subcategory: FoodSubcategory; amount: number; count: number; topMerchant: string }[];
  total: number;
}) {
  if (data.length === 0 || total === 0) return <EmptyState message="No food spending this month" />;

  return (
    <View style={{ gap: 10 }}>
      {/* Donut-style summary row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 2,
          borderWidth: 3,
          borderColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
          padding: 8,
        }}>
          <Text style={{
            color: colors.white,
            fontSize: 28,
            fontWeight: "800",
            textShadowColor: 'rgba(0,255,204,0.3)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 8,
          }} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(total).replace(".00", "")}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, letterSpacing: 2 }}>TOTAL</Text>
        </View>
        <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {data.map((item) => {
            const cfg = FOOD_SUB_CONFIG[item.subcategory];
            const pct = ((item.amount / total) * 100).toFixed(0);
            return (
              <View key={item.subcategory} style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: cfg.color,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 2,
                borderWidth: 1,
                borderColor: cfg.color + "40",
              }}>
                <Text style={{ color: '#050505', fontSize: 11, fontWeight: "600" }}>
                  {cfg.label} {pct}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Detailed bars */}
      {data.map((item) => {
        const cfg = FOOD_SUB_CONFIG[item.subcategory];
        const pct = (item.amount / total) * 100;
        return (
          <View key={item.subcategory}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: "600", letterSpacing: 2 }}>
                {cfg.emoji} {cfg.label.toUpperCase()}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: -0.5 }}>
                {formatCurrency(item.amount)} ({item.count}x)
              </Text>
            </View>
            <View style={{ height: 20, backgroundColor: colors.dimmed, borderRadius: 2, overflow: "hidden" }}>
              <View style={{
                height: "100%",
                width: `${Math.max(pct, 5)}%`,
                minWidth: 20,
                backgroundColor: cfg.color,
                borderRadius: 2,
              }} />
            </View>
            {item.topMerchant && (
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 }}>
                Top: {cleanMerchantName(item.topMerchant)}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// --- Shopping Breakdown ---

function ShoppingBreakdownChart({
  groceryAmount,
  groceryCount,
  retailAmount,
  retailCount,
  topGrocery,
  topRetail,
}: {
  groceryAmount: number;
  groceryCount: number;
  retailAmount: number;
  retailCount: number;
  topGrocery: string;
  topRetail: string;
}) {
  const total = groceryAmount + retailAmount;
  if (total === 0) return <EmptyState message="No shopping this month" />;

  const groceryPct = (groceryAmount / total) * 100;
  const retailPct = (retailAmount / total) * 100;

  return (
    <View style={{ gap: 10 }}>
      {/* Stacked bar */}
      <View style={{ height: 28, borderRadius: 2, overflow: "hidden", flexDirection: "row" }}>
        {groceryAmount > 0 && (
          <View style={{ width: `${groceryPct}%`, height: "100%", backgroundColor: "#10B981" }} />
        )}
        {retailAmount > 0 && (
          <View style={{ width: `${retailPct}%`, height: "100%", backgroundColor: "#FF00FF" }} />
        )}
      </View>

      {/* Legend pills */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: "#10B981" }} />
          <Text style={{ color: colors.white, fontSize: 11, fontWeight: "600" }}>
            Groceries {groceryPct.toFixed(0)}%
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: "#FF00FF" }} />
          <Text style={{ color: colors.white, fontSize: 11, fontWeight: "600" }}>
            Retail {retailPct.toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* Grocery row */}
      {groceryAmount > 0 && (
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
            <Text style={{ color: colors.white, fontSize: 13, fontWeight: "600", letterSpacing: 2 }}>
              {"\u{1F6D2}"} GROCERIES
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: -0.5 }}>
              {formatCurrency(groceryAmount)} ({groceryCount}x)
            </Text>
          </View>
          <View style={{ height: 16, backgroundColor: colors.dimmed, borderRadius: 2, overflow: "hidden" }}>
            <View style={{
              height: "100%",
              width: `${Math.max(groceryPct, 2)}%`,
              backgroundColor: "#10B981",
              borderRadius: 2,
            }} />
          </View>
          {topGrocery && (
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 }}>
              Top: {cleanMerchantName(topGrocery)}
            </Text>
          )}
        </View>
      )}

      {/* Retail row */}
      {retailAmount > 0 && (
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
            <Text style={{ color: colors.white, fontSize: 13, fontWeight: "600", letterSpacing: 2 }}>
              {"\u{1F6CD}\u{FE0F}"} RETAIL
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: -0.5 }}>
              {formatCurrency(retailAmount)} ({retailCount}x)
            </Text>
          </View>
          <View style={{ height: 16, backgroundColor: colors.dimmed, borderRadius: 2, overflow: "hidden" }}>
            <View style={{
              height: "100%",
              width: `${Math.max(retailPct, 2)}%`,
              backgroundColor: "#FF00FF",
              borderRadius: 2,
            }} />
          </View>
          {topRetail && (
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 }}>
              Top: {cleanMerchantName(topRetail)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// --- Grocery Store Breakdown ---

function GroceryStoreBreakdown({
  data,
}: {
  data: { name: string; amount: number; count: number }[];
}) {
  if (data.length === 0) return <EmptyState message="No grocery store data" />;

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <View style={{ gap: 6 }}>
      {data.map((item, i) => (
        <View key={`${item.name}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, width: 20, textAlign: "right", fontWeight: "700" }}>
            {i + 1}.
          </Text>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: -0.5 }}>
                {formatCurrency(item.amount)} ({item.count} {item.count === 1 ? "trip" : "trips"})
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.dimmed, borderRadius: 1, overflow: "hidden" }}>
              <View
                style={{
                  height: "100%",
                  width: `${(item.amount / maxAmount) * 100}%`,
                  backgroundColor: PALETTE[i % PALETTE.length],
                  borderRadius: 1,
                }}
              />
            </View>
          </View>
        </View>
      ))}
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
            <Text style={{ color: colors.white, fontSize: 13, fontWeight: "600", letterSpacing: 2 }}>
              {item.emoji} {item.name.toUpperCase()}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: -0.5 }}>
              {formatCurrency(item.amount)} ({item.percent.toFixed(1)}%)
            </Text>
          </View>
          <View style={{ height: 20, backgroundColor: colors.dimmed, borderRadius: 2, overflow: "hidden" }}>
            <View
              style={{
                height: "100%",
                width: `${Math.max(item.percent, 1)}%`,
                backgroundColor: item.color,
                borderRadius: 2,
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
            <Text style={{ color: item.isCurrent ? colors.primary : colors.white, fontSize: 13, fontWeight: item.isCurrent ? "700" : "500", letterSpacing: 2 }}>
              {item.label.toUpperCase()}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: -0.5 }}>
              {formatCurrency(item.total)}
            </Text>
          </View>
          <View style={{ height: 24, backgroundColor: colors.dimmed, borderRadius: 2, overflow: "hidden" }}>
            <View
              style={{
                height: "100%",
                width: `${(item.total / maxVal) * 100}%`,
                backgroundColor: item.isCurrent ? colors.primary : colors.primaryDark,
                borderRadius: 2,
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
          <Text style={{ color: colors.textSecondary, fontSize: 12, width: 20, textAlign: "right", fontWeight: "700" }}>
            {i + 1}.
          </Text>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: -0.5 }}>
                {formatCurrency(item.amount)} ({item.count}x)
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.dimmed, borderRadius: 1, overflow: "hidden" }}>
              <View
                style={{
                  height: "100%",
                  width: `${(item.amount / maxAmount) * 100}%`,
                  backgroundColor: PALETTE[i % PALETTE.length],
                  borderRadius: 1,
                }}
              />
            </View>
          </View>
        </View>
      ))}
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
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: "600", letterSpacing: 2 }}>
                {item.emoji} {item.name.toUpperCase()}
              </Text>
              <Text style={{ color: isOver ? colors.red : colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: -0.5 }}>
                {formatCurrency(item.spent)} / {formatCurrency(item.allocated)}
              </Text>
            </View>
            <View style={{ height: 12, backgroundColor: colors.dimmed, borderRadius: 2, overflow: "hidden" }}>
              <View
                style={{
                  height: "100%",
                  width: `${Math.max(barPct, 1)}%`,
                  backgroundColor: isOver ? colors.red : colors.primary,
                  borderRadius: 2,
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

// --- Month Pill Selector ---

function MonthSelector({
  months,
  selected,
  onSelect,
}: {
  months: string[];
  selected: string;
  onSelect: (m: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: spacing.sm }}>
        {months.map((mk) => {
          const active = mk === selected;
          const label = formatMonthLabel(mk).split(" ")[0];
          return (
            <Pressable
              key={mk}
              onPress={() => onSelect(mk)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 2,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.cardBorder,
              }}
            >
              <Text style={{
                color: active ? colors.bg : colors.white,
                fontSize: 13,
                fontWeight: active ? "700" : "500",
                letterSpacing: 1,
              }}>
                {label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// --- Main Screen ---

export default function InsightsScreen() {
  const { transactions, currentBudget, currentMonth, profile } = useApp();

  // Available months from transaction data
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    transactions.forEach((t) => {
      const normalized = normalizeDate(t.date);
      const mk = normalized.substring(0, 7);
      if (mk.match(/^\d{4}-\d{2}$/)) monthSet.add(mk);
    });
    return Array.from(monthSet).sort();
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Ensure selectedMonth is valid
  const activeMonth = availableMonths.includes(selectedMonth) ? selectedMonth : currentMonth;

  const monthExpenses = useMemo(
    () =>
      transactions.filter((t) => {
        const normalized = normalizeDate(t.date);
        return normalized.startsWith(activeMonth) && t.type === "expense";
      }),
    [transactions, activeMonth]
  );

  const monthIncome = useMemo(
    () =>
      transactions.filter((t) => {
        const normalized = normalizeDate(t.date);
        return normalized.startsWith(activeMonth) && t.type === "income";
      }),
    [transactions, activeMonth]
  );

  // Previous month expenses for comparison
  const prevMonth = shiftMonth(activeMonth, -1);
  const prevMonthExpenseTotal = useMemo(
    () =>
      transactions
        .filter((t) => normalizeDate(t.date).startsWith(prevMonth) && t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [transactions, prevMonth]
  );

  // Top Stats
  const topStatsData = useMemo(() => {
    const now = new Date();
    const [y, m] = activeMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = now.getFullYear() === y && now.getMonth() + 1 === m ? now.getDate() : daysInMonth;
    const daysLeft = Math.max(daysInMonth - today, 0);
    const totalSpent = monthExpenses.reduce((s, t) => s + t.amount, 0);
    const avgDaily = today > 0 ? totalSpent / today : 0;
    const projectedTotal = avgDaily * daysInMonth;

    const biggest =
      monthExpenses.length > 0
        ? monthExpenses.reduce((max, t) => (t.amount > max.amount ? t : max), monthExpenses[0])
        : null;

    const catMap: Record<string, { amount: number; name: string; emoji: string }> = {};
    monthExpenses.forEach((t) => {
      const key = t.category;
      const cfg = getCatConfig(key);
      if (!catMap[key]) {
        catMap[key] = { amount: 0, name: cfg.label, emoji: cfg.emoji };
      }
      catMap[key].amount += t.amount;
    });
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

    return { avgDaily, biggest, topCategory: topCatEntry || null, daysLeft, projectedTotal };
  }, [monthExpenses, activeMonth, currentBudget]);

  // Food breakdown - includes grocery purchases from shopping category
  const foodBreakdown = useMemo(() => {
    const foodTxns = monthExpenses.filter((t) => t.category === "food");
    // Also pull in grocery-type transactions from shopping category
    const shoppingGroceries = monthExpenses.filter(
      (t) => t.category === "shopping" && isGroceryMerchant(t.note || "")
    );

    const subMap: Record<FoodSubcategory, { amount: number; count: number; merchants: Record<string, number> }> = {
      groceries: { amount: 0, count: 0, merchants: {} },
      delivery: { amount: 0, count: 0, merchants: {} },
      coffee: { amount: 0, count: 0, merchants: {} },
      restaurants: { amount: 0, count: 0, merchants: {} },
    };

    foodTxns.forEach((t) => {
      const sub = classifyFood(t.note || "");
      subMap[sub].amount += t.amount;
      subMap[sub].count += 1;
      const merchant = cleanMerchantName(t.note || "Unknown");
      subMap[sub].merchants[merchant] = (subMap[sub].merchants[merchant] || 0) + t.amount;
    });

    // Add shopping groceries to the groceries subcategory
    shoppingGroceries.forEach((t) => {
      subMap.groceries.amount += t.amount;
      subMap.groceries.count += 1;
      const merchant = cleanMerchantName(t.note || "Unknown");
      subMap.groceries.merchants[merchant] = (subMap.groceries.merchants[merchant] || 0) + t.amount;
    });

    const total = Object.values(subMap).reduce((s, v) => s + v.amount, 0);
    const result = (Object.keys(subMap) as FoodSubcategory[])
      .map((sub) => {
        const d = subMap[sub];
        const topMerchant = Object.entries(d.merchants).sort((a, b) => b[1] - a[1])[0];
        return {
          subcategory: sub,
          amount: d.amount,
          count: d.count,
          topMerchant: topMerchant ? topMerchant[0] : "",
        };
      })
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return { data: result, total };
  }, [monthExpenses]);

  // Shopping breakdown - groceries vs retail
  const shoppingBreakdown = useMemo(() => {
    const shoppingTxns = monthExpenses.filter((t) => t.category === "shopping");
    let groceryAmount = 0, groceryCount = 0, retailAmount = 0, retailCount = 0;
    const groceryMerchants: Record<string, number> = {};
    const retailMerchants: Record<string, number> = {};

    shoppingTxns.forEach((t) => {
      const merchant = cleanMerchantName(t.note || "Unknown");
      if (isGroceryMerchant(t.note || "")) {
        groceryAmount += t.amount;
        groceryCount += 1;
        groceryMerchants[merchant] = (groceryMerchants[merchant] || 0) + t.amount;
      } else {
        retailAmount += t.amount;
        retailCount += 1;
        retailMerchants[merchant] = (retailMerchants[merchant] || 0) + t.amount;
      }
    });

    const topGrocery = Object.entries(groceryMerchants).sort((a, b) => b[1] - a[1])[0];
    const topRetail = Object.entries(retailMerchants).sort((a, b) => b[1] - a[1])[0];

    return {
      groceryAmount,
      groceryCount,
      retailAmount,
      retailCount,
      topGrocery: topGrocery ? topGrocery[0] : "",
      topRetail: topRetail ? topRetail[0] : "",
    };
  }, [monthExpenses]);

  // Grocery Store Breakdown - individual stores from food + shopping categories
  const groceryStoreBreakdown = useMemo(() => {
    const storeMap: Record<string, { amount: number; count: number }> = {};

    // Grocery transactions from food category
    monthExpenses
      .filter((t) => t.category === "food" && classifyFood(t.note || "") === "groceries")
      .forEach((t) => {
        const name = cleanMerchantName(t.note || "Unknown");
        if (!storeMap[name]) storeMap[name] = { amount: 0, count: 0 };
        storeMap[name].amount += t.amount;
        storeMap[name].count += 1;
      });

    // Grocery merchants from shopping category
    monthExpenses
      .filter((t) => t.category === "shopping" && isGroceryMerchant(t.note || ""))
      .forEach((t) => {
        const name = cleanMerchantName(t.note || "Unknown");
        if (!storeMap[name]) storeMap[name] = { amount: 0, count: 0 };
        storeMap[name].amount += t.amount;
        storeMap[name].count += 1;
      });

    return Object.entries(storeMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [monthExpenses]);

  // Spending by Category (with food subcategories expanded)
  const categorySpending = useMemo(() => {
    const map: Record<string, { amount: number; name: string; emoji: string; color: string }> = {};
    monthExpenses.forEach((t) => {
      if (t.category === "food") {
        const sub = classifyFood(t.note || "");
        const cfg = FOOD_SUB_CONFIG[sub];
        const key = `food_${sub}`;
        if (!map[key]) {
          map[key] = { amount: 0, name: cfg.label, emoji: cfg.emoji, color: cfg.color };
        }
        map[key].amount += t.amount;
      } else if (t.category === "shopping") {
        // Split shopping into groceries vs retail
        if (isGroceryMerchant(t.note || "")) {
          const key = "shopping_grocery";
          if (!map[key]) {
            map[key] = { amount: 0, name: "Groceries", emoji: "\u{1F6D2}", color: "#10B981" };
          }
          map[key].amount += t.amount;
        } else {
          const key = "shopping_retail";
          if (!map[key]) {
            map[key] = { amount: 0, name: "Retail", emoji: "\u{1F6CD}\u{FE0F}", color: "#FF00FF" };
          }
          map[key].amount += t.amount;
        }
      } else {
        const key = t.category;
        const cfg = getCatConfig(key);
        if (!map[key]) {
          map[key] = { amount: 0, name: cfg.label, emoji: cfg.emoji, color: cfg.color };
        }
        map[key].amount += t.amount;
      }
    });
    const total = Object.values(map).reduce((s, v) => s + v.amount, 0);
    return Object.values(map)
      .map((item) => ({
        ...item,
        percent: total > 0 ? (item.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  // Daily Spending
  const { dailyData, daysInMonth } = useMemo(() => {
    const [y, m] = activeMonth.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    const daily = new Array(dim).fill(0);
    monthExpenses.forEach((t) => {
      const normalized = normalizeDate(t.date);
      const day = parseInt(normalized.split("-")[2], 10);
      if (day >= 1 && day <= dim) daily[day - 1] += t.amount;
    });
    return { dailyData: daily, daysInMonth: dim };
  }, [monthExpenses, activeMonth]);

  // Monthly Spending Trend
  const monthlyTrend = useMemo(() => {
    const months = [
      shiftMonth(activeMonth, -3),
      shiftMonth(activeMonth, -2),
      shiftMonth(activeMonth, -1),
      activeMonth,
    ];
    return months.map((mk) => {
      const total = transactions
        .filter((t) => {
          const normalized = normalizeDate(t.date);
          return normalized.startsWith(mk) && t.type === "expense";
        })
        .reduce((s, t) => s + t.amount, 0);
      const label = formatMonthLabel(mk).split(" ")[0];
      return { label, total, isCurrent: mk === activeMonth };
    });
  }, [transactions, activeMonth]);

  // Monthly Income vs Expenses (all available months)
  const monthlyIncomeExpense = useMemo(() => {
    const months = [
      shiftMonth(activeMonth, -3),
      shiftMonth(activeMonth, -2),
      shiftMonth(activeMonth, -1),
      activeMonth,
    ];
    return months.map((mk) => {
      const income = transactions
        .filter((t) => {
          const n = normalizeDate(t.date);
          return n.startsWith(mk) && t.type === "income";
        })
        .reduce((s, t) => s + t.amount, 0);
      const expenses = transactions
        .filter((t) => {
          const n = normalizeDate(t.date);
          return n.startsWith(mk) && t.type === "expense";
        })
        .reduce((s, t) => s + t.amount, 0);
      const label = formatMonthLabel(mk).split(" ")[0];
      return { label, income, expenses, isCurrent: mk === activeMonth };
    });
  }, [transactions, activeMonth]);

  // Top Merchants (with cleaned names)
  const topMerchants = useMemo(() => {
    const merchantMap: Record<string, { amount: number; count: number }> = {};
    monthExpenses.forEach((t) => {
      const name = cleanMerchantName(t.note || t.category || "Unknown");
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

  // Weekly Income breakdown - uses REAL income transactions, not averages
  const weeklyStats = useMemo(() => {
    // Get all income transactions for this month
    const monthIncome = transactions
      .filter((t) => t.type === "income" && normalizeDate(t.date).startsWith(activeMonth))
      .reduce((s, t) => s + t.amount, 0);

    // Current week spending & income (Mon-Sun containing today)
    const now = new Date();
    const [y, m] = activeMonth.split("-").map(Number);
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;

    let weekSpending = 0;
    let weekIncome = 0;

    if (isCurrentMonth) {
      const today = now.getDate();
      const dayOfWeek = now.getDay(); // 0=Sun
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = today - mondayOffset;
      const weekEnd = weekStart + 6;

      transactions.forEach((t) => {
        const normalized = normalizeDate(t.date);
        if (!normalized.startsWith(activeMonth)) return;
        const day = parseInt(normalized.split("-")[2], 10);
        if (day >= weekStart && day <= weekEnd) {
          if (t.type === "expense") weekSpending += t.amount;
          if (t.type === "income") weekIncome += t.amount;
        }
      });
    } else {
      // For past months, break into actual weeks
      const allMonthTxns = transactions.filter((t) => normalizeDate(t.date).startsWith(activeMonth));
      const daysInM = new Date(y, m, 0).getDate();
      const numWeeks = Math.ceil(daysInM / 7);
      const totalSpent = allMonthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const totalInc = allMonthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      weekSpending = totalSpent / numWeeks;
      weekIncome = totalInc / numWeeks;
    }

    // Use real weekly income, fall back to profile-based if no income transactions
    const weeklyIncome = weekIncome > 0 ? weekIncome : (profile?.monthlyIncome ?? 0) / 4.33;
    const weeklySavings = weeklyIncome - weekSpending;
    return { weeklyIncome, weekSpending, weeklySavings, monthIncome };
  }, [profile, transactions, activeMonth]);

  // Waste Alerts
  const wasteAlerts = useMemo(() => {
    const alerts: { emoji: string; description: string; amount: number; color: string }[] = [];

    // 1. Groceries over budget
    if (currentBudget) {
      // Total grocery spending = food groceries + shopping groceries
      const grocerySpent = foodBreakdown.data.find((d) => d.subcategory === "groceries")?.amount ?? 0;
      const groceryBudget = currentBudget.categories.find(
        (c) => c.name.toLowerCase() === "groceries" || c.name.toLowerCase() === "food"
      );
      if (groceryBudget && grocerySpent > groceryBudget.allocated) {
        const over = grocerySpent - groceryBudget.allocated;
        alerts.push({
          emoji: "\u{1F6D2}",
          description: `Groceries $${Math.round(over)} over budget`,
          amount: grocerySpent,
          color: colors.red,
        });
      }
    }

    // 2. Restaurant spending vs last month
    const currentRestaurants = monthExpenses
      .filter((t) => t.category === "food" && classifyFood(t.note || "") === "restaurants")
      .reduce((s, t) => s + t.amount, 0);
    const prevRestaurants = transactions
      .filter((t) => {
        const n = normalizeDate(t.date);
        return n.startsWith(prevMonth) && t.type === "expense" && t.category === "food" && classifyFood(t.note || "") === "restaurants";
      })
      .reduce((s, t) => s + t.amount, 0);
    if (prevRestaurants > 0 && currentRestaurants > prevRestaurants) {
      const pct = ((currentRestaurants - prevRestaurants) / prevRestaurants) * 100;
      if (pct >= 10) {
        alerts.push({
          emoji: "\u{1F37D}\u{FE0F}",
          description: `Restaurant spending up ${Math.round(pct)}% vs last month`,
          amount: currentRestaurants,
          color: pct >= 30 ? colors.red : "#FF9500",
        });
      }
    }

    // 3. Amazon purchases
    const amazonTxns = monthExpenses.filter((t) =>
      (t.note || "").toLowerCase().includes("amazon") || (t.note || "").toLowerCase().includes("amzn")
    );
    if (amazonTxns.length >= 3) {
      const amazonTotal = amazonTxns.reduce((s, t) => s + t.amount, 0);
      alerts.push({
        emoji: "\u{1F4E6}",
        description: `${amazonTxns.length} Amazon purchases this month totaling ${formatCurrency(amazonTotal)}`,
        amount: amazonTotal,
        color: "#FF9500",
      });
    }

    // 4. Delivery / DoorDash
    const deliveryTotal = monthExpenses
      .filter((t) => t.category === "food" && classifyFood(t.note || "") === "delivery")
      .reduce((s, t) => s + t.amount, 0);
    if (deliveryTotal > 0) {
      alerts.push({
        emoji: "\u{1F4F1}",
        description: `Delivery/DoorDash: ${formatCurrency(deliveryTotal)} this month`,
        amount: deliveryTotal,
        color: deliveryTotal > 100 ? colors.red : "#FF9500",
      });
    }

    // 5. Coffee shops
    const coffeeTxns = monthExpenses.filter(
      (t) => t.category === "food" && classifyFood(t.note || "") === "coffee"
    );
    const coffeeTotal = coffeeTxns.reduce((s, t) => s + t.amount, 0);
    if (coffeeTxns.length >= 2 && coffeeTotal > 0) {
      alerts.push({
        emoji: "\u{2615}",
        description: `Coffee shops: ${formatCurrency(coffeeTotal)} this month (${coffeeTxns.length} visits)`,
        amount: coffeeTotal,
        color: coffeeTotal > 50 ? "#FF9500" : "#FF9500",
      });
    }

    return alerts;
  }, [monthExpenses, transactions, prevMonth, currentBudget, foodBreakdown]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>INSIGHTS</Text>

        {/* Month Selector */}
        {availableMonths.length > 1 && (
          <MonthSelector
            months={availableMonths}
            selected={activeMonth}
            onSelect={setSelectedMonth}
          />
        )}

        {/* Top Stats */}
        <TopStats
          avgDaily={topStatsData.avgDaily}
          biggestExpense={topStatsData.biggest}
          topCategory={topStatsData.topCategory}
          daysLeft={topStatsData.daysLeft}
          projectedTotal={topStatsData.projectedTotal}
          lastMonthTotal={prevMonthExpenseTotal}
        />

        {/* Weekly Income Card */}
        {(profile?.monthlyIncome ?? 0) > 0 && (
          <View style={[styles.chartCard, { borderColor: colors.cardBorder }]}>
            <SectionHeader title="Weekly Snapshot" subtitle="Income, spending & savings this week" />
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600", letterSpacing: 2 }}>
                  WEEKLY INCOME
                </Text>
                <View style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 0,
                }}>
                  <Text style={{
                    color: colors.bg,
                    fontSize: 17,
                    fontWeight: "800",
                    letterSpacing: -0.5,
                  }}>
                    {formatCurrency(weeklyStats.weeklyIncome)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600", letterSpacing: 2 }}>
                  WEEKLY SPENDING
                </Text>
                <Text style={{
                  color: colors.red,
                  fontSize: 17,
                  fontWeight: "800",
                  letterSpacing: -0.5,
                  textShadowColor: 'rgba(255,0,60,0.3)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 8,
                }}>
                  {formatCurrency(weeklyStats.weekSpending)}
                </Text>
              </View>
              <View style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: colors.cardBorder,
              }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600", letterSpacing: 2 }}>
                  WEEKLY SAVINGS
                </Text>
                <Text style={{
                  color: weeklyStats.weeklySavings >= 0 ? colors.primary : colors.red,
                  fontSize: 20,
                  fontWeight: "800",
                  letterSpacing: -0.5,
                  textShadowColor: weeklyStats.weeklySavings >= 0 ? 'rgba(0,255,204,0.3)' : 'rgba(255,0,60,0.3)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 8,
                }}>
                  {weeklyStats.weeklySavings >= 0 ? "+" : ""}{formatCurrency(weeklyStats.weeklySavings)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Income vs Expenses */}
        <View style={styles.chartCard}>
          <SectionHeader title="Income vs Expenses" subtitle={formatMonthLabel(activeMonth)} />
          <IncomeVsExpenses income={incomeTotal} expenses={expenseTotal} />
        </View>

        {/* Food Breakdown - includes groceries from shopping */}
        {foodBreakdown.total > 0 && (
          <View style={[styles.chartCard, { borderColor: "rgba(255, 149, 0, 0.25)" }]}>
            <SectionHeader
              title="Food & Grocery Breakdown"
              subtitle="Groceries, delivery, coffee & dining out"
            />
            <FoodBreakdownChart data={foodBreakdown.data} total={foodBreakdown.total} />
          </View>
        )}

        {/* Grocery Store Breakdown */}
        {groceryStoreBreakdown.length > 0 && (
          <View style={[styles.chartCard, { borderColor: "rgba(16, 185, 129, 0.25)" }]}>
            <SectionHeader
              title="Grocery Store Breakdown"
              subtitle="Spending by store across food & shopping"
            />
            <GroceryStoreBreakdown data={groceryStoreBreakdown} />
          </View>
        )}

        {/* Waste Alerts */}
        <View style={[styles.chartCard, {
          borderColor: wasteAlerts.length > 0 ? colors.red : colors.cardBorder,
          borderWidth: 1,
          backgroundColor: wasteAlerts.length > 0 ? colors.redBg : colors.card,
        }]}>
          <SectionHeader
            title="WASTE ALERTS"
            subtitle={wasteAlerts.length > 0 ? "Spending patterns to watch" : undefined}
          />
          {wasteAlerts.length === 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}>
              <Text style={{ fontSize: 20 }}>{"\u2705"}</Text>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700", letterSpacing: 1 }}>
                You're doing great! No spending alerts this month.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {wasteAlerts.map((alert, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: alert.color + "10",
                    borderRadius: 2,
                    padding: 10,
                    borderLeftWidth: 3,
                    borderLeftColor: alert.color,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{alert.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.white, fontSize: 13, fontWeight: "700" }}>
                      {alert.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Shopping Breakdown */}
        {(shoppingBreakdown.groceryAmount > 0 || shoppingBreakdown.retailAmount > 0) && (
          <View style={[styles.chartCard, { borderColor: "rgba(255, 0, 255, 0.25)" }]}>
            <SectionHeader
              title="Shopping Breakdown"
              subtitle="Groceries vs retail purchases"
            />
            <ShoppingBreakdownChart {...shoppingBreakdown} />
          </View>
        )}

        {/* Spending by Category (with food + shopping splits) */}
        <View style={styles.chartCard}>
          <SectionHeader title="Spending by Category" subtitle="Food & shopping split into subcategories" />
          <SpendingByCategoryChart data={categorySpending} />
        </View>

        {/* Monthly Income vs Expenses */}
        <View style={styles.chartCard}>
          <SectionHeader title="Monthly Income vs Expenses" subtitle="4-month comparison" />
          <ChartLegend
            items={[
              { color: colors.primary, label: "Income" },
              { color: colors.red, label: "Expenses" },
            ]}
          />
          <MonthlyIncomeExpenseChart data={monthlyIncomeExpense} />
        </View>

        {/* Monthly Spending Trend */}
        <View style={styles.chartCard}>
          <SectionHeader title="Monthly Spending Trend" />
          <MonthlySpendingTrend data={monthlyTrend} />
        </View>

        {/* Top Merchants */}
        <View style={styles.chartCard}>
          <SectionHeader title="Top Merchants" />
          <TopMerchants data={topMerchants} />
        </View>

        {/* Daily Spending */}
        <View style={styles.chartCard}>
          <SectionHeader title="Daily Spending" />
          <DailySpendingChart dailyData={dailyData} daysInMonth={daysInMonth} />
        </View>

        {/* Budget vs Actual */}
        <View style={styles.chartCard}>
          <SectionHeader title="Budget vs Actual" />
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
    paddingBottom: 140,
  },
  header: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    letterSpacing: 4,
    textTransform: "uppercase",
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
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 2,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  statValue: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,255,204,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
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
    borderRadius: 2,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  chartTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
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
    borderRadius: 1,
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
