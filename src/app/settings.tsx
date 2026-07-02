import { GLASS_SHEET_SIZES } from "@/domain/calculations/glassOptimizer";
import {
  AppSettings,
  MeasurementUnit,
  SystemAccessoryRules,
} from "@/domain/models";
import {
  SYSTEM_CATALOG,
  supportsSquareFootPricing,
} from "@/domain/systemCatalog";
import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, Field, SectionHeader } from "@/presentation/components";
import { useTheme } from "@/presentation/theme";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export default function SettingsScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { settings, updateSettings } = useApp();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const wide = width >= 960;

  const setCompany = (key: keyof AppSettings["company"], value: string) =>
    setDraft((current) => ({
      ...current,
      company: { ...current.company, [key]: value },
    }));

  const selectLogo = async () => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Permite el acceso a tus fotos para seleccionar el logo.",
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const logoUri = asset.base64
      ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`
      : asset.uri;
    setCompany("logoUri", logoUri);
  };

  const setPrice = (
    key: Exclude<
      keyof AppSettings["prices"],
      "accessoryPrices" | "squareFootPrices" | "accessoryRules"
    >,
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      prices: {
        ...current.prices,
        [key]:
          key === "currency" ? value.toUpperCase() : Number(value.replace(",", ".")) || 0,
      },
    }));

  const setSquareFootPrice = (systemId: keyof AppSettings["prices"]["squareFootPrices"], value: string) =>
    setDraft((current) => ({
      ...current,
      prices: {
        ...current.prices,
        squareFootPrices: {
          ...current.prices.squareFootPrices,
          [systemId]: Number(value.replace(",", ".")) || 0,
        },
      },
    }));

  const setAccessoryRule = (
    systemId: keyof AppSettings["prices"]["accessoryRules"],
    accessory: keyof Omit<SystemAccessoryRules, "locksByType">,
    factor: "perWindow" | "perLeaf",
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      prices: {
        ...current.prices,
        accessoryRules: {
          ...current.prices.accessoryRules,
          [systemId]: {
            ...current.prices.accessoryRules[systemId],
            [accessory]: {
              ...current.prices.accessoryRules[systemId][accessory],
              [factor]: Number(value.replace(",", ".")) || 0,
            },
          },
        },
      },
    }));

  const setCenterHandleRule = (
    systemId: keyof AppSettings["prices"]["accessoryRules"],
    factor: "perWindow" | "perLeaf",
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      prices: {
        ...current.prices,
        accessoryRules: {
          ...current.prices.accessoryRules,
          [systemId]: {
            ...current.prices.accessoryRules[systemId],
            locksByType: {
              ...current.prices.accessoryRules[systemId].locksByType,
              puño: {
                ...current.prices.accessoryRules[systemId].locksByType.puño,
                [factor]: Number(value.replace(",", ".")) || 0,
              },
            },
          },
        },
      },
    }));

  const setAccessoryPrice = (
    key: keyof AppSettings["prices"]["accessoryPrices"],
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      prices: {
        ...current.prices,
        accessoryPrices: {
          ...current.prices.accessoryPrices,
          [key]: Number(value.replace(",", ".")) || 0,
        },
      },
    }));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings(draft);
      Alert.alert("Configuración guardada", "Los valores se aplicarán a los trabajos nuevos.");
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Badge label="Administración" tone="red" />
          <Text style={[styles.pageTitle, { color: theme.text }]}>Configuración del taller</Text>
          <Text style={[styles.pageSubtitle, { color: theme.muted }]}>
            Empresa, identidad, precios demostrativos y parámetros de optimización.
          </Text>
        </View>
        <View style={[styles.savedHint, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.savedHintText, { color: theme.primary }]}>Guardado local</Text>
        </View>
      </View>

      <View style={[styles.layout, wide && styles.layoutWide]}>
        <View style={styles.mainColumn}>
          <SectionHeader title="Datos de la empresa" />
          <Card>
            <View style={styles.fieldsRow}>
              <SettingField>
                <Field label="Nombre comercial" value={draft.company.name} onChangeText={(value) => setCompany("name", value)} />
              </SettingField>
              <SettingField>
                <Field label="RNC / ID fiscal" value={draft.company.taxId} onChangeText={(value) => setCompany("taxId", value)} />
              </SettingField>
            </View>
            <View style={styles.fieldsRow}>
              <SettingField>
                <Field label="Teléfono" value={draft.company.phone} onChangeText={(value) => setCompany("phone", value)} />
              </SettingField>
              <SettingField>
                <Field label="Correo" value={draft.company.email} onChangeText={(value) => setCompany("email", value)} keyboardType="email-address" />
              </SettingField>
            </View>
            <Field label="Dirección" value={draft.company.address} onChangeText={(value) => setCompany("address", value)} />
            <View style={styles.companyLogoRow}>
              <View style={[styles.companyLogoPreview, { borderColor: theme.border }]}>
                {draft.company.logoUri ? (
                  <Image
                    source={{ uri: draft.company.logoUri }}
                    style={styles.companyLogoImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={[styles.logoPlaceholder, { color: theme.muted }]}>
                    Sin logo
                  </Text>
                )}
              </View>
              <View style={styles.logoActions}>
                <Button title="Seleccionar imagen" onPress={() => void selectLogo()} />
                {draft.company.logoUri && (
                  <Button
                    title="Quitar logo"
                    variant="secondary"
                    onPress={() => setCompany("logoUri", "")}
                  />
                )}
                <Text style={[styles.helperText, { color: theme.muted }]}>
                  Se guarda localmente con la configuración y queda disponible
                  para futuras cotizaciones y PDF.
                </Text>
              </View>
            </View>
          </Card>

          <SectionHeader title="Valores generales" action="Plantilla demostrativa" />
          <Card>
            <Text style={{ color: theme.muted }}>Unidad predeterminada</Text>
            <View style={styles.unitRow}>
              {(
                [
                  ["in", "Pulgadas"],
                  ["cm", "Centímetros"],
                ] as [MeasurementUnit, string][]
              ).map(([unit, label]) => (
                <Pressable
                  key={unit}
                  onPress={() => setDraft((current) => ({ ...current, unit }))}
                  style={[
                    styles.unitButton,
                    {
                      backgroundColor: draft.unit === unit ? theme.primary : theme.surfaceAlt,
                      borderColor: draft.unit === unit ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={{ color: draft.unit === unit ? "#FFFFFF" : theme.text, fontWeight: "800" }}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.fieldsRow}>
              <SettingField>
                <Field label="Moneda" value={draft.prices.currency} onChangeText={(value) => setPrice("currency", value)} />
              </SettingField>
              <SettingField>
                <Field label="ITBIS / impuesto %" value={String(draft.prices.taxRate)} onChangeText={(value) => setPrice("taxRate", value)} keyboardType="decimal-pad" />
              </SettingField>
              <SettingField>
                <Field label="Margen %" value={String(draft.prices.profitMargin)} onChangeText={(value) => setPrice("profitMargin", value)} keyboardType="decimal-pad" />
              </SettingField>
            </View>
            <View style={styles.fieldsRow}>
              <SettingField>
                <Field label="Perfil por metro" value={String(draft.prices.profilePricePerMeter)} onChangeText={(value) => setPrice("profilePricePerMeter", value)} keyboardType="decimal-pad" />
              </SettingField>
              <SettingField>
                <Field label="Cristal por m²" value={String(draft.prices.glassPricePerSquareMeter)} onChangeText={(value) => setPrice("glassPricePerSquareMeter", value)} keyboardType="decimal-pad" />
              </SettingField>
              <SettingField>
                <Field label="Accesorio genérico" value={String(draft.prices.accessoryUnitPrice)} onChangeText={(value) => setPrice("accessoryUnitPrice", value)} keyboardType="decimal-pad" />
              </SettingField>
            </View>
          </Card>

          <SectionHeader title="Operación e instalación" />
          <Card>
            <View style={styles.fieldsRow}>
              <SettingField>
                <Field label="Instalación / mano de obra por unidad" value={String(draft.prices.laborPerUnit)} onChangeText={(value) => setPrice("laborPerUnit", value)} keyboardType="decimal-pad" />
              </SettingField>
              <SettingField>
                <Field label="Transporte por trabajo" value={String(draft.prices.transport)} onChangeText={(value) => setPrice("transport", value)} keyboardType="decimal-pad" />
              </SettingField>
              <SettingField>
                <Field label="Largo de barras (mm)" value={String(draft.prices.barLengthMm)} onChangeText={(value) => setPrice("barLengthMm", value)} keyboardType="number-pad" />
              </SettingField>
            </View>
          </Card>

          <SectionHeader title="Accesorios" action="Precio por unidad o metro" />
          <Card>
            <Text style={{ color: theme.muted, lineHeight: 20 }}>
              Si un valor queda en cero se utiliza el precio genérico configurado arriba.
            </Text>
            <View style={styles.fieldsRow}>
              <AccessoryPriceField label="Goma / m" field="rubberPerMeter" draft={draft} onChange={setAccessoryPrice} />
              <AccessoryPriceField label="Rueda" field="wheel" draft={draft} onChange={setAccessoryPrice} />
              <AccessoryPriceField label="Puño de centro" field="centerHandle" draft={draft} onChange={setAccessoryPrice} />
              <AccessoryPriceField label="Kit de guías" field="guideKit" draft={draft} onChange={setAccessoryPrice} />
              <AccessoryPriceField label="Felpa / m" field="weatherstripPerMeter" draft={draft} onChange={setAccessoryPrice} />
              <AccessoryPriceField label="Tornillo instalación" field="installationScrew" draft={draft} onChange={setAccessoryPrice} />
              <AccessoryPriceField label="Tornillo fabricación" field="fabricationScrew" draft={draft} onChange={setAccessoryPrice} />
              <AccessoryPriceField label="Tarugo" field="wallPlug" draft={draft} onChange={setAccessoryPrice} />
            </View>
          </Card>
        </View>

        <View style={styles.sideColumn}>
          <SectionHeader title="Identidad MAC" />
          <Card>
            <View style={styles.logoPreview}>
              <View style={[styles.logoMark, { backgroundColor: theme.brandRed }]}>
                <Text style={styles.logoText}>MAC</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewTitle, { color: theme.text }]}>
                  {draft.company.name || "Mi empresa"}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>Rojo · Azul · Blanco</Text>
              </View>
            </View>
            <View style={styles.swatches}>
              <ColorSwatch name="Rojo MAC" color={theme.brandRed} value="#D62828" />
              <ColorSwatch name="Azul MAC" color={theme.brandBlue} value="#123B7A" />
              <ColorSwatch name="Blanco" color="#FFFFFF" value="#FFFFFF" bordered />
            </View>
            <Text style={[styles.helperText, { color: theme.muted }]}>
              La paleta corporativa se mantiene fija para conservar consistencia en web y móvil.
            </Text>
          </Card>

          <SectionHeader title="Precio por pie² y reglas por sistema" />
          <Card>
            <Text style={[styles.helperText, { color: theme.muted }]}>
              Cada cantidad se calcula como (por ventana + por hoja × hojas) × ventanas.
              Los valores iniciales son cero hasta que el taller defina sus reglas.
            </Text>
            <View style={styles.systemList}>
              {SYSTEM_CATALOG.map((system) => {
                const rules = draft.prices.accessoryRules[system.id];
                return (
                  <View key={system.id} style={[styles.ruleCard, { borderColor: theme.border }]}>
                    <Text style={[styles.systemName, { color: theme.text }]}>{system.label}</Text>
                    {supportsSquareFootPricing(system.id) && (
                      <Field
                        label={`Precio por pie² (${draft.prices.currency})`}
                        value={String(draft.prices.squareFootPrices[system.id])}
                        onChangeText={(value) => setSquareFootPrice(system.id, value)}
                        keyboardType="decimal-pad"
                      />
                    )}
                    <View style={styles.ruleGrid}>
                      {(
                        [
                          ["rubberMeters", "Goma"],
                          ["wheels", "Ruedas"],
                          ["guideKits", "Kit guías"],
                          ["weatherstripMeters", "Felpa"],
                          ["screws", "Tornillos"],
                        ] as [keyof Omit<SystemAccessoryRules, "locksByType">, string][]
                      ).map(([key, label]) => (
                        <RuleFields
                          key={key}
                          label={label}
                          perWindow={rules[key].perWindow}
                          perLeaf={rules[key].perLeaf}
                          partLabel={system.id === "AA" ? "Por cuerpo" : "Por hoja"}
                          onWindow={(value) => setAccessoryRule(system.id, key, "perWindow", value)}
                          onLeaf={(value) => setAccessoryRule(system.id, key, "perLeaf", value)}
                        />
                      ))}
                      <RuleFields
                        label="Puño de centro"
                        perWindow={rules.locksByType.puño.perWindow}
                        perLeaf={rules.locksByType.puño.perLeaf}
                        partLabel={system.id === "AA" ? "Por cuerpo" : "Por hoja"}
                        onWindow={(value) => setCenterHandleRule(system.id, "perWindow", value)}
                        onLeaf={(value) => setCenterHandleRule(system.id, "perLeaf", value)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          <SectionHeader title="Tamaños de planchas" />
          <Card>
            {Object.values(GLASS_SHEET_SIZES).map((sheet) => (
              <View key={sheet.label} style={[styles.sheetRow, { backgroundColor: theme.primarySoft }]}>
                <View style={[styles.sheetIcon, { borderColor: theme.primary }]} />
                <View>
                  <Text style={[styles.systemName, { color: theme.text }]}>Plancha {sheet.label}</Text>
                  <Text style={{ color: theme.muted, fontSize: 11 }}>
                    {Math.round(sheet.widthMm)} × {Math.round(sheet.heightMm)} mm
                  </Text>
                </View>
              </View>
            ))}
            <Text style={[styles.helperText, { color: theme.muted }]}>
              Medidas demostrativas usadas por el comparador de cristal.
            </Text>
          </Card>
        </View>
      </View>

      <View style={[styles.saveBar, { backgroundColor: theme.brandBlue }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.saveTitle}>¿Listo para aplicar los cambios?</Text>
          <Text style={styles.saveSubtitle}>Solo afectarán trabajos nuevos.</Text>
        </View>
        <View style={styles.saveButton}>
          <Button title={saving ? "Guardando…" : "Guardar configuración"} disabled={saving} onPress={save} />
        </View>
      </View>
    </ScrollView>
  );
}

function SettingField({ children }: { children: React.ReactNode }) {
  return <View style={styles.settingField}>{children}</View>;
}

function AccessoryPriceField({
  label,
  field,
  draft,
  onChange,
}: {
  label: string;
  field: keyof AppSettings["prices"]["accessoryPrices"];
  draft: AppSettings;
  onChange(key: keyof AppSettings["prices"]["accessoryPrices"], value: string): void;
}) {
  return (
    <View style={styles.accessoryField}>
      <Field
        label={label}
        value={String(draft.prices.accessoryPrices[field])}
        onChangeText={(value) => onChange(field, value)}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

function RuleFields({
  label,
  perWindow,
  perLeaf,
  onWindow,
  onLeaf,
  partLabel = "Por hoja",
}: {
  label: string;
  perWindow: number;
  perLeaf: number;
  partLabel?: string;
  onWindow(value: string): void;
  onLeaf(value: string): void;
}) {
  return (
    <View style={styles.ruleFields}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Field
        label="Por ventana"
        value={String(perWindow)}
        onChangeText={onWindow}
        keyboardType="decimal-pad"
      />
      <Field
        label={partLabel}
        value={String(perLeaf)}
        onChangeText={onLeaf}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

function ColorSwatch({
  name,
  color,
  value,
  bordered,
}: {
  name: string;
  color: string;
  value: string;
  bordered?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.swatchItem}>
      <View style={[styles.swatch, { backgroundColor: color, borderColor: bordered ? theme.border : color }]} />
      <Text style={[styles.swatchName, { color: theme.text }]}>{name}</Text>
      <Text style={{ color: theme.muted, fontSize: 10 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1440, alignSelf: "center", padding: 20, gap: 18, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", gap: 20 },
  pageTitle: { fontSize: 29, fontWeight: "900", marginTop: 10, letterSpacing: -0.5 },
  pageSubtitle: { marginTop: 5, lineHeight: 21 },
  savedHint: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  savedHintText: { fontSize: 11, fontWeight: "900" },
  layout: { gap: 18 },
  layoutWide: { flexDirection: "row", alignItems: "flex-start" },
  mainColumn: { flex: 1.35, gap: 14, minWidth: 0 },
  sideColumn: { flex: 0.75, gap: 14, minWidth: 0 },
  fieldsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  unitRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  unitButton: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10 },
  settingField: { flexGrow: 1, flexBasis: 190 },
  accessoryField: { flexGrow: 1, flexBasis: 150 },
  companyLogoRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "center" },
  companyLogoPreview: { width: 140, height: 100, borderWidth: 1, borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  companyLogoImage: { width: "100%", height: "100%" },
  logoPlaceholder: { fontSize: 12, fontWeight: "800" },
  logoActions: { flex: 1, minWidth: 220, gap: 8 },
  logoPreview: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoMark: { width: 58, height: 58, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  previewTitle: { fontSize: 17, fontWeight: "900" },
  swatches: { flexDirection: "row", gap: 12 },
  swatchItem: { flex: 1, gap: 5 },
  swatch: { height: 42, borderRadius: 11, borderWidth: 1 },
  swatchName: { fontSize: 11, fontWeight: "800" },
  helperText: { fontSize: 12, lineHeight: 18 },
  systemList: { gap: 2 },
  ruleCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  ruleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ruleFields: { flexGrow: 1, flexBasis: 180, gap: 6 },
  ruleLabel: { fontWeight: "900", fontSize: 12 },
  systemRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 9, borderBottomWidth: 1 },
  systemDot: { width: 8, height: 8, borderRadius: 4 },
  systemName: { fontSize: 12, fontWeight: "800" },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12 },
  sheetIcon: { width: 38, height: 26, borderWidth: 2 },
  saveBar: { borderRadius: 21, padding: 19, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 15 },
  saveTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  saveSubtitle: { color: "#C9D9F2", fontSize: 12, marginTop: 3 },
  saveButton: { minWidth: 220 },
});
