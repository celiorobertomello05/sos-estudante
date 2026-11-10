import type { StockItem } from "../../domain/models";
import { RULES } from "../../domain/rules";

export const stockTone = (item: StockItem) => (item.quantity === 0 ? "rose" : item.quantity < RULES.lowStockThreshold ? "amber" : "brand");

export const stockLabel = (item: StockItem) => (item.quantity === 0 ? "Esgotado" : item.quantity < RULES.lowStockThreshold ? "Baixo estoque" : "Disponível");
