import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Armazena a sessão do Supabase no Keystore (Android) / Keychain (iOS).
 * No preview web, mantém a sessão somente em memória e não persiste credenciais.
 * O SecureStore limita o tamanho por chave, então o valor é dividido em partes.
 */
const CHUNK_SIZE = 1800;
const keyFor = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, "_");
const webSession = new Map<string, string>();

export const secureSessionStorage = {
  async getItem(key: string) {
    if (Platform.OS === "web") return webSession.get(key) ?? null;
    const base = keyFor(key);
    const count = Number(await SecureStore.getItemAsync(`${base}.count`));
    if (!count) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${base}.${i}`)),
    );
    return parts.some((part) => part === null) ? null : parts.join("");
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") {
      webSession.set(key, value);
      return;
    }
    const base = keyFor(key);
    await this.removeItem(key);
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "gs")) ?? [];
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${base}.${i}`, chunk)));
    await SecureStore.setItemAsync(`${base}.count`, String(chunks.length));
  },
  async removeItem(key: string) {
    if (Platform.OS === "web") {
      webSession.delete(key);
      return;
    }
    const base = keyFor(key);
    const count = Number(await SecureStore.getItemAsync(`${base}.count`));
    await Promise.all(
      Array.from({ length: count || 0 }, (_, i) => SecureStore.deleteItemAsync(`${base}.${i}`)),
    );
    await SecureStore.deleteItemAsync(`${base}.count`);
  },
};
