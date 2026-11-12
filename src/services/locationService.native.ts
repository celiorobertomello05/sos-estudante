import * as Location from "expo-location";
import type { LocationResult } from "./locationService.types";

export type { LocationResult } from "./locationService.types";

export async function requestCurrentLocation(): Promise<LocationResult> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Ative a localização do aparelho para calcular as distâncias.",
      };
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return {
        ok: false,
        reason: "denied",
        message: "Permissão de localização não concedida. O mapa e a lista continuam disponíveis.",
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      ok: true,
      coordinates: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch {
    return {
      ok: false,
      reason: "unavailable",
      message: "Não foi possível obter sua localização. Verifique o GPS e tente novamente.",
    };
  }
}

/**
 * Converte um endereço em coordenadas com o geocodificador do próprio aparelho
 * (sem chave de API). Usado para a origem "casa" ou "escola" da busca.
 */
export async function geocodeAddress(query: string): Promise<LocationResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return { ok: false, reason: "denied", message: "Permita a localização para buscar a partir desse endereço." };
    }
    const [first] = await Location.geocodeAsync(query);
    if (!first) {
      return { ok: false, reason: "unavailable", message: "Não encontramos esse endereço no mapa. Confira os dados no seu perfil." };
    }
    return { ok: true, coordinates: { latitude: first.latitude, longitude: first.longitude } };
  } catch {
    return { ok: false, reason: "unavailable", message: "Não foi possível localizar esse endereço agora. Tente novamente." };
  }
}
