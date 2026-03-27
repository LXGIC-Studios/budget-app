import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SectionList,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { notification, impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { TransactionItem } from "../../src/components/TransactionItem";
import { FAB } from "../../src/components/FAB";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import { formatRelativeDate } from "../../src/utils";
import type { Transaction } from "../../src/types";

type Filter = "all" | "income" | "expense";

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export default function HistoryScreen() {
  const { transactions, deleteTransaction, addTransaction, updateTransaction } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    new Date().getMonth()
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | undefined>(undefined);
  const monthScrollRef = useRef<ScrollView>(null);

  // Scroll to current month pill on mount
  useEffect(() => {
    if (selectedMonth !== null && monthScrollRef.current) {
      // Each pill is ~56px wide + 8px gap
      const offset = Math.max(0, selectedMonth * 64 - 32);
      setTimeout(() => {
        monthScrollRef.current?.scrollTo({ x: offset, animated: false });
      }, 100);
    }
  }, []);

  // Get unique categories from all transactions
  const categories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach((t) => cats.add(t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = [...transactions];

    // Sort by date descending (newest first)
    list.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Month filter
    if (selectedMonth !== null) {
      list = list.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === selectedMonth;
      });
    }

    // Type filter
    if (filter !== "all") {
      list = list.filter((t) => t.type === filter);
    }

    // Category filter
    if (selectedCategory !== "all") {
      list = list.filter((t) => t.category === selectedCategory);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.category.toLowerCase().includes(q) ||
          (t.note && t.note.toLowerCase().includes(q))
      );
    }

    return list;
  }, [transactions, filter, search, selectedMonth, selectedCategory]);

  const sections = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      const key = formatRelativeDate(t.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    // Sections are already in order since filtered is sorted
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

  const typeFilters: { label: string; value: Filter }[] = [
    { label: "ALL", value: "all" },
    { label: "INCOME", value: "income" },
    { label: "EXPENSES", value: "expense" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>History</Text>

      {/* Search */}
      <View style={styles.searchRow}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={colors.dimmed}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Type Filters */}
      <View style={styles.filterRow}>
        {typeFilters.map((f) => (
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

      {/* Month Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>MONTH</Text>
        <ScrollView
          ref={monthScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          <Pressable
            onPress={() => {
              impact("Light");
              setSelectedMonth(null);
            }}
            style={[
              styles.pill,
              selectedMonth === null && styles.pillActive,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                selectedMonth === null && styles.pillTextActive,
              ]}
            >
              ALL
            </Text>
          </Pressable>
          {MONTHS.map((m, i) => (
            <Pressable
              key={m}
              onPress={() => {
                impact("Light");
                setSelectedMonth(i);
              }}
              style={[
                styles.pill,
                selectedMonth === i && styles.pillActive,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedMonth === i && styles.pillTextActive,
                ]}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Category Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>CATEGORY</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          <Pressable
            onPress={() => {
              impact("Light");
              setSelectedCategory("all");
            }}
            style={[
              styles.pill,
              selectedCategory === "all" && styles.pillActive,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                selectedCategory === "all" && styles.pillTextActive,
              ]}
            >
              ALL
            </Text>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => {
                impact("Light");
                setSelectedCategory(cat);
              }}
              style={[
                styles.pill,
                selectedCategory === cat && styles.pillActive,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedCategory === cat && styles.pillTextActive,
                ]}
              >
                {cat.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Transaction Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filtered.length} TRANSACTION{filtered.length !== 1 ? "S" : ""}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={() => {
              setEditingTxn(item);
              setSheetVisible(true);
            }}
            onLongPress={() => handleDelete(item)}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />

      <FAB onPress={() => {
        setEditingTxn(undefined);
        setSheetVisible(true);
      }} />
      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingTxn(undefined);
        }}
        onSave={addTransaction}
        editTransaction={editingTxn}
        onUpdate={updateTransaction}
        onDelete={(id) => {
          deleteTransaction(id);
          setSheetVisible(false);
          setEditingTxn(undefined);
        }}
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
    fontSize: 32,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primarySolid,
    borderColor: colors.primarySolid,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  filterTextActive: {
    color: colors.primaryText,
  },
  filterSection: {
    marginBottom: spacing.sm,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    paddingHorizontal: spacing.md,
    marginBottom: 6,
  },
  scrollRow: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pillActive: {
    backgroundColor: colors.primarySolid,
    borderColor: colors.primarySolid,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pillTextActive: {
    color: colors.primaryText,
  },
  countRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  countText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
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
    fontSize: 15,
  },
});
