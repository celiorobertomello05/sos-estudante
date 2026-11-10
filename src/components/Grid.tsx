import { Children, isValidElement, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import { spacing } from "../theme";
import { gridColumns, gridItemWidth } from "../theme/layout";

/**
 * Grade responsiva: mede a própria largura e escolhe quantas colunas
 * cabem sem deixar um item menor que `minItemWidth`. Uma coluna em celulares
 * pequenos, duas no padrão e até `maxColumns` em tablets.
 */
export default function Grid({
  children,
  minItemWidth,
  gap = spacing.md,
  maxColumns = 4,
}: {
  children: ReactNode;
  minItemWidth: number;
  gap?: number;
  maxColumns?: number;
}) {
  const [width, setWidth] = useState(0);
  const columns = gridColumns(width, minItemWidth, gap, maxColumns);
  const itemStyle = width > 0 ? { width: gridItemWidth(width, columns, gap) } : { flexBasis: "45%" as const, flexGrow: 1 };

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {Children.toArray(children).map((child, index) => (
        <View key={isValidElement(child) && child.key != null ? child.key : index} style={itemStyle}>
          {child}
        </View>
      ))}
    </View>
  );
}
