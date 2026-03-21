import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing } from "../theme";
import { formatCurrency, formatShortDate } from "../utils";
import type { Transaction } from "../types";

interface Props {
  transaction: Transaction;
  onLongPress?: () => void;
}

const CATEGORY_DOT_COLORS: Record<string, string> = {
  food: "#FF9500",
  shopping: colors.pink,
  transport: colors.cyan,
  bills: colors.red,
  fun: colors.yellow,
  health: colors.primary,
  other: colors.textSecondary,
  salary: colors.primary,
  freelance: colors.cyan,
  transfer: colors.yellow,
  gift: colors.pink,
};

function getCategoryColor(category: string): string {
  return CATEGORY_DOT_COLORS[category.toLowerCase()] || colors.textSecondary;
}

export function TransactionItem({ transaction, onLongPress }: Props) {
  const isExpense = transaction.type === "expense";
  const dotColor = getCategoryColor(transaction.category);

  return (
    <Pressable onLongPress={onLongPress} style={styles.container}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {transaction.note || transaction.category}
        </Text>
        <Text style={styles.category}>{transaction.category.toUpperCase()}</Text>
      </View>
      <View style={styles.right}>
        <Text
          style={[styles.amount, { color: isExpense ? colors.red : colors.primary }]}
        >
          {isExpense ? "-" : "+"}
          {formatCurrency(transaction.amount)}
        </Text>
        <Text style={styles.date}>{formatShortDate(transaction.date)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  dot: {
    width: 6,
    height: 6,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  category: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  date: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },
});
