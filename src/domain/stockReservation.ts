/** Reserva de estoque na aprovação. */
import type { ItemCategory, RequestItem, RequestStatus } from "./models";

/** Situações em que a quantidade aprovada já está reservada no estoque. */
export const requestStatusesHoldingStock: RequestStatus[] = ["approved", "separating", "ready"];

/**
 * Quanto de cada categoria já está reservado por pedidos aprovados e ainda
 * não entregues (o estoque só baixa na entrega). Espelha
 * `public.reserved_stock` (migration 20261110130000).
 */
export function reservedStockByCategory(
  requests: readonly { id: string; status: RequestStatus; items: readonly RequestItem[] }[],
  excludeRequestId?: string,
): Partial<Record<ItemCategory, number>> {
  const reserved: Partial<Record<ItemCategory, number>> = {};
  for (const request of requests) {
    if (request.id === excludeRequestId || !requestStatusesHoldingStock.includes(request.status)) continue;
    for (const item of request.items) {
      reserved[item.category] = (reserved[item.category] ?? 0) + item.quantityApproved;
    }
  }
  return reserved;
}

/**
 * Quantidades aprovadas limitadas ao saldo livre (estoque − reservas), na
 * mesma ordem do servidor (categoria, tamanho).
 */
export function allocateApprovedQuantities(
  items: readonly RequestItem[],
  stockByCategory: Partial<Record<ItemCategory, number>>,
  reserved: Partial<Record<ItemCategory, number>>,
): RequestItem[] {
  const used: Partial<Record<ItemCategory, number>> = {};
  const order = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.category.localeCompare(b.item.category) || a.item.size.localeCompare(b.item.size));
  const result = items.map((item) => ({ ...item }));
  for (const { item, index } of order) {
    const free = (stockByCategory[item.category] ?? 0) - (reserved[item.category] ?? 0) - (used[item.category] ?? 0);
    const approved = Math.max(0, Math.min(item.quantityRequested, free));
    used[item.category] = (used[item.category] ?? 0) + approved;
    result[index].quantityApproved = approved;
  }
  return result;
}
