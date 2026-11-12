import { useCallback, useEffect, useState } from "react";
import { defaultSettings } from "../data/seed";
import type { AppNotification, PendingReviews, Profile, UserSettings } from "../domain/models";
import type { GeoCoordinates } from "../domain/location";
import { inactiveAccountNotice } from "../domain/rules";
import { friendlyError } from "../lib/supabase";
import { parseAuthLink } from "../utils/authLinks";
import * as auth from "../services/authService";
import * as api from "../services/dataService";
import { loadSettings } from "../services/preferencesService";
import type { AccountDocumentKey } from "../domain/documents";
import { localId } from "../utils/format";
import { Mode, LocationStatus, DataState, emptyData, emptyReviews, Result } from "./types";

/**
 * Núcleo do store: estado, efeitos de abertura, execução segura
 * de ações (`run`) e regras comuns. As ações por assunto recebem este núcleo.
 */
export function useStoreCore() {
  const [mode, setMode] = useState<Mode>("signedOut");
  const [booting, setBooting] = useState(true);
  /** Falha ao restaurar uma sessão existente na abertura do app (mensagem segura). */
  const [startupError, setStartupError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<DataState>(emptyData);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [userLocation, setUserLocation] = useState<GeoCoordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  /** Coordenadas de casa/escola já localizadas, por endereço (evita geocodificar de novo). */
  const [originCache, setOriginCache] = useState<Record<string, GeoCoordinates>>({});
  /** Pendências de revisão da equipe; carregadas sob demanda pela tela. */
  const [reviews, setReviews] = useState<PendingReviews>(emptyReviews);
  /** Sessão aberta pelo link "redefinir senha": o app pede a nova senha. */
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  /** Provedor Google habilitado no Supabase; sem ele o botão some. */
  const [googleEnabled, setGoogleEnabled] = useState(false);
  /** Provedor de criação da conta; decide se o app pede Completar cadastro. */
  const [signupProvider, setSignupProvider] = useState<string | null>(null);
  /** Documentos da conta já enviados; carregados pela tela. */
  const [accountDocuments, setAccountDocuments] = useState<AccountDocumentKey[]>([]);
  /** Resultado de um link de autenticação, mostrado uma vez pela interface. */
  const [authLinkNotice, setAuthLinkNotice] = useState<{ title: string; body: string } | null>(null);
  /** Mensagem da tela de carregamento durante conexões (login, cadastro, links); null = oculta. */
  const [connecting, setConnecting] = useState<string | null>(null);

  const patch = (changes: Partial<DataState>) => setData((current) => ({ ...current, ...changes }));

  /** Executa uma ação e converte qualquer erro em mensagem amigável. */
  const run = async <T,>(action: () => Promise<T>): Promise<Result<T>> => {
    try {
      return { ok: true, value: await action() };
    } catch (error) {
      return { ok: false, error: friendlyError(error) };
    }
  };

  /** Mostra a tela de carregamento enquanto a conexão acontece. */
  const withConnecting = async <T,>(message: string, action: () => Promise<T>): Promise<T> => {
    setConnecting(message);
    try {
      return await action();
    } finally {
      setConnecting(null);
    }
  };

  const pushLocalNotification = (title: string, body: string, kind: AppNotification["kind"] = "info") =>
    setData((current) => ({
      ...current,
      notifications: [
        { id: localId("nt"), title, body, kind, createdAt: new Date().toISOString(), read: false },
        ...current.notifications,
      ],
    }));

  const refresh = useCallback(async () => {
    const userId = await auth.currentUserId();
    if (!userId) return;
    const snapshot = await api.loadSnapshot(userId);
    setSignupProvider(await auth.currentSignupProvider());
    setProfile(snapshot.profile);
    setData({
      enrollment: snapshot.enrollment,
      enrollmentHistory: snapshot.enrollmentHistory,
      points: snapshot.points,
      stock: snapshot.stock,
      donations: snapshot.donations,
      requests: snapshot.requests,
      deliveries: snapshot.deliveries,
      movements: snapshot.movements,
      notifications: snapshot.notifications,
      tickets: snapshot.tickets,
      pickupCodes: snapshot.pickupCodes,
      lockedPickupCodes: snapshot.lockedPickupCodes,
    });
    if (snapshot.settings) setSettings(snapshot.settings);
    setStartupError(null);
    setMode("online");
  }, []);

  // Restaura preferências locais e uma sessão existente ao abrir o app.
  useEffect(() => {
    (async () => {
      const saved = await loadSettings();
      if (saved) setSettings({ ...defaultSettings, ...saved });
      // Sem sessão, refresh não faz nada. Com sessão, a falha deixa o app
      // deslogado como antes, mas a tela de login passa a explicar o motivo.
      await refresh().catch((error: unknown) => setStartupError(friendlyError(error)));
      setBooting(false);
    })();
    const unsubscribe = auth.onSignedOut(() => {
      setMode("signedOut");
      setProfile(null);
      setData(emptyData);
      setReviews(emptyReviews);
      setPasswordRecovery(false);
      setSignupProvider(null);
      setAccountDocuments([]);
      setUserLocation(null);
      setLocationStatus("idle");
      setLocationMessage(null);
    });
    return unsubscribe;
  }, [refresh]);

  useEffect(() => {
    let active = true;
    auth.isGoogleSignInEnabled().then((enabled) => {
      if (active) setGoogleEnabled(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  // Links de e-mail: redefinição de senha e confirmação de cadastro.
  useEffect(() => {
    if (!auth.isAuthAvailable()) return;
    return auth.onIncomingUrl(async (url) => {
      const link = parseAuthLink(url);
      if (!link) return;
      if (link.kind === "callback" && auth.isOAuthInProgress()) return;
      const title = link.kind === "reset" ? "Redefinir senha" : "Confirmação de e-mail";
      if ("error" in link) return setAuthLinkNotice({ title, body: link.error });
      try {
        await withConnecting("Confirmando seu acesso…", async () => {
          await auth.exchangeAuthCode(link.code);
          await refresh();
        });
        if (link.kind === "reset") setPasswordRecovery(true);
        else setAuthLinkNotice({ title, body: "E-mail confirmado. Envie seus documentos em Perfil." });
      } catch (error) {
        // Link já usado: se a sessão existir (ex.: callback repetido), segue sem alarme.
        if (link.kind === "callback" && (await auth.currentUserId().catch(() => null))) return;
        setAuthLinkNotice({ title, body: friendlyError(error) });
      }
    });
  }, [refresh]);

  const isDemo = mode === "demo";


  /** Contas pendentes ou bloqueadas não iniciam ações sobre solicitações. */
  const ensureActiveAccount = () => {
    const notice = profile ? inactiveAccountNotice(profile.role, profile.status) : null;
    if (notice) throw new Error(`BUSINESS_RULE: ${notice.body}`);
  };

  return { mode, setMode, booting, setBooting, startupError, setStartupError, profile, setProfile, data, setData, settings, setSettings, userLocation, setUserLocation, locationStatus, setLocationStatus, locationMessage, setLocationMessage, originCache, setOriginCache, reviews, setReviews, passwordRecovery, setPasswordRecovery, googleEnabled, setGoogleEnabled, signupProvider, setSignupProvider, accountDocuments, setAccountDocuments, authLinkNotice, setAuthLinkNotice, connecting, withConnecting, patch, run, pushLocalNotification, refresh, isDemo, ensureActiveAccount };
}

export type StoreCore = ReturnType<typeof useStoreCore>;
