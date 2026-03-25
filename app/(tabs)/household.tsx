import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Users,
  Plus,
  LogIn,
  Copy,
  LogOut,
  Crown,
  User,
} from "lucide-react-native";
import { impact, notification } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";

export default function HouseholdScreen() {
  const {
    household,
    householdMembers,
    createHousehold,
    joinHousehold,
    leaveHousehold,
  } = useApp();

  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const success = await createHousehold(name.trim());
    setLoading(false);
    if (success) {
      impact("Medium");
      setName("");
      setMode("idle");
    } else {
      const msg = "Failed to create household. You may already be in one.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const success = await joinHousehold(code.trim());
    setLoading(false);
    if (success) {
      impact("Medium");
      setCode("");
      setMode("idle");
    } else {
      const msg = "Invalid invite code or you're already in a household.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    }
  };

  const handleLeave = () => {
    const doLeave = async () => {
      notification("Warning");
      await leaveHousehold();
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Leave this household? You'll only see your own data again."
        )
      ) {
        doLeave();
      }
    } else {
      Alert.alert(
        "Leave Household",
        "Leave this household? You'll only see your own data again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: doLeave },
        ]
      );
    }
  };

  const handleCopyCode = async () => {
    if (!household?.inviteCode) return;
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(household.inviteCode);
      } catch {
        // fallback - just show the code
      }
    }
    impact("Light");
    const msg = `Invite code copied: ${household.inviteCode}`;
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert("Copied", msg);
    }
  };

  // Not in a household
  if (!household) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Text style={styles.header}>Household</Text>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Users size={40} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Shared Budgets</Text>
            <Text style={styles.heroSubtext}>
              Create or join a household to share budgets, transactions, and
              debts with your partner or family.
            </Text>
          </View>

          {mode === "idle" && (
            <View style={styles.actionButtons}>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => setMode("create")}
              >
                <Plus size={20} color={colors.bg} />
                <Text style={styles.primaryBtnText}>Create Household</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryBtn}
                onPress={() => setMode("join")}
              >
                <LogIn size={20} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>Join with Code</Text>
              </Pressable>
            </View>
          )}

          {mode === "create" && (
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Household Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Smith Family"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <View style={styles.formButtons}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setMode("idle");
                    setName("");
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, loading && styles.disabledBtn]}
                  onPress={handleCreate}
                  disabled={loading}
                >
                  <Text style={styles.saveBtnText}>
                    {loading ? "Creating..." : "Create"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {mode === "join" && (
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Invite Code</Text>
              <TextInput
                style={[styles.formInput, styles.codeInput]}
                placeholder="ABC123"
                placeholderTextColor={colors.textSecondary}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
                autoFocus
              />
              <View style={styles.formButtons}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setMode("idle");
                    setCode("");
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, loading && styles.disabledBtn]}
                  onPress={handleJoin}
                  disabled={loading}
                >
                  <Text style={styles.saveBtnText}>
                    {loading ? "Joining..." : "Join"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // In a household
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>{household.name}</Text>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Invite Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeCardLabel}>INVITE CODE</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{household.inviteCode}</Text>
            <Pressable style={styles.copyBtn} onPress={handleCopyCode}>
              <Copy size={18} color={colors.primary} />
              <Text style={styles.copyBtnText}>Copy</Text>
            </Pressable>
          </View>
          <Text style={styles.codeHint}>
            Share this code so others can join your household
          </Text>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            MEMBERS ({householdMembers.length})
          </Text>
          {householdMembers.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberLeft}>
                <View style={styles.memberAvatar}>
                  {member.role === "owner" ? (
                    <Crown size={18} color={colors.primary} />
                  ) : (
                    <User size={18} color={colors.textSecondary} />
                  )}
                </View>
                <View>
                  <Text style={styles.memberName}>
                    {member.fullName ||
                      member.email?.split("@")[0] ||
                      "Unknown"}
                  </Text>
                  <Text style={styles.memberRole}>
                    {member.role === "owner" ? "Owner" : "Member"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Leave */}
        <Pressable style={styles.leaveBtn} onPress={handleLeave}>
          <LogOut size={18} color={colors.red} />
          <Text style={styles.leaveBtnText}>Leave Household</Text>
        </Pressable>
      </ScrollView>
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
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
  },
  heroSubtext: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
  },
  primaryBtnText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  formInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.white,
    fontSize: 16,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 8,
  },
  formButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  saveBtnText: {
    color: colors.bg,
    fontWeight: "700",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  codeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  codeCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: colors.textSecondary,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 6,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  copyBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  codeHint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  section: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 2,
  },
  memberLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  memberName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "500",
  },
  memberRole: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginTop: spacing.md,
  },
  leaveBtnText: {
    color: colors.red,
    fontSize: 15,
    fontWeight: "600",
  },
});
