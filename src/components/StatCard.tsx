import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";

interface Props {
  label: string;
  value: string;
  emoji: string;
  color?: string;
}

const INDICATOR_COLORS: Record<string, string> = {
  "\uD83D\uDCB0": colors.primary,
  "\uD83D\uDCCA": colors.cyan,
  "\uD83C\uDFAF": colors.yellow,
};

export function StatCard({ label, value, emoji, color = colors.white }: Props) {
  const indicatorColor = INDICATOR_COLORS[emoji] || colors.pink;
  return (
    <View style={styles.card}>
      <View style={[styles.indicator, { backgroundColor: indicatorColor }]} />
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  indicator: {
    width: 8,
    height: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
});
