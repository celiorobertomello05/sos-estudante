import { StyleSheet } from "react-native";
import { colors, radius, spacing } from "../../theme";

export const styles = StyleSheet.create({
  statCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, gap: 6, padding: spacing.md },
  statIcon: { alignItems: "center", borderRadius: 10, height: 34, justifyContent: "center", width: 34 },
  statChip: { borderRadius: radius.pill, flexShrink: 1, marginLeft: 6, paddingHorizontal: 8, paddingVertical: 2 },
  bar: { borderRadius: 6, width: "70%" },
  track: { backgroundColor: colors.ink100, borderRadius: 4, height: 8, overflow: "hidden" },
  trackFill: { borderRadius: 4, height: 8 },
  actionButton: { alignItems: "center", borderRadius: radius.md, borderWidth: 1, paddingVertical: 14 },
  typePill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  backdrop: { backgroundColor: colors.overlay, flex: 1 },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", padding: spacing.xl },
  legendIcon: { alignItems: "center", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  legendDot: { borderRadius: 6, height: 12, width: 12 },
  total: { borderRadius: radius.lg, gap: 4, padding: spacing.lg },
});
