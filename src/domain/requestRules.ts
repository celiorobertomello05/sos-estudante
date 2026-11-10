/** Regras gerais de solicitação, triagem, conta e código de retirada. */
import type { AccountStatus, DonationStatus, RequestItem, RequestStatus, UserRole } from "./models";

export const RULES = {
  maxItemsPerRequest: 5,
  maxQuantityPerItem: 5,
  maxOpenRequestsPerStudent: 3,
  maxDonationQuantity: 50,
  pickupCodeLength: 4,
  lowStockThreshold: 15,
};

/** Tentativas erradas até o código de retirada bloquear (confirm_delivery). */
export const PICKUP_CODE_MAX_ATTEMPTS = 5;

export const REQUEST_STEPS = [
  "Solicitação enviada",
  "Solicitação analisada",
  "Itens separados",
  "Kit preparado",
  "Pronto para retirada",
  "Retirada realizada",
] as const;

/** Transições permitidas para a equipe de distribuição. */
export const allowedRequestTransitions: Record<RequestStatus, RequestStatus[]> = {
  in_review: ["approved", "cancelled"],
  approved: ["separating", "cancelled"],
  separating: ["ready", "cancelled"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus) {
  return allowedRequestTransitions[from].includes(to);
}

export function isOpenRequest(status: RequestStatus) {
  return status !== "delivered" && status !== "cancelled";
}

/**
 * Doações que ainda aguardam triagem. Enquanto não existir a etapa formal de
 * recebimento, `scheduled` também conta: é o que `review_donation` aceita hoje.
 */
export const donationStatusesAwaitingTriage: DonationStatus[] = ["received", "scheduled"];

export function isAwaitingTriage(status: DonationStatus) {
  return donationStatusesAwaitingTriage.includes(status);
}

/**
 * Explica a uma conta não ativa por que as operações estão indisponíveis.
 * Retorna `null` para conta ativa. É experiência de uso: o servidor continua
 * recusando operações de contas pendentes ou bloqueadas.
 */
export function inactiveAccountNotice(role: UserRole, status: AccountStatus): { title: string; body: string } | null {
  if (status === "active") return null;
  if (status === "blocked") {
    return {
      title: "Conta bloqueada",
      body: "As operações estão suspensas para esta conta. Fale com o suporte em Ajuda para entender o motivo.",
    };
  }
  const operations =
    role === "collector"
      ? "As operações de triagem e entrega"
      : role === "donor"
        ? "O agendamento de doações"
        : "As solicitações de itens";
  return {
    title: "Cadastro em análise",
    body: `${operations} serão liberadas após a aprovação da instituição.`,
  };
}

export function validateRequestItems(items: RequestItem[]): string | null {
  if (items.length === 0) return "Selecione pelo menos um item.";
  if (items.length > RULES.maxItemsPerRequest) {
    return `Cada solicitação aceita até ${RULES.maxItemsPerRequest} itens.`;
  }
  const invalid = items.find(
    (item) =>
      !Number.isInteger(item.quantityRequested) ||
      item.quantityRequested < 1 ||
      item.quantityRequested > RULES.maxQuantityPerItem,
  );
  if (invalid) return `A quantidade por item deve ficar entre 1 e ${RULES.maxQuantityPerItem}.`;
  const uniqueItems = new Set(items.map((item) => `${item.category}\u0000${item.size}`));
  if (uniqueItems.size !== items.length) {
    return "Não adicione a mesma categoria e tamanho mais de uma vez.";
  }
  return null;
}

export function isValidPickupCode(value: string) {
  return new RegExp(`^\\d{${RULES.pickupCodeLength}}$`).test(value);
}
