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
