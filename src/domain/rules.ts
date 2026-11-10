/**
 * Regras de negócio (fachada). São validadas no app (para feedback imediato)
 * e novamente no banco (funções RPC e políticas RLS), que é a fonte de verdade.
 * Implementação dividida por assunto.
 */
export { itemCategories } from "./catalog";
export * from "./requestRules";
export * from "./categoryEligibility";
export * from "./annualLimit";
export * from "./enrollmentRules";
export * from "./stockReservation";
export * from "./profileCompletion";
