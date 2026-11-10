import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Alert, Animated } from "react-native";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import * as SplashScreenApi from "expo-splash-screen";
import { LoadingOverlay, TextScaleContext } from "../components/ui";
import { NavigationProvider, useNav } from "../navigation/Navigator";
import { inactiveAccountNotice, needsProfileCompletion } from "../domain/rules";
import { canAccess, publicRoutes } from "../navigation/routes";
import type { Route } from "../navigation/routes";
import { AppStoreProvider, useApp } from "../store/AppStore";
import { colors } from "../theme";
import { AdminDashboardScreen, AdminStockScreen, ImpactMapScreen } from "../screens/admin/AdminScreens";
import { ReviewsScreen } from "../screens/admin/ReviewScreens";
import {
  AboutScreen,
  AccountDocumentsScreen,
  EnrollmentScreen,
  HelpScreen,
  HistoryScreen,
  NotificationsScreen,
  PersonalDataScreen,
  ProfileScreen,
  SecurityScreen,
  SettingsScreen,
} from "../screens/account/AccountScreens";
import { CompleteProfileScreen, ForgotPasswordScreen, LoginScreen, NewPasswordScreen, OnboardingScreen, RegisterScreen, SplashScreen } from "../screens/auth/AuthScreens";
import { DeliveryScreen, DistributionScreen } from "../screens/delivery/DeliveryScreens";
import { DonateScreen, DonationSuccessScreen, PointsScreen } from "../screens/donations/DonationScreens";
import DashboardScreen from "../screens/home/DashboardScreen";
import { StockDetailScreen, StockScreen, TriageScreen } from "../screens/inventory/InventoryScreens";
import { RequestDetailScreen, RequestScreen, RequestSuccessScreen, RequestsScreen } from "../screens/requests/RequestScreens";

SplashScreenApi.preventAutoHideAsync().catch(() => undefined);

const screens: Record<Route["name"], () => ReactNode> = {
  splash: SplashScreen,
  onboarding: OnboardingScreen,
  login: LoginScreen,
  register: RegisterScreen,
  "forgot-password": ForgotPasswordScreen,
  "new-password": NewPasswordScreen,
  "complete-profile": CompleteProfileScreen,
  dashboard: DashboardScreen,
  donate: DonateScreen,
  "donation-success": DonationSuccessScreen,
  points: PointsScreen,
  stock: StockScreen,
  "stock-detail": StockDetailScreen,
  triage: TriageScreen,
  request: RequestScreen,
  "request-success": RequestSuccessScreen,
  requests: RequestsScreen,
  "request-detail": RequestDetailScreen,
  distribution: DistributionScreen,
  delivery: DeliveryScreen,
  history: HistoryScreen,
  notifications: NotificationsScreen,
  profile: ProfileScreen,
  "personal-data": PersonalDataScreen,
  enrollment: EnrollmentScreen,
  documents: AccountDocumentsScreen,
  settings: SettingsScreen,
  security: SecurityScreen,
  help: HelpScreen,
  about: AboutScreen,
  admin: AdminDashboardScreen,
  "admin-stock": AdminStockScreen,
  "impact-map": ImpactMapScreen,
  reviews: ReviewsScreen,
};

/** Mostra a tela atual, protegendo rotas privadas e restritas por papel. */
function Router() {
  const { route, reset, back, canGoBack } = useNav();
  const { profile, mode, settings, passwordRecovery, authLinkNotice, dismissAuthLinkNotice, isDemo, signupProvider, connecting } = useApp();
  const opacity = useRef(new Animated.Value(1)).current;
  const isPublic = publicRoutes.includes(route.name);
  const blocked =
    (!isPublic && !profile) || (profile && !isPublic && !canAccess(route.name, profile.role, profile.status));
  // Papel permite a tela, mas a conta ainda não está ativa.
  const blockedByStatus = Boolean(blocked && profile && canAccess(route.name, profile.role));

  useEffect(() => {
    if (!blocked) return;
    const notice = blockedByStatus && profile ? inactiveAccountNotice(profile.role, profile.status) : null;
    if (notice) {
      Alert.alert(notice.title, notice.body);
      if (canGoBack) return back();
    }
    reset(profile ? { name: "dashboard" } : { name: "login" });
  }, [blocked, blockedByStatus, canGoBack, back, profile, reset]);

  // Conta criada pelo Google (sem cadastro prévio): completa o cadastro antes de usar o app.
  const mustComplete = Boolean(profile && !isDemo && needsProfileCompletion(profile, signupProvider));
  useEffect(() => {
    if (mustComplete && !isPublic && route.name !== "complete-profile" && route.name !== "new-password") {
      reset({ name: "complete-profile" });
    }
  }, [mustComplete, isPublic, route.name, reset]);

  // Link "redefinir senha": com a sessão aberta, a próxima tela é a nova senha.
  useEffect(() => {
    if (passwordRecovery && profile && route.name !== "new-password") reset({ name: "new-password" });
  }, [passwordRecovery, profile, route.name, reset]);

  useEffect(() => {
    if (!authLinkNotice) return;
    Alert.alert(authLinkNotice.title, authLinkNotice.body);
    dismissAuthLinkNotice();
  }, [authLinkNotice, dismissAuthLinkNotice]);

  // Sessão encerrada em outro lugar (token expirado, logout): volta ao login.
  useEffect(() => {
    if (mode === "signedOut" && !isPublic) reset({ name: "login" });
  }, [mode, isPublic, reset]);

  useEffect(() => {
    if (settings.reduceMotion) return opacity.setValue(1);
    opacity.setValue(0.4);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [route, settings.reduceMotion, opacity]);

  const overlay = <LoadingOverlay message={connecting} />;
  if (blocked) return overlay;
  const Current = screens[route.name];
  return (
    <>
      <Animated.View key={route.name} style={{ flex: 1, opacity, backgroundColor: colors.ink50 }}>
        <Current />
      </Animated.View>
      {overlay}
    </>
  );
}

function Scaled({ children }: { children: ReactNode }) {
  const { settings } = useApp();
  return <TextScaleContext.Provider value={settings.largeText ? 1.15 : 1}>{children}</TextScaleContext.Provider>;
}

export default function SosEstudanteApp() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) SplashScreenApi.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  return (
    <AppStoreProvider>
      <Scaled>
        <NavigationProvider initial={{ name: "splash" }}>
          <Router />
        </NavigationProvider>
      </Scaled>
    </AppStoreProvider>
  );
}
