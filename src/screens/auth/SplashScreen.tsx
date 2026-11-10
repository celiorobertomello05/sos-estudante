import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Brand from "../../components/Brand";
import { Row, Txt } from "../../components/ui";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import { styles } from "./styles";

export function SplashScreen() {
  const { booting, profile, hasSeenOnboarding } = useApp();
  const { reset } = useNav();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (booting) return;
    const timer = setTimeout(async () => {
      if (profile) return reset({ name: "dashboard" });
      const seen = await hasSeenOnboarding();
      reset({ name: seen ? "login" : "onboarding" });
    }, 1400);
    return () => clearTimeout(timer);
  }, [booting, profile, reset, hasSeenOnboarding]);

  return (
    <View style={[styles.splash, { paddingBottom: insets.bottom + 32 }]}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xl }}>
        <View style={styles.splashCard}>
          <Brand full size={130} />
        </View>
        <Txt color={colors.ink500}>Educação começa com dignidade.</Txt>
      </View>
      <Row gap={8}>
        <ActivityIndicator color={colors.brand600} size="small" />
        <Txt variant="small" color={colors.ink400}>
          Preparando seu acesso
        </Txt>
      </Row>
    </View>
  );
}
