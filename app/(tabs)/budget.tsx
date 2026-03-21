import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { FAB } from "../../src/components/FAB";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import { formatCurrency } from "../../src/utils";
import type { BudgetCategory, Transaction } from "../../src/types";

function CategoryRow({
  cat,
  spent,
  onPress,
}: {
  cat: BudgetCategory;
  spent: number;
  onPress: () => void;
}) {
  const pct = cat.allocated > 0 ? Math.min(spent / cat.allocated, 1.5) : 0;
  const isOver = spent > cat.allocated;
  const barColor = isOver ? colors.red : colors.primary;

  return (
    <Pressable onPress={onPress} style={styles.catCard}>
      <View style={styles.catHeader}>
        <View style={styles.catInfo}>
          <Text style={styles.catEmoji}>{cat.emoji}</Text>
          <Text style={styles.catName}>{cat.name}</Text>
          {cat.type === "fixed" && (
            <View style={styles.fixedBadge}>
              <Text style={styles.fixedText}>Fixed</Text>
            </View>
          )}
        </View>
        <Text style={[styles.catSpent, isOver && { color: colors.red }]}>
          {formatCurrency(spent)}{" "}
          <Text style={styles.catOf}>/ {formatCurrency(cat.allocated)}</Text>
        </Text>
      </View>
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(pct * 100, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

export default function BudgetScreen() {
  const { currentBudget, transactions, currentMonth, saveBudget, addTransaction } =
    useApp();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editCat, setEditCat] = useState<BudgetCategory | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const monthTxns = useMemo(
    () =>
      transactions.filter(
        (t) => t.date.startsWith(currentMonth) && t.type === "expense"
      ),
    [transactions, currentMonth]
  );

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.forEach((t) => {
      const key = t.category.toLowerCase();
      map[key] = (map[key] || 0) + t.amount;
    });
    return map;
  }, [monthTxns]);

  const categories = currentBudget?.categories ?? [];

  const totalBudget = categories.reduce((s, c) => s + c.allocated, 0);
  const totalSpent = monthTxns.reduce((s, t) => s + t.amount, 0);

  const handleEditSave = () => {
    if (!editCat || !currentBudget) return;
    const newAmount = parseFloat(editAmount) || 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = {
      ...currentBudget,
      categories: currentBudget.categories.map((c) =>
        c.id === editCat.id ? { ...c, allocated: newAmount } : c
      ),
    };
    saveBudget(updated);
    setEditCat(null);
  };

  const openEdit = (cat: BudgetCategory) => {
    setEditCat(cat);
    setEditAmount(cat.allocated.toString());
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Budget</Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Budgeted</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalBudget)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Spent</Text>
          <Text
            style={[
              styles.summaryValue,
              totalSpent > totalBudget && { color: colors.red },
            ]}
          >
            {formatCurrency(totalSpent)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Remaining</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  totalBudget - totalSpent >= 0 ? colors.primary : colors.red,
              },
            ]}
          >
            {formatCurrency(totalBudget - totalSpent)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.catList}>
        {categories.map((cat) => {
          const catKey = cat.name.toLowerCase();
          return (
            <CategoryRow
              key={cat.id}
              cat={cat}
              spent={spentByCategory[catKey] || 0}
              onPress={() => openEdit(cat)}
            />
          );
        })}
      </ScrollView>

      <FAB onPress={() => setSheetVisible(true)} />
      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={addTransaction}
      />

      {/* Edit modal */}
      <Modal visible={!!editCat} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setEditCat(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editCat?.emoji} {editCat?.name} Budget
            </Text>
            <View style={styles.modalInputRow}>
              <Text style={styles.modalDollar}>$</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="decimal-pad"
                value={editAmount}
                onChangeText={setEditAmount}
                autoFocus
              />
            </View>
            <Pressable onPress={handleEditSave} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.cardBorder,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  summaryValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  catList: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: 100,
  },
  catCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  catEmoji: {
    fontSize: 18,
  },
  catName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  fixedBadge: {
    backgroundColor: colors.primary + "20",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  fixedText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "600",
  },
  catSpent: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  catOf: {
    color: colors.textSecondary,
    fontWeight: "400",
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dimmed,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  // Edit modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 340,
    gap: spacing.lg,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  modalDollar: {
    color: colors.textSecondary,
    fontSize: 24,
    fontWeight: "600",
  },
  modalInput: {
    flex: 1,
    color: colors.white,
    fontSize: 24,
    fontWeight: "600",
  },
  modalBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  modalBtnText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
  },
});
