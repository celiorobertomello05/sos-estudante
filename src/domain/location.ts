export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Distância do arco entre duas coordenadas, calculada pela fórmula de Haversine. */
export function distanceBetweenCoordinatesKm(from: GeoCoordinates, to: GeoCoordinates) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const normalizedHaversine = Math.min(1, Math.max(0, haversine));

  return (
    EARTH_RADIUS_KM *
    2 *
    Math.atan2(Math.sqrt(normalizedHaversine), Math.sqrt(1 - normalizedHaversine))
  );
}
