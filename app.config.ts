import type { ExpoConfig } from "expo/config";

const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

const config: ExpoConfig = {
  name: "SOS Estudante",
  slug: "sos-estudante",
  owner: "celiomello",
  version: "1.0.0",
  scheme: "sosestudante",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icons/app-icon.png",
  assetBundlePatterns: ["**/*"],
  /** Projeto no EAS (build na nuvem). Não é segredo: identifica o projeto, não dá acesso. */
  extra: { eas: { projectId: "c0c730a0-6bad-4a20-85fa-71a221cbe4a5" } },
  plugins: [
    [
      "expo-splash-screen",
      {
        backgroundColor: "#ffffff",
        image: "./assets/icons/splash-icon.png",
        imageWidth: 240,
        resizeMode: "contain",
      },
    ],
    "expo-secure-store",
    "expo-web-browser",
    "expo-font",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "O SOS Estudante usa sua localização somente para calcular a distância até os pontos de coleta.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "O SOS Estudante usa suas fotos para anexar documentos e a foto do perfil.",
        cameraPermission:
          "O SOS Estudante usa a câmera para fotografar documentos e os itens entregues.",
        microphonePermission: false,
      },
    ],
  ],
  android: {
    package: "br.org.sosestudante.app",
    allowBackup: false,
    permissions: ["CAMERA"],
    blockedPermissions: ["android.permission.RECORD_AUDIO"],
    adaptiveIcon: {
      foregroundImage: "./assets/icons/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    ...(googleMapsAndroidApiKey
      ? {
          config: {
            googleMaps: {
              apiKey: googleMapsAndroidApiKey,
            },
          },
        }
      : {}),
  },
  androidNavigationBar: {
    backgroundColor: "#ffffff",
    barStyle: "dark-content",
    visible: "immersive",
  },
  ios: {
    bundleIdentifier: "br.org.sosestudante.app",
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "O SOS Estudante usa sua localização somente para calcular a distância até os pontos de coleta.",
    },
  },
  splash: {
    image: "./assets/icons/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
};

export default config;
