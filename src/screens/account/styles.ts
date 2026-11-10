import { StyleSheet } from "react-native";
import { colors, radius, spacing } from "../../theme";

export const styles = StyleSheet.create({
  historyHero: { alignItems: "center", borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  historyIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  historyThumb: { alignItems: "center", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  markRead: { backgroundColor: colors.brand50, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  notifIcon: { alignItems: "center", backgroundColor: colors.white, borderRadius: 10, borderWidth: 1, height: 32, justifyContent: "center", width: 32 },
  cameraBadge: { alignItems: "center", backgroundColor: colors.white, borderRadius: 10, bottom: -2, height: 20, justifyContent: "center", position: "absolute", right: -2, width: 20 },
  rolePill: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  groupTitle: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  docBox: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.ink300, borderRadius: radius.md, borderStyle: "dashed", borderWidth: 1.5, gap: 4, overflow: "hidden", padding: spacing.lg },
  docPreview: { borderRadius: 8, height: 140, width: "100%" },
  enrollmentHistoryHeader: { gap: 2, padding: spacing.lg },
  enrollmentHistoryItem: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  faqRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.lg },
});
