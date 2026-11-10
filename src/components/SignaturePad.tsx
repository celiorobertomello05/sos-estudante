import { useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, radius } from "../theme";
import { Txt } from "./ui";

const HEIGHT = 150;

/** Área de assinatura. Devolve a assinatura como SVG (texto) ou null se vazia. */
export default function SignaturePad({ onChange }: { onChange: (svg: string | null) => void }) {
  const [paths, setPaths] = useState<string[]>([]);
  const current = useRef("");
  const pathsRef = useRef<string[]>([]);
  const draw = (next: string[]) => {
    pathsRef.current = next;
    setPaths(next);
  };
  const width = useRef(320);

  const emit = (next: string[]) => {
    draw(next);
    onChange(
      next.length
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width.current)}" height="${HEIGHT}">${next
            .map((d) => `<path d="${d}" stroke="#102a2b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`)
            .join("")}</svg>`
        : null,
    );
  };

  const emitRef = useRef(emit);
  emitRef.current = emit;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        current.current = `M${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        draw([...pathsRef.current, current.current]);
      },
      onPanResponderMove: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        current.current += ` L${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        draw([...pathsRef.current.slice(0, -1), current.current]);
      },
      onPanResponderRelease: () => emitRef.current(pathsRef.current),
    }),
  ).current;

  return (
    <View style={{ gap: 6 }}>
      <View
        accessibilityLabel="Área de assinatura"
        onLayout={(e) => (width.current = e.nativeEvent.layout.width)}
        style={[styles.pad, paths.length > 0 && { borderColor: colors.brand500, borderStyle: "solid" }]}
        {...responder.panHandlers}
      >
        <Svg height={HEIGHT} width="100%">
          {paths.map((d, i) => (
            <Path d={d} fill="none" key={i} stroke={colors.ink900} strokeLinecap="round" strokeWidth={2.5} />
          ))}
        </Svg>
        {paths.length === 0 ? (
          <View pointerEvents="none" style={styles.placeholder}>
            <Txt variant="small">O beneficiário assina aqui com o dedo</Txt>
          </View>
        ) : null}
      </View>
      {paths.length > 0 ? (
        <Pressable
          accessibilityLabel="Limpar assinatura"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => emit([])}
          style={{ alignSelf: "flex-end" }}
        >
          <Txt variant="label" color={colors.rose500}>
            Limpar assinatura
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    backgroundColor: colors.white,
    borderColor: colors.ink300,
    borderRadius: radius.md,
    borderStyle: "dashed",
    borderWidth: 1.5,
    height: HEIGHT,
    overflow: "hidden",
  },
  placeholder: { alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
});
