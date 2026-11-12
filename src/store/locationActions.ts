import type { GeoCoordinates } from "../domain/location";
import { homeGeocodeQuery, schoolGeocodeQuery, type SearchOrigin } from "../domain/pointSearch";
import { geocodeAddress, requestCurrentLocation } from "../services/locationService";
import type { StoreCore } from "./core";
import type { Result } from "./types";

/** Localização: posição atual do aparelho e origens da busca de pontos (US01). */
export function createLocationActions(core: StoreCore) {
  const { profile, data, setUserLocation, setLocationStatus, setLocationMessage, originCache, setOriginCache } = core;

  const requestUserLocation = async (): Promise<Result<GeoCoordinates>> => {
    setLocationStatus("loading");
    setLocationMessage(null);
    const result = await requestCurrentLocation();
    if (!result.ok) {
      setUserLocation(null);
      setLocationStatus(result.reason);
      setLocationMessage(result.message);
      return { ok: false, error: result.message };
    }
    setUserLocation(result.coordinates);
    setLocationStatus("granted");
    return { ok: true, value: result.coordinates };
  };

  /** Endereço que representa a origem; `null` quando falta cadastro. */
  const originQuery = (origin: Exclude<SearchOrigin, "current">) =>
    origin === "home"
      ? homeGeocodeQuery(profile?.address, profile?.postalCode)
      : schoolGeocodeQuery(data.enrollment?.schoolName, profile?.postalCode);

  /** Coordenadas da origem escolhida. Casa e escola ficam em cache por endereço. */
  const locateSearchOrigin = async (origin: SearchOrigin): Promise<Result<GeoCoordinates>> => {
    if (origin === "current") return requestUserLocation();
    const query = originQuery(origin);
    if (!query) {
      return {
        ok: false,
        error: origin === "home" ? "Cadastre seu endereço em Perfil › Dados pessoais." : "Informe sua escola em Perfil › Escola e matrícula.",
      };
    }
    const cached = originCache[query];
    if (cached) return { ok: true, value: cached };
    setLocationStatus("loading");
    const result = await geocodeAddress(query);
    setLocationStatus(result.ok ? "granted" : result.reason);
    if (!result.ok) return { ok: false, error: result.message };
    setOriginCache((current) => ({ ...current, [query]: result.coordinates }));
    return { ok: true, value: result.coordinates };
  };

  return { requestUserLocation, locateSearchOrigin, canUseOrigin: (origin: SearchOrigin) => origin === "current" || originQuery(origin) !== null };
}
