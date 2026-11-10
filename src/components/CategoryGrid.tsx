import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { categoryLabels } from "../domain/labels";
import type { ItemCategory } from "../domain/models";
import { colors, radius, spacing } from "../theme";
import Grid from "./Grid";
import Photo from "./Photo";
import { Txt } from "./ui";

const categories = Object.keys(categoryLabels) as ItemCategory[];

/** Grade de categorias com foto, compartilhada por doação e solicitação. */
export default function CategoryGrid({
  value,
  onChange,
  caption,
}: {
  value: ItemCategory;
  onChange: (category: ItemCategory) => void;
  caption?: (category: ItemCategory) => string;
}) {
  return (
    <Grid gap={spacing.sm} minItemWidth={140}>
      {categories.map((category) => {
        const active = category === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            key={category}
            onPress={() => onChange(category)}
            style={[styles.tile, active && styles.tileActive]}
          >
            <Photo imageKey={category} style={styles.tileImage} />
            {active ? (
              <View style={styles.tileCheck}>
                <Ionicons color={colors.white} name="checkmark" size={14} />
              </View>
            ) : null}
            <View style={styles.label}>
              <Txt variant="label" color={colors.ink900}>
                {categoryLabels[category].replace(" escolar", "")}
              </Txt>
              {caption ? (
                <Txt variant="small" color={colors.brand700}>
                  {caption(category)}
                </Txt>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </Grid>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.white,
    borderColor: colors.ink100,
    borderRadius: radius.md,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  tileActive: { borderColor: colors.brand600 },
  tileImage: { height: 82, width: "100%" },
  tileCheck: {
    alignItems: "center",
    backgroundColor: colors.brand600,
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 22,
  },
  label: { padding: spacing.sm },
});
