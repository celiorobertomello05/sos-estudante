import { StyleSheet } from "react-native";
import { colors, fonts, radius, spacing } from "../../theme";

export const styles = StyleSheet.create({
  routeIcon: { alignItems: "center", backgroundColor: colors.brand50, borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  stat: { flex: 1, paddingVertical: spacing.md },
  actions: { borderTopColor: colors.ink100, borderTopWidth: 1, flexDirection: "row" },
  action: { alignItems: "center", flex: 1, flexDirection: "row", gap: 4, justifyContent: "center", paddingVertical: 12 },
  darkHero: { alignItems: "center", backgroundColor: colors.brand900, borderRadius: radius.lg, gap: 6, padding: spacing.xl },
  darkIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  check: { alignItems: "center", backgroundColor: colors.brand100, borderRadius: 11, height: 22, justifyContent: "center", width: 22 },
  codeInput: {
    backgroundColor: colors.ink50,
    borderColor: colors.ink200,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink900,
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: 14,
    paddingVertical: 12,
    textAlign: "center",
  },
  capture: { alignItems: "center", borderColor: colors.ink300, borderRadius: radius.md, borderStyle: "dashed", borderWidth: 1.5, gap: 4, justifyContent: "center", minHeight: 130, overflow: "hidden" },
  preview: { height: 180, width: "100%" },
  doneIcon: { alignItems: "center", alignSelf: "center", backgroundColor: colors.brand600, borderRadius: 45, height: 90, justifyContent: "center", marginTop: spacing.lg, width: 90 },
});
