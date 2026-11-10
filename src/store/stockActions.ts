import type { MovementType } from "../domain/models";
import { hasStockItemAdministrativeDetails } from "../domain/models";
import * as api from "../services/dataService";
import { localId } from "../utils/format";
import type { StoreCore } from "./core";

/** Estoque: movimentações da equipe. */
export function createStockActions(core: StoreCore) {
  const { profile, data, patch, run, refresh, isDemo } = core;

  const registerMovement = (input: {
    stockItemId: string | null;
    label: string;
    type: MovementType;
    quantity: number;
    from: string;
    to: string;
  }) =>
    run(async () => {
      const min = input.type === "adjust" ? 0 : 1;
      if (!Number.isInteger(input.quantity) || input.quantity < min || input.quantity > 1000) {
        throw new Error(`BUSINESS_RULE: Informe uma quantidade entre ${min} e 1000.`);
      }
      if (!isDemo) {
        await api.registerMovement(input);
        return refresh();
      }
      const target = data.stock.find((s) => s.id === input.stockItemId);
      if (target && (input.type === "out" || input.type === "transfer") && target.quantity < input.quantity) {
        throw new Error("BUSINESS_RULE: Estoque insuficiente para esta movimentação.");
      }
      const delta = input.type === "in" ? input.quantity : input.type === "out" ? -input.quantity : 0;
      patch({
        stock: data.stock.map((s) => {
          if (s.id !== input.stockItemId) return s;
          const nextQuantity = input.type === "adjust" ? input.quantity : s.quantity + delta;
          if (input.type === "transfer" && hasStockItemAdministrativeDetails(s)) {
            return { ...s, location: input.to };
          }
          return { ...s, quantity: nextQuantity };
        }),
        movements: [
          { id: localId("mv"), responsible: profile?.fullName ?? "Equipe", createdAt: new Date().toISOString(), ...input },
          ...data.movements,
        ],
      });
    });

  return { registerMovement };
}
