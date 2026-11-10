import type { ItemCategory } from "./models";

/** Tamanhos oferecidos pela interface para cada categoria existente. */
export const sizesByCategory: Record<ItemCategory, readonly string[]> = {
  camisa: ["PP", "P", "M", "G", "GG"],
  calca: ["34", "36", "38", "40", "42", "44"],
  agasalho: ["P", "M", "G", "GG"],
  shorts: ["P", "M", "G"],
  jaqueta: ["P", "M", "G", "GG"],
  kit: ["Único"],
};

export const itemCategories = Object.freeze(
  Object.keys(sizesByCategory) as ItemCategory[],
);
