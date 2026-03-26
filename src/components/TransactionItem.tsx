import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius } from "../theme";
import { formatCurrency, formatShortDate } from "../utils";
import type { Transaction } from "../types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../types";

interface Props {
  transaction: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#ff0080',
  shopping: '#8b00ff',
  bills: '#00ffcc',
  transport: '#ccff00',
  transfer: '#00ffff',
  fun: '#EC4899',
  health: '#14B8A6',
  other: '#707070',
};

function getCategoryEmoji(category: string): string {
  const lower = category.toLowerCase();
  const found =
    EXPENSE_CATEGORIES.find((c) => c.id === lower) ||
    INCOME_CATEGORIES.find((c) => c.id === lower);
  return found?.emoji ?? "\uD83D\uDCE6";
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] || '#707070';
}

export function TransactionItem({ transaction, onPress, onLongPress }: Props) {
  const isExpense = transaction.type === "expense";
  const catColor = getCategoryColor(transaction.category);

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={[styles.container, {
      borderLeftWidth: 3,
      borderLeftColor: catColor,
    }]}>
      <View style={[styles.emojiBox, { borderColor: catColor + '30' }]}>
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
        style={[styles.amount, {
          color: isExpense ? colors.red : colors.primary,
        }]}
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
    borderRadius: 2,
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
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});
