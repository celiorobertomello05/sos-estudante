import type { LocationResult } from "./locationService.types";

export type { LocationResult } from "./locationService.types";

/** O preview web mantém o mapa visual, mas não acessa APIs nativas de localização. */
export async function requestCurrentLocation(): Promise<LocationResult> {
  return {
    ok: false,
    reason: "unavailable",
    message: "A localização do aparelho está disponível no aplicativo para Android e iOS.",
  };
}

export async function geocodeAddress(_query: string): Promise<LocationResult> {
  return {
    ok: false,
    reason: "unavailable",
    message: "A busca a partir da casa ou da escola está disponível no aplicativo para Android e iOS.",
  };
}
