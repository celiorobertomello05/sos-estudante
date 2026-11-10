import MapView, { Marker } from "react-native-maps";
import type { Region } from "react-native-maps";
import { StyleSheet, View } from "react-native";
import type { GeoCoordinates } from "../domain/location";
import { colors, radius } from "../theme";
import { Txt } from "./ui";

interface MapPoint extends GeoCoordinates {
  id: string;
  name?: string;
  color?: string;
}

function regionForCoordinates(coordinates: GeoCoordinates[]): Region {
  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  const minimumLongitude = Math.min(...longitudes);
  const maximumLongitude = Math.max(...longitudes);

  return {
    latitude: (minimumLatitude + maximumLatitude) / 2,
    longitude: (minimumLongitude + maximumLongitude) / 2,
    latitudeDelta: Math.max((maximumLatitude - minimumLatitude) * 1.45, 0.02),
    longitudeDelta: Math.max((maximumLongitude - minimumLongitude) * 1.45, 0.02),
  };
}

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

  const coordinates = userLocation ? [...points, userLocation] : points;
  const mapKey = coordinates
    .map((coordinate) => `${coordinate.latitude.toFixed(5)},${coordinate.longitude.toFixed(5)}`)
    .join("|");

  return (
    <View style={styles.container}>
      <MapView
        accessibilityLabel="Mapa dos pontos de coleta"
        initialRegion={regionForCoordinates(coordinates)}
        key={mapKey}
        rotateEnabled={false}
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
      >
        {points.map((point) => (
          <Marker
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            description="Ponto de coleta"
            key={point.id}
            pinColor={point.color ?? colors.brand700}
            title={point.name}
          />
        ))}
        {userLocation ? (
          <Marker
            coordinate={userLocation}
            description="Posição usada para calcular as distâncias"
            pinColor={colors.trust600}
            title="Sua localização"
          />
        ) : null}
      </MapView>
      {caption ? (
        <View pointerEvents="none" style={styles.caption}>
          <Txt variant="label">{caption}</Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    height: 170,
    overflow: "hidden",
  },
  caption: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 10,
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute",
    right: 10,
  },
});
