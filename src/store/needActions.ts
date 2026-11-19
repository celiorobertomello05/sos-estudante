import type { MyInterest, OpenNeed } from "../domain/needs";
import * as api from "../services/dataService";
import type { StoreCore } from "./core";

/** US05, lado do doador: necessidades abertas e demonstração de interesse. */
export function createNeedActions(core: StoreCore) {
  const { run, isDemo } = core;

  /** Necessidades e interesses vêm sempre do servidor (anônimos e atualizados). */
  const loadNeeds = () =>
    run<{ needs: OpenNeed[]; interests: MyInterest[] }>(async () => {
      // O modo demonstração não tem banco: não há necessidades de outros usuários.
      if (isDemo) return { needs: [], interests: [] };
      return api.loadNeeds();
    });

  const expressInterest = (needId: string) =>
    run(async () => {
      if (isDemo) throw new Error("BUSINESS_RULE: Disponível com o aplicativo conectado ao banco de dados.");
      await api.expressInterest(needId);
    });

  return { loadNeeds, expressInterest };
}
