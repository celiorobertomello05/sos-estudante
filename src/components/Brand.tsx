import { Image } from "react-native";
import { brandAssets } from "../config/images";

/** Logo oficial. "full" mostra a marca com o nome; caso contrário, só o símbolo. */
export default function Brand({ full = false, size = 88 }: { full?: boolean; size?: number }) {
  const ratio = full ? 0.889 : 1.202;
  return (
    <Image
      accessibilityLabel="SOS Estudante"
      resizeMode="contain"
      source={full ? brandAssets.logo : brandAssets.mark}
      style={{ height: size, width: size * ratio }}
    />
  );
}
