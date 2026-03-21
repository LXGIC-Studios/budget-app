import { Pressable, StyleSheet } from "react-native";
import { Plus } from "lucide-react-native";
import { impact } from "../lib/haptics";
import { colors, spacing } from "../theme";

interface Props {
  onPress: () => void;
}

export function FAB({ onPress }: Props) {
  const handlePress = () => {
    impact("Medium");
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.fab}>
      <Plus size={28} color={colors.bg} strokeWidth={3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 0,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
});
