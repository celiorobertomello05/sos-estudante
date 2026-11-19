import type { ItemCategory, RequestStatus } from "./models";
import { categoryLabels } from "./labels";

/** US05 (lado do doador): necessidade aberta, sempre anônima (sem dados do estudante). */
export interface OpenNeed {
  id: string;
  category: ItemCategory;
  size: string;
  quantity: number;
  district: string;
  createdAt: string;
  interestedCount: number;
  /** O doador logado já demonstrou interesse. */
  mine: boolean;
}

/** Interesse demonstrado pelo doador e a situação atual do pedido atendido. */
export interface MyInterest {
  id: string;
  needId: string;
  category: ItemCategory;
  size: string;
  quantity: number;
  district: string;
  status: RequestStatus;
  createdAt: string;
}

export const MAX_ACTIVE_INTERESTS = 20;

export function needTitle(need: Pick<OpenNeed, "category" | "size" | "quantity">): string {
  return `${need.quantity}× ${categoryLabels[need.category]} — Tam. ${need.size}`;
}

export function interestedLabel(need: Pick<OpenNeed, "interestedCount" | "mine">): string {
  if (need.mine) return "Você quer ajudar";
  if (need.interestedCount === 0) return "Sem interessados";
  return need.interestedCount === 1 ? "1 interessado" : `${need.interestedCount} interessados`;
}

/** Filtra por categoria e por texto (item, tamanho ou bairro). */
export function filterNeeds(needs: OpenNeed[], category: ItemCategory | "all", query: string): OpenNeed[] {
  const q = query.trim().toLowerCase();
  return needs.filter((need) => {
    if (category !== "all" && need.category !== category) return false;
    return !q || `${categoryLabels[need.category]} ${need.size} ${need.district}`.toLowerCase().includes(q);
  });
}

/** Pedido ainda aberto: o doador pode demonstrar interesse. */
export function isNeedOpen(status: RequestStatus): boolean {
  return status === "in_review" || status === "approved" || status === "separating";
}
