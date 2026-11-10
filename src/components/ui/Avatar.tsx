import { Image, View } from "react-native";
import { colors } from "../../theme";
import { initials } from "../../utils/format";
import { Txt } from "./Txt";
import { s } from "./styles";

/** Avatar com foto enviada pelo próprio usuário ou com as iniciais do nome. */
export function Avatar({ name, uri, size = 44, light }: { name: string; uri?: string; size?: number; light?: boolean }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View
      accessibilityLabel={name}
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        light && { backgroundColor: "rgba(255,255,255,0.18)", borderColor: "rgba(255,255,255,0.35)" },
      ]}
    >
      <Txt variant="title" color={light ? colors.white : colors.brand700} style={{ fontSize: size * 0.36 }}>
        {initials(name)}
      </Txt>
    </View>
  );
}
