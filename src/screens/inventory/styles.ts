import { StyleSheet } from "react-native";
import { colors, radius, spacing } from "../../theme";

export const styles = StyleSheet.create({
  total: { borderRadius: radius.lg, gap: 4, padding: spacing.lg },
  tile: { backgroundColor: colors.white, borderColor: colors.ink100, borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  tileImage: { height: 96, width: "100%" },
  detailImage: { borderRadius: radius.lg, height: 220, width: "100%" },
  thumb: { borderRadius: 10, height: 52, width: 52 },
  actions: { borderTopColor: colors.ink100, borderTopWidth: 1, flexDirection: "row" },
  action: { alignItems: "center", flex: 1, flexDirection: "row", gap: 4, justifyContent: "center", paddingVertical: 12 },
});
