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
      <Plus size={26} color={colors.primaryText} strokeWidth={2.5} />
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
    borderRadius: 2,
    backgroundColor: colors.primarySolid,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100,
  },
});
