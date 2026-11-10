import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { DonorKind, UserRole } from "../domain/models";
import { env } from "../config/env";
import { requireSupabase, supabase } from "../lib/supabase";
import { expoGoRedirectUrl, isAuthProviderEnabled } from "../utils/authLinks";
import { cleanText, onlyDigits } from "../utils/validation";

WebBrowser.maybeCompleteAuthSession();

/**
 * Endereço para onde o Supabase devolve o usuário depois do login/e-mail.
 * No Expo Go usa o `exp://` do próprio Expo Go (o esquema `sosestudante://`
 * não é atendido lá e o navegador ficava carregando para sempre); no app
 * instalado, o esquema próprio.
 */
async function authRedirectUrl(path: string) {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    // Expo Go: endereço do servidor de desenvolvimento (ex.: exp://192.168.0.5:8081).
    const hostUri = Constants.expoConfig?.hostUri;
    const fromConstants =
      expoGoRedirectUrl(Constants.linkingUri, path) ?? expoGoRedirectUrl(hostUri ? `exp://${hostUri}` : null, path);
    if (fromConstants) return fromConstants;
  }
  const appUrl = await Linking.getInitialURL().catch(() => null);
  return expoGoRedirectUrl(appUrl, path) ?? Linking.createURL(path);
}

/**
 * O login Google troca o próprio código. Enquanto ele roda, o link
 * `auth/callback` que o sistema também entrega ao app deve ser ignorado.
 */
let oauthInProgress = false;
export function isOAuthInProgress() {
  return oauthInProgress;
}

/** Há cliente Supabase configurado (fora do modo demonstração puro). */
export function isAuthAvailable() {
  return Boolean(supabase);
}

/** Provedor com que a conta foi criada ("email", "google"…), lido da sessão. */
export async function currentSignupProvider() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const provider = data.session?.user.app_metadata?.provider;
  return typeof provider === "string" ? provider : null;
}

export async function currentUserId() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

export function onSignedOut(callback: () => void) {
  const subscription = supabase?.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") callback();
  });
  return () => subscription?.data.subscription.unsubscribe();
}

export interface SignUpInput {
  role: UserRole;
  fullName: string;
  document: string;
  rg?: string;
  birthDate?: string;
  email: string;
  phone: string;
  password: string;
  donorKind?: DonorKind;
  postalCode: string;
  address: string;
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await requireSupabase().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
}

/**
 * Cria a conta. O perfil é gerado no banco pelo gatilho handle_new_user,
 * que só aceita os papéis permitidos e deixa coletores como "pendente".
 */
export async function signUp(input: SignUpInput) {
  const { data, error } = await requireSupabase().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: await authRedirectUrl("auth/callback"),
      data: {
        role: input.role,
        full_name: cleanText(input.fullName, 120),
        document: onlyDigits(input.document),
        rg: input.rg ? input.rg.replace(/[^0-9A-Za-z]/g, "").toUpperCase() : null,
        birth_date: input.birthDate ?? null,
        phone: onlyDigits(input.phone),
        donor_kind: input.donorKind ?? null,
        postal_code: onlyDigits(input.postalCode),
        address: cleanText(input.address, 200),
      },
    },
  });
  if (error) throw error;
  return { needsEmailConfirmation: !data.session };
}

/** Login com Google via OAuth + PKCE, abrindo o navegador seguro do sistema. */
export async function signInWithGoogle() {
  const supabase = requireSupabase();
  const redirectTo = await authRedirectUrl("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error("OAuth indisponível");
  oauthInProgress = true;
  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success") return false;
    const code = new URL(result.url).searchParams.get("code");
    if (!code) throw new Error("Resposta de login inválida");
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return true;
  } finally {
    oauthInProgress = false;
  }
}

/** Consulta se o login Google está habilitado no projeto (endpoint público do Auth). */
export async function isGoogleSignInEnabled() {
  if (!supabase) return false;
  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabaseAnonKey },
    });
    if (!response.ok) return false;
    return isAuthProviderEnabled(await response.json(), "google");
  } catch {
    return false;
  }
}

/** Define o papel uma única vez para contas criadas via Google. */
export async function claimInitialRole(role: UserRole) {
  const { error } = await requireSupabase().rpc("claim_initial_role", { p_role: role });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: await authRedirectUrl("auth/reset"),
  });
  if (error) throw error;
}

/** Escuta links de autenticação, inclusive o que abriu o app. */
export function onIncomingUrl(callback: (url: string) => void) {
  Linking.getInitialURL()
    .then((url) => {
      if (url) callback(url);
    })
    .catch(() => undefined);
  const subscription = Linking.addEventListener("url", ({ url }) => callback(url));
  return () => subscription.remove();
}

/** Troca o código PKCE recebido no link por uma sessão neste aparelho. */
export async function exchangeAuthCode(code: string) {
  const { error } = await requireSupabase().auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function changePassword(newPassword: string) {
  const { error } = await requireSupabase().auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  await requireSupabase().auth.signOut();
}
