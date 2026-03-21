import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { notification } from "../../src/lib/haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { generateBudgetCategories } from "../../src/budget";
import { formatCurrency, getMonthKey } from "../../src/utils";
import type { Bill } from "../../src/types";

export default function OnboardingSummary() {
  const router = useRouter();
  const { saveProfile, saveBudget } = useApp();
  const params = useLocalSearchParams<{ income: string; bills: string }>();

  const income = parseFloat(params.income ?? "0");
  const bills: Bill[] = params.bills ? JSON.parse(params.bills) : [];
  const categories = generateBudgetCategories(income, bills);
  const totalBudget = categories.reduce((s, c) => s + c.allocated, 0);

  const handleFinish = async () => {
    notification("Success");

    await saveProfile({
      monthlyIncome: income,
      currency: "USD",
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
    });

    await saveBudget({
      month: getMonthKey(),
      categories,
    });

    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={styles.title}>Nice.{"\n"}Here's your budget.</Text>
        <Text style={styles.subtitle}>
          {formatCurrency(income)}/mo income {"\u2192"} {formatCurrency(totalBudget)}{" "}
          budgeted
        </Text>

        <View style={styles.catList}>
          {categories.map((cat) => (
            <View key={cat.id} style={styles.catRow}>
              <View style={styles.catInfo}>
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text style={styles.catName}>{cat.name}</Text>
                {cat.type === "fixed" && (
                  <View style={styles.fixedBadge}>
                    <Text style={styles.fixedText}>Fixed</Text>
                  </View>
                )}
              </View>
              <Text style={styles.catAmount}>
                {formatCurrency(cat.allocated)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Text style={styles.hint}>You can adjust these anytime in Budget</Text>
        <Pressable onPress={handleFinish} style={styles.btn}>
          <Text style={styles.btnText}>Let's go</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  step: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  title: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  catList: {
    gap: spacing.sm,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  catInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  catEmoji: {
    fontSize: 20,
  },
  catName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  fixedBadge: {
    backgroundColor: colors.primary + "20",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  fixedText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  catAmount: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  bottom: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  btnText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: "700",
  },
});
