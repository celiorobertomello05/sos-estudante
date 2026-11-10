import { StyleSheet } from "react-native";
import { colors, spacing } from "../../theme";

export const styles = StyleSheet.create({
  successIcon: { alignItems: "center", alignSelf: "center", backgroundColor: colors.brand50, borderRadius: 60, height: 110, justifyContent: "center", marginTop: spacing.xxl, width: 110 },
  successInner: { alignItems: "center", backgroundColor: colors.brand100, borderRadius: 42, height: 84, justifyContent: "center", width: 84 },
  pointImage: { borderRadius: 10, height: 44, width: 44 },
  pointActions: { borderTopColor: colors.ink100, borderTopWidth: 1, flexDirection: "row" },
  directions: { alignItems: "center", backgroundColor: colors.trust50, flexDirection: "row", gap: 6, justifyContent: "center", paddingHorizontal: spacing.lg },
});
