import {
  GlassOptimization,
  GlassPiece,
  GlassSheetPlan,
  GlassSheetSizeId,
  PositionedGlassCut,
} from "../models";

const INCH_TO_MM = 25.4;

export const GLASS_SHEET_SIZES: Record<
  GlassSheetSizeId,
  { label: string; widthMm: number; heightMm: number }
> = {
  "130x84": {
    label: '130 × 84"',
    widthMm: 130 * INCH_TO_MM,
    heightMm: 84 * INCH_TO_MM,
  },
  "96x72": {
    label: '96 × 72"',
    widthMm: 96 * INCH_TO_MM,
    heightMm: 72 * INCH_TO_MM,
  },
};

interface FreeRectangle {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

interface Piece {
  id: string;
  widthMm: number;
  heightMm: number;
}

interface WorkingSheet {
  cuts: PositionedGlassCut[];
  free: FreeRectangle[];
}

interface Placement {
  sheetIndex: number;
  freeIndex: number;
  widthMm: number;
  heightMm: number;
  rotated: boolean;
}

const round = (value: number, precision = 2) =>
  Math.round(value * 10 ** precision) / 10 ** precision;

function expandPieces(glass: GlassPiece[]): Piece[] {
  return glass
    .flatMap((piece, groupIndex) =>
      Array.from({ length: piece.pieces }, (_, pieceIndex) => ({
        id: `g${groupIndex + 1}-${pieceIndex + 1}`,
        widthMm: piece.widthMm,
        heightMm: piece.heightMm,
      })),
    )
    .sort((a, b) => b.widthMm * b.heightMm - a.widthMm * a.heightMm);
}

function findPlacement(
  sheets: WorkingSheet[],
  piece: Piece,
): Placement | null {
  let best: Placement | null = null;
  let bestRemainder = Number.POSITIVE_INFINITY;
  sheets.forEach((sheet, sheetIndex) => {
    sheet.free.forEach((free, freeIndex) => {
      const orientations = [
        { widthMm: piece.widthMm, heightMm: piece.heightMm, rotated: false },
        { widthMm: piece.heightMm, heightMm: piece.widthMm, rotated: true },
      ];
      for (const orientation of orientations) {
        if (
          orientation.widthMm <= free.widthMm &&
          orientation.heightMm <= free.heightMm
        ) {
          const remainder =
            free.widthMm * free.heightMm -
            orientation.widthMm * orientation.heightMm;
          if (remainder < bestRemainder) {
            bestRemainder = remainder;
            best = { sheetIndex, freeIndex, ...orientation };
          }
        }
      }
    });
  });
  return best;
}

function splitFreeRectangle(
  free: FreeRectangle,
  cutWidthMm: number,
  cutHeightMm: number,
): FreeRectangle[] {
  const result: FreeRectangle[] = [];
  const rightWidth = free.widthMm - cutWidthMm;
  const bottomHeight = free.heightMm - cutHeightMm;
  if (rightWidth > 0) {
    result.push({
      xMm: free.xMm + cutWidthMm,
      yMm: free.yMm,
      widthMm: rightWidth,
      heightMm: cutHeightMm,
    });
  }
  if (bottomHeight > 0) {
    result.push({
      xMm: free.xMm,
      yMm: free.yMm + cutHeightMm,
      widthMm: free.widthMm,
      heightMm: bottomHeight,
    });
  }
  return result;
}

export function optimizeGlassForSheet(
  glass: GlassPiece[],
  sizeId: GlassSheetSizeId,
): GlassOptimization {
  const stock = GLASS_SHEET_SIZES[sizeId];
  const pieces = expandPieces(glass);
  const workingSheets: WorkingSheet[] = [];

  for (const piece of pieces) {
    if (
      !(
        (piece.widthMm <= stock.widthMm && piece.heightMm <= stock.heightMm) ||
        (piece.heightMm <= stock.widthMm && piece.widthMm <= stock.heightMm)
      )
    ) {
      throw new Error(
        `El cristal ${piece.widthMm} × ${piece.heightMm} mm no cabe en la plancha ${stock.label}.`,
      );
    }

    let placement = findPlacement(workingSheets, piece);
    if (!placement) {
      workingSheets.push({
        cuts: [],
        free: [
          { xMm: 0, yMm: 0, widthMm: stock.widthMm, heightMm: stock.heightMm },
        ],
      });
      placement = findPlacement(workingSheets, piece);
    }
    if (!placement) throw new Error("No se pudo ubicar el cristal.");

    const sheet = workingSheets[placement.sheetIndex];
    const free = sheet.free.splice(placement.freeIndex, 1)[0];
    sheet.cuts.push({
      id: piece.id,
      xMm: free.xMm,
      yMm: free.yMm,
      widthMm: placement.widthMm,
      heightMm: placement.heightMm,
      originalWidthMm: piece.widthMm,
      originalHeightMm: piece.heightMm,
      rotated: placement.rotated,
    });
    sheet.free.push(
      ...splitFreeRectangle(free, placement.widthMm, placement.heightMm),
    );
  }

  const sheetAreaM2 = (stock.widthMm * stock.heightMm) / 1_000_000;
  const sheets: GlassSheetPlan[] = workingSheets.map((sheet, index) => {
    const usedAreaM2 = sheet.cuts.reduce(
      (sum, cut) => sum + (cut.widthMm * cut.heightMm) / 1_000_000,
      0,
    );
    const wasteAreaM2 = sheetAreaM2 - usedAreaM2;
    return {
      id: index + 1,
      widthMm: stock.widthMm,
      heightMm: stock.heightMm,
      cuts: sheet.cuts,
      usedAreaM2: round(usedAreaM2),
      wasteAreaM2: round(wasteAreaM2),
      wastePercent: round((wasteAreaM2 / sheetAreaM2) * 100, 1),
    };
  });
  const totalStockArea = sheets.length * sheetAreaM2;
  const usedArea = sheets.reduce((sum, sheet) => sum + sheet.usedAreaM2, 0);
  return {
    sizeId,
    label: stock.label,
    sheets,
    totalWasteAreaM2: round(totalStockArea - usedArea),
    wastePercent: totalStockArea
      ? round(((totalStockArea - usedArea) / totalStockArea) * 100, 1)
      : 0,
  };
}

export function compareGlassSheetSizes(glass: GlassPiece[]) {
  const options = (Object.keys(GLASS_SHEET_SIZES) as GlassSheetSizeId[]).map(
    (sizeId): GlassOptimization => {
      try {
        return optimizeGlassForSheet(glass, sizeId);
      } catch (error) {
        return {
          sizeId,
          label: GLASS_SHEET_SIZES[sizeId].label,
          sheets: [],
          totalWasteAreaM2: 0,
          wastePercent: 100,
          error: error instanceof Error ? error.message : "La pieza no cabe.",
        };
      }
    },
  );
  const recommended = options.filter((option) => !option.error).sort((a, b) => {
    const aArea = a.sheets.reduce(
      (sum, sheet) => sum + (sheet.widthMm * sheet.heightMm) / 1_000_000,
      0,
    );
    const bArea = b.sheets.reduce(
      (sum, sheet) => sum + (sheet.widthMm * sheet.heightMm) / 1_000_000,
      0,
    );
    return aArea - bArea || a.wastePercent - b.wastePercent;
  })[0];
  return { options, recommendedSizeId: recommended?.sizeId ?? null };
}
