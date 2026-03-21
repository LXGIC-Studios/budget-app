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
import { colors, spacing } from "../theme";
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
  shopping: colors.pink,
  transport: colors.cyan,
  bills: "#FF9800",
  fun: colors.yellow,
  health: colors.primary,
  other: colors.textSecondary,
  salary: colors.primary,
  freelance: colors.cyan,
  transfer: colors.yellow,
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
          <Text style={styles.title}>IMPORT PREVIEW</Text>
          <Text style={styles.subtitle}>
            {items.length} TRANSACTION{items.length !== 1 ? "S" : ""} FOUND
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
                        {getCategoryName(item.category).toUpperCase()}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            {remaining > 0 && (
              <Text style={styles.moreText}>
                +{remaining} MORE TRANSACTION{remaining !== 1 ? "S" : ""}
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
                      {cat.name.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.buttons}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </Pressable>
            <Pressable onPress={handleImport} style={styles.importBtn}>
              <Text style={styles.importBtnText}>
                IMPORT {items.length}
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
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  centeredWrap: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    maxHeight: "80%",
    borderWidth: 2,
    borderColor: colors.cyan,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 2,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    fontWeight: "700",
    letterSpacing: 1,
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
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  txnDesc: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  txnRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 2,
  },
  categoryPillEmoji: {
    fontSize: 11,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  moreText: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
    paddingTop: spacing.sm,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pickerWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 2,
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
    borderRadius: 2,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  pickerPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerEmoji: {
    fontSize: 14,
  },
  pickerLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pickerLabelActive: {
    color: colors.bg,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1,
  },
  importBtn: {
    flex: 2,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  importBtnText: {
    color: colors.bg,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
});
