/**
 * Tokens visuais do SOS Estudante.
 * Todas as cores, fontes e medidas do app devem vir daqui.
 */
import type { LabelTone } from "../domain/labels";

export const colors = {
  brand50: "#f0fdfa",
  brand100: "#ccfbf1",
  brand200: "#99f6e4",
  brand500: "#14b8a6",
  brand600: "#0f766e",
  brand700: "#0b665f",
  brand800: "#134e4a",
  brand900: "#0f3f3c",
  trust50: "#f3f8fb",
  trust100: "#dceaf3",
  trust500: "#477a9b",
  trust600: "#315e7d",
  amber50: "#fdf9f0",
  amber100: "#f7e5c5",
  amber500: "#c8842f",
  rose50: "#fdf5f6",
  rose100: "#f6dce1",
  rose500: "#c95768",
  purple50: "#f6f4fa",
  purple500: "#7566a2",
  ink900: "#102a2b",
  ink800: "#183b3c",
  ink700: "#2e4e50",
  ink500: "#637a7b",
  ink400: "#8ca0a0",
  ink300: "#becbca",
  ink200: "#dce5e3",
  ink100: "#edf2f1",
  ink50: "#f7f9f8",
  white: "#ffffff",
  overlay: "rgba(16,42,43,0.45)",
};

export const fonts = {
  display: "PlusJakartaSans_800ExtraBold",
  displayBold: "PlusJakartaSans_700Bold",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

/** Largura máxima do conteúdo em tablets e celulares grandes. */
export const CONTENT_MAX_WIDTH = 640;

export const shadow = {
  shadowColor: colors.ink900,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 2,
};

export type Tone = LabelTone;

/** Pares [fundo, texto] usados por pílulas, ícones e cartões. */
export const tones: Record<Tone, { bg: string; fg: string; border: string }> = {
  brand: { bg: colors.brand50, fg: colors.brand700, border: colors.brand200 },
  trust: { bg: colors.trust50, fg: colors.trust600, border: colors.trust100 },
  amber: { bg: colors.amber50, fg: colors.amber500, border: colors.amber100 },
  rose: { bg: colors.rose50, fg: colors.rose500, border: colors.rose100 },
  purple: { bg: colors.purple50, fg: colors.purple500, border: "#e4dff0" },
  neutral: { bg: colors.ink100, fg: colors.ink500, border: colors.ink200 },
};
