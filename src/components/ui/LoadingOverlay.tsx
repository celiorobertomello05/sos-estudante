import { ActivityIndicator, Modal, StyleSheet, View } from "react-native";
import { colors, radius, shadow, spacing } from "../../theme";
import { Txt } from "./Txt";

/**
 * Tela de carregamento por cima do app durante conexões (login, cadastro,
 * links de e-mail). Bloqueia toques para evitar envios repetidos.
 */
export function LoadingOverlay({ message }: { message: string | null }) {
  return (
    <Modal animationType="fade" onRequestClose={() => undefined} statusBarTranslucent transparent visible={Boolean(message)}>
      <View accessibilityLiveRegion="polite" accessibilityViewIsModal style={styles.backdrop}>
        <View accessible accessibilityLabel={message ?? undefined} style={styles.card}>
          <ActivityIndicator color={colors.brand600} size="large" />
          <Txt variant="title" center>
            {message}
          </Txt>
          <Txt variant="small" center color={colors.ink500}>
            Isso pode levar alguns segundos.
          </Txt>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.overlay, padding: spacing.xl },
  card: {
    ...shadow,
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    maxWidth: 320,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
});
