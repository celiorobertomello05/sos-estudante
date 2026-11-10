/**
 * Regras de layout responsivo. Funções puras, sem React, para serem
 * testadas e reaproveitadas pelos componentes de grade.
 */

/** Larguras de referência da janela (dp). */
export const BREAKPOINTS = {
  /** Celulares pequenos (ex.: 320–359 dp). */
  compact: 360,
  /** A partir daqui, tablet ou celular deitado. */
  wide: 600,
} as const;

export type WindowClass = "compact" | "regular" | "wide";

export function windowClass(width: number): WindowClass {
  if (width < BREAKPOINTS.compact) return "compact";
  if (width >= BREAKPOINTS.wide) return "wide";
  return "regular";
}

/**
 * Quantas colunas cabem em `availableWidth` sem que um item fique menor que
 * `minItemWidth`. Antes de medir (largura 0), usa 2 colunas, como o layout
 * original.
 */
export function gridColumns(availableWidth: number, minItemWidth: number, gap: number, maxColumns = 4): number {
  if (availableWidth <= 0) return Math.min(2, maxColumns);
  const fit = Math.floor((availableWidth + gap) / (minItemWidth + gap));
  return Math.max(1, Math.min(maxColumns, fit));
}

/** Largura de cada item para `columns` colunas separadas por `gap`. */
export function gridItemWidth(availableWidth: number, columns: number, gap: number): number {
  return (availableWidth - gap * (columns - 1)) / columns;
}
