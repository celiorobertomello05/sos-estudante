import type { AccountStatus, ItemCategory, UserRole } from "../domain/models";

/** Todas as telas do app e os parâmetros que cada uma recebe. */
export type Route =
  | { name: "splash" }
  | { name: "onboarding" }
  | { name: "login" }
  | { name: "register"; role: UserRole }
  | { name: "forgot-password" }
  | { name: "new-password" }
  | { name: "complete-profile" }
  | { name: "dashboard" }
  | { name: "donate"; tab?: "new" | "agenda" }
  | { name: "donation-success"; id: string }
  | { name: "points" }
  | { name: "stock" }
  | { name: "stock-detail"; id: string }
  | { name: "triage" }
  | { name: "request"; category?: ItemCategory }
  | { name: "request-success"; id: string }
  | { name: "requests" }
  | { name: "request-detail"; id: string }
  | { name: "distribution" }
  | { name: "delivery"; id: string }
  | { name: "history" }
  | { name: "notifications" }
  | { name: "profile" }
  | { name: "personal-data" }
  | { name: "enrollment" }
  | { name: "documents" }
  | { name: "settings" }
  | { name: "security" }
  | { name: "help" }
  | { name: "about" }
  | { name: "admin" }
  | { name: "admin-stock" }
  | { name: "reviews" }
  | { name: "impact-map" };

export type RouteName = Route["name"];

export const publicRoutes: RouteName[] = ["splash", "onboarding", "login", "register", "forgot-password"];

/** Telas restritas. As que não aparecem aqui ficam liberadas para todos os papéis logados. */
export const routeRoles: Partial<Record<RouteName, UserRole[]>> = {
  donate: ["donor"],
  "donation-success": ["donor"],
  request: ["student"],
  "request-success": ["student"],
  requests: ["student"],
  enrollment: ["student"],
  triage: ["collector"],
  distribution: ["collector"],
  delivery: ["collector"],
  admin: ["collector"],
  "admin-stock": ["collector"],
  reviews: ["collector"],
  "impact-map": ["collector", "donor"],
  "request-detail": ["student", "collector"],
};

/**
 * Telas que iniciam operações (doar, solicitar, triar, distribuir, entregar,
 * movimentar estoque). Exigem conta ativa. É só experiência de uso: o servidor
 * continua recusando operações de contas pendentes ou bloqueadas.
 */
export const operationalRoutes: RouteName[] = [
  "donate",
  "donation-success",
  "request",
  "request-success",
  "triage",
  "distribution",
  "delivery",
  "admin",
  "admin-stock",
  "reviews",
];

export function requiresActiveAccount(route: RouteName) {
  return operationalRoutes.includes(route);
}

export function canAccess(route: RouteName, role: UserRole, status: AccountStatus = "active") {
  const allowed = routeRoles[route];
  if (allowed && !allowed.includes(role)) return false;
  return status === "active" || !requiresActiveAccount(route);
}

/**
 * Para onde o "voltar" leva. Com histórico, volta uma tela. Sem histórico
 * (tela aberta pela barra inferior, que reinicia a pilha), volta ao Início —
 * exceto no próprio Início e nas telas públicas.
 */
export function backTarget(route: RouteName, canGoBack: boolean): "history" | "home" | null {
  if (canGoBack) return "history";
  if (route === "dashboard" || publicRoutes.includes(route)) return null;
  return "home";
}
