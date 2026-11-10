import { Switch, View } from "react-native";
import { colors, spacing } from "../../theme";
import { Txt } from "./Txt";
import { Row } from "./Row";

export function ToggleRow({ title, detail, value, onChange }: { title: string; detail?: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Row style={{ paddingVertical: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Txt variant="title">{title}</Txt>
        {detail ? <Txt variant="small">{detail}</Txt> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        onValueChange={onChange}
        thumbColor={colors.white}
        trackColor={{ false: colors.ink200, true: colors.brand500 }}
        value={value}
      />
    </Row>
  );
}
