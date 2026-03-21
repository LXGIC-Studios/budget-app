import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SectionList,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { notification, impact } from "../../src/lib/haptics";
import { colors, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { TransactionItem } from "../../src/components/TransactionItem";
import { FAB } from "../../src/components/FAB";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import { formatRelativeDate } from "../../src/utils";
import type { Transaction } from "../../src/types";

type Filter = "all" | "income" | "expense";

export default function HistoryScreen() {
  const { transactions, deleteTransaction, addTransaction } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sheetVisible, setSheetVisible] = useState(false);

  const filtered = useMemo(() => {
    let list = transactions;
    if (filter !== "all") {
      list = list.filter((t) => t.type === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.category.toLowerCase().includes(q) ||
          (t.note && t.note.toLowerCase().includes(q))
      );
    }
    return list;
  }, [transactions, filter, search]);

  const sections = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      const key = formatRelativeDate(t.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const handleDelete = useCallback(
    (txn: Transaction) => {
      notification("Warning");

      const doDelete = () => deleteTransaction(txn.id);

      if (Platform.OS === "web") {
        if (window.confirm(`Remove ${txn.note || txn.category} for $${txn.amount.toFixed(2)}?`)) {
          doDelete();
        }
      } else {
        Alert.alert(
          "Delete Transaction",
          `Remove ${txn.note || txn.category} for $${txn.amount.toFixed(2)}?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: doDelete,
            },
          ]
        );
      }
    },
    [deleteTransaction]
  );

  const filters: { label: string; value: Filter }[] = [
    { label: "ALL", value: "all" },
    { label: "INCOME", value: "income" },
    { label: "EXPENSES", value: "expense" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>HISTORY</Text>

      {/* Search */}
      <View style={styles.searchRow}>
        <Search size={18} color={colors.primary} />
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH TRANSACTIONS..."
          placeholderTextColor={colors.dimmed}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => {
              impact("Light");
              setFilter(f.value);
            }}
            style={[
              styles.filterChip,
              filter === f.value && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.value && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onLongPress={() => handleDelete(item)}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={styles.sectionLine} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>NO TRANSACTIONS FOUND</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />

      <FAB onPress={() => setSheetVisible(true)} />
      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={addTransaction}
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
    color: colors.white,
    fontSize: 36,
    fontWeight: "900",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    letterSpacing: -1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 2,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  filterTextActive: {
    color: colors.bg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.pink,
  },
  list: {
    paddingBottom: 100,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
