import { createQuote, createQuoteItem } from "@/application/quoteFactory";
import {
  AccessoryInput,
  LeafCount,
  OpeningInput,
  QuoteItem,
  RailPosition,
  SYSTEM_IDS,
  SystemId,
  MeasurementUnit,
} from "@/domain/models";
import {
  SYSTEM_CATALOG,
  availableLockTypes,
  getSystemCatalogItem,
  supportsRails,
  supportsSquareFootPricing,
} from "@/domain/systemCatalog";
import { calculateAutomaticAccessories } from "@/domain/calculations/accessories";
import {
  fromInches,
  inchesToMillimeters,
  toInches,
} from "@/domain/calculations/measurement";
import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, Field, Money, SectionHeader } from "@/presentation/components";
import { useTheme } from "@/presentation/theme";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const EMPTY_ACCESSORIES: AccessoryInput = {
  rubberMeters: 0,
  wheels: 0,
  lockType: "mono",
  locks: 0,
  guideKits: 0,
  weatherstripMeters: 0,
  screws: 0,
};

function initialOpening(
  systemId: SystemId = "P-65",
  unit: MeasurementUnit = "in",
  pricePerSquareFoot = 0,
): OpeningInput {
  return {
    systemId,
    leaves: systemId === "AA" ? undefined : 2,
    bodyCount: systemId === "AA" ? 1 : undefined,
    railPosition: supportsRails(systemId) ? "interior" : undefined,
    width: 0,
    height: 0,
    unit,
    widthInches: 0,
    heightInches: 0,
    widthMm: 0,
    heightMm: 0,
    quantity: 1,
    pricePerSquareFoot,
    applyAdditionalMargin: false,
    accessories: { ...EMPTY_ACCESSORIES },
  };
}

export default function NewQuoteScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { systemId: requestedSystem } = useLocalSearchParams<{ systemId?: string }>();
  const { settings, saveQuote } = useApp();
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [opening, setOpening] = useState(() =>
    initialOpening("P-65", settings.unit, settings.prices.squareFootPrices["P-65"]),
  );
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const twoColumns = width >= 980;

  useEffect(() => {
    const selected = SYSTEM_IDS.find((id) => id === requestedSystem);
    if (selected)
      setOpening(
        initialOpening(
          selected,
          settings.unit,
          settings.prices.squareFootPrices[selected],
        ),
      );
  }, [requestedSystem, settings]);

  const selectedSystem = getSystemCatalogItem(opening.systemId);
  const itemTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.lineTotal, 0),
    [items],
  );
  const automaticAccessories = useMemo(
    () =>
      calculateAutomaticAccessories(
        settings.prices.accessoryRules[opening.systemId],
        opening.systemId === "AA"
          ? opening.bodyCount ?? opening.leaves ?? 1
          : opening.leaves ?? 2,
        opening.quantity,
        opening.accessories.lockType,
      ),
    [
      opening.systemId,
      opening.leaves,
      opening.bodyCount,
      opening.quantity,
      opening.accessories.lockType,
      settings,
    ],
  );

  const selectSystem = (systemId: SystemId) => {
    const usesRails = supportsRails(systemId);
    setOpening((current) => ({
      ...current,
      systemId,
      leaves: systemId === "AA" ? undefined : current.leaves ?? 2,
      bodyCount:
        systemId === "AA"
          ? current.bodyCount ?? current.leaves ?? 1
          : undefined,
      pricePerSquareFoot: settings.prices.squareFootPrices[systemId],
      railPosition: usesRails
        ? current.railPosition ?? "interior"
        : undefined,
      accessories: {
        ...current.accessories,
        lockType: availableLockTypes(systemId).includes(
          current.accessories.lockType,
        )
          ? current.accessories.lockType
          : "mono",
      },
    }));
  };

  const setNumber = (
    key: "width" | "height" | "quantity" | "pricePerSquareFoot" | "bodyCount",
    value: string,
  ) =>
    setOpening((current) => ({
      ...current,
      [key]: Number(value.replace(",", ".")) || 0,
      ...(key === "width"
        ? {
            widthInches: toInches(Number(value.replace(",", ".")) || 0, current.unit),
            widthMm: inchesToMillimeters(
              toInches(Number(value.replace(",", ".")) || 0, current.unit),
            ),
          }
        : key === "height"
          ? {
              heightInches: toInches(Number(value.replace(",", ".")) || 0, current.unit),
              heightMm: inchesToMillimeters(
                toInches(Number(value.replace(",", ".")) || 0, current.unit),
              ),
            }
          : {}),
    }));

  const selectUnit = (unit: MeasurementUnit) =>
    setOpening((current) => ({
      ...current,
      unit,
      width: fromInches(current.widthInches, unit),
      height: fromInches(current.heightInches, unit),
    }));

  const addOrUpdateItem = () => {
    try {
      const calculated = createQuoteItem(opening, settings.prices);
      if (editingId) {
        setItems((current) =>
          current.map((item) =>
            item.id === editingId ? { ...calculated, id: editingId } : item,
          ),
        );
      } else {
        setItems((current) => [...current, calculated]);
      }
      setEditingId(null);
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
      Alert.alert(
        "Revisa las medidas",
        error instanceof Error ? error.message : "Los datos no son válidos.",
      );
    }
  };

  const editItem = (item: QuoteItem) => {
    const lockType = availableLockTypes(item.opening.systemId).includes(
      item.opening.accessories.lockType,
    )
      ? item.opening.accessories.lockType
      : "mono";
    const unit: MeasurementUnit =
      item.opening.unit === "cm" ? "cm" : "in";
    setOpening({
      ...item.opening,
      unit,
      width: fromInches(item.opening.widthInches, unit),
      height: fromInches(item.opening.heightInches, unit),
      accessories: { ...item.opening.accessories, lockType },
    });
    setEditingId(item.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setOpening(
      initialOpening(
        opening.systemId,
        settings.unit,
        settings.prices.squareFootPrices[opening.systemId],
      ),
    );
  };

  const saveAndView = async () => {
    if (!clientName.trim()) {
      Alert.alert("Cliente requerido", "Escribe el nombre del cliente.");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Agrega una medida", "El trabajo necesita al menos una medida.");
      return;
    }
    setSaving(true);
    try {
      const quote = createQuote(
        {
          client: { name: clientName.trim(), phone, address },
          projectName,
          notes,
          items,
        },
        settings.prices,
      );
      await saveQuote(quote);
      router.replace({ pathname: "/quotes/[id]", params: { id: quote.id } });
    } catch {
      Alert.alert("No se pudo guardar", "Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Badge label="Nuevo trabajo" tone="red" />
            <Text style={[styles.pageTitle, { color: theme.text }]}>Captura rápida de medidas</Text>
            <Text style={[styles.pageSubtitle, { color: theme.muted }]}>
              Selecciona un sistema, agrega todas las medidas y revisa el desglose.
            </Text>
          </View>
          <View style={[styles.stepPill, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.stepPillText, { color: theme.primary }]}>{items.length} agregadas</Text>
          </View>
        </View>

        <SectionHeader title="1. Datos del trabajo" />
        <Card>
          <View style={styles.fieldsRow}>
            <View style={styles.clientField}>
              <Field label="Cliente *" value={clientName} onChangeText={setClientName} placeholder="Nombre del cliente" />
            </View>
            <View style={styles.clientField}>
              <Field label="Proyecto" value={projectName} onChangeText={setProjectName} placeholder="Nombre o referencia" />
            </View>
            <View style={styles.clientField}>
              <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          </View>
          <View style={styles.fieldsRow}>
            <View style={styles.clientField}>
              <Field label="Dirección" value={address} onChangeText={setAddress} />
            </View>
            <View style={styles.clientField}>
              <Field label="Observaciones" value={notes} onChangeText={setNotes} />
            </View>
          </View>
        </Card>

        <SectionHeader title="2. Sistema seleccionado" action={selectedSystem.label} />
        <View style={styles.systemGrid}>
          {SYSTEM_CATALOG.map((system) => {
            const selected = system.id === opening.systemId;
            return (
              <Pressable
                key={system.id}
                onPress={() => selectSystem(system.id)}
                style={[
                  styles.systemOption,
                  {
                    backgroundColor: selected ? theme.primary : theme.surface,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.systemOptionTitle, { color: selected ? "#FFFFFF" : theme.text }]}>
                  {system.shortLabel}
                </Text>
                <Text style={{ color: selected ? "#DDE8FA" : theme.muted, fontSize: 11 }}>
                  {system.category}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.workspace, twoColumns && styles.workspaceWide]}>
          <View style={styles.formColumn}>
            <SectionHeader title="3. Agrega una medida" action={selectedSystem.label} />
            <Card style={editingId ? { borderColor: theme.brandRed, borderWidth: 2 } : undefined}>
              {editingId && <Badge label="Editando medida" tone="red" />}
              {opening.systemId === "AA" ? (
                <View style={styles.measureField}>
                  <Field
                    label="Cantidad de cuerpos"
                    value={String(opening.bodyCount ?? opening.leaves ?? "")}
                    onChangeText={(value) => setNumber("bodyCount", value)}
                    keyboardType="number-pad"
                    placeholder="1"
                  />
                </View>
              ) : (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>CANTIDAD DE HOJAS</Text>
                  <View style={styles.chips}>
                    {([2, 3, 4] as LeafCount[]).map((leaves) => (
                      <Chip
                        key={leaves}
                        label={`${leaves} hojas`}
                        selected={opening.leaves === leaves}
                        onPress={() =>
                          setOpening((current) => ({ ...current, leaves }))
                        }
                      />
                    ))}
                  </View>
                </>
              )}

              {supportsRails(opening.systemId) && (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>POSICIÓN DEL RIEL</Text>
                  <View style={styles.chips}>
                    {(
                      [
                        ["interior", "Int."],
                        ["exterior", "Ext."],
                      ] as [RailPosition, string][]
                    ).map(([railPosition, label]) => (
                        <Chip
                          key={railPosition}
                          label={label}
                          selected={opening.railPosition === railPosition}
                          onPress={() =>
                            setOpening((current) => ({
                              ...current,
                              railPosition,
                            }))
                          }
                        />
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.fieldLabel, { color: theme.muted }]}>UNIDAD DE MEDIDA</Text>
              <View style={styles.chips}>
                {(
                  [
                    ["in", "Pulgadas"],
                    ["cm", "Centímetros"],
                  ] as [MeasurementUnit, string][]
                ).map(([unit, label]) => (
                  <Chip
                    key={unit}
                    label={label}
                    selected={opening.unit === unit}
                    onPress={() => selectUnit(unit)}
                  />
                ))}
              </View>

              <View style={styles.fieldsRow}>
                <View style={styles.measureField}>
                  <Field
                    label="Cantidad"
                    value={String(opening.quantity || "")}
                    onChangeText={(value) => setNumber("quantity", value)}
                    keyboardType="number-pad"
                    placeholder="1"
                  />
                </View>
                <View style={styles.measureField}>
                  <Field
                    label={`Ancho (${opening.unit})`}
                    value={opening.width ? String(opening.width) : ""}
                    onChangeText={(value) => setNumber("width", value)}
                    keyboardType="numeric"
                    placeholder={opening.unit === "in" ? "48" : "0"}
                  />
                </View>
                <View style={styles.measureField}>
                  <Field
                    label={`Alto (${opening.unit})`}
                    value={opening.height ? String(opening.height) : ""}
                    onChangeText={(value) => setNumber("height", value)}
                    keyboardType="numeric"
                    placeholder={opening.unit === "in" ? "40" : "0"}
                  />
                </View>
                {supportsSquareFootPricing(opening.systemId) && (
                  <View style={styles.measureField}>
                    <Field
                      label={`Precio por pie² (${settings.prices.currency})`}
                      value={String(opening.pricePerSquareFoot)}
                      onChangeText={(value) => setNumber("pricePerSquareFoot", value)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}
              </View>

              <View style={[styles.marginOption, { backgroundColor: theme.surfaceAlt }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    Aplicar margen adicional
                  </Text>
                  <Text style={[styles.cardHelp, { color: theme.muted }]}>
                    {opening.applyAdditionalMargin
                      ? `Suma ${settings.prices.profitMargin}% al precio base.`
                      : "Desactivado: el precio por pie² ya incluye la ganancia."}
                  </Text>
                </View>
                <Switch
                  value={opening.applyAdditionalMargin ?? false}
                  onValueChange={(applyAdditionalMargin) =>
                    setOpening((current) => ({ ...current, applyAdditionalMargin }))
                  }
                  trackColor={{ false: theme.border, true: theme.primary }}
                />
              </View>

              <View style={styles.actionRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={editingId ? "Actualizar medida" : "+ Agregar medida"}
                    onPress={addOrUpdateItem}
                  />
                </View>
                {editingId && (
                  <View style={{ flex: 1 }}>
                    <Button title="Cancelar edición" variant="secondary" onPress={cancelEdit} />
                  </View>
                )}
              </View>
            </Card>

            <Card>
              <View style={styles.cardHeading}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Accesorios automáticos</Text>
                  <Text style={[styles.cardHelp, { color: theme.muted }]}>
                    Calculados por sistema,{" "}
                    {opening.systemId === "AA" ? "cuerpos" : "hojas"},
                    ventanas y cerradura
                  </Text>
                </View>
                <Badge label="Configurable" tone="neutral" />
              </View>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>TIPO DE CIERRE</Text>
              <View style={styles.chips}>
                {availableLockTypes(opening.systemId).map((lockType) => (
                  <Chip
                    key={lockType}
                    label={
                      lockType === "mono"
                        ? "Mono"
                        : lockType === "puño"
                          ? "Puño"
                          : lockType === "monopunto"
                            ? "Monopunto"
                            : "Tradicional"
                    }
                    selected={opening.accessories.lockType === lockType}
                    onPress={() =>
                      setOpening((current) => ({
                        ...current,
                        accessories: { ...current.accessories, lockType },
                      }))
                    }
                  />
                ))}
              </View>
              <View style={styles.autoAccessoryGrid}>
                <AutomaticAccessory label="Goma" value={automaticAccessories.rubberMeters} unit="m" />
                <AutomaticAccessory label="Ruedas" value={automaticAccessories.wheels} />
                <AutomaticAccessory label="Kit de guías" value={automaticAccessories.guideKits} />
                <AutomaticAccessory label="Felpa" value={automaticAccessories.weatherstripMeters} unit="m" />
                <AutomaticAccessory label="Tornillos" value={automaticAccessories.screws} />
                <AutomaticAccessory
                  label={`Cerradura ${opening.accessories.lockType}`}
                  value={automaticAccessories.locks}
                />
              </View>
            </Card>
          </View>

          <View style={styles.listColumn}>
            <SectionHeader title="4. Medidas agregadas" action={`${items.length} total`} />
            {items.length === 0 ? (
              <Card>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Aún no hay medidas</Text>
                <Text style={{ color: theme.muted, lineHeight: 20 }}>
                  Completa ancho, alto y cantidad. Puedes editar cada registro antes de ver el desglose.
                </Text>
              </Card>
            ) : (
              <View style={styles.measureList}>
                {items.map((item, index) => (
                  <Card key={item.id} style={editingId === item.id ? { borderColor: theme.brandRed } : undefined}>
                    <View style={styles.measureHeader}>
                      <View style={[styles.measureNumber, { backgroundColor: theme.primarySoft }]}>
                        <Text style={[styles.measureNumberText, { color: theme.primary }]}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.measureTitle, { color: theme.text }]}>{item.opening.systemId}</Text>
                        <Text style={{ color: theme.muted }}>
                          {item.opening.width} × {item.opening.height} {item.opening.unit} · {item.opening.quantity} ud.
                        </Text>
                        {item.squareFoot && (
                          <Text style={[styles.measureMeta, { color: theme.primary }]}>
                            {item.squareFoot.individualArea} pie² c/u · {item.squareFoot.totalArea} pie² total ·{" "}
                            {item.squareFoot.pricePerSquareFoot} /pie² · total{" "}
                            {item.squareFoot.total}
                          </Text>
                        )}
                        <Text style={[styles.measureMeta, { color: theme.muted }]}>
                          {item.opening.systemId === "AA"
                            ? `${item.opening.bodyCount ?? item.opening.leaves ?? 1} cuerpos`
                            : `${item.opening.leaves ?? 2} hojas`}
                          {item.opening.railPosition
                            ? ` · ${item.opening.railPosition === "interior" ? "Int." : "Ext."}`
                            : ""}
                        </Text>
                      </View>
                      <Money value={item.lineTotal} currency={settings.prices.currency} />
                    </View>
                    <View style={styles.actionRow}>
                      <View style={{ flex: 1 }}>
                        <Button title="Editar" variant="secondary" onPress={() => editItem(item)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          title="Quitar"
                          variant="danger"
                          onPress={() => setItems((current) => current.filter(({ id }) => id !== item.id))}
                        />
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.summaryBar, { backgroundColor: theme.brandBlue }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>ESTIMADO DEMOSTRATIVO</Text>
            <Text style={styles.summaryCount}>{items.length} medida(s) listas</Text>
          </View>
          <View style={styles.summaryTotal}>
            <Money value={itemTotal} currency={settings.prices.currency} />
          </View>
          <View style={styles.summaryButton}>
            <Button
              title={saving ? "Guardando…" : "Ver desglose →"}
              disabled={saving}
              onPress={saveAndView}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AutomaticAccessory({
  label,
  value,
  unit = "ud.",
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.autoAccessory, { backgroundColor: theme.surfaceAlt }]}>
      <Text style={[styles.cardHelp, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.autoAccessoryValue, { color: theme.text }]}>
        {value} {unit}
      </Text>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress(): void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surfaceAlt,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <Text style={{ color: selected ? "#FFFFFF" : theme.text, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1440, alignSelf: "center", padding: 20, gap: 18, paddingBottom: 60 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  pageTitle: { fontSize: 29, fontWeight: "900", marginTop: 10, letterSpacing: -0.5 },
  pageSubtitle: { marginTop: 5, lineHeight: 21 },
  stepPill: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999 },
  stepPillText: { fontWeight: "900", fontSize: 12 },
  systemGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  systemOption: { minWidth: 126, flexGrow: 1, flexBasis: 150, maxWidth: 230, borderWidth: 1, borderRadius: 14, padding: 13, gap: 3 },
  systemOptionTitle: { fontWeight: "900", fontSize: 13 },
  workspace: { gap: 18 },
  workspaceWide: { flexDirection: "row", alignItems: "flex-start" },
  formColumn: { flex: 1.1, gap: 14, minWidth: 0 },
  listColumn: { flex: 0.9, gap: 14, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.7 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, justifyContent: "center", borderRadius: 11, borderWidth: 1, paddingHorizontal: 14 },
  fieldsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  measureField: { flexGrow: 1, flexBasis: 140 },
  marginOption: { flexDirection: "row", alignItems: "center", gap: 14, padding: 13, borderRadius: 13 },
  autoAccessoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  autoAccessory: { flexGrow: 1, flexBasis: 120, borderRadius: 11, padding: 11, gap: 3 },
  autoAccessoryValue: { fontWeight: "900", fontSize: 15 },
  clientField: { flexGrow: 1, flexBasis: 220 },
  actionRow: { flexDirection: "row", gap: 10 },
  cardHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  cardHelp: { fontSize: 12, marginTop: 3 },
  emptyTitle: { fontSize: 17, fontWeight: "900" },
  measureList: { gap: 10 },
  measureHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  measureNumber: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  measureNumberText: { fontWeight: "900" },
  measureTitle: { fontWeight: "900", fontSize: 15 },
  measureMeta: { fontSize: 12, marginTop: 3 },
  summaryBar: { borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 16 },
  summaryLabel: { color: "#C8D9F3", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  summaryCount: { color: "#FFFFFF", fontSize: 17, fontWeight: "900", marginTop: 4 },
  summaryTotal: { backgroundColor: "#FFFFFF", borderRadius: 13, padding: 13 },
  summaryButton: { minWidth: 190 },
});
