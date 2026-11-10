import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { colors, spacing } from "../../theme";
import { Txt } from "./Txt";
import { Row } from "./Row";

export function SectionTitle({ children, action }: { children: ReactNode; action?: { label: string; onPress: () => void } }) {
  return (
    <Row style={{ justifyContent: "space-between", marginTop: spacing.sm }}>
      <Txt variant="h2">{children}</Txt>
      {action ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={action.onPress}>
          <Txt variant="label" color={colors.brand700}>
            {action.label}
          </Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}
