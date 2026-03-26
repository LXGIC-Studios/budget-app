import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme";

interface Props {
  label: string;
  value: string;
  emoji: string;
  color?: string;
  accentColor?: string;
}

export function StatCard({ label, value, emoji, color = colors.white, accentColor }: Props) {
  const borderColor = accentColor || color;
  const bgTint = accentColor
    ? accentColor + '0D'
    : color === colors.red
    ? colors.redBg
    : color === colors.primary
    ? colors.greenBg
    : 'transparent';

  return (
    <View style={[styles.card, {
      borderLeftColor: borderColor,
      borderLeftWidth: 2,
      backgroundColor: bgTint === 'transparent' ? colors.card : bgTint,
    }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text
        style={[styles.value, {
          color,
          textShadowColor: color + '40',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
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
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
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
