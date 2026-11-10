import { StyleSheet } from "react-native";
import { colors, radius, spacing } from "../../theme";

export const styles = StyleSheet.create({
  shortcuts: { flexDirection: "row", gap: spacing.sm },
  shortcut: { alignItems: "center", borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.sm, paddingHorizontal: 6, paddingVertical: spacing.lg },
  shortcutIcon: { alignItems: "center", backgroundColor: colors.white, borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  banner: { borderRadius: radius.lg, height: 150, justifyContent: "center", overflow: "hidden" },
  bannerButton: { alignSelf: "flex-start", backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  softButton: { alignItems: "center", backgroundColor: colors.trust50, borderRadius: radius.sm, paddingVertical: 10 },
});
