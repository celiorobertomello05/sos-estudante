import { useMemo, useState } from "react";
import { Platform } from "react-native";
import PointsMap from "../../components/PointsMap";
import Screen from "../../components/Screen";
import { Button, Chips, EmptyState, Field, Notice, Txt } from "../../components/ui";
import type { GeoCoordinates } from "../../domain/location";
import {
  DEFAULT_RADIUS_KM,
  RADIUS_OPTIONS_KM,
  emptyRadiusMessage,
  originLabels,
  pointsWithinRadius,
  type SearchOrigin,
} from "../../domain/pointSearch";
import { useApp } from "../../store/AppStore";
import { PointCard } from "./PointCard";

type PointFilter = "near" | "open" | "capacity";
const ORIGINS: SearchOrigin[] = ["current", "home", "school"];

/** Locais de retirada: busca por raio a partir de onde estou, da casa ou da escola (US01). */
export function PointsScreen() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PointFilter>("near");
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS_KM);
  const restored = app.settings.shareLocation && app.userLocation ? app.userLocation : null;
  const [origin, setOrigin] = useState<SearchOrigin | "none">(restored ? "current" : "none");
  const [coords, setCoords] = useState<GeoCoordinates | null>(restored);
  const [originError, setOriginError] = useState<string | null>(null);
  const isWeb = Platform.OS === "web";

  const chooseOrigin = async (next: SearchOrigin | "none") => {
    if (next === "none") return;
    setOriginError(null);
    const result = await app.locateSearchOrigin(next);
    if (!result.ok || !result.value) return setOriginError(result.error ?? null);
    setOrigin(next);
    setCoords(result.value);
    if (next === "current" && !app.settings.shareLocation) await app.updateSettings({ shareLocation: true });
  };

  const byText = useMemo(() => {
    const q = query.trim().toLowerCase();
    return app.points.filter((p) => !q || `${p.name} ${p.district} ${p.address}`.toLowerCase().includes(q));
  }, [app.points, query]);

  const results = useMemo(() => {
    const base = coords
      ? pointsWithinRadius(byText, coords, radius)
      : [...byText].sort((a, b) => a.name.localeCompare(b.name)).map((point) => ({ point, distanceKm: undefined as number | undefined }));
    if (filter === "open") return base.filter((r) => r.point.openNow);
    if (filter === "capacity") return [...base].sort((a, b) => b.point.capacity - a.point.capacity);
    return base;
  }, [byText, coords, radius, filter]);

  const empty = coords && origin !== "none" && results.length === 0 && byText.length > 0 ? emptyRadiusMessage(byText, coords, radius, origin) : null;

  return (
    <Screen tabs title="Locais de retirada">
      {app.points.length ? (
        <PointsMap caption={`${app.points.length} pontos de coleta ativos`} points={app.points} userLocation={coords ?? undefined} />
      ) : null}
      {isWeb ? (
        <Notice body="A busca por distância (onde estou, casa ou escola) funciona no aplicativo Android e iOS." title="Visualização web" />
      ) : (
        <>
          <Txt variant="label">Buscar a partir de</Txt>
          <Chips
            onChange={chooseOrigin}
            options={ORIGINS.filter((o) => app.canUseOrigin(o)).map((o) => ({ value: o, label: originLabels[o].option }))}
            value={origin}
          />
          {coords ? (
            <>
              <Txt variant="label">Raio de busca</Txt>
              <Chips
                onChange={(v) => setRadius(Number(v))}
                options={RADIUS_OPTIONS_KM.map((km) => ({ value: String(km), label: `${km} km` }))}
                value={String(radius)}
              />
            </>
          ) : null}
          {app.locationStatus === "loading" ? <Txt variant="small">Localizando…</Txt> : null}
          {originError ? <Notice body={originError} title="Não foi possível usar essa origem" tone="amber" /> : null}
          {!coords && !originError ? (
            <Notice body="Escolha onde estou, casa ou escola para ver os pontos dentro do raio de busca." title="Encontre o ponto mais perto" />
          ) : null}
        </>
      )}
      <Field label="Buscar" onChangeText={setQuery} placeholder="Nome ou bairro" value={query} />
      <Chips
        onChange={setFilter}
        options={[
          { value: "near", label: coords ? "Mais próximo" : "Ordem alfabética" },
          { value: "open", label: "Aberto agora" },
          { value: "capacity", label: "Maior capacidade" },
        ]}
        value={filter}
      />
      {coords && origin !== "none" && results.length > 0 ? (
        <Txt variant="small">
          {results.length} {results.length === 1 ? "ponto" : "pontos"} até {radius} km {originLabels[origin].phrase}
        </Txt>
      ) : null}
      {empty ? (
        <EmptyState
          action={empty.suggestedRadiusKm ? <Button label={`Ampliar para ${empty.suggestedRadiusKm} km`} onPress={() => setRadius(empty.suggestedRadiusKm!)} /> : undefined}
          body={empty.body}
          icon="locate-outline"
          title={empty.title}
        />
      ) : null}
      {!empty && results.length === 0 ? <EmptyState body="Tente outro nome, bairro ou filtro." icon="search-outline" title="Nenhum ponto encontrado" /> : null}
      {results.map(({ point, distanceKm }) => (
        <PointCard distanceKm={distanceKm} key={point.id} point={point} />
      ))}
    </Screen>
  );
}
