import { useMemo, useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Photo from "../../components/Photo";
import PointsMap from "../../components/PointsMap";
import Screen from "../../components/Screen";
import { Button, Card, Chips, EmptyState, Field, Notice, Pill, ProgressBar, Row, Txt } from "../../components/ui";
import { distanceBetweenCoordinatesKm } from "../../domain/location";
import type { CollectionPoint } from "../../domain/models";
import { useApp } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import { styles } from "./styles";

type PointFilter = "near" | "open" | "capacity";

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

export function PointsScreen() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PointFilter>("near");
  const showDistance = app.settings.shareLocation && app.userLocation !== null;
  const distances = useMemo(() => {
    const currentLocation = app.userLocation;
    if (!currentLocation) return new Map<string, number>();
    return new Map(
      app.points.map((point) => [
        point.id,
        distanceBetweenCoordinatesKm(currentLocation, point),
      ]),
    );
  }, [app.points, app.userLocation]);

  const points = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = app.points.filter((p) => !q || `${p.name} ${p.district} ${p.address}`.toLowerCase().includes(q));
    if (filter === "open") return list.filter((p) => p.openNow);
    if (filter === "capacity") return [...list].sort((a, b) => b.capacity - a.capacity);
    return showDistance
      ? [...list].sort((a, b) => (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity))
      : [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [app.points, query, filter, showDistance, distances]);

  const requestLocation = async () => {
    const result = await app.requestUserLocation();
    if (result.ok && !app.settings.shareLocation) {
      await app.updateSettings({ shareLocation: true });
    }
  };

  return (
    <Screen tabs title="Locais de retirada">
      {app.points.length ? (
        <PointsMap
          caption={`${app.points.length} pontos de coleta ativos`}
          points={app.points}
          userLocation={showDistance ? app.userLocation ?? undefined : undefined}
        />
      ) : null}
      {Platform.OS === "web" ? (
        <Notice
          body="O preview mantém o mapa visual. A posição atual fica disponível no aplicativo Android e iOS."
          title="Visualização web"
        />
      ) : (
        <Button
          icon="locate-outline"
          label={showDistance ? "Atualizar minha localização" : "Usar minha localização"}
          loading={app.locationStatus === "loading"}
          onPress={requestLocation}
          variant="secondary"
        />
      )}
      {app.locationMessage ? (
        <Notice body={app.locationMessage} title={app.locationStatus === "denied" ? "Permissão não concedida" : "Localização indisponível"} />
      ) : null}
      <Field label="Buscar" onChangeText={setQuery} placeholder="Nome ou bairro" value={query} />
      <Chips
        onChange={setFilter}
        options={[
          { value: "near", label: showDistance ? "Mais próximo" : "Ordem alfabética" },
          { value: "open", label: "Aberto agora" },
          { value: "capacity", label: "Maior capacidade" },
        ]}
        value={filter}
      />
      {!showDistance && Platform.OS !== "web" && !app.locationMessage ? (
        <Notice body="Use o botão acima para autorizar a localização e calcular as distâncias reais." title="Localização opcional" />
      ) : null}
      {points.length === 0 ? <EmptyState body="Tente outro nome, bairro ou filtro." icon="search-outline" title="Nenhum ponto encontrado" /> : null}
      {points.map((point) => (
        <Card key={point.id} padded={false}>
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
              {showDistance && distances.has(point.id) ? (
                <Txt variant="small">
                  {distances.get(point.id)!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
                </Txt>
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
      ))}
    </Screen>
  );
}
