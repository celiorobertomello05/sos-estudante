import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BackHandler } from "react-native";
import type { Route } from "./routes";

interface NavigationApi {
  route: Route;
  /** Abre uma tela, guardando a atual no histórico. */
  go: (route: Route) => void;
  /** Substitui a tela atual (sem histórico). */
  replace: (route: Route) => void;
  /** Limpa o histórico e abre a tela (ex.: após login ou ao tocar numa aba). */
  reset: (route: Route) => void;
  back: () => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationApi | null>(null);

export function NavigationProvider({ initial, children }: { initial: Route; children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([initial]);

  const go = useCallback((route: Route) => setStack((current) => [...current, route].slice(-30)), []);
  const replace = useCallback((route: Route) => setStack((current) => [...current.slice(0, -1), route]), []);
  const reset = useCallback((route: Route) => setStack([route]), []);
  const back = useCallback(() => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current)), []);

  // Botão voltar do Android: volta uma tela; na raiz, deixa o sistema fechar o app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length <= 1) return false;
      back();
      return true;
    });
    return () => subscription.remove();
  }, [stack.length, back]);

  const value = useMemo(
    () => ({ route: stack[stack.length - 1], go, replace, reset, back, canGoBack: stack.length > 1 }),
    [stack, go, replace, reset, back],
  );
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNav() {
  const nav = useContext(NavigationContext);
  if (!nav) throw new Error("useNav precisa estar dentro de NavigationProvider");
  return nav;
}

/** Lê os parâmetros da rota atual com o tipo correto. */
export function useRouteParams<N extends Route["name"]>(name: N) {
  const { route } = useNav();
  if (route.name !== name) throw new Error(`Rota inesperada: ${route.name}`);
  return route as Extract<Route, { name: N }>;
}
