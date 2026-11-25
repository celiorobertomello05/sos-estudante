import { categoryLabels } from "./labels";
import type { CollectionPoint, Donation, SupportRequest, UserRole } from "./models";

/** RU04: datas do usuário (entregas e retiradas), para a tela Calendário. */
export interface AgendaEntry {
  id: string;
  date: string;
  title: string;
  detail: string;
  kind: "donation" | "pickup";
  past: boolean;
}

interface AgendaData {
  requests: SupportRequest[];
  donations: Donation[];
  points: CollectionPoint[];
}

const pointName = (points: CollectionPoint[], id: string) => points.find((point) => point.id === id)?.name ?? "Ponto de coleta";

function requestTitle(request: SupportRequest) {
  const first = request.items[0];
  if (!first) return "Retirada de itens";
  const extra = request.items.length > 1 ? ` e mais ${request.items.length - 1}` : "";
  return `${first.quantityRequested}× ${categoryLabels[first.category]}${extra}`;
}

/**
 * Cada perfil vê as datas que lhe dizem respeito:
 * aluno = retiradas dos próprios pedidos; doador = entregas agendadas;
 * equipe = entregas de doadores e retiradas em andamento.
 */
export function buildAgenda(role: UserRole, data: AgendaData, now: Date = new Date()): AgendaEntry[] {
  const entries: AgendaEntry[] = [];
  const isPast = (iso: string, done: boolean) => done || new Date(iso).getTime() < now.getTime();

  if (role === "student") {
    for (const request of data.requests) {
      if (request.status === "cancelled") continue;
      entries.push({
        id: `r-${request.id}`,
        date: request.pickupAt,
        title: `Retirada: ${requestTitle(request)}`,
        detail: pointName(data.points, request.pointId),
        kind: "pickup",
        past: isPast(request.pickupAt, request.status === "delivered"),
      });
    }
  }

  if (role === "donor" || role === "collector") {
    for (const donation of data.donations) {
      if (donation.status === "rejected") continue;
      const who = role === "collector" ? `Entrega de ${donation.donorName.split(" ")[0]}` : "Entrega da sua doação";
      entries.push({
        id: `d-${donation.id}`,
        date: donation.scheduledFor,
        title: `${who}: ${donation.quantity}× ${categoryLabels[donation.category]}`,
        detail: pointName(data.points, donation.pointId),
        kind: "donation",
        past: isPast(donation.scheduledFor, donation.status !== "scheduled"),
      });
    }
  }

  if (role === "collector") {
    for (const request of data.requests) {
      if (request.status === "cancelled") continue;
      entries.push({
        id: `r-${request.id}`,
        date: request.pickupAt,
        title: `Retirada: ${requestTitle(request)}`,
        detail: pointName(data.points, request.pointId),
        kind: "pickup",
        past: isPast(request.pickupAt, request.status === "delivered"),
      });
    }
  }

  const time = (entry: AgendaEntry) => new Date(entry.date).getTime();
  const upcoming = entries.filter((entry) => !entry.past).sort((a, b) => time(a) - time(b));
  const past = entries.filter((entry) => entry.past).sort((a, b) => time(b) - time(a));
  return [...upcoming, ...past];
}
