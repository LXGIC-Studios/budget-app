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
import { impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { FAB } from "../../src/components/FAB";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import { formatCurrency } from "../../src/utils";
import type { BudgetCategory } from "../../src/types";

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
              <Text style={styles.fixedText}>FIXED</Text>
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
  const { profile, currentBudget, transactions, currentMonth, saveBudget, addTransaction } =
    useApp();

  const monthlyIncome = profile?.monthlyIncome ?? 0;
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
    impact("Medium");
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
          <Text style={styles.summaryLabel}>INCOME</Text>
          <Text style={styles.summaryValue}>{formatCurrency(monthlyIncome)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>BUDGETED</Text>
          <Text
            style={[
              styles.summaryValue,
              totalBudget > monthlyIncome && { color: colors.red },
            ]}
          >
            {formatCurrency(totalBudget)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>REMAINING</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  monthlyIncome - totalBudget >= 0 ? colors.primary : colors.red,
              },
            ]}
          >
            {formatCurrency(monthlyIncome - totalBudget)}
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
              {editCat?.name} Budget
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
    fontSize: 32,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  summaryValue: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  catList: {
    padding: spacing.md,
    gap: 10,
    paddingBottom: 100,
  },
  catCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
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
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  fixedText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
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
    backgroundColor: colors.dimmed,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  // Edit modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
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
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  modalDollar: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "700",
  },
  modalInput: {
    flex: 1,
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
  },
  modalBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: radius.md,
  },
  modalBtnText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
  },
});
