import {
  MaterialBreakdown,
  OpeningInput,
  SYSTEM_IDS,
  SystemId,
  WindowSystemDefinition,
} from "../models";

const round = (value: number, precision = 2) =>
  Math.round(value * 10 ** precision) / 10 ** precision;

/**
 * PLANTILLA, NO FÓRMULA DE FABRICACIÓN.
 * Produce un desglose básico demostrativo para validar el flujo de la app.
 * Cada sistema debe reemplazar esta función con sus descuentos, encuentros,
 * referencias de perfiles y accesorios reales.
 */
function demoBreakdown(input: OpeningInput): MaterialBreakdown {
  const { widthMm, heightMm, quantity } = input;
  const parts =
    input.systemId === "AA"
      ? input.bodyCount ?? input.leaves ?? 1
      : input.leaves ?? 2;
  const glassWidth = widthMm / parts;
  const glassArea = (glassWidth * heightMm * parts * quantity) / 1_000_000;
  const frameMeters = ((widthMm * 2 + heightMm * 2) * quantity) / 1000;
  const leafMeters = ((glassWidth * 2 + heightMm * 2) * parts * quantity) / 1000;

  return {
    cuts: [
      {
        id: "frame-horizontal",
        materialCode: `${input.systemId}-MARCO-H`,
        materialName: "Perfil de marco horizontal (referencia pendiente)",
        lengthMm: widthMm,
        pieces: 2 * quantity,
        purpose: "Marco",
      },
      {
        id: "frame-vertical",
        materialCode: `${input.systemId}-MARCO-V`,
        materialName: "Perfil de marco vertical (referencia pendiente)",
        lengthMm: heightMm,
        pieces: 2 * quantity,
        purpose: "Marco",
      },
      {
        id: "leaf-horizontal",
        materialCode: `${input.systemId}-HOJA-H`,
        materialName: "Perfil de hoja horizontal (referencia pendiente)",
        lengthMm: round(glassWidth, 0),
        pieces: 2 * parts * quantity,
        purpose: "Hojas",
      },
      {
        id: "leaf-vertical",
        materialCode: `${input.systemId}-HOJA-V`,
        materialName: "Perfil de hoja vertical (referencia pendiente)",
        lengthMm: heightMm,
        pieces: 2 * parts * quantity,
        purpose: "Hojas",
      },
    ],
    materials: ([
      {
        code: `${input.systemId}-PERFILES`,
        name: "Perfiles (estimado de plantilla)",
        unit: "m",
        quantity: round(frameMeters + leafMeters),
        category: "profile",
      },
      {
        code: "GOMA",
        name: "Goma",
        unit: "m",
        quantity: input.accessories.rubberMeters,
        category: "accessory",
      },
      {
        code: "RUEDAS",
        name: "Ruedas",
        unit: "ud",
        quantity: input.accessories.wheels,
        category: "accessory",
      },
      {
        code: `CIERRE-${input.accessories.lockType}`,
        name:
          input.accessories.lockType === "puño"
            ? "Puño"
          : input.accessories.lockType === "mono"
              ? "Mono"
              : input.accessories.lockType === "monopunto"
                ? "Monopunto"
              : "Cerradura tradicional",
        unit: "ud",
        quantity: input.accessories.locks,
        category: "accessory",
      },
      {
        code: "KIT-GUIAS",
        name: "Kit de guías plásticas",
        unit: "ud",
        quantity: input.accessories.guideKits,
        category: "accessory",
      },
      {
        code: "FELPA",
        name: "Felpa",
        unit: "m",
        quantity: input.accessories.weatherstripMeters,
        category: "accessory",
      },
      {
        code: "TORNILLOS",
        name: "Tornillos",
        unit: "ud",
        quantity: input.accessories.screws,
        category: "accessory",
      },
    ] as MaterialBreakdown["materials"]).filter(
      (material) => material.category === "profile" || material.quantity > 0,
    ),
    glass: [
      {
        widthMm: round(glassWidth, 0),
        heightMm,
        pieces: parts * quantity,
        areaM2: round(glassArea),
      },
    ],
    estimatedWastePercent: 0,
    warning:
      "Desglose demostrativo. Configure la fórmula técnica real antes de fabricar.",
  };
}

type SlidingProfileRule = {
  suffix: string;
  name: string;
  purpose: string;
  axis: "width" | "height" | "leafWidth";
  pieces: number;
};

const slidingRulesByLeaves: Record<2 | 3 | 4, SlidingProfileRule[]> = {
  2: [
    { suffix: "R2V", name: "Riel 2 vías", purpose: "Riel inferior", axis: "width", pieces: 1 },
    { suffix: "C2V", name: "Cabezal 2 vías", purpose: "Cabezal de marco", axis: "width", pieces: 1 },
    { suffix: "L2V", name: "Lateral 2 vías", purpose: "Laterales de marco", axis: "height", pieces: 2 },
    { suffix: "LL", name: "Llavín", purpose: "Vertical de cierre", axis: "height", pieces: 2 },
    { suffix: "ENG", name: "Enganche", purpose: "Vertical de encuentro", axis: "height", pieces: 2 },
    { suffix: "CH", name: "Cabezal de hoja", purpose: "Horizontal superior de hoja", axis: "leafWidth", pieces: 2 },
    { suffix: "ALF", name: "Alféizar", purpose: "Horizontal inferior de hoja", axis: "leafWidth", pieces: 2 },
  ],
  3: [
    { suffix: "R3V", name: "Riel 3 vías", purpose: "Riel inferior", axis: "width", pieces: 1 },
    { suffix: "C3V", name: "Cabezal 3 vías", purpose: "Cabezal de marco", axis: "width", pieces: 1 },
    { suffix: "L3V", name: "Lateral 3 vías", purpose: "Laterales de marco", axis: "height", pieces: 2 },
    { suffix: "LL", name: "Llavín", purpose: "Vertical de cierre", axis: "height", pieces: 2 },
    { suffix: "ENG", name: "Enganche", purpose: "Vertical de encuentro", axis: "height", pieces: 4 },
    { suffix: "CH", name: "Cabezal de hoja", purpose: "Horizontal superior de hoja", axis: "leafWidth", pieces: 3 },
    { suffix: "ALF", name: "Alféizar", purpose: "Horizontal inferior de hoja", axis: "leafWidth", pieces: 3 },
  ],
  4: [
    { suffix: "R2V", name: "Riel 2 vías", purpose: "Riel inferior", axis: "width", pieces: 1 },
    { suffix: "C2V", name: "Cabezal 2 vías", purpose: "Cabezal de marco", axis: "width", pieces: 1 },
    { suffix: "L2V", name: "Lateral 2 vías", purpose: "Laterales de marco", axis: "height", pieces: 2 },
    { suffix: "LL", name: "Llavín", purpose: "Vertical de cierre", axis: "height", pieces: 4 },
    { suffix: "ENG", name: "Enganche", purpose: "Vertical de encuentro", axis: "height", pieces: 4 },
    { suffix: "CH", name: "Cabezal de hoja", purpose: "Horizontal superior de hoja", axis: "leafWidth", pieces: 4 },
    { suffix: "ALF", name: "Alféizar", purpose: "Horizontal inferior de hoja", axis: "leafWidth", pieces: 4 },
  ],
};

function slidingWindowBreakdown(input: OpeningInput): MaterialBreakdown {
  const base = demoBreakdown(input);
  const leaves = input.leaves ?? 2;
  if (leaves !== 2 && leaves !== 3 && leaves !== 4) {
    throw new Error("La cantidad de hojas debe ser 2, 3 o 4.");
  }
  const leafWidth = input.widthMm / leaves;
  const cuts = slidingRulesByLeaves[leaves].map((rule) => {
    const lengthMm =
      rule.axis === "width"
        ? input.widthMm
        : rule.axis === "height"
          ? input.heightMm
          : leafWidth;
    return {
      id: `${input.systemId}-${rule.suffix}`,
      materialCode: `${input.systemId}-${rule.suffix}`,
      materialName: rule.name,
      lengthMm: round(lengthMm, 1),
      pieces: rule.pieces * input.quantity,
      purpose: rule.purpose,
    };
  });
  const profileMaterials: MaterialBreakdown["materials"] = cuts.map((cut) => ({
    code: cut.materialCode,
    name: cut.materialName,
    unit: "m",
    quantity: round((cut.lengthMm * cut.pieces) / 1000),
    category: "profile",
  }));

  return {
    ...base,
    cuts,
    materials: [
      ...profileMaterials,
      ...base.materials.filter((material) => material.category === "accessory"),
    ],
    warning:
      "Estimado basado en cantidad de hojas y medidas terminadas. Valide descuentos técnicos antes de fabricar.",
  };
}

export const SYSTEM_REGISTRY: Record<SystemId, WindowSystemDefinition> =
  Object.fromEntries(
    SYSTEM_IDS.map((id) => [
      id,
      {
        id,
        name: id,
        formulaVersion:
          id === "Tradicional" || id === "P-65" || id === "P-92"
            ? "estimated-sliding-1"
            : "demo-1",
        configured: id === "Tradicional" || id === "P-65" || id === "P-92",
        calculate:
          id === "Tradicional" || id === "P-65" || id === "P-92"
            ? slidingWindowBreakdown
            : demoBreakdown,
      },
    ]),
  ) as Record<SystemId, WindowSystemDefinition>;

export function calculateMaterials(input: OpeningInput): MaterialBreakdown {
  if (input.widthMm <= 0 || input.heightMm <= 0 || input.quantity <= 0) {
    throw new Error("Las medidas y la cantidad deben ser mayores que cero.");
  }
  const bodyCount = input.bodyCount ?? input.leaves;
  if (
    input.systemId === "AA" &&
    (!bodyCount || bodyCount <= 0 || !Number.isInteger(bodyCount))
  ) {
    throw new Error("La cantidad de cuerpos debe ser un entero mayor que cero.");
  }
  return SYSTEM_REGISTRY[input.systemId].calculate(input);
}
