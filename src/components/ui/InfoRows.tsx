import type { ReactNode } from "react";
import { View } from "react-native";
import { colors } from "../../theme";
import { Txt } from "./Txt";
import { s } from "./styles";

/** Pares rótulo/valor, como no comprovante de doação. */
export function InfoRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <View>
      {rows.map(([label, value], index) => (
        <View key={label} style={[s.infoRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.ink100 }]}>
          <Txt variant="small">{label}</Txt>
          {typeof value === "string" || typeof value === "number" ? (
            <Txt variant="label" color={colors.ink900} style={{ flexShrink: 1, textAlign: "right" }}>
              {value}
            </Txt>
          ) : (
            value
          )}
        </View>
      ))}
    </View>
  );
}
