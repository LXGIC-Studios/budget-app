import { Pressable, Text, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme";
import * as Haptics from "expo-haptics";

interface Props {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function CategoryPill({ emoji, label, selected, onPress }: Props) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.pill, selected && styles.selected]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, selected && styles.selectedLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selected: {
    backgroundColor: colors.primarySolid,
    borderColor: colors.primarySolid,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  selectedLabel: {
    color: colors.primaryText,
    fontWeight: "700",
  },
});
