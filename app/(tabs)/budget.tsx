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
import { colors, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { FAB } from "../../src/components/FAB";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import { formatCurrency } from "../../src/utils";
import type { BudgetCategory } from "../../src/types";

const CAT_BORDER_COLORS: Record<string, string> = {
  food: "#FF9500",
  shopping: colors.pink,
  transport: colors.cyan,
  bills: colors.red,
  fun: colors.yellow,
  health: colors.primary,
  savings: colors.primary,
  other: colors.textSecondary,
};

function getCatBorderColor(name: string): string {
  return CAT_BORDER_COLORS[name.toLowerCase()] || colors.cyan;
}

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
  const borderColor = getCatBorderColor(cat.name);

  return (
    <Pressable onPress={onPress} style={[styles.catCard, { borderLeftColor: borderColor, borderLeftWidth: 4 }]}>
      <View style={styles.catHeader}>
        <View style={styles.catInfo}>
          <Text style={styles.catName}>{cat.name.toUpperCase()}</Text>
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
            isOver && styles.barOverspent,
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
      <Text style={styles.header}>BUDGET</Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>BUDGETED</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalBudget)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>SPENT</Text>
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
          <Text style={styles.summaryLabel}>REMAINING</Text>
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
              {editCat?.name?.toUpperCase()} BUDGET
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
              <Text style={styles.modalBtnText}>SAVE</Text>
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
    fontSize: 36,
    fontWeight: "900",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    letterSpacing: -1,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderWidth: 2,
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
    width: 2,
    backgroundColor: colors.primary,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  summaryValue: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  catList: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: 100,
  },
  catCard: {
    backgroundColor: colors.card,
    borderWidth: 2,
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
  catName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  fixedBadge: {
    backgroundColor: colors.primary + "20",
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  fixedText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  catSpent: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  catOf: {
    color: colors.textSecondary,
    fontWeight: "400",
  },
  barBg: {
    height: 8,
    backgroundColor: colors.dimmed,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
  },
  barOverspent: {
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
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
    borderWidth: 2,
    borderColor: colors.primary,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 340,
    gap: spacing.lg,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.dimmed,
    padding: spacing.md,
  },
  modalDollar: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "900",
  },
  modalInput: {
    flex: 1,
    color: colors.white,
    fontSize: 28,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  modalBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  modalBtnText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
