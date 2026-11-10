import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Txt } from "../../components/ui";
import type { IconName } from "../../components/ui";
import type { Route } from "../../navigation/routes";
import { useNav } from "../../navigation/Navigator";
import { colors, tones } from "../../theme";
import type { Tone } from "../../theme";
import { styles } from "./styles";

export interface Shortcut {
  label: string;
  icon: IconName;
  tone: Tone;
  route: Route;
}

export function Shortcuts({ items }: { items: Shortcut[] }) {
  const { go } = useNav();
  return (
    <View style={styles.shortcuts}>
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          key={item.label}
          onPress={() => go(item.route)}
          style={({ pressed }) => [styles.shortcut, { backgroundColor: tones[item.tone].bg, borderColor: tones[item.tone].border }, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.shortcutIcon}>
            <Ionicons color={tones[item.tone].fg} name={item.icon} size={20} />
          </View>
          <Txt variant="label" center color={colors.ink800}>
            {item.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
