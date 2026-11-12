import { Linking, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Photo from "../../components/Photo";
import { Card, Pill, ProgressBar, Row, Txt } from "../../components/ui";
import type { CollectionPoint } from "../../domain/models";
import { colors, spacing } from "../../theme";
import { styles } from "./styles";

function openDirections(point: CollectionPoint) {
  const label = encodeURIComponent(point.name);
  const url =
    Platform.OS === "ios"
      ? `maps:0,0?q=${label}@${point.latitude},${point.longitude}`
      : `geo:${point.latitude},${point.longitude}?q=${point.latitude},${point.longitude}(${label})`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`),
  );
}

/** Cartão de um ponto de coleta, com distância (quando conhecida) e "Como chegar". */
export function PointCard({ point, distanceKm }: { point: CollectionPoint; distanceKm?: number }) {
  return (
    <Card padded={false}>
      <View style={{ gap: spacing.md, padding: spacing.lg }}>
        <Row style={{ alignItems: "flex-start" }}>
          <Photo imageKey={point.imageKey} style={styles.pointImage} />
          <View style={{ flex: 1 }}>
            <Txt variant="title">{point.name}</Txt>
            <Txt variant="small">
              {point.address} — {point.district}
            </Txt>
          </View>
          <Pill label={point.openNow ? "Aberto" : "Fechado"} tone={point.openNow ? "brand" : "neutral"} />
        </Row>
        <Row gap={spacing.md}>
          {distanceKm !== undefined ? (
            <Txt variant="small">{distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</Txt>
          ) : null}
          <Txt variant="small">{point.hours}</Txt>
          <Row gap={2}>
            <Ionicons color={colors.amber500} name="star" size={12} />
            <Txt variant="small" color={colors.amber500}>
              {point.rating.toLocaleString("pt-BR")}
            </Txt>
          </Row>
        </Row>
        <Row style={{ justifyContent: "space-between" }}>
          <Txt variant="small">Capacidade disponível</Txt>
          <Txt variant="label">{point.capacity}%</Txt>
        </Row>
        <ProgressBar tone={point.capacity < 50 ? "amber" : "brand"} value={point.capacity} />
      </View>
      <View style={styles.pointActions}>
        <Row gap={6} style={{ flex: 1, justifyContent: "center", paddingVertical: 12 }}>
          <Ionicons color={point.openNow ? colors.brand700 : colors.ink400} name={point.openNow ? "checkmark" : "time-outline"} size={16} />
          <Txt variant="label" color={point.openNow ? colors.brand700 : colors.ink500}>
            {point.openNow ? "Atendimento disponível" : "Fora do horário"}
          </Txt>
        </Row>
        <Pressable accessibilityRole="button" onPress={() => openDirections(point)} style={styles.directions}>
          <Ionicons color={colors.trust600} name="navigate-outline" size={16} />
          <Txt variant="label" color={colors.trust600}>
            Como chegar
          </Txt>
        </Pressable>
      </View>
    </Card>
  );
}
