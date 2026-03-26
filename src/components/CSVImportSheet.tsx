import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { colors, spacing, radius } from "../theme";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../types";
import type { Transaction } from "../types";
import { formatCurrency, formatShortDate } from "../utils";
import { parseCSV } from "../lib/csv-parser";
import { parseOFX } from "../lib/ofx-parser";
import { impact, notification } from "../lib/haptics";

interface ReviewItem {
  transaction: Transaction;
  included: boolean;
  isDuplicate: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onImport: (txns: Transaction[]) => void;
  existingTransactions: Transaction[];
}

function getCategoryEmoji(id: string): string {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  return all.find((c) => c.id === id)?.emoji ?? "📦";
}

function getCategoryName(id: string): string {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  return all.find((c) => c.id === id)?.name ?? id;
}

function checkDuplicate(txn: Transaction, existing: Transaction[]): boolean {
  const txnDate = txn.date.slice(0, 10);
  const txnNote = (txn.note ?? "").toLowerCase().slice(0, 20);
  return existing.some((e) => {
    const eDate = e.date.slice(0, 10);
    const eNote = (e.note ?? "").toLowerCase().slice(0, 20);
    return eDate === txnDate && e.amount === txn.amount && eNote === txnNote;
  });
}

function isInternalTransfer(description: string): boolean {
  const lower = description.toLowerCase();
  return (
    lower.includes("online transfer from") ||
    lower.includes("online transfer to") ||
    lower.includes("transfer from checking") ||
    lower.includes("transfer to checking") ||
    lower.includes("transfer from savings") ||
    lower.includes("transfer to savings")
  );
}

async function readFileContent(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    return response.text();
  }
  return FileSystem.readAsStringAsync(uri);
}

export function CSVImportSheet({ visible, onClose, onImport, existingTransactions }: Props) {
  const [step, setStep] = useState<"pick" | "loading" | "review">("pick");
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/csv",
          "text/comma-separated-values",
          "application/x-ofx",
          "application/ofx",
          "text/plain",
          "application/octet-stream",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setFileName(file.name ?? "file");
      setStep("loading");

      const content = await readFileContent(file.uri);

      const isOFX =
        file.name?.toLowerCase().endsWith(".ofx") ||
        file.name?.toLowerCase().endsWith(".qfx") ||
        content.trimStart().startsWith("OFXHEADER") ||
        content.includes("<OFX>");

      const parsed = isOFX ? parseOFX(content) : parseCSV(content);

      if (parsed.length === 0) {
        const msg = "No transactions found. Make sure it's a valid bank statement CSV.";
        if (Platform.OS === "web") {
          window.alert(msg);
        } else {
          Alert.alert("No Transactions", msg);
        }
        setStep("pick");
        return;
      }

      // Build review items with duplicate detection and auto-exclude transfers
      const items: ReviewItem[] = parsed.map((txn) => {
        const isDuplicate = checkDuplicate(txn, existingTransactions);
        const isTransfer = isInternalTransfer(txn.note ?? "");
        return {
          transaction: txn,
          included: !isDuplicate && !isTransfer,
          isDuplicate,
        };
      });

      setReviewItems(items);
      setEditingCategory(null);
      setStep("review");
    } catch {
      const msg = "Failed to read the file. Please try again.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Import Error", msg);
      }
      setStep("pick");
    }
  };

  const handleToggleItem = (index: number) => {
    impact("Light");
    setReviewItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], included: !updated[index].included };
      return updated;
    });
  };

  const handleCategoryChange = (index: number, newCategory: string) => {
    setReviewItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        transaction: { ...updated[index].transaction, category: newCategory },
      };
      return updated;
    });
    setEditingCategory(null);
    impact("Light");
  };

  const handleImport = () => {
    const selected = reviewItems
      .filter((item) => item.included)
      .map((item) => item.transaction);

    if (selected.length === 0) {
      const msg = "No transactions selected to import.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Nothing Selected", msg);
      }
      return;
    }

    notification("Success");
    onImport(selected);
    handleClose();
  };

  const handleClose = () => {
    setStep("pick");
    setReviewItems([]);
    setEditingCategory(null);
    setFileName("");
    onClose();
  };

  const includedCount = reviewItems.filter((r) => r.included).length;
  const duplicateCount = reviewItems.filter((r) => r.isDuplicate).length;
  const totalIncome = reviewItems
    .filter((r) => r.included && r.transaction.type === "income")
    .reduce((s, r) => s + r.transaction.amount, 0);
  const totalExpenses = reviewItems
    .filter((r) => r.included && r.transaction.type === "expense")
    .reduce((s, r) => s + r.transaction.amount, 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {step === "pick" && (
            <View style={styles.pickContent}>
              <Text style={styles.title}>IMPORT BANK STATEMENT</Text>
              <Text style={styles.subtitle}>
                Select a CSV or OFX file from your bank
              </Text>

              <Pressable onPress={handlePickFile} style={styles.pickBtn}>
                <Text style={styles.pickBtnText}>SELECT FILE</Text>
              </Pressable>

              <Text style={styles.supportedText}>
                Supports Chase, Wells Fargo, Bank of America, and generic CSV formats
              </Text>

              <Pressable onPress={handleClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </Pressable>
            </View>
          )}

          {step === "loading" && (
            <View style={styles.loadingContent}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.loadingText}>
                PARSING {fileName.toUpperCase()}...
              </Text>
            </View>
          )}

          {step === "review" && (
            <View style={styles.reviewContent}>
              {/* Review header */}
              <Text style={styles.title}>REVIEW IMPORT</Text>

              <View style={styles.statsRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statValue}>{includedCount}</Text>
                  <Text style={styles.statLabel}>SELECTED</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {formatCurrency(totalIncome)}
                  </Text>
                  <Text style={styles.statLabel}>INCOME</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={[styles.statValue, { color: colors.red }]}>
                    {formatCurrency(totalExpenses)}
                  </Text>
                  <Text style={styles.statLabel}>EXPENSES</Text>
                </View>
              </View>

              {duplicateCount > 0 && (
                <View style={styles.duplicateWarning}>
                  <Text style={styles.duplicateWarningText}>
                    {duplicateCount} DUPLICATE{duplicateCount !== 1 ? "S" : ""} DETECTED — AUTO-EXCLUDED
                  </Text>
                </View>
              )}

              {/* Transaction list */}
              <FlatList
                data={reviewItems}
                keyExtractor={(_, index) => String(index)}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item, index }) => (
                  <View>
                    <Pressable
                      onPress={() => handleToggleItem(index)}
                      style={[
                        styles.reviewRow,
                        !item.included && styles.reviewRowExcluded,
                      ]}
                    >
                      {/* Checkbox */}
                      <View
                        style={[
                          styles.checkbox,
                          item.included && styles.checkboxActive,
                        ]}
                      >
                        {item.included && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>

                      {/* Info */}
                      <View style={styles.reviewInfo}>
                        <View style={styles.reviewTopRow}>
                          <Text style={styles.reviewDate}>
                            {formatShortDate(item.transaction.date)}
                          </Text>
                          {item.isDuplicate && (
                            <View style={styles.dupBadge}>
                              <Text style={styles.dupBadgeText}>DUPLICATE</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.reviewDesc,
                            !item.included && styles.reviewDescExcluded,
                          ]}
                          numberOfLines={1}
                        >
                          {item.transaction.note || "No description"}
                        </Text>
                      </View>

                      {/* Right side: amount + category */}
                      <View style={styles.reviewRight}>
                        <Text
                          style={[
                            styles.reviewAmount,
                            {
                              color: item.transaction.type === "income"
                                ? colors.primary
                                : colors.red,
                            },
                            !item.included && { opacity: 0.4 },
                          ]}
                        >
                          {item.transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(item.transaction.amount)}
                        </Text>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setEditingCategory(editingCategory === index ? null : index);
                          }}
                          style={styles.catPill}
                        >
                          <Text style={styles.catPillEmoji}>
                            {getCategoryEmoji(item.transaction.category)}
                          </Text>
                          <Text style={styles.catPillText}>
                            {getCategoryName(item.transaction.category)}
                          </Text>
                        </Pressable>
                      </View>
                    </Pressable>

                    {/* Category picker */}
                    {editingCategory === index && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.catPickerRow}
                      >
                        {(item.transaction.type === "expense"
                          ? EXPENSE_CATEGORIES
                          : INCOME_CATEGORIES
                        ).map((cat) => (
                          <Pressable
                            key={cat.id}
                            onPress={() => handleCategoryChange(index, cat.id)}
                            style={[
                              styles.catPickerPill,
                              item.transaction.category === cat.id && styles.catPickerPillActive,
                            ]}
                          >
                            <Text style={styles.catPickerEmoji}>{cat.emoji}</Text>
                            <Text
                              style={[
                                styles.catPickerLabel,
                                item.transaction.category === cat.id && styles.catPickerLabelActive,
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />

              {/* Action buttons */}
              <View style={styles.reviewActions}>
                <Pressable onPress={handleClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </Pressable>
                <Pressable
                  onPress={handleImport}
                  style={[
                    styles.importBtn,
                    includedCount === 0 && styles.importBtnDisabled,
                  ]}
                >
                  <Text style={styles.importBtnText}>
                    IMPORT {includedCount} SELECTED
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheetWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "90%",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderTopWidth: 1,
    borderTopColor: colors.primarySolid,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dimmed,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },

  // Pick step
  pickContent: {
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  pickBtn: {
    backgroundColor: colors.primarySolid,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 2,
    alignItems: "center",
  },
  pickBtnText: {
    color: colors.primaryText,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
  },
  supportedText: {
    color: colors.dimmed,
    fontSize: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // Loading step
  loadingContent: {
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },

  // Review step
  reviewContent: {
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  statValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  duplicateWarning: {
    backgroundColor: colors.redBg,
    borderWidth: 1,
    borderColor: colors.redBorder,
    borderRadius: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  duplicateWarningText: {
    color: colors.red,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  list: {
    maxHeight: 380,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  reviewRowExcluded: {
    opacity: 0.45,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: colors.primarySolid,
    borderColor: colors.primarySolid,
  },
  checkmark: {
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: "800",
  },
  reviewInfo: {
    flex: 1,
  },
  reviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  reviewDate: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  dupBadge: {
    backgroundColor: colors.redBg,
    borderWidth: 1,
    borderColor: colors.redBorder,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  dupBadgeText: {
    color: colors.red,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },
  reviewDesc: {
    color: colors.white,
    fontSize: 13,
    marginTop: 2,
  },
  reviewDescExcluded: {
    color: colors.textSecondary,
  },
  reviewRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  reviewAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
  },
  catPillEmoji: {
    fontSize: 10,
  },
  catPillText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "600",
  },
  catPickerRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  catPickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  catPickerPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  catPickerEmoji: {
    fontSize: 13,
  },
  catPickerLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  catPickerLabelActive: {
    color: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  reviewActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 1,
  },
  importBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.primarySolid,
    borderRadius: 2,
  },
  importBtnDisabled: {
    opacity: 0.4,
  },
  importBtnText: {
    color: colors.primaryText,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 1,
  },
});
