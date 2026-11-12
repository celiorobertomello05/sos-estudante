/**
 * Busca de pontos de coleta por raio a partir de uma origem (US01):
 * localização atual, casa ou escola. Regras puras, sem React nem Expo.
 */
import { distanceBetweenCoordinatesKm, type GeoCoordinates } from "./location";

export type SearchOrigin = "current" | "home" | "school";

export const RADIUS_OPTIONS_KM = [2, 5, 10, 20] as const;
export const DEFAULT_RADIUS_KM = 5;

export const originLabels: Record<SearchOrigin, { option: string; phrase: string }> = {
  current: { option: "Onde estou", phrase: "de você" },
  home: { option: "Casa", phrase: "da sua casa" },
  school: { option: "Escola", phrase: "da sua escola" },
};

export interface PointAtDistance<T> {
  point: T;
  distanceKm: number;
}

/** Pontos dentro do raio, do mais próximo para o mais distante. */
export function pointsWithinRadius<T extends GeoCoordinates>(
  points: readonly T[],
  origin: GeoCoordinates,
  radiusKm: number,
): PointAtDistance<T>[] {
  return points
    .map((point) => ({ point, distanceKm: distanceBetweenCoordinatesKm(origin, point) }))
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Próximo raio maior disponível, ou `null` quando já está no máximo. */
export function nextRadiusKm(radiusKm: number): number | null {
  return RADIUS_OPTIONS_KM.find((option) => option > radiusKm) ?? null;
}

/** Menor raio da lista que alcança o ponto mais próximo, ou `null` se nenhum alcança. */
export function radiusToReachNearest(points: readonly GeoCoordinates[], origin: GeoCoordinates): number | null {
  if (!points.length) return null;
  const nearest = Math.min(...points.map((point) => distanceBetweenCoordinatesKm(origin, point)));
  return RADIUS_OPTIONS_KM.find((option) => option >= nearest) ?? null;
}

/**
 * CA02 — sem resultados: explica e sugere expandir o raio. `suggestedRadiusKm`
 * é o raio que já mostra pelo menos um ponto (ou o próximo, se nenhum alcança).
 */
export function emptyRadiusMessage(
  points: readonly GeoCoordinates[],
  origin: GeoCoordinates,
  radiusKm: number,
  from: SearchOrigin,
): { title: string; body: string; suggestedRadiusKm: number | null } {
  const reach = radiusToReachNearest(points, origin);
  const suggested = reach && reach > radiusKm ? reach : nextRadiusKm(radiusKm);
  const title = `Nenhum ponto até ${radiusKm} km ${originLabels[from].phrase}`;
  if (suggested) {
    return { title, body: `Amplie a busca para ${suggested} km para ver os pontos mais próximos.`, suggestedRadiusKm: suggested };
  }
  return { title, body: "Não há pontos de coleta nesse alcance. Tente outra origem ou busque pelo nome do bairro.", suggestedRadiusKm: null };
}

/** Texto enviado ao geocodificador do aparelho para localizar a casa. */
export function homeGeocodeQuery(address?: string, postalCode?: string): string | null {
  const street = address?.trim();
  if (!street) return null;
  const cep = postalCode?.replace(/\D/g, "");
  return [street, cep && cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : null, "Brasil"].filter(Boolean).join(", ");
}

/** Texto enviado ao geocodificador para localizar a escola (o CEP da casa ajuda a achar a cidade). */
export function schoolGeocodeQuery(schoolName?: string, postalCode?: string): string | null {
  const name = schoolName?.trim();
  if (!name) return null;
  const cep = postalCode?.replace(/\D/g, "");
  return [name, cep && cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : null, "Brasil"].filter(Boolean).join(", ");
}
