import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserSettings } from "../domain/models";

const ONBOARDING_KEY = "sos-estudante:onboarding-done";
const SETTINGS_KEY = "sos-estudante:settings";

const settingKeys: (keyof UserSettings)[] = [
  "pushEnabled",
  "emailEnabled",
  "pickupReminders",
  "campaignUpdates",
  "shareLocation",
  "largeText",
  "reduceMotion",
];

export async function hasSeenOnboarding() {
  return (await AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null)) === "1";
}

export async function markOnboardingSeen() {
  await AsyncStorage.setItem(ONBOARDING_KEY, "1");
}

export async function loadSettings(): Promise<Partial<UserSettings> | null> {
  try {
    const saved = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!saved) return null;

    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const settings: Partial<UserSettings> = {};
    for (const key of settingKeys) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "boolean") settings[key] = value;
    }
    return settings;
  } catch {
    return null;
  }
}

export async function saveSettings(settings: UserSettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
