import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tones } from "../../theme";
import type { Tone } from "../../theme";
import type { IconName } from "./types";
import { Txt } from "./Txt";
import { Row } from "./Row";
import { Card } from "./Card";

export function Notice({ tone = "trust", icon = "information-circle-outline", title, body }: { tone?: Tone; icon?: IconName; title: string; body?: string }) {
  return (
    <Card tone={tone}>
      <Row style={{ alignItems: "flex-start" }}>
        <Ionicons color={tones[tone].fg} name={icon} size={20} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="title">{title}</Txt>
          {body ? <Txt variant="small">{body}</Txt> : null}
        </View>
      </Row>
    </Card>
  );
}
