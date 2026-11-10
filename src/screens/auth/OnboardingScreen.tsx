import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Pill, Row, Txt } from "../../components/ui";
import type { IconName } from "../../components/ui";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import { styles } from "./styles";

const slides: { icon: IconName; title: string; body: string; chips?: string[] }[] = [
  {
    icon: "shirt-outline",
    title: "Doe o que ainda pode ser usado",
    body: "Uniformes e materiais escolares em boas condições podem transformar a trajetória escolar de outro estudante. Cada peça conta.",
    chips: ["Novo", "Muito bom", "Bom"],
  },
  {
    icon: "shield-checkmark-outline",
    title: "Processo seguro e transparente",
    body: "Triagem, estoque e solicitações são acompanhados em todas as etapas, com dados pessoais protegidos.",
  },
  {
    icon: "school-outline",
    title: "Dignidade para estudar",
    body: "A retirada é confirmada com código de 4 dígitos, foto dos itens e assinatura digital.",
  },
];

export function OnboardingScreen() {
  const { reset } = useNav();
  const app = useApp();
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();
  const slide = slides[step];
  const finish = async () => {
    await app.markOnboardingSeen().catch(() => undefined);
    reset({ name: "login" });
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.onboarding,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <Pressable accessibilityRole="button" hitSlop={10} onPress={finish} style={{ alignSelf: "flex-end" }}>
        <Txt variant="label" color={colors.ink500}>
          Pular
        </Txt>
      </Pressable>
      <View style={styles.onboardingBody}>
        <View style={styles.illustration}>
          <View style={[styles.blob, { top: -40, right: -40 }]} />
          <View style={[styles.blob, { bottom: -50, left: -50, backgroundColor: colors.brand50 }]} />
          <View style={styles.illustrationIcon}>
            <Ionicons color={colors.white} name={slide.icon} size={40} />
          </View>
          {slide.chips ? (
            <Row gap={6}>
              {slide.chips.map((chip, i) => (
                <Pill key={chip} label={chip} tone={i === 0 ? "brand" : "neutral"} />
              ))}
            </Row>
          ) : null}
        </View>
        <Txt variant="display" center>
          {slide.title}
        </Txt>
        <Txt center>{slide.body}</Txt>
      </View>
      <Row gap={6} style={{ justifyContent: "center", marginBottom: spacing.lg }}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </Row>
      <Button label={step === slides.length - 1 ? "Começar" : "Próximo"} onPress={() => (step === slides.length - 1 ? finish() : setStep(step + 1))} />
    </ScrollView>
  );
}
