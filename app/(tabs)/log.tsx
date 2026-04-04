import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Upload } from "lucide-react-native";
import { impact, notification } from "../../src/lib/haptics";
import { colors, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import { CSVImportSheet } from "../../src/components/CSVImportSheet";
import { formatCurrency, formatShortDate } from "../../src/utils";
import type { Transaction } from "../../src/types";


const FILTER_OPTIONS = ["ALL", "INCOME", "EXPENSES", "TRANSFERS"] as const;
type Filter = (typeof FILTER_OPTIONS)[number];

const CATEGORY_ICONS: Record<string, string> = {
  salary: "💰", other_income: "💵", groceries: "🛒", "eating out": "🍔",
  "gas/transport": "⛽", shopping: "🛍️", subscriptions: "📺", bills: "📋",
  auto: "🚗", health: "💊", kids: "🧒", payments: "💳", clothing: "👕",
  laundry: "🧺", fees: "📑", other: "📦", transfer: "🔄",
};
function getIcon(category: string): string {
  return CATEGORY_ICONS[category.toLowerCase()] ?? "📦";
}

export default function LogScreen() {
  const { transactions, addTransaction, addTransactions, updateTransaction, deleteTransaction, userAccounts } = useApp();

  const getTagInfo = (tag?: string) => {
    if (!tag) return null;
    const found = userAccounts.find((t) => t.id === tag);
    return found ? { label: found.label, emoji: found.emoji } : null;
  };
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | undefined>(undefined);
  const [sheetInitialMode, setSheetInitialMode] = useState<"expense" | "income" | undefined>(undefined);
  const [csvImportVisible, setCsvImportVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filter === "ALL") list = list.filter((t) => t.type !== "transfer");
    if (filter === "INCOME") list = list.filter((t) => t.type === "income");
    if (filter === "EXPENSES") list = list.filter((t) => t.type === "expense");
    if (filter === "TRANSFERS") list = list.filter((t) => t.type === "transfer");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        (t.note?.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [transactions, filter, search]);

  const handleCSVImport = async (txns: Transaction[]) => {
    await addTransactions(txns);
    const msg = `Imported ${txns.length} transaction${txns.length !== 1 ? "s" : ""}.`;
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert("Done", msg);
  };

  const handleDelete = (id: string) => {
    notification("Warning");
    deleteTransaction(id);
  };

  const openAdd = (mode: "expense" | "income") => {
    impact("Light");
    setEditingTxn(undefined);
    setSheetInitialMode(mode);
    setSheetVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>LOG</Text>
        <Pressable
          onPress={() => { impact("Light"); setCsvImportVisible(true); }}
          style={styles.importBtn}
        >
          <Upload size={14} color={colors.primaryText} strokeWidth={2.5} />
          <Text style={styles.importBtnText}>CSV</Text>
        </Pressable>
      </View>

      {/* Quick add row */}
      <View style={styles.quickRow}>
        <Pressable onPress={() => openAdd("expense")} style={[styles.quickBtn, styles.quickExpense]}>
          <Text style={styles.quickBtnText}>+ EXPENSE</Text>
        </Pressable>
        <Pressable onPress={() => openAdd("income")} style={[styles.quickBtn, styles.quickIncome]}>
          <Text style={[styles.quickBtnText, { color: colors.primaryText }]}>+ INCOME</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((f) => (
          <Pressable
            key={f}
            onPress={() => { impact("Light"); setFilter(f); }}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
        <Text style={styles.filterCount}>{filtered.length}</Text>
      </View>

      {/* Transaction list */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>
              {search ? "Try a different search" : "Tap + EXPENSE or import a CSV to get started"}
            </Text>
          </View>
        ) : (
          filtered.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => { setEditingTxn(t); setSheetInitialMode(undefined); setSheetVisible(true); }}
              onLongPress={() => handleDelete(t.id)}
              style={styles.txnRow}
            >
              <View style={styles.txnIcon}>
                <Text style={styles.txnEmoji}>{getIcon(t.category)}</Text>
              </View>
              <View style={styles.txnMeta}>
                <Text style={styles.txnCategory}>{t.category}</Text>
                {t.note && <Text style={styles.txnNote} numberOfLines={1}>{t.note}</Text>}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.txnDate}>{formatShortDate(t.date)}</Text>
                  {getTagInfo(t.accountTag) && (
                    <View style={styles.acctChip}>
                      <Text style={styles.acctChipText}>{getTagInfo(t.accountTag)!.emoji} {getTagInfo(t.accountTag)!.label}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.txnAmount, t.type === "income" ? styles.amountIn : t.type === "transfer" ? styles.amountTransfer : styles.amountOut]}>
                {t.type === "income" ? "+" : t.type === "transfer" ? "" : "-"}{formatCurrency(t.amount)}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); setEditingTxn(undefined); setSheetInitialMode(undefined); }}
        onSave={addTransaction}
        editTransaction={editingTxn}
        onUpdate={updateTransaction}
        onDelete={(id) => { deleteTransaction(id); setSheetVisible(false); setEditingTxn(undefined); }}
        initialMode={sheetInitialMode}
      />

      <CSVImportSheet
        visible={csvImportVisible}
        onClose={() => setCsvImportVisible(false)}
        onImport={handleCSVImport}
        existingTransactions={transactions}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 6,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySolid,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 2,
  },
  importBtnText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  quickRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 2,
    borderWidth: 1,
  },
  quickExpense: {
    borderColor: colors.red,
    backgroundColor: colors.redBg,
  },
  quickIncome: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  quickBtnText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  searchRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  filterBtnActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(0,255,204,0.1)",
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  filterTextActive: {
    color: colors.primary,
  },
  filterCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: "auto",
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: spacing.sm,
  },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  txnEmoji: {
    fontSize: 18,
  },
  txnMeta: {
    flex: 1,
    gap: 2,
  },
  txnCategory: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  txnNote: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  txnDate: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
  amountIn: {
    color: colors.primary,
  },
  amountOut: {
    color: colors.red,
  },
  amountTransfer: {
    color: colors.textSecondary,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  acctChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  acctChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
