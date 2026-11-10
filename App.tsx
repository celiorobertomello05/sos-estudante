import { useEffect } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SosEstudanteApp from "./src/application/SosEstudanteApp";

export default function App() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void NavigationBar.setVisibilityAsync("hidden");
  }, []);

  // Cada tela trata as áreas seguras (status bar e barra de navegação) sozinha.
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SosEstudanteApp />
    </SafeAreaProvider>
  );
}
