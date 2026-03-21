import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radius, spacing } from "../theme";
import { formatCurrency, formatShortDate } from "../utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../types";
import type { Transaction } from "../types";

interface Props {
  transaction: Transaction;
  onLongPress?: () => void;
}

function getCategoryEmoji(category: string, type: string): string {
  const cats =
    type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return (cats as readonly { id: string; emoji: string }[]).find((c) => c.id === category)?.emoji ?? "\uD83D\uDCE6";
}

export function TransactionItem({ transaction, onLongPress }: Props) {
  const isExpense = transaction.type === "expense";
  const emoji = getCategoryEmoji(transaction.category, transaction.type);

  return (
    <Pressable onLongPress={onLongPress} style={styles.container}>
      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {transaction.note || transaction.category}
        </Text>
        <Text style={styles.date}>{formatShortDate(transaction.date)}</Text>
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
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.sm + 4,
  },
  emojiBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
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
    textTransform: "capitalize",
  },
  date: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
  },
});
