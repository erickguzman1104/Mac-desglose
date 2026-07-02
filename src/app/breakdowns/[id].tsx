import { createBreakdownItem } from "@/application/breakdownFactory";
import { fromInches, inchesToMillimeters, toInches } from "@/domain/calculations/measurement";
import {
  DEFAULT_BAR_LENGTH_FEET,
  feetToInches,
  optimizeCuts,
} from "@/domain/calculations/cutOptimizer";
import {
  formatInches,
  formatMeasurement,
  roundToNearestSixteenth,
} from "@/domain/calculations/inchFractions";
import {
  DEFAULT_GLASS_SHEET_SIZE_ID,
  compareGlassSheetSizes,
} from "@/domain/calculations/glassOptimizer";
import { Breakdown, BreakdownItem, MaterialCut, MeasurementUnit } from "@/domain/models";
import { usesSimpleMeasurementFlow } from "@/domain/systemCatalog";
import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, Field, SectionHeader } from "@/presentation/components";
import { FractionMeasureField } from "@/presentation/FractionMeasureField";
import { GlassSheetSketch } from "@/presentation/GlassSheetSketch";
import { useTheme } from "@/presentation/theme";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

const round = (value: number, precision = 1) =>
  Math.round(value * 10 ** precision) / 10 ** precision;
const length = (mm: number) => formatInches(mm / 25.4);

export default function BreakdownDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findBreakdown, saveBreakdown, settings } = useApp();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [breakdown, setBreakdown] = useState<Breakdown | null>();
  const [draft, setDraft] = useState<Breakdown | null>();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [needsRecalculation, setNeedsRecalculation] = useState(false);
  const [barLengthFeetInput, setBarLengthFeetInput] = useState(
    String(DEFAULT_BAR_LENGTH_FEET),
  );
  const scrollRef = useRef<ScrollView>(null);
  const aluminumY = useRef(0);
  const glassY = useRef(0);
  const wide = width >= 900;

  useEffect(() => {
    findBreakdown(id).then((found) => {
      setBreakdown(found);
      setDraft(found);
    });
  }, [findBreakdown, id]);

  const activeBreakdown = draft ?? breakdown;

  const groups = useMemo(() => {
    const result = new Map<string, { code: string; name: string; cuts: MaterialCut[]; totalMm: number }>();
    for (const cut of activeBreakdown?.items.flatMap((item) => item.breakdown.cuts) ?? []) {
      const group = result.get(cut.materialCode) ?? {
        code: cut.materialCode,
        name: cut.materialName,
        cuts: [],
        totalMm: 0,
      };
      group.cuts.push(cut);
      group.totalMm += cut.lengthMm * cut.pieces;
      result.set(cut.materialCode, group);
    }
    return [...result.values()];
  }, [activeBreakdown]);

  const barLengthFeet =
    Number(barLengthFeetInput.replace(",", ".")) || 0;
  const barLengthInches = feetToInches(barLengthFeet);
  const barLengthMm = inchesToMillimeters(barLengthInches);
  const aluminumPlan = useMemo(() => {
    const bars: Array<ReturnType<typeof optimizeCuts>[number] & {
      code: string;
      name: string;
    }> = [];
    const errors: string[] = [];
    if (barLengthMm <= 0) {
      return {
        bars,
        errors: ["El largo de barra debe ser mayor que cero."],
        totalWasteMm: 0,
      };
    }
    for (const group of groups) {
      try {
        bars.push(
          ...optimizeCuts(group.cuts, barLengthMm).map((bar) => ({
            ...bar,
            code: group.code,
            name: group.name,
          })),
        );
      } catch (error) {
        errors.push(
          `${group.name}: ${
            error instanceof Error ? error.message : "No se pudo optimizar."
          }`,
        );
      }
    }
    return {
      bars,
      errors,
      totalWasteMm: bars.reduce((sum, bar) => sum + bar.remainderMm, 0),
    };
  }, [barLengthMm, groups]);
  const aluminumEfficiency = useMemo(() => {
    const result = new Map<
      string,
      {
        code: string;
        name: string;
        bars: number;
        usedMm: number;
        wasteMm: number;
      }
    >();
    for (const bar of aluminumPlan.bars) {
      const current = result.get(bar.code) ?? {
        code: bar.code,
        name: bar.name,
        bars: 0,
        usedMm: 0,
        wasteMm: 0,
      };
      current.bars += 1;
      current.usedMm += bar.cuts.reduce(
        (sum, cut) => sum + cut.lengthMm,
        0,
      );
      current.wasteMm += bar.remainderMm;
      result.set(bar.code, current);
    }
    return [...result.values()].map((group) => ({
      ...group,
      efficiencyPercent: group.bars
        ? round((group.usedMm / (group.bars * barLengthMm)) * 100, 1)
        : 0,
    }));
  }, [aluminumPlan.bars, barLengthMm]);
  const materialSummaries = useMemo(() => {
    const result = new Map<string, { code: string; name: string; totalMm: number }>();
    for (const material of activeBreakdown?.items.flatMap((item) => item.breakdown.materials) ?? []) {
      if (material.category !== "profile") continue;
      const summary = result.get(material.code) ?? {
        code: material.code,
        name: material.name,
        totalMm: 0,
      };
      summary.totalMm += material.unit === "m" ? material.quantity * 1000 : 0;
      result.set(material.code, summary);
    }
    return [...result.values()];
  }, [activeBreakdown]);
  const glass = useMemo(
    () => compareGlassSheetSizes(activeBreakdown?.items.flatMap((item) => item.breakdown.glass) ?? []),
    [activeBreakdown],
  );
  const requiredGlassPieces =
    activeBreakdown?.items
      .flatMap((item) => item.breakdown.glass)
      .reduce((sum, piece) => sum + piece.pieces, 0) ?? 0;

  if (breakdown === undefined) return <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />;
  if (breakdown === null) return <Text style={{ color: theme.text, padding: 20 }}>Desglose no encontrado.</Text>;
  const shown = activeBreakdown ?? breakdown;

  const updateItem = (index: number, updater: (item: BreakdownItem) => BreakdownItem) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item, itemIndex) =>
              itemIndex === index ? updater(item) : item,
            ),
          }
        : current,
    );

  const setOpeningNumber = (
    itemIndex: number,
    key: "width" | "height" | "quantity" | "leaves" | "bodyCount",
    value: string,
  ) => {
    setNeedsRecalculation(true);
    updateItem(itemIndex, (item) => {
      const numeric = Number(value.replace(",", ".")) || 0;
      if (key === "width" || key === "height") {
        const inches = toInches(numeric, item.opening.unit);
        return {
          ...item,
          opening: {
            ...item.opening,
            [key]: numeric,
            [key === "width" ? "widthInches" : "heightInches"]: inches,
            [key === "width" ? "widthMm" : "heightMm"]: inchesToMillimeters(inches),
          },
        };
      }
      return { ...item, opening: { ...item.opening, [key]: numeric } };
    });
  };

  const setUnit = (itemIndex: number, unit: MeasurementUnit) => {
    setNeedsRecalculation(true);
    updateItem(itemIndex, (item) => {
      const widthInches =
        unit === "in"
          ? roundToNearestSixteenth(item.opening.widthInches)
          : item.opening.widthInches;
      const heightInches =
        unit === "in"
          ? roundToNearestSixteenth(item.opening.heightInches)
          : item.opening.heightInches;
      return {
        ...item,
        opening: {
          ...item.opening,
          unit,
          widthInches,
          heightInches,
          widthMm: inchesToMillimeters(widthInches),
          heightMm: inchesToMillimeters(heightInches),
          width: fromInches(widthInches, unit),
          height: fromInches(heightInches, unit),
        },
      };
    });
  };

  const recalculate = () => {
    if (!draft) return;
    try {
      const items = draft.items.map((item) => ({
        ...createBreakdownItem(item.opening, settings.prices),
        id: item.id,
      }));
      setDraft({ ...draft, items });
      setNeedsRecalculation(false);
    } catch (error) {
      Alert.alert(
        "No se pudo recalcular",
        error instanceof Error ? error.message : "Revisa los valores editados.",
      );
    }
  };

  const saveChanges = async () => {
    if (!draft) return;
    if (needsRecalculation) {
      Alert.alert(
        "Recalcula los materiales",
        "Confirma las medidas con Recalcular antes de guardar los cambios.",
      );
      return;
    }
    setSaving(true);
    try {
      const updated = { ...draft, updatedAt: new Date().toISOString() };
      await saveBreakdown(updated);
      setBreakdown(updated);
      setDraft(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: shown.number }} />
      <ScrollView ref={scrollRef} style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
        <View style={[styles.hero, { backgroundColor: theme.brandBlue }]}>
          <View style={{ flex: 1 }}>
            <Badge label="Desglose técnico" tone="red" />
            <Text style={styles.heroTitle}>{shown.name}</Text>
            <Text style={styles.heroMeta}>{shown.number} · {shown.items.length} medida(s)</Text>
          </View>
          <Button
            title="Crear cotización"
            onPress={() =>
              router.push({ pathname: "/quotes/new", params: { breakdownId: shown.id } })
            }
          />
        </View>
        <View style={styles.editToolbar}>
          {!editing ? (
            <Button
              title="Editar desglose"
              onPress={() => {
                setNeedsRecalculation(false);
                setEditing(true);
              }}
            />
          ) : (
            <>
              <View style={styles.actions}>
                <Button
                  title={saving ? "Guardando…" : "Guardar cambios"}
                  disabled={saving || needsRecalculation}
                  onPress={() => void saveChanges()}
                />
                <Button
                  title="Cancelar edición"
                  variant="danger"
                  onPress={() => {
                    setDraft(breakdown);
                    setNeedsRecalculation(false);
                    setEditing(false);
                  }}
                />
              </View>
              <View
                style={[
                  styles.technicalAction,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                ]}
              >
                <View>
                  <Text style={[styles.technicalLabel, { color: theme.primary }]}>
                    ACCIÓN TÉCNICA
                  </Text>
                  {needsRecalculation && (
                    <Text style={{ color: theme.warning }}>
                      Hay medidas pendientes de recalcular
                    </Text>
                  )}
                </View>
                <Button title="Recalcular" variant="secondary" onPress={recalculate} />
              </View>
            </>
          )}
        </View>
        <View style={styles.actions}>
          <Button title="Optimizador de aluminio" variant="secondary" onPress={() => scrollRef.current?.scrollTo({ y: aluminumY.current, animated: true })} />
          <Button title="Optimizador de cristales" variant="secondary" onPress={() => scrollRef.current?.scrollTo({ y: glassY.current, animated: true })} />
        </View>

        <SectionHeader title="Medidas y sistemas" />
        {shown.items.map((item, index) => {
          return (
            <Card key={item.id}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{index + 1}. {item.description}</Text>
              <Text style={{ color: theme.muted }}>
                {formatMeasurement(item.opening.width, item.opening.unit)} ×{" "}
                {formatMeasurement(item.opening.height, item.opening.unit)} · {item.opening.quantity} ud.
              </Text>
              {editing && (
                <View style={styles.editor}>
                  <Text style={[styles.technicalLabel, { color: theme.muted }]}>
                    UNIDAD
                  </Text>
                  <View style={styles.actions}>
                    {(["in", "cm"] as MeasurementUnit[]).map((unit) => (
                      <Button key={unit} title={unit === "in" ? "Pulgadas" : "Centímetros"} variant={item.opening.unit === unit ? "primary" : "secondary"} onPress={() => setUnit(index, unit)} />
                    ))}
                  </View>
                  <View style={styles.fieldGrid}>
                    {usesSimpleMeasurementFlow(item.opening.systemId) ? (
                      <>
                        <Field label="Cantidad" value={String(item.opening.quantity)} keyboardType="number-pad" onChangeText={(value) => setOpeningNumber(index, "quantity", value)} />
                        <FractionMeasureField label="Ancho" value={item.opening.width} unit={item.opening.unit} onChange={(value) => setOpeningNumber(index, "width", String(value))} />
                        <FractionMeasureField label="Alto" value={item.opening.height} unit={item.opening.unit} onChange={(value) => setOpeningNumber(index, "height", String(value))} />
                      </>
                    ) : (
                      <>
                        <FractionMeasureField label="Ancho" value={item.opening.width} unit={item.opening.unit} onChange={(value) => setOpeningNumber(index, "width", String(value))} />
                        <FractionMeasureField label="Alto" value={item.opening.height} unit={item.opening.unit} onChange={(value) => setOpeningNumber(index, "height", String(value))} />
                        <Field label="Cantidad" value={String(item.opening.quantity)} keyboardType="number-pad" onChangeText={(value) => setOpeningNumber(index, "quantity", value)} />
                      </>
                    )}
                    {!usesSimpleMeasurementFlow(item.opening.systemId) && (
                      <Field
                        label={item.opening.systemId === "AA" ? "Cuerpos" : "Hojas"}
                        value={String(item.opening.systemId === "AA" ? item.opening.bodyCount ?? 1 : item.opening.leaves ?? 2)}
                        keyboardType="number-pad"
                        onChangeText={(value) => setOpeningNumber(index, item.opening.systemId === "AA" ? "bodyCount" : "leaves", value)}
                      />
                    )}
                  </View>
                  <View
                    style={[
                      styles.lockedResults,
                      { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.lockedHeader}>
                      <Text style={[styles.subheading, { color: theme.text }]}>
                        Materiales calculados
                      </Text>
                      <Badge label="Solo lectura" tone="neutral" />
                    </View>
                    <Text style={{ color: theme.muted }}>
                      Se actualizan únicamente al confirmar las medidas con Recalcular.
                    </Text>
                    {item.breakdown.materials.map((material, materialIndex) => (
                      <View
                        key={`${material.code}-${materialIndex}`}
                        style={styles.resultRow}
                      >
                        <Text style={{ color: theme.muted, flex: 1 }}>
                          {material.name}
                        </Text>
                        <Text style={{ color: theme.text, fontWeight: "800" }}>
                          {material.quantity} {material.unit}
                        </Text>
                      </View>
                    ))}
                    {item.breakdown.glass.map((piece, glassIndex) => (
                      <View key={`glass-${glassIndex}`} style={styles.resultRow}>
                        <Text style={{ color: theme.muted, flex: 1 }}>Cristal</Text>
                        <Text style={{ color: theme.text, fontWeight: "800" }}>
                          {formatInches(piece.widthMm / 25.4)} ×{" "}
                          {formatInches(piece.heightMm / 25.4)} · {piece.pieces} piezas
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              <View style={[styles.columns, wide && styles.columnsWide]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subheading, { color: theme.text }]}>Cristales</Text>
                  {item.breakdown.glass.map((piece, pieceIndex) => (
                    <Text key={pieceIndex} style={{ color: theme.muted }}>
                      {formatInches(piece.widthMm / 25.4)} × {formatInches(piece.heightMm / 25.4)} · {piece.pieces} piezas
                    </Text>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subheading, { color: theme.text }]}>Accesorios automáticos</Text>
                  <Text style={{ color: theme.muted }}>Goma: {item.opening.accessories.rubberMeters} m</Text>
                  <Text style={{ color: theme.muted }}>Ruedas: {item.opening.accessories.wheels} ud.</Text>
                  <Text style={{ color: theme.muted }}>Puño de centro: {item.opening.accessories.locks} ud.</Text>
                  <Text style={{ color: theme.muted }}>Kit: {item.opening.accessories.guideKits} ud.</Text>
                  <Text style={{ color: theme.muted }}>Felpa: {item.opening.accessories.weatherstripMeters} m</Text>
                  <Text style={{ color: theme.muted }}>Tornillos: {item.opening.accessories.screws} ud.</Text>
                </View>
              </View>
            </Card>
          );
        })}

        <Card>
          <SectionHeader title="Materiales estimados" action={`${materialSummaries.length} referencias`} />
          {materialSummaries.map((group) => (
            <View key={group.code} style={[styles.row, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{group.name}</Text>
                <Text style={[styles.code, { color: theme.primary }]}>{group.code}</Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: "800" }}>{length(group.totalMm)}</Text>
            </View>
          ))}
        </Card>

        <View onLayout={({ nativeEvent }) => { glassY.current = nativeEvent.layout.y; }}>
          <Card>
            <SectionHeader
              title="Optimizador de cristales"
              action={
                glass.recommendedSizeId
                  ? `Recomendada ${glass.options.find(({ sizeId }) => sizeId === glass.recommendedSizeId)?.label}`
                  : "Sin recomendación"
              }
            />
            <Text style={{ color: theme.muted }}>
              Piezas requeridas: {requiredGlassPieces}. Se prueban ambas orientaciones
              sobre planchas reales de 130 × 84″ y 96 × 72″.
            </Text>
            <View style={[styles.columns, wide && styles.columnsWide]}>
              {glass.options.map((option) => (
                <View key={option.sizeId} style={[styles.plan, { borderColor: option.sizeId === glass.recommendedSizeId ? theme.primary : theme.border }]}>
                  <View style={styles.lockedHeader}>
                    <Badge
                      label={
                        option.sizeId === DEFAULT_GLASS_SHEET_SIZE_ID
                          ? "Plancha principal"
                          : "Opción secundaria"
                      }
                      tone={
                        option.sizeId === DEFAULT_GLASS_SHEET_SIZE_ID
                          ? "blue"
                          : "neutral"
                      }
                    />
                    {option.sizeId === glass.recommendedSizeId && (
                      <Badge label="Menor desperdicio" tone="red" />
                    )}
                  </View>
                  <Text style={[styles.subheading, { color: theme.text }]}>Plancha {option.label}</Text>
                  <Text style={{ color: theme.muted }}>
                    {option.sheets.length} plancha(s) ·{" "}
                    {option.placedPieces} de {option.requiredPieces} piezas ubicadas
                  </Text>
                  <Text style={{ color: theme.muted }}>
                    Sobrante estimado: {option.totalWasteAreaM2} m² · desperdicio{" "}
                    {option.wastePercent}%
                  </Text>
                  {!!option.error && <Text style={{ color: theme.danger }}>{option.error}</Text>}
                  {option.sheets.map((sheet) => (
                    <View key={sheet.id} style={styles.sheetResult}>
                      <Text style={[styles.code, { color: theme.primary }]}>
                        PLANCHA #{sheet.id} · {sheet.cuts.length} PIEZAS
                      </Text>
                      <Text style={{ color: theme.muted }}>
                        Sobrante {sheet.wasteAreaM2} m² · desperdicio {sheet.wastePercent}%
                      </Text>
                      <GlassSheetSketch sheet={sheet} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </Card>
        </View>

        <View onLayout={({ nativeEvent }) => { aluminumY.current = nativeEvent.layout.y; }}>
          <Card>
            <SectionHeader title="Optimizador de aluminio" action={`${aluminumPlan.bars.length} barras`} />
            <View style={styles.barSettings}>
              <Field
                label="Largo de barra (pies)"
                value={barLengthFeetInput}
                keyboardType="decimal-pad"
                onChangeText={setBarLengthFeetInput}
                placeholder="21"
              />
              <View
                style={[
                  styles.conversionResult,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.technicalLabel, { color: theme.primary }]}>
                  CONVERSIÓN INTERNA
                </Text>
                <Text style={{ color: theme.text, fontWeight: "900" }}>
                  {round(barLengthInches, 2)} pulgadas
                </Text>
              </View>
            </View>
            <Text style={{ color: theme.muted }}>
              Predeterminado: 21 pies = 252 pulgadas. Puedes indicar una barra
              disponible más corta.
            </Text>
            <Text style={[styles.subheading, { color: theme.text }]}>
              Eficiencia por tipo de material
            </Text>
            <View style={styles.efficiencyGrid}>
              {aluminumEfficiency.map((group) => (
                <View
                  key={group.code}
                  style={[
                    styles.efficiencyCard,
                    { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.rowTitle, { color: theme.text }]}>
                    {group.name}
                  </Text>
                  <Text style={[styles.code, { color: theme.primary }]}>
                    {group.code}
                  </Text>
                  <Text style={[styles.efficiencyValue, { color: theme.primary }]}>
                    {group.efficiencyPercent}%
                  </Text>
                  <Text style={{ color: theme.muted }}>
                    {group.bars} barra(s) · sobrante {length(group.wasteMm)}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ color: theme.warning, fontWeight: "800" }}>
              Desperdicio total: {length(aluminumPlan.totalWasteMm)}
            </Text>
            {aluminumPlan.errors.map((error) => (
              <Text key={error} style={{ color: theme.danger }}>
                {error}
              </Text>
            ))}
            <View style={styles.barGrid}>
              {aluminumPlan.bars.map((bar, index) => (
                <View key={`${bar.code}-${bar.id}-${index}`} style={[styles.barCard, { backgroundColor: theme.surfaceAlt }]}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{bar.name}</Text>
                  <Text style={[styles.code, { color: theme.primary }]}>{bar.code} · BARRA #{bar.id}</Text>
                  <View style={[styles.bar, { backgroundColor: theme.border }]}>
                    {bar.cuts.map((cut, cutIndex) => (
                      <View key={cutIndex} style={{ flex: cut.lengthMm, backgroundColor: cutIndex % 2 ? theme.brandRed : theme.primary }} />
                    ))}
                    <View style={{ flex: bar.remainderMm, backgroundColor: theme.background }} />
                  </View>
                  <Text style={{ color: theme.muted }}>
                    Cortes: {bar.cuts.map((cut) => `${cut.label} ${formatInches(cut.lengthMm / 25.4)}`).join(" + ")}
                  </Text>
                  <Text style={{ color: theme.warning, fontWeight: "800" }}>Sobrante: {length(bar.remainderMm)}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1300, alignSelf: "center", padding: 20, gap: 16, paddingBottom: 60 },
  hero: { borderRadius: 24, padding: 24, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 16 },
  heroTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", marginTop: 8 },
  heroMeta: { color: "#DCE7F7", marginTop: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  editToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  technicalAction: { marginLeft: "auto", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, borderWidth: 1, borderRadius: 14, padding: 10 },
  technicalLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  columns: { gap: 14 },
  columnsWide: { flexDirection: "row", alignItems: "flex-start" },
  itemTitle: { fontSize: 17, fontWeight: "900" },
  subheading: { fontSize: 14, fontWeight: "900", marginBottom: 5 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1 },
  rowTitle: { fontSize: 13, fontWeight: "900" },
  code: { fontSize: 10, fontWeight: "900", marginTop: 3 },
  plan: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, gap: 6, minWidth: 0 },
  sheetResult: { gap: 3, paddingTop: 7 },
  barSettings: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 10 },
  conversionResult: { flex: 1, minHeight: 70, minWidth: 180, borderWidth: 1, borderRadius: 13, padding: 12, justifyContent: "center", gap: 4 },
  efficiencyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  efficiencyCard: { flexGrow: 1, flexBasis: 190, borderWidth: 1, borderRadius: 13, padding: 12, gap: 3 },
  efficiencyValue: { fontSize: 22, fontWeight: "900", marginTop: 4 },
  barGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  barCard: { flexGrow: 1, flexBasis: 260, maxWidth: 420, padding: 13, borderRadius: 13, gap: 6 },
  bar: { height: 25, borderRadius: 7, overflow: "hidden", flexDirection: "row" },
  editor: { gap: 12, marginTop: 8 },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  lockedResults: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 7 },
  lockedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 5 },
});
