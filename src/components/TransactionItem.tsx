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
  "eating out": '#ff0080',
  "groceries": '#00ff88',
  "shopping": '#8b00ff',
  "bills": '#00ffcc',
  "subscriptions": '#EC4899',
  "gas/transport": '#ccff00',
  "transfer": '#555555',
  "health": '#14B8A6',
  "kids": '#FF9500',
  "clothing": '#9d50dd',
  "auto": '#007eb5',
  "payments": '#FF6B35',
  "fees": '#666',
  "salary": '#00ffcc',
  "other": '#707070',
  "other_income": '#00ddaa',
  "laundry": '#888',
};

function getCategoryEmoji(category: string): string {
  const lower = category.toLowerCase();
  if (lower === "transfer") return "🔄";
  if (lower === "salary") return "💼";
  if (lower === "other_income") return "💰";
  const found =
    EXPENSE_CATEGORIES.find((c) => c.id.toLowerCase() === lower) ||
    INCOME_CATEGORIES.find((c) => c.id.toLowerCase() === lower);
  return found?.emoji ?? "📦";
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] || '#707070';
}

export function TransactionItem({ transaction, onPress, onLongPress }: Props) {
  const isTransfer = transaction.type === "transfer" || transaction.category === "transfer";
  const isExpense = transaction.type === "expense" && !isTransfer;
  const catColor = getCategoryColor(transaction.category);

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={[styles.container, {
      borderLeftWidth: 3,
      borderLeftColor: catColor,
      opacity: isTransfer ? 0.5 : 1,
    }]}>
      <View style={[styles.emojiBox, { borderColor: catColor + '30' }]}>
        <Text style={styles.emoji}>{getCategoryEmoji(transaction.category)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {transaction.note || transaction.category}
        </Text>
        <Text style={styles.category}>
          {isTransfer ? "transfer" : transaction.category} - {formatShortDate(transaction.date)}
          {transaction.userName ? ` - ${transaction.userName}` : ""}
        </Text>
      </View>
      <Text
        style={[styles.amount, {
          color: isTransfer ? colors.textSecondary : isExpense ? colors.red : colors.primary,
        }]}
      >
        {isExpense ? "-" : isTransfer ? "" : "+"}
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
