/** Limite anual por beneficiário. */
import type { ItemCategory, RequestItem, RequestStatus } from "./models";
import { CategoryEligibilityDelivery, addUtcCalendarMonths } from "./categoryEligibility";

/**
 * Limite anual por beneficiário:
 * até 2 camisas e 1 kit escolar entregues em 12 meses móveis. Vale junto com
 * a carência de 6 meses por categoria. Só entregas contam; cancelamentos e
 * recusas não consomem a cota. Categorias sem cota seguem só a carência.
 */
export const ANNUAL_LIMITS: Partial<Record<ItemCategory, number>> = {
  camisa: 2,
  kit: 1,
};

const ANNUAL_WINDOW_MONTHS = 12;

export interface AnnualLimitRequest {
  id: string;
  status: RequestStatus;
  items: readonly Pick<RequestItem, "category" | "quantityApproved">[];
}

export interface EvaluateAnnualLimitInput {
  requestedItems: readonly Pick<RequestItem, "category" | "quantityRequested">[];
  previousRequests: readonly AnnualLimitRequest[];
  previousDeliveries: readonly CategoryEligibilityDelivery[];
  now: Date;
}

export interface AnnualLimitBlock {
  category: ItemCategory;
  limit: number;
  used: number;
  requested: number;
}

export interface AnnualLimitResult {
  allowed: boolean;
  blockedCategories: AnnualLimitBlock[];
}

export function evaluateAnnualLimit({
  requestedItems,
  previousRequests,
  previousDeliveries,
  now,
}: EvaluateAnnualLimitInput): AnnualLimitResult {
  const windowStart = addUtcCalendarMonths(now, -ANNUAL_WINDOW_MONTHS);
  const requestedByCategory = new Map<ItemCategory, number>();
  for (const item of requestedItems) {
    requestedByCategory.set(item.category, (requestedByCategory.get(item.category) ?? 0) + item.quantityRequested);
  }

  const blockedCategories: AnnualLimitBlock[] = [];
  for (const [category, requested] of requestedByCategory) {
    const limit = ANNUAL_LIMITS[category];
    if (limit === undefined) continue;
    let used = 0;
    for (const request of previousRequests) {
      if (request.status !== "delivered") continue;
      const delivery = previousDeliveries.find((d) => d.requestId === request.id);
      const deliveredAt = delivery?.deliveredAt ? new Date(delivery.deliveredAt) : null;
      if (!deliveredAt || Number.isNaN(deliveredAt.getTime())) continue;
      if (deliveredAt.getTime() <= windowStart.getTime()) continue;
      for (const item of request.items) {
        if (item.category === category) used += item.quantityApproved;
      }
    }
    if (used + requested > limit) {
      blockedCategories.push({ category, limit, used, requested });
    }
  }

  return { allowed: blockedCategories.length === 0, blockedCategories };
}
