import { StyleSheet } from "react-native";
import { colors, radius, spacing } from "../../theme";

export const styles = StyleSheet.create({
  splash: { alignItems: "center", backgroundColor: colors.white, flex: 1 },
  splashCard: { padding: 24 },
  onboarding: { backgroundColor: colors.white, flexGrow: 1, paddingHorizontal: spacing.xl },
  onboardingBody: { alignItems: "center", flex: 1, gap: spacing.lg, justifyContent: "center", maxWidth: 420, alignSelf: "center" },
  illustration: {
    alignItems: "center",
    backgroundColor: "#f3faf9",
    borderColor: colors.ink100,
    borderRadius: 32,
    borderWidth: 1,
    gap: spacing.lg,
    height: 220,
    justifyContent: "center",
    marginBottom: spacing.lg,
    overflow: "hidden",
    width: 220,
  },
  blob: { backgroundColor: colors.brand100, borderRadius: 70, height: 130, position: "absolute", width: 130 },
  illustrationIcon: { alignItems: "center", backgroundColor: colors.brand600, borderRadius: 22, height: 76, justifyContent: "center", width: 76 },
  dot: { backgroundColor: colors.ink200, borderRadius: 3, height: 6, width: 6 },
  dotActive: { backgroundColor: colors.brand600, width: 22 },
  roleCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.ink200,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flex: 1,
    gap: 6,
    paddingVertical: spacing.md,
  },
  roleCardActive: { backgroundColor: colors.brand50, borderColor: colors.brand600 },
  roleIcon: { alignItems: "center", backgroundColor: colors.ink100, borderRadius: radius.sm, height: 34, justifyContent: "center", width: 34 },
  progress: { backgroundColor: colors.ink200, borderRadius: 3, flex: 1, height: 5 },
});
