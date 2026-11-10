import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import { colors, fonts } from "../../theme";

export const TextScaleContext = createContext(1);

const variants = {
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.ink900 },
  h1: { fontFamily: fonts.display, fontSize: 23, lineHeight: 29, color: colors.ink900 },
  h2: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 23, color: colors.ink900 },
  title: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink900 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink500 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink700 },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.ink500 },
  caption: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.ink400, letterSpacing: 0.6 },
  /** Rótulos de apoio em gráficos, chips e barras (mínimo legível). */
  tiny: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.ink500 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof variants;

export function Txt({
  variant = "body",
  color,
  center,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const scale = useContext(TextScaleContext);
  const base = variants[variant];
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        base,
        { fontSize: base.fontSize * scale, lineHeight: base.lineHeight * scale },
        variant === "caption" && { textTransform: "uppercase" },
        color ? { color } : null,
        center && { textAlign: "center" },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
