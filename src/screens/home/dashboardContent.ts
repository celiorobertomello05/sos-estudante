import type { UserRole } from "../../domain/models";
import { RULES, isAwaitingTriage, isOpenRequest } from "../../domain/rules";
import type { AppStore } from "../../store/AppStore";
import type { Shortcut } from "./Shortcuts";

/** Cabeçalho do início: subtítulo, números e atalhos de cada papel (antes, três ternários). */
export interface DashboardContent {
  subtitle: string;
  stats: [number | string, string][];
  shortcuts: Shortcut[];
}

const totalStock = (app: AppStore) => app.stock.reduce((sum, s) => sum + s.quantity, 0);

export const dashboardContent: Record<UserRole, (app: AppStore) => DashboardContent> = {
  student: (app) => ({
    subtitle:
      app.enrollment?.status === "verified"
        ? `Matrícula ativa · ${app.enrollment.schoolName}`
        : "Envie sua declaração de matrícula para solicitar itens",
    stats: [
      [app.requests.filter((r) => isOpenRequest(r.status)).length, "Pedidos ativos"],
      [app.points.filter((p) => p.openNow).length, "Pontos abertos"],
      [totalStock(app), "Itens disponíveis"],
    ],
    shortcuts: [
      { label: "Solicitar uniforme", icon: "clipboard-outline", tone: "trust", route: { name: "request" } },
      { label: "Pontos próximos", icon: "location-outline", tone: "brand", route: { name: "points" } },
      { label: "Meus pedidos", icon: "cube-outline", tone: "amber", route: { name: "requests" } },
    ],
  }),
  donor: (app) => ({
    subtitle: "Obrigado por apoiar estudantes da sua região",
    stats: [
      [app.donations.reduce((sum, d) => sum + (d.status === "stocked" || d.status === "approved" ? d.quantity : 0), 0), "Itens doados"],
      [app.donations.filter((d) => d.status === "scheduled").length, "Agendadas"],
      [app.points.length, "Pontos parceiros"],
    ],
    shortcuts: [
      { label: "Fazer doação", icon: "heart-outline", tone: "brand", route: { name: "donate" } },
      { label: "Minha agenda", icon: "calendar-outline", tone: "trust", route: { name: "donate", tab: "agenda" } },
      { label: "Impacto", icon: "analytics-outline", tone: "amber", route: { name: "impact-map" } },
    ],
  }),
  collector: (app) => ({
    subtitle: app.profile?.status === "active" ? "Equipe de coleta e distribuição" : "Conta aguardando aprovação",
    stats: [
      [app.donations.filter((d) => isAwaitingTriage(d.status)).length, "Na triagem"],
      [app.requests.filter((r) => r.status === "ready").length, "Prontos"],
      [app.stock.filter((s) => s.quantity < RULES.lowStockThreshold).length, "Estoque baixo"],
    ],
    shortcuts: [
      { label: "Triagem", icon: "filter-outline", tone: "amber", route: { name: "triage" } },
      { label: "Estoque", icon: "cube-outline", tone: "brand", route: { name: "stock" } },
      { label: "Distribuição", icon: "car-outline", tone: "trust", route: { name: "distribution" } },
    ],
  }),
};
