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
  const { widthMm, heightMm, leaves, quantity } = input;
  const glassWidth = widthMm / leaves;
  const glassArea = (glassWidth * heightMm * leaves * quantity) / 1_000_000;
  const frameMeters = ((widthMm * 2 + heightMm * 2) * quantity) / 1000;
  const leafMeters = ((glassWidth * 2 + heightMm * 2) * leaves * quantity) / 1000;

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
        pieces: 2 * leaves * quantity,
        purpose: "Hojas",
      },
      {
        id: "leaf-vertical",
        materialCode: `${input.systemId}-HOJA-V`,
        materialName: "Perfil de hoja vertical (referencia pendiente)",
        lengthMm: heightMm,
        pieces: 2 * leaves * quantity,
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
        quantity: input.accessories.rubberMeters * quantity,
        category: "accessory",
      },
      {
        code: "RUEDAS",
        name: "Ruedas",
        unit: "ud",
        quantity: input.accessories.wheels * quantity,
        category: "accessory",
      },
      {
        code: `CIERRE-${input.accessories.lockType}`,
        name:
          input.accessories.lockType === "puño-centro"
            ? "Puño de centro"
            : input.accessories.lockType === "monopunto"
              ? "Monopunto"
              : "Cerradura tradicional",
        unit: "ud",
        quantity: input.accessories.locks * quantity,
        category: "accessory",
      },
      {
        code: "KIT-GUIAS",
        name: "Kit de guías plásticas",
        unit: "ud",
        quantity: input.accessories.guideKits * quantity,
        category: "accessory",
      },
      {
        code: "FELPA",
        name: "Felpa",
        unit: "m",
        quantity: input.accessories.weatherstripMeters * quantity,
        category: "accessory",
      },
      {
        code: "TORNILLO-INSTALACION",
        name: "Tornillos de instalación",
        unit: "ud",
        quantity: input.accessories.installationScrews * quantity,
        category: "accessory",
      },
      {
        code: "TORNILLO-FABRICACION",
        name: "Tornillos de fabricación",
        unit: "ud",
        quantity: input.accessories.fabricationScrews * quantity,
        category: "accessory",
      },
      {
        code: "TARUGOS",
        name: "Tarugos",
        unit: "ud",
        quantity: input.accessories.wallPlugs * quantity,
        category: "accessory",
      },
    ] as MaterialBreakdown["materials"]).filter(
      (material) => material.category === "profile" || material.quantity > 0,
    ),
    glass: [
      {
        widthMm: round(glassWidth, 0),
        heightMm,
        pieces: leaves * quantity,
        areaM2: round(glassArea),
      },
    ],
    estimatedWastePercent: 0,
    warning:
      "Desglose demostrativo. Configure la fórmula técnica real antes de fabricar.",
  };
}

export const SYSTEM_REGISTRY: Record<SystemId, WindowSystemDefinition> =
  Object.fromEntries(
    SYSTEM_IDS.map((id) => [
      id,
      {
        id,
        name: id,
        formulaVersion: "demo-1",
        configured: false,
        calculate: demoBreakdown,
      },
    ]),
  ) as Record<SystemId, WindowSystemDefinition>;

export function calculateMaterials(input: OpeningInput): MaterialBreakdown {
  if (input.widthMm <= 0 || input.heightMm <= 0 || input.quantity <= 0) {
    throw new Error("Las medidas y la cantidad deben ser mayores que cero.");
  }
  return SYSTEM_REGISTRY[input.systemId].calculate(input);
}
