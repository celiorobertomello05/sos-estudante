import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { GeoCoordinates } from "../domain/location";
import { colors, radius } from "../theme";
import Photo from "./Photo";
import { Txt } from "./ui";

interface MapPoint extends GeoCoordinates {
  id: string;
  color?: string;
}

/** Fallback web: mantém o mapa ilustrativo sem carregar módulos nativos. */
export default function PointsMap({
  points,
  caption,
  userLocation,
}: {
  points: MapPoint[];
  caption?: string;
  userLocation?: GeoCoordinates;
}) {
  if (points.length === 0) return null;

  const visiblePoints = userLocation
    ? [...points, { id: "user-location", ...userLocation, color: colors.trust600 }]
    : points;
  const lats = visiblePoints.map((point) => point.latitude);
  const lngs = visiblePoints.map((point) => point.longitude);
  const [minLat, maxLat, minLng, maxLng] = [
    Math.min(...lats),
    Math.max(...lats),
    Math.min(...lngs),
    Math.max(...lngs),
  ];
  const position = (value: number, min: number, max: number) =>
    max === min ? 50 : 15 + ((value - min) / (max - min)) * 70;

  return (
    <View style={styles.map}>
      <Photo imageKey="map" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      {visiblePoints.map((point) => (
        <View
          key={point.id}
          style={[
            styles.pin,
            {
              left: `${position(point.longitude, minLng, maxLng)}%`,
              top: `${100 - position(point.latitude, minLat, maxLat)}%`,
              backgroundColor: point.color ?? colors.brand700,
            },
          ]}
        >
          <Ionicons color={colors.white} name="location" size={14} />
        </View>
      ))}
      {caption ? (
        <View style={styles.caption}>
          <Ionicons color={colors.brand700} name="location-outline" size={16} />
          <Txt variant="label">{caption}</Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { borderRadius: radius.lg, height: 170, overflow: "hidden" },
  overlay: { backgroundColor: "rgba(16,42,43,0.15)" },
  pin: {
    alignItems: "center",
    borderColor: colors.white,
    borderRadius: 15,
    borderWidth: 2,
    height: 30,
    justifyContent: "center",
    marginLeft: -15,
    marginTop: -15,
    position: "absolute",
    width: 30,
  },
  caption: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 10,
    bottom: 10,
    flexDirection: "row",
    gap: 6,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute",
    right: 10,
  },
});
