/**
 * Estado central do aplicativo (raiz de composição).
 *
 * - Modo "online": dados reais do Supabase (RLS + funções RPC no servidor).
 * - Modo "demo": dados locais, para explorar todos os fluxos sem conta.
 *
 * As telas só conhecem as ações expostas aqui; não acessam o banco diretamente.
 * Organização: core.ts (estado e efeitos), *Actions.ts por assunto,
 * types.ts e messages.ts. Este arquivo monta tudo e mantém a sessão.
 */
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { env } from "../config/env";
import { demoPendingReviews, demoProfiles } from "../data/seed";
import type { Profile, UserRole } from "../domain/models";
import type { GeoCoordinates } from "../domain/location";
import { isRoleAlreadyClaimedError } from "../utils/errors";
import * as auth from "../services/authService";
import * as api from "../services/dataService";
import { requestCurrentLocation } from "../services/locationService";
import { hasSeenOnboarding, markOnboardingSeen } from "../services/preferencesService";
import { listFiles, uploadFile } from "../services/storageService";
import { accountDocumentPath, uploadedAccountDocuments } from "../domain/documents";
import type { AccountDocumentKey } from "../domain/documents";
import { demoData, emptyData, emptyReviews, Result } from "./types";
import { useStoreCore } from "./core";
import { createDonationActions } from "./donationActions";
import { createRequestActions } from "./requestActions";
import { createStockActions } from "./stockActions";
import { createReviewActions } from "./reviewActions";
import { createAccountActions } from "./accountActions";

export type { Result } from "./types";

function useAppStoreState() {
  const core = useStoreCore();
  const { mode, setMode, booting, startupError, profile, setProfile, data, setData, settings, userLocation, setUserLocation, locationStatus, setLocationStatus, locationMessage, setLocationMessage, reviews, setReviews, passwordRecovery, setPasswordRecovery, googleEnabled, signupProvider, setSignupProvider, accountDocuments, setAccountDocuments, authLinkNotice, setAuthLinkNotice, connecting, withConnecting, run, refresh, isDemo } = core;

  // ───────────── Sessão ─────────────
  const enterDemo = (role: UserRole, overrides?: Partial<Profile>) => {
    // Defesa em profundidade: build de produção (EXPO_PUBLIC_ENABLE_DEMO_MODE=false) nunca entra em demo.
    if (!env.demoModeEnabled) return;
    setProfile({ ...demoProfiles[role], ...overrides, role });
    setData(demoData(role));
    setReviews(role === "collector" ? demoPendingReviews : emptyReviews);
    setAccountDocuments(["documento-com-foto"]);
    setMode("demo");
  };

  const signIn = (email: string, password: string) =>
    run(() =>
      withConnecting("Entrando na sua conta…", async () => {
        await auth.signInWithEmail(email, password);
        await refresh();
      }),
    );

  const signInWithGoogle = (role: UserRole) =>
    run(() =>
      withConnecting("Conectando com o Google…", async () => {
        const done = await auth.signInWithGoogle();
        if (!done) return false;
        // A conta que já tem papel recebe a recusa NOT_ALLOWED e mantém o papel
        // atual. Outras falhas (rede, permission denied, RLS) chegam ao usuário.
        await auth.claimInitialRole(role).catch((error: unknown) => {
          if (!isRoleAlreadyClaimedError(error)) throw error;
        });
        await refresh();
        return true;
      }),
    );

  /**
   * Com confirmação de e-mail não há sessão para enviar arquivos: o cadastro
   * avisa e os documentos são enviados depois em Perfil › Meus documentos.
   */
  const signUp = (input: auth.SignUpInput, documents: Partial<Record<AccountDocumentKey, string>>) =>
    run(() => withConnecting("Criando sua conta…", async () => {
      const result = await auth.signUp(input);
      if (!result.needsEmailConfirmation) {
        const uid = await auth.currentUserId();
        if (uid) {
          await Promise.all(
            Object.entries(documents).map(([key, uri]) =>
              uri ? uploadFile("documents", accountDocumentPath(uid, key as AccountDocumentKey), uri, "image/jpeg") : undefined,
            ),
          );
          await refresh();
        }
      }
      return result;
    }));

  /** Dados do cadastro de quem entrou pelo Google + documentos da conta. */
  const completeProfile = (
    fields: Parameters<typeof api.completeProfile>[0],
    documents: Partial<Record<AccountDocumentKey, string>>,
  ) =>
    run(async () => {
      if (!profile) return;
      if (isDemo) {
        setProfile({ ...profile, ...fields });
        return;
      }
      await withConnecting("Salvando seu cadastro…", async () => {
        await api.completeProfile(fields);
        await Promise.all(
          Object.entries(documents).map(([key, uri]) =>
            uri ? uploadFile("documents", accountDocumentPath(profile.id, key as AccountDocumentKey), uri, "image/jpeg") : undefined,
          ),
        );
        await refresh();
      });
    });

  const loadAccountDocuments = () =>
    run(async () => {
      if (!profile) return [];
      const keys = isDemo ? accountDocuments : uploadedAccountDocuments(await listFiles("documents", profile.id));
      setAccountDocuments(keys);
      return keys;
    });

  const uploadAccountDocument = (key: AccountDocumentKey, uri: string) =>
    run(async () => {
      if (!profile) return;
      if (!isDemo) await uploadFile("documents", accountDocumentPath(profile.id, key), uri, "image/jpeg");
      setAccountDocuments((current) => (current.includes(key) ? current : [...current, key]));
    });

  const resetPassword = (email: string) => run(() => auth.sendPasswordReset(email));
  const changePassword = (password: string) =>
    run(async () => {
      if (isDemo) return;
      await auth.changePassword(password);
      setPasswordRecovery(false);
    });

  const signOut = async () => {
    if (mode === "online") await auth.signOut().catch(() => undefined);
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
  };

  const requestUserLocation = async (): Promise<Result<GeoCoordinates>> => {
    setLocationStatus("loading");
    setLocationMessage(null);
    const result = await requestCurrentLocation();
    if (!result.ok) {
      setUserLocation(null);
      setLocationStatus(result.reason);
      setLocationMessage(result.message);
      return { ok: false, error: result.message };
    }
    setUserLocation(result.coordinates);
    setLocationStatus("granted");
    return { ok: true, value: result.coordinates };
  };

  const { createDonation, reviewDonation } = createDonationActions(core);
  const { createRequest, cancelRequest, regeneratePickupCode, advanceRequest, confirmDelivery } = createRequestActions(core);
  const { registerMovement } = createStockActions(core);
  const { loadReviews, reviewEnrollment, reviewCollector, openReviewDocument } = createReviewActions(core);
  const { openTicket, markAllRead, updateSettings, updateProfile, saveEnrollment } = createAccountActions(core);

  return {
    mode,
    booting,
    startupError,
    isDemo,
    profile,
    role: profile?.role ?? "student",
    settings,
    userLocation,
    locationStatus,
    locationMessage,
    ...data,
    refresh: () => run(refresh),
    enterDemo,
    signIn,
    signInWithGoogle,
    signUp,
    resetPassword,
    changePassword,
    signOut,
    passwordRecovery,
    googleEnabled,
    signupProvider,
    /** Telas não acessam services: a preferência de onboarding passa pelo store. */
    hasSeenOnboarding,
    markOnboardingSeen,
    accountDocuments,
    completeProfile,
    loadAccountDocuments,
    uploadAccountDocument,
    authLinkNotice,
    /** Mensagem da tela de carregamento global (null = oculta). */
    connecting,
    dismissAuthLinkNotice: () => setAuthLinkNotice(null),
    createDonation,
    reviewDonation,
    createRequest,
    cancelRequest,
    regeneratePickupCode,
    advanceRequest,
    confirmDelivery,
    registerMovement,
    openTicket,
    markAllRead,
    updateSettings,
    requestUserLocation,
    updateProfile,
    saveEnrollment,
    reviews,
    loadReviews,
    reviewEnrollment,
    reviewCollector,
    openReviewDocument,
  };
}

export type AppStore = ReturnType<typeof useAppStoreState>;

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const store = useAppStoreState();
  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

export function useApp() {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("useApp precisa estar dentro de AppStoreProvider");
  return store;
}

/**
 * Perfil do usuário logado em telas protegidas. O roteador só mostra essas
 * telas com perfil carregado; substitui o `app.profile!` repetido.
 */
export function useProfile() {
  const { profile } = useApp();
  if (!profile) throw new Error("useProfile só pode ser usado em telas que exigem login.");
  return profile;
}
