import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius } from "../theme";
import { formatCurrency, formatShortDate } from "../utils";
import type { Transaction } from "../types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../types";

interface Props {
  transaction: Transaction;
  onLongPress?: () => void;
}

function getCategoryEmoji(category: string): string {
  const lower = category.toLowerCase();
  const found =
    EXPENSE_CATEGORIES.find((c) => c.id === lower) ||
    INCOME_CATEGORIES.find((c) => c.id === lower);
  return found?.emoji ?? "\uD83D\uDCE6";
}

export function TransactionItem({ transaction, onLongPress }: Props) {
  const isExpense = transaction.type === "expense";

  return (
    <Pressable onLongPress={onLongPress} style={styles.container}>
      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{getCategoryEmoji(transaction.category)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {transaction.note || transaction.category}
        </Text>
        <Text style={styles.category}>
          {transaction.category} · {formatShortDate(transaction.date)}
          {transaction.userName ? ` · ${transaction.userName}` : ""}
        </Text>
      </View>
      <Text
        style={[styles.amount, { color: isExpense ? colors.red : colors.primary }]}
      >
        {isExpense ? "-" : "+"}
        {formatCurrency(transaction.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  emojiBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "500",
  },
  category: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});
