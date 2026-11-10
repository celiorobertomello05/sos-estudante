import type { ReactNode } from "react";
import { View } from "react-native";
import type { IconName } from "./types";
import { Txt } from "./Txt";
import { IconBadge } from "./IconBadge";
import { s } from "./styles";

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={s.empty}>
      <IconBadge name={icon} size={56} tone="neutral" />
      <Txt variant="h2" center>
        {title}
      </Txt>
      <Txt center>{body}</Txt>
      {action}
    </View>
  );
}
