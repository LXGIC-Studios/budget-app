import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme";

interface Props {
  label: string;
  value: string;
  emoji: string;
  color?: string;
  accentColor?: string;
  variant?: "positive" | "negative" | "neutral";
}

export function StatCard({ label, value, emoji, color = colors.white, accentColor, variant }: Props) {
  // Determine variant from color if not explicitly set
  const resolvedVariant = variant
    ?? (color === colors.red || accentColor === colors.red ? "negative"
    : color === colors.primary || accentColor === colors.primary ? "positive"
    : "neutral");

  const cardStyle = resolvedVariant === "positive"
    ? { backgroundColor: colors.primarySolid, borderColor: colors.primarySolid, borderLeftColor: colors.primarySolid }
    : resolvedVariant === "negative"
    ? { backgroundColor: colors.red, borderColor: colors.red, borderLeftColor: colors.red }
    : { backgroundColor: colors.card, borderColor: accentColor === colors.red ? colors.red : colors.cardBorder, borderLeftColor: accentColor || colors.cardBorder };

  const valueColor = resolvedVariant === "positive"
    ? colors.primaryText
    : resolvedVariant === "negative"
    ? colors.white
    : accentColor === colors.red ? colors.red : colors.primarySolid;

  const labelColor = resolvedVariant === "positive"
    ? colors.primaryText
    : resolvedVariant === "negative"
    ? 'rgba(255,255,255,0.8)'
    : colors.textSecondary;

  return (
    <View style={[styles.card, {
      backgroundColor: cardStyle.backgroundColor,
      borderColor: cardStyle.borderColor,
      borderLeftWidth: 3,
      borderLeftColor: cardStyle.borderLeftColor,
    }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text
        style={[styles.value, { color: valueColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[styles.label, { color: labelColor }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  emoji: {
    fontSize: 20,
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 2,
  },
});
