import { StyleSheet } from "react-native";
import { colors, radius, spacing } from "../../theme";

export const styles = StyleSheet.create({
  enrollRow: { alignItems: "center", borderTopColor: colors.ink100, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  stepNumber: { alignItems: "center", backgroundColor: colors.brand600, borderRadius: 12, height: 24, justifyContent: "center", width: 24 },
  successIcon: { alignItems: "center", alignSelf: "center", backgroundColor: colors.trust100, borderRadius: 55, height: 110, justifyContent: "center", marginTop: spacing.xxl, width: 110 },
  plus: { alignItems: "center", backgroundColor: colors.brand600, borderRadius: 10, height: 34, justifyContent: "center", width: 34 },
  statCell: { flex: 1, paddingVertical: spacing.md },
  hero: { borderRadius: radius.lg, gap: 4, padding: spacing.lg },
  heroPill: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  codeBox: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.brand200, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: spacing.lg },
  thumb: { borderRadius: 10, height: 44, width: 44 },
  okDot: { alignItems: "center", backgroundColor: colors.brand100, borderRadius: 13, height: 26, justifyContent: "center", width: 26 },
});
