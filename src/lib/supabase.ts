import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "../config/env";
import { secureSessionStorage } from "./secureStorage";

/**
 * Cliente único do Supabase. Usa apenas a chave pública (anon);
 * o servidor deverá restringir os dados com RLS e RPCs validadas.
 */
export const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;

// Renova o token apenas com o app em primeiro plano, como recomenda o Supabase.
if (supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase não configurado. Configure as variáveis públicas do ambiente e reinicie o app.");
  }
  return supabase;
}

/** Converte erros técnicos em mensagens seguras, sem expor detalhes internos. */
export { friendlyErrorMessage as friendlyError } from "../utils/errors";
