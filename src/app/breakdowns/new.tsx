import { createBreakdown, createBreakdownItem } from "@/application/breakdownFactory";
import { calculateAutomaticAccessories } from "@/domain/calculations/accessories";
import {
  formatMeasurement,
  roundToNearestSixteenth,
} from "@/domain/calculations/inchFractions";
import { fromInches, inchesToMillimeters, toInches } from "@/domain/calculations/measurement";
import {
  AccessoryInput,
  BreakdownItem,
  LeafCount,
  MeasurementUnit,
  OpeningInput,
  RailPosition,
  SystemId,
} from "@/domain/models";
import {
  SYSTEM_CATALOG,
  getSystemCatalogItem,
  supportsRails,
  usesSimpleMeasurementFlow,
} from "@/domain/systemCatalog";
import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, Field, SectionHeader } from "@/presentation/components";
import { FractionMeasureField } from "@/presentation/FractionMeasureField";
import { useTheme } from "@/presentation/theme";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const EMPTY_ACCESSORIES: AccessoryInput = {
  rubberMeters: 0,
  wheels: 0,
  lockType: "puño",
  locks: 0,
  guideKits: 0,
  weatherstripMeters: 0,
  screws: 0,
};

function initialOpening(unit: MeasurementUnit): OpeningInput {
  return {
    systemId: "P-65",
    leaves: 2,
    railPosition: "interior",
    width: 0,
    height: 0,
    unit,
    widthInches: 0,
    heightInches: 0,
    widthMm: 0,
    heightMm: 0,
    quantity: 1,
    pricePerSquareFoot: 0,
    applyAdditionalMargin: false,
    accessories: { ...EMPTY_ACCESSORIES },
  };
}

export default function NewBreakdownScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { settings, saveBreakdown } = useApp();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [opening, setOpening] = useState(() => initialOpening(settings.unit));
  const [items, setItems] = useState<BreakdownItem[]>([]);
  const [saving, setSaving] = useState(false);
  const wide = width >= 900;
  const simpleMeasurements = usesSimpleMeasurementFlow(opening.systemId);
  const parts =
    opening.systemId === "AA"
      ? opening.bodyCount ?? 1
      : simpleMeasurements
        ? 1
        : opening.leaves ?? 2;
  const automaticAccessories = useMemo(
    () =>
      calculateAutomaticAccessories(
        settings.prices.accessoryRules[opening.systemId],
        parts,
        opening.quantity,
      ),
    [opening, parts, settings],
  );

  const setMeasure = (key: "width" | "height", value: string) => {
    const numeric = Number(value.replace(",", ".")) || 0;
    setOpening((current) => {
      const inches = toInches(numeric, current.unit);
      return {
        ...current,
        [key]: numeric,
        [key === "width" ? "widthInches" : "heightInches"]: inches,
        [key === "width" ? "widthMm" : "heightMm"]: inchesToMillimeters(inches),
      };
    });
  };

  const selectSystem = (systemId: SystemId) =>
    setOpening((current) => ({
      ...current,
      systemId,
      leaves:
        systemId === "AA" || usesSimpleMeasurementFlow(systemId)
          ? undefined
          : current.leaves ?? 2,
      bodyCount: systemId === "AA" ? current.bodyCount ?? 1 : undefined,
      railPosition: supportsRails(systemId) ? current.railPosition ?? "interior" : undefined,
      accessories: { ...current.accessories, lockType: "puño" },
    }));

  const addItem = () => {
    try {
      setItems((current) => [...current, createBreakdownItem(opening, settings.prices)]);
      setOpening((current) => ({
        ...current,
        width: 0,
        height: 0,
        widthInches: 0,
        heightInches: 0,
        widthMm: 0,
        heightMm: 0,
        quantity: 1,
      }));
    } catch (error) {
      Alert.alert("Revisa las medidas", error instanceof Error ? error.message : "Datos inválidos.");
    }
  };

  const save = async () => {
    if (!items.length) {
      Alert.alert("Agrega una medida", "El desglose necesita al menos una medida.");
      return;
    }
    setSaving(true);
    try {
      const breakdown = createBreakdown(name, notes, items);
      await saveBreakdown(breakdown);
      router.replace({ pathname: "/breakdowns/[id]", params: { id: breakdown.id } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
      <View>
        <Badge label="Nuevo desglose técnico" tone="red" />
        <Text style={[styles.title, { color: theme.text }]}>Medidas y materiales</Text>
        <Text style={{ color: theme.muted }}>Este flujo no necesita precios ni datos de cliente.</Text>
      </View>
      <Card>
        <View style={styles.fields}>
          <Field label="Nombre del desglose" value={name} onChangeText={setName} placeholder="Ej. Ventanas segundo nivel" />
          <Field label="Notas técnicas" value={notes} onChangeText={setNotes} />
        </View>
      </Card>
      <SectionHeader title="Sistema" action={getSystemCatalogItem(opening.systemId).label} />
      <View style={styles.chips}>
        {SYSTEM_CATALOG.map((system) => (
          <Chip
            key={system.id}
            label={system.shortLabel}
            selected={system.id === opening.systemId}
            onPress={() => selectSystem(system.id)}
          />
        ))}
      </View>
      <View style={[styles.columns, wide && styles.columnsWide]}>
        <Card style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.muted }]}>UNIDAD</Text>
          <View style={styles.chips}>
            {([
              ["in", "Pulgadas"],
              ["cm", "Centímetros"],
            ] as [MeasurementUnit, string][]).map(([unit, label]) => (
              <Chip
                key={unit}
                label={label}
                selected={opening.unit === unit}
                onPress={() =>
                  setOpening((current) => {
                    const widthInches =
                      unit === "in"
                        ? roundToNearestSixteenth(current.widthInches)
                        : current.widthInches;
                    const heightInches =
                      unit === "in"
                        ? roundToNearestSixteenth(current.heightInches)
                        : current.heightInches;
                    return {
                      ...current,
                      unit,
                      widthInches,
                      heightInches,
                      widthMm: inchesToMillimeters(widthInches),
                      heightMm: inchesToMillimeters(heightInches),
                      width: fromInches(widthInches, unit),
                      height: fromInches(heightInches, unit),
                    };
                  })
                }
              />
            ))}
          </View>
          {!simpleMeasurements && (opening.systemId === "AA" ? (
            <Field
              label="Cantidad de cuerpos"
              value={String(opening.bodyCount ?? 1)}
              keyboardType="number-pad"
              onChangeText={(value) =>
                setOpening((current) => ({ ...current, bodyCount: Number(value) || 1 }))
              }
            />
          ) : (
            <>
              <Text style={[styles.label, { color: theme.muted }]}>HOJAS</Text>
              <View style={styles.chips}>
                {([2, 3, 4] as LeafCount[]).map((leaves) => (
                  <Chip
                    key={leaves}
                    label={`${leaves} hojas`}
                    selected={opening.leaves === leaves}
                    onPress={() => setOpening((current) => ({ ...current, leaves }))}
                  />
                ))}
              </View>
            </>
          ))}
          {supportsRails(opening.systemId) && (
            <>
              <Text style={[styles.label, { color: theme.muted }]}>TIPO DE RIEL</Text>
              <View style={styles.chips}>
                {(["interior", "exterior"] as RailPosition[]).map((railPosition) => (
                  <Chip
                    key={railPosition}
                    label={railPosition === "interior" ? "Interior" : "Exterior"}
                    selected={opening.railPosition === railPosition}
                    onPress={() => setOpening((current) => ({ ...current, railPosition }))}
                  />
                ))}
              </View>
            </>
          )}
          <View style={styles.fields}>
            {simpleMeasurements && (
              <Field label="Cantidad" value={String(opening.quantity)} keyboardType="number-pad" onChangeText={(value) => setOpening((current) => ({ ...current, quantity: Number(value) || 0 }))} />
            )}
            <FractionMeasureField
              label="Ancho"
              value={opening.width}
              unit={opening.unit}
              onChange={(value) => setMeasure("width", String(value))}
            />
            <FractionMeasureField
              label="Alto"
              value={opening.height}
              unit={opening.unit}
              onChange={(value) => setMeasure("height", String(value))}
            />
            {!simpleMeasurements && (
              <Field label="Cantidad" value={String(opening.quantity)} keyboardType="number-pad" onChangeText={(value) => setOpening((current) => ({ ...current, quantity: Number(value) || 0 }))} />
            )}
          </View>
          <Button title="+ Agregar medida" onPress={addItem} />
        </Card>
        <View style={{ flex: 1, gap: 14 }}>
          {!simpleMeasurements && <Card>
            <SectionHeader title="Accesorios automáticos" />
            {[
              ["Goma", automaticAccessories.rubberMeters, "m"],
              ["Ruedas", automaticAccessories.wheels, "ud."],
              ["Guías", automaticAccessories.guideKits, "ud."],
              ["Felpa", automaticAccessories.weatherstripMeters, "m"],
              ["Tornillos", automaticAccessories.screws, "ud."],
              ["Puño de centro", automaticAccessories.locks, "ud."],
            ].map(([label, value, unit]) => (
              <Text key={String(label)} style={{ color: theme.muted }}>
                {label}: {value} {unit}
              </Text>
            ))}
          </Card>}
          <Card>
            <SectionHeader title="Medidas agregadas" action={`${items.length}`} />
            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{index + 1}. {item.description}</Text>
                  <Text style={{ color: theme.muted }}>
                    {formatMeasurement(item.opening.width, item.opening.unit)} ×{" "}
                    {formatMeasurement(item.opening.height, item.opening.unit)} · {item.opening.quantity} ud.
                  </Text>
                </View>
                <Button title="Quitar" variant="danger" onPress={() => setItems((current) => current.filter(({ id }) => id !== item.id))} />
              </View>
            ))}
          </Card>
        </View>
      </View>
      <Button title={saving ? "Guardando…" : "Guardar desglose"} disabled={saving} onPress={() => void save()} />
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <Text style={{ color: selected ? "#FFFFFF" : theme.text, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1280, alignSelf: "center", padding: 20, gap: 16, paddingBottom: 60 },
  title: { fontSize: 29, fontWeight: "900", marginTop: 8 },
  columns: { gap: 14 },
  columnsWide: { flexDirection: "row", alignItems: "flex-start" },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, justifyContent: "center", borderRadius: 11, borderWidth: 1, paddingHorizontal: 13 },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 0.7 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemTitle: { fontSize: 14, fontWeight: "900" },
});
