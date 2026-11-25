import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
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

/** Centro usado quando ainda não há pontos nem localização (Mogi das Cruzes, SP). */
const DEFAULT_CENTER: GeoCoordinates = { latitude: -23.5229, longitude: -46.188 };

/**
 * Monta a página do mapa: Leaflet + mapa do OpenStreetMap (sem chave do Google).
 * Os dados entram como JSON; nomes passam por escape para não virar HTML.
 */
function mapHtml(points: MapPoint[], userLocation: GeoCoordinates | undefined, interactive: boolean): string {
  const data = JSON.stringify({
    points: points.map((point) => ({
      lat: point.latitude,
      lng: point.longitude,
      name: point.name ?? "Ponto de coleta",
      color: point.color ?? colors.brand700,
    })),
    user: userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude, color: colors.trust600 } : null,
    center: { lat: DEFAULT_CENTER.latitude, lng: DEFAULT_CENTER.longitude },
    interactive,
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0;background:#eef2f0}</style>
</head><body><div id="map"></div>
<script>
  var d = ${data};
  var i = d.interactive;
  var map = L.map("map", {
    zoomControl: i, dragging: i, touchZoom: i, doubleClickZoom: i,
    scrollWheelZoom: i, boxZoom: i, keyboard: i, tap: i, attributionControl: true
  });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
  function pin(lat, lng, color) {
    return L.circleMarker([lat, lng], { radius: 9, color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 1 });
  }
  var bounds = [];
  d.points.forEach(function (p) {
    pin(p.lat, p.lng, p.color).addTo(map).bindPopup("<b>" + esc(p.name) + "</b><br>Ponto de coleta");
    bounds.push([p.lat, p.lng]);
  });
  if (d.user) {
    pin(d.user.lat, d.user.lng, d.user.color).addTo(map).bindPopup("Sua localização");
    bounds.push([d.user.lat, d.user.lng]);
  }
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
  else if (bounds.length === 1) map.setView(bounds[0], 14);
  else map.setView([d.center.lat, d.center.lng], 12);
</script></body></html>`;
}

function MapFrame({ html, label }: { html: string; label: string }) {
  return (
    <WebView
      accessibilityLabel={label}
      javaScriptEnabled
      originWhitelist={["*"]}
      scrollEnabled={false}
      setSupportMultipleWindows={false}
      source={{ html }}
      style={styles.web}
    />
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
  // O mapa aparece mesmo sem pontos cadastrados, para o usuário explorar a região.
  const label = caption ?? (points.length === 0 ? "Nenhum ponto de coleta cadastrado ainda" : undefined);

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <MapFrame html={mapHtml(points, userLocation, false)} label="Mapa dos pontos de coleta" />
      </View>
      {/* Camada de toque: a miniatura é só prévia; o toque abre o mapa interativo. */}
      <Pressable
        accessibilityHint="Abre o mapa em tela cheia para mover e dar zoom"
        accessibilityLabel="Mapa dos pontos de coleta. Toque para ampliar."
        accessibilityRole="button"
        onPress={() => setExpanded(true)}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.hint}>
        <Ionicons color={colors.brand700} name="expand-outline" size={16} />
        <Txt variant="label">Toque para ampliar</Txt>
      </View>
      {label ? (
        <View pointerEvents="none" style={styles.caption}>
          <Txt variant="label">{label}</Txt>
        </View>
      ) : null}

      <Modal animationType="slide" onRequestClose={() => setExpanded(false)} visible={expanded}>
        <View style={[styles.full, { paddingTop: insets.top }]}>
          <MapFrame html={mapHtml(points, userLocation, true)} label="Mapa ampliado dos pontos de coleta" />
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
  web: { flex: 1, backgroundColor: "#eef2f0" },
  full: { flex: 1, backgroundColor: "#eef2f0" },
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
