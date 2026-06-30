import { createQuote, createQuoteItem } from "@/application/quoteFactory";
import {
  AccessoryInput,
  LeafCount,
  LockType,
  OpeningInput,
  QuoteItem,
  RailType,
  SYSTEM_IDS,
  SystemId,
} from "@/domain/models";
import { SYSTEM_CATALOG, getSystemCatalogItem } from "@/domain/systemCatalog";
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
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const EMPTY_ACCESSORIES: AccessoryInput = {
  rubberMeters: 0,
  wheels: 0,
  lockType: "puño-centro",
  locks: 0,
  guideKits: 0,
  weatherstripMeters: 0,
  installationScrews: 0,
  fabricationScrews: 0,
  wallPlugs: 0,
};

function initialOpening(systemId: SystemId = "P-65"): OpeningInput {
  return {
    systemId,
    leaves: 2,
    railType: getSystemCatalogItem(systemId).usesRails ? "2-riel" : "no-aplica",
    widthMm: 0,
    heightMm: 0,
    quantity: 1,
    accessories: { ...EMPTY_ACCESSORIES },
  };
}

type AccessoryNumberKey = Exclude<keyof AccessoryInput, "lockType">;

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
  const [opening, setOpening] = useState(initialOpening());
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const twoColumns = width >= 980;

  useEffect(() => {
    const selected = SYSTEM_IDS.find((id) => id === requestedSystem);
    if (selected) setOpening(initialOpening(selected));
  }, [requestedSystem]);

  const selectedSystem = getSystemCatalogItem(opening.systemId);
  const itemTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.lineTotal, 0),
    [items],
  );

  const selectSystem = (systemId: SystemId) => {
    const usesRails = getSystemCatalogItem(systemId).usesRails;
    setOpening((current) => ({
      ...current,
      systemId,
      railType: usesRails
        ? current.railType === "no-aplica"
          ? "2-riel"
          : current.railType
        : "no-aplica",
    }));
  };

  const setNumber = (key: "widthMm" | "heightMm" | "quantity", value: string) =>
    setOpening((current) => ({
      ...current,
      [key]: Number(value.replace(",", ".")) || 0,
    }));

  const setAccessory = (key: AccessoryNumberKey, value: string) =>
    setOpening((current) => ({
      ...current,
      accessories: {
        ...current.accessories,
        [key]: Number(value.replace(",", ".")) || 0,
      },
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
      setOpening((current) => ({ ...current, widthMm: 0, heightMm: 0, quantity: 1 }));
    } catch (error) {
      Alert.alert(
        "Revisa las medidas",
        error instanceof Error ? error.message : "Los datos no son válidos.",
      );
    }
  };

  const editItem = (item: QuoteItem) => {
    setOpening({ ...item.opening, accessories: { ...item.opening.accessories } });
    setEditingId(item.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setOpening(initialOpening(opening.systemId));
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

        <SectionHeader title="1. Selecciona el sistema" />
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
            <SectionHeader title="2. Define la medida" action={selectedSystem.label} />
            <Card style={editingId ? { borderColor: theme.brandRed, borderWidth: 2 } : undefined}>
              {editingId && <Badge label="Editando medida" tone="red" />}
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>CANTIDAD DE HOJAS</Text>
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

              {selectedSystem.usesRails && (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>TIPO DE RIEL</Text>
                  <View style={styles.chips}>
                    {(["2-riel", "3-riel", "monorriel"] as RailType[]).map((railType) => (
                      <Chip
                        key={railType}
                        label={railType}
                        selected={opening.railType === railType}
                        onPress={() => setOpening((current) => ({ ...current, railType }))}
                      />
                    ))}
                  </View>
                </>
              )}

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
                    label="Ancho (mm)"
                    value={opening.widthMm ? String(opening.widthMm) : ""}
                    onChangeText={(value) => setNumber("widthMm", value)}
                    keyboardType="numeric"
                    placeholder="1200"
                  />
                </View>
                <View style={styles.measureField}>
                  <Field
                    label="Alto (mm)"
                    value={opening.heightMm ? String(opening.heightMm) : ""}
                    onChangeText={(value) => setNumber("heightMm", value)}
                    keyboardType="numeric"
                    placeholder="1000"
                  />
                </View>
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
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Accesorios demostrativos</Text>
                  <Text style={[styles.cardHelp, { color: theme.muted }]}>
                    Opcional · consumo por unidad
                  </Text>
                </View>
                <Badge label="Configurable" tone="neutral" />
              </View>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>TIPO DE CIERRE</Text>
              <View style={styles.chips}>
                {(
                  [
                    ["puño-centro", "Puño centro"],
                    ["monopunto", "Monopunto"],
                    ["tradicional", "Tradicional"],
                  ] as [LockType, string][]
                ).map(([lockType, label]) => (
                  <Chip
                    key={lockType}
                    label={label}
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
              <View style={styles.fieldsRow}>
                <AccessoryField label="Goma (m)" field="rubberMeters" opening={opening} onChange={setAccessory} />
                <AccessoryField label="Ruedas" field="wheels" opening={opening} onChange={setAccessory} />
                <AccessoryField label="Cierres" field="locks" opening={opening} onChange={setAccessory} />
                <AccessoryField label="Kits guías" field="guideKits" opening={opening} onChange={setAccessory} />
                <AccessoryField label="Felpa (m)" field="weatherstripMeters" opening={opening} onChange={setAccessory} />
              </View>
            </Card>
          </View>

          <View style={styles.listColumn}>
            <SectionHeader title="3. Medidas agregadas" action={`${items.length} total`} />
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
                          {item.opening.widthMm} × {item.opening.heightMm} mm · {item.opening.quantity} ud.
                        </Text>
                        <Text style={[styles.measureMeta, { color: theme.muted }]}>
                          {item.opening.leaves} hojas
                          {item.opening.railType && item.opening.railType !== "no-aplica"
                            ? ` · ${item.opening.railType}`
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

        <SectionHeader title="4. Datos del trabajo" />
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

function AccessoryField({
  label,
  field,
  opening,
  onChange,
}: {
  label: string;
  field: AccessoryNumberKey;
  opening: OpeningInput;
  onChange(key: AccessoryNumberKey, value: string): void;
}) {
  const value = opening.accessories[field];
  return (
    <View style={styles.accessoryField}>
      <Field
        label={label}
        value={value ? String(value) : ""}
        onChangeText={(text) => onChange(field, text)}
        keyboardType="decimal-pad"
        placeholder="0"
      />
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
  accessoryField: { flexGrow: 1, flexBasis: 120 },
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
