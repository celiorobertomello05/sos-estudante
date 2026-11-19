import { cleanPointInput, pointGeocodeQuery, pointInputIssue } from "../domain/pointRegistration";
import type { PointInput } from "../domain/pointRegistration";
import * as api from "../services/dataService";
import { geocodeAddress } from "../services/locationService";
import { localId } from "../utils/format";
import type { StoreCore } from "./core";

/** Pontos de coleta: cadastro pela equipe (distribuidor com conta ativa). */
export function createPointActions(core: StoreCore) {
  const { data, patch, run, refresh, isDemo, ensureActiveAccount } = core;

  const createPoint = (raw: PointInput) =>
    run(async () => {
      ensureActiveAccount();
      const issue = pointInputIssue(raw);
      if (issue) throw new Error(`BUSINESS_RULE: ${issue}`);
      const input = cleanPointInput(raw);

      // O aparelho localiza o endereço (sem chave de API); o servidor valida de novo.
      const located = await geocodeAddress(pointGeocodeQuery(input));
      if (!located.ok) throw new Error(`BUSINESS_RULE: ${located.message}`);
      const { latitude, longitude } = located.coordinates;
      const payload = { ...input, capacity: Number(input.capacity), latitude, longitude };

      if (!isDemo) {
        await api.createCollectionPoint(payload);
        return refresh();
      }
      patch({
        points: [
          ...data.points,
          { id: localId("pt"), distanceKm: 0, openNow: true, rating: 5, imageKey: "pointA", ...payload },
        ],
      });
    });

  return { createPoint };
}
