import { MaterialCut, OptimizedBar } from "../models";

/**
 * First Fit Decreasing: una heurística rápida y determinista.
 * Agrupa por referencia de perfil antes de llamar esta función.
 */
export function optimizeCuts(cuts: MaterialCut[], barLengthMm: number): OptimizedBar[] {
  const pieces = cuts
    .flatMap((cut) =>
      Array.from({ length: cut.pieces }, () => ({
        lengthMm: cut.lengthMm,
        label: cut.purpose,
      })),
    )
    .sort((a, b) => b.lengthMm - a.lengthMm);

  if (pieces.some((piece) => piece.lengthMm > barLengthMm)) {
    throw new Error("Existe un corte mayor que el largo de barra configurado.");
  }

  const bars: OptimizedBar[] = [];
  for (const piece of pieces) {
    const target = bars.find((bar) => bar.remainderMm >= piece.lengthMm);
    if (target) {
      target.cuts.push(piece);
      target.remainderMm -= piece.lengthMm;
    } else {
      bars.push({
        id: bars.length + 1,
        cuts: [piece],
        remainderMm: barLengthMm - piece.lengthMm,
      });
    }
  }
  return bars;
}
