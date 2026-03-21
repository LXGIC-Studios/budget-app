import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import { colors, radius, spacing } from "../theme";
import { EXPENSE_CATEGORIES } from "../types";
import type { Transaction } from "../types";
import { formatCurrency, formatShortDate } from "../utils";
import { impact } from "../lib/haptics";

interface Props {
  visible: boolean;
  transactions: Transaction[];
  onImport: (txns: Transaction[]) => void;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#FF6B35",
  shopping: "#7C4DFF",
  transport: "#00BCD4",
  bills: "#FF9800",
  fun: "#E91E63",
  health: "#4CAF50",
  other: "#78909C",
  salary: colors.primary,
  freelance: "#26A69A",
  transfer: "#42A5F5",
};

function getCategoryEmoji(id: string): string {
  const cat = EXPENSE_CATEGORIES.find((c) => c.id === id);
  return cat?.emoji ?? "\uD83D\uDCE6";
}

function getCategoryName(id: string): string {
  const cat = EXPENSE_CATEGORIES.find((c) => c.id === id);
  return cat?.name ?? id.charAt(0).toUpperCase() + id.slice(1);
}

export function ImportPreview({ visible, transactions, onImport, onClose }: Props) {
  const [items, setItems] = useState<Transaction[]>(transactions);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  const handleCategoryChange = (index: number, newCategory: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], category: newCategory };
      return updated;
    });
    setPickerIndex(null);
    impact("Light");
  };

  const handleImport = () => {
    onImport(items);
  };

  const displayItems = items.slice(0, 10);
  const remaining = items.length - 10;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.centeredWrap}>
        <View style={styles.card}>
          <Text style={styles.title}>Import Preview</Text>
          <Text style={styles.subtitle}>
            {items.length} transaction{items.length !== 1 ? "s" : ""} found
          </Text>

          <View style={styles.list}>
            <FlatList
              data={displayItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <View style={styles.txnRow}>
                  <View style={styles.txnLeft}>
                    <Text style={styles.txnDate}>
                      {formatShortDate(item.date)}
                    </Text>
                    <Text style={styles.txnDesc} numberOfLines={1}>
                      {item.note || "No description"}
                    </Text>
                  </View>
                  <View style={styles.txnRight}>
                    <Text
                      style={[
                        styles.txnAmount,
                        { color: item.type === "income" ? colors.primary : colors.red },
                      ]}
                    >
                      {item.type === "income" ? "+" : "-"}
                      {formatCurrency(item.amount)}
                    </Text>
                    <Pressable
                      onPress={() => setPickerIndex(pickerIndex === index ? null : index)}
                      style={[
                        styles.categoryPill,
                        { backgroundColor: (CATEGORY_COLORS[item.category] || colors.dimmed) + "25" },
                      ]}
                    >
                      <Text style={styles.categoryPillEmoji}>
                        {getCategoryEmoji(item.category)}
                      </Text>
                      <Text
                        style={[
                          styles.categoryPillText,
                          { color: CATEGORY_COLORS[item.category] || colors.textSecondary },
                        ]}
                      >
                        {getCategoryName(item.category)}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            {remaining > 0 && (
              <Text style={styles.moreText}>
                +{remaining} more transaction{remaining !== 1 ? "s" : ""}
              </Text>
            )}
          </View>

          {pickerIndex !== null && (
            <View style={styles.pickerWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => handleCategoryChange(pickerIndex, cat.id)}
                    style={[
                      styles.pickerPill,
                      items[pickerIndex]?.category === cat.id && styles.pickerPillActive,
                    ]}
                  >
                    <Text style={styles.pickerEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        styles.pickerLabel,
                        items[pickerIndex]?.category === cat.id && styles.pickerLabelActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.buttons}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleImport} style={styles.importBtn}>
              <Text style={styles.importBtnText}>
                Import {items.length} Transaction{items.length !== 1 ? "s" : ""}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  centeredWrap: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  list: {
    maxHeight: 340,
  },
  txnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  txnLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  txnDate: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  txnDesc: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  txnRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  categoryPillEmoji: {
    fontSize: 11,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  moreText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    paddingTop: spacing.sm,
  },
  pickerWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  pickerRow: {
    gap: spacing.xs,
  },
  pickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pickerPillActive: {
    backgroundColor: colors.primary + "20",
    borderColor: colors.primary,
  },
  pickerEmoji: {
    fontSize: 14,
  },
  pickerLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  pickerLabelActive: {
    color: colors.primary,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
  importBtn: {
    flex: 2,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  importBtnText: {
    color: colors.bg,
    fontWeight: "700",
    fontSize: 15,
  },
});
