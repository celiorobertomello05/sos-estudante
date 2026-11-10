import { useState } from "react";
import { Image, View } from "react-native";
import type { ImageStyle, StyleProp } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { images } from "../config/images";
import type { ImageKey } from "../domain/models";
import { colors } from "../theme";

/** Foto de item/local. Sem internet, mostra um ícone no lugar da imagem. */
export default function Photo({ imageKey, uri, style }: { imageKey?: ImageKey; uri?: string; style: StyleProp<ImageStyle> }) {
  const [failed, setFailed] = useState(false);
  const source = uri ?? (imageKey ? images[imageKey] : undefined);
  if (!source || failed) {
    return (
      <View style={[{ alignItems: "center", backgroundColor: colors.brand50, justifyContent: "center" }, style as object]}>
        <Ionicons color={colors.brand500} name="shirt-outline" size={28} />
      </View>
    );
  }
  return (
    <Image
      accessibilityIgnoresInvertColors
      onError={() => setFailed(true)}
      source={{ uri: source }}
      style={[{ backgroundColor: colors.ink100 }, style]}
    />
  );
}
