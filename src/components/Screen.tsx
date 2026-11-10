import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useNav } from "../navigation/Navigator";
import { backTarget } from "../navigation/routes";
import { useApp } from "../store/AppStore";
import { CONTENT_MAX_WIDTH, colors, spacing } from "../theme";
import BottomNav from "./BottomNav";
import { Txt } from "./ui";

/**
 * Estrutura padrão de tela: cabeçalho com voltar, conteúdo rolável centralizado
 * (largura máxima em tablets), rodapé fixo opcional e barra inferior.
 */
export default function Screen({
  title,
  children,
  hero,
  right,
  footer,
  tabs = false,
  back,
  scroll = true,
  gap = spacing.lg,
  padded = true,
}: {
  title?: string;
  children: ReactNode;
  /** Bloco de destaque colado ao topo (cabeçalhos verdes do protótipo). */
  hero?: ReactNode;
  right?: ReactNode;
  footer?: ReactNode;
  tabs?: boolean;
  /** Por padrão mostra "voltar" se houver histórico. */
  back?: boolean | (() => void);
  scroll?: boolean;
  gap?: number;
  padded?: boolean;
}) {
  const nav = useNav();
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const target = backTarget(nav.route.name, nav.canGoBack);
  const showBack = back === undefined ? target !== null : Boolean(back);
  const defaultBack = () => (target === "home" ? nav.reset({ name: "dashboard" }) : nav.back());
  const onBack = typeof back === "function" ? back : defaultBack;

  const body = (
    <View style={[styles.content, padded && styles.padded, { gap }]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      {!hero ? <StatusBar style="dark" /> : null}
      {title !== undefined && !hero ? (
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <View style={styles.headerSide}>
            {showBack ? (
              <Pressable accessibilityLabel="Voltar" accessibilityRole="button" hitSlop={10} onPress={onBack} style={styles.back}>
                <Ionicons color={colors.ink900} name="chevron-back" size={20} />
              </Pressable>
            ) : null}
          </View>
          <Txt numberOfLines={1} style={{ flex: 1, textAlign: "center" }} variant="h2">
            {title}
          </Txt>
          <View style={[styles.headerSide, { alignItems: "flex-end" }]}>{right}</View>
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xxl, paddingTop: hero ? 0 : (title === undefined ? insets.top : 0) + (padded ? spacing.lg : 0) }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            app.mode === "online" ? (
              <RefreshControl
                colors={[colors.brand600]}
                onRefresh={async () => {
                  setRefreshing(true);
                  await app.refresh();
                  setRefreshing(false);
                }}
                refreshing={refreshing}
              />
            ) : undefined
          }
          style={styles.root}
        >
          {hero}
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.root, !hero && { paddingTop: (title === undefined ? insets.top : 0) + (padded ? spacing.lg : 0) }]}>
          {hero}
          {body}
        </View>
      )}
      {footer ? <View style={[styles.footer, !tabs && { paddingBottom: insets.bottom + spacing.lg }]}><View style={[styles.content, { gap: spacing.sm }]}>{footer}</View></View> : null}
      {tabs && app.profile ? <BottomNav role={app.profile.role} /> : !footer ? <View style={{ height: insets.bottom }} /> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.ink50, flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderBottomColor: colors.ink100,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingBottom: 10,
    paddingHorizontal: spacing.lg,
  },
  headerSide: { minWidth: 72 },
  back: {
    alignItems: "center",
    backgroundColor: colors.ink100,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  content: { alignSelf: "center", maxWidth: CONTENT_MAX_WIDTH, width: "100%" },
  padded: { paddingHorizontal: spacing.lg },
  footer: {
    backgroundColor: colors.white,
    borderTopColor: colors.ink100,
    borderTopWidth: 1,
    padding: spacing.lg,
  },
});

/** Cabeçalho em degradê verde usado no início, perfil, estoque e painel. */
/** Ação de voltar da tela atual (histórico ou Início), ou `undefined` no Início. */
export function useBackAction() {
  const nav = useNav();
  const target = backTarget(nav.route.name, nav.canGoBack);
  if (!target) return undefined;
  return target === "home" ? () => nav.reset({ name: "dashboard" }) : nav.back;
}

export function Hero({ children, onBack, right, title }: { children: ReactNode; onBack?: () => void; right?: ReactNode; title?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={[colors.brand700, colors.brand600, colors.brand500]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={[heroStyles.hero, { paddingTop: insets.top + spacing.lg }]}>
      <StatusBar style="light" />
      <View style={heroStyles.circle} />
      <View style={[styles.content, { gap: spacing.lg }]}>
        {onBack || right || title ? (
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
            {onBack ? (
              <Pressable accessibilityLabel="Voltar" accessibilityRole="button" hitSlop={10} onPress={onBack} style={heroStyles.glassButton}>
                <Ionicons color={colors.white} name="chevron-back" size={20} />
              </Pressable>
            ) : null}
            <Txt color={colors.white} style={{ flex: 1 }} variant="h1">{title ?? ""}</Txt>
            {right}
          </View>
        ) : null}
        {children}
      </View>
    </LinearGradient>
  );
}

export function GlassButton({ icon, label, onPress, badge }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; badge?: boolean }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" hitSlop={8} onPress={onPress} style={heroStyles.glassButton}>
      <Ionicons color={colors.white} name={icon} size={19} />
      {badge ? <View style={heroStyles.badge} /> : null}
    </Pressable>
  );
}

/** Pequeno bloco translúcido de número + rótulo dentro do Hero. */
export function HeroStat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={heroStyles.stat}>
      <Txt center color={colors.white} variant="h2">{value}</Txt>
      <Txt center color="rgba(255,255,255,0.8)" variant="tiny">{label}</Txt>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  hero: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  circle: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 140, height: 220, position: "absolute", right: -70, top: -60, width: 220 },
  glassButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  badge: { backgroundColor: colors.rose500, borderColor: colors.brand700, borderRadius: 5, borderWidth: 1.5, height: 10, position: "absolute", right: 6, top: 6, width: 10 },
  stat: { backgroundColor: "rgba(255,255,255,0.13)", borderColor: "rgba(255,255,255,0.2)", borderRadius: 14, borderWidth: 1, flex: 1, paddingVertical: 10 },
});
