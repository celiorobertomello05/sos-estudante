import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Photo from "../../components/Photo";
import { Txt } from "../../components/ui";
import { colors, spacing } from "../../theme";
import { styles } from "./styles";

/** Banner de campanha (só no modo demonstração; não há campanhas cadastradas). */
export function Banner({ eyebrow, title, action, imageKey, onPress }: { eyebrow: string; title: string; action: string; imageKey: "agasalho" | "kit" | "jaqueta"; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.banner}>
      <Photo imageKey={imageKey} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(15,63,60,0.92)", "rgba(15,63,60,0.35)"]} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={{ gap: spacing.sm, padding: spacing.lg, maxWidth: "70%" }}>
        <Txt variant="caption" color="rgba(255,255,255,0.8)">
          {eyebrow}
        </Txt>
        <Txt variant="h2" color={colors.white}>
          {title}
        </Txt>
        <View style={styles.bannerButton}>
          <Txt variant="label" color={colors.brand800}>
            {action}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}
