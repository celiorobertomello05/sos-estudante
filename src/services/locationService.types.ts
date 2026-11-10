import type { GeoCoordinates } from "../domain/location";

export type LocationResult =
  | { ok: true; coordinates: GeoCoordinates }
  | { ok: false; reason: "denied" | "unavailable"; message: string };
