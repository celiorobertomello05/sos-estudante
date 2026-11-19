import { useState } from "react";
import MapView, { Marker } from "react-native-maps";
import type { Region } from "react-native-maps";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

function Markers({ points, userLocation, onPress }: { points: MapPoint[]; userLocation?: GeoCoordinates; onPress?: () => void }) {
  return (
    <>
      {points.map((point) => (
        <Marker
          coordinate={{ latitude: point.latitude, longitude: point.longitude }}
          description="Ponto de coleta"
          key={point.id}
          onPress={onPress}
          pinColor={point.color ?? colors.brand700}
          title={point.name}
        />
      ))}
      {userLocation ? (
        <Marker
          coordinate={userLocation}
          description="Posição usada para calcular as distâncias"
          onPress={onPress}
          pinColor={colors.trust600}
          title="Sua localização"
        />
      ) : null}
    </>
  );
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
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  if (points.length === 0) return null;

  const coordinates = userLocation ? [...points, userLocation] : points;
  const mapKey = coordinates
    .map((coordinate) => `${coordinate.latitude.toFixed(5)},${coordinate.longitude.toFixed(5)}`)
    .join("|");
  const open = () => setExpanded(true);

  return (
    <View style={styles.container}>
      <MapView
        accessibilityLabel="Mapa dos pontos de coleta. Toque para ampliar."
        initialRegion={regionForCoordinates(coordinates)}
        key={mapKey}
        onPress={open}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={false}
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
        zoomEnabled={false}
      >
        <Markers onPress={open} points={points} userLocation={userLocation} />
      </MapView>
      <View pointerEvents="none" style={styles.hint}>
        <Ionicons color={colors.brand700} name="expand-outline" size={16} />
        <Txt variant="label">Toque para ampliar</Txt>
      </View>
      {caption ? (
        <View pointerEvents="none" style={styles.caption}>
          <Txt variant="label">{caption}</Txt>
        </View>
      ) : null}

      <Modal animationType="slide" onRequestClose={() => setExpanded(false)} visible={expanded}>
        <View style={styles.full}>
          <MapView accessibilityLabel="Mapa ampliado dos pontos de coleta" initialRegion={regionForCoordinates(coordinates)} key={`full-${mapKey}`} style={StyleSheet.absoluteFill} toolbarEnabled>
            <Markers points={points} userLocation={userLocation} />
          </MapView>
          <Pressable
            accessibilityLabel="Fechar mapa"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setExpanded(false)}
            style={[styles.close, { top: insets.top + 12 }]}
          >
            <Ionicons color={colors.brand800} name="close" size={24} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    height: 170,
    overflow: "hidden",
  },
  full: { flex: 1 },
  close: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    width: 44,
  },
  hint: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    right: 10,
    top: 10,
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
