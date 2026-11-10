import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * Abre a câmera ou a galeria pedindo permissão antes.
 * Retorna o endereço local da imagem, ou null se o usuário cancelar.
 */
export async function pickImage(source: "camera" | "library", square = false): Promise<string | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Permissão necessária",
      source === "camera"
        ? "Autorize o uso da câmera nas configurações do aparelho."
        : "Autorize o acesso às fotos nas configurações do aparelho.",
    );
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.6,
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    exif: false,
  };
  const result =
    source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0].uri;
}

/** Pergunta ao usuário se quer usar a câmera ou a galeria. */
export function chooseImage(onPicked: (uri: string) => void, square = false) {
  Alert.alert("Adicionar imagem", "Escolha a origem", [
    { text: "Câmera", onPress: () => pickImage("camera", square).then((uri) => uri && onPicked(uri)) },
    { text: "Galeria", onPress: () => pickImage("library", square).then((uri) => uri && onPicked(uri)) },
    { text: "Cancelar", style: "cancel" },
  ]);
}
