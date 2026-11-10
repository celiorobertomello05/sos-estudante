/**
 * Variáveis públicas do Expo (prefixo EXPO_PUBLIC_), lidas do arquivo .env.
 * Nunca coloque aqui chaves privadas como a service_role do Supabase:
 * tudo que começa com EXPO_PUBLIC_ é embutido no aplicativo.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  /** O modo demonstração só existe quando habilitado explicitamente. */
  demoModeEnabled: process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE === "true",
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || "suporte@example.com",
};

export const isSupabaseConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabaseUrl) && supabaseAnonKey.length > 20;
