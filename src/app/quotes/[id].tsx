import { recalculateQuoteCommercial } from "@/application/quoteFactory";
import { formatMeasurement } from "@/domain/calculations/inchFractions";
import { Quote, QuoteStatus } from "@/domain/models";
import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, Field, Money, SectionHeader } from "@/presentation/components";
import { useTheme } from "@/presentation/theme";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from "react-native";

function normalizedTerms(quote: Quote) {
  if (quote.commercial) {
    return {
      ...quote.commercial,
      applyTax: quote.commercial.applyTax ?? quote.totals.tax > 0,
    };
  }
  return {
      pricePerSquareFoot: quote.items[0]?.squareFoot?.pricePerSquareFoot ?? 0,
      transport: quote.settingsSnapshot.transport ?? 0,
      installation: 0,
      taxRate: quote.settingsSnapshot.taxRate,
      applyTax: quote.totals.tax > 0,
      applyAdditionalMargin: quote.totals.margin > 0,
      discountPercent: 0,
    };
}

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findQuote, saveQuote, settings } = useApp();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [quote, setQuote] = useState<Quote | null>();
  const [draft, setDraft] = useState<Quote | null>();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const wide = width >= 850;

  useEffect(() => {
    findQuote(id).then((found) => {
      setQuote(found);
      setDraft(found ? { ...found, commercial: normalizedTerms(found) } : found);
    });
  }, [findQuote, id]);

  if (quote === undefined) return <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />;
  if (quote === null) return <Text style={{ color: theme.text, padding: 20 }}>Cotización no encontrada.</Text>;
  const shown = draft ?? quote;

  const currency = shown.settingsSnapshot.currency || settings.prices.currency;
  const terms = normalizedTerms(shown);
  const squareFootTotal = shown.items.reduce((sum, item) => sum + (item.squareFoot?.total ?? 0), 0);
  const transport = terms.transport;
  const installation = terms?.installation ?? 0;
  const discount = shown.totals.discount ?? 0;

  const setTerm = (key: keyof typeof terms, value: string | boolean) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            commercial: {
              ...normalizedTerms(current),
              [key]:
                typeof value === "boolean"
                  ? value
                  : Number(value.replace(",", ".")) || 0,
            },
          }
        : current,
    );

  const saveChanges = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = { ...draft, updatedAt: new Date().toISOString() };
      await saveQuote(updated);
      setQuote(updated);
      setDraft(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const recalculate = () =>
    setDraft((current) =>
      current
        ? recalculateQuoteCommercial(current, normalizedTerms(current))
        : current,
    );

  const changeStatus = async (status: QuoteStatus) => {
    setSaving(true);
    try {
      const updated = { ...shown, status, updatedAt: new Date().toISOString() };
      await saveQuote(updated);
      setQuote(updated);
    } catch {
      Alert.alert("No se pudo actualizar", "Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: shown.number }} />
      <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
        <View style={[styles.hero, { backgroundColor: theme.brandBlue }]}>
          <View style={{ flex: 1 }}>
            <Badge label={`Cotización · ${shown.status}`} tone="red" />
            <Text style={styles.heroTitle}>{shown.client.name}</Text>
            <Text style={styles.heroMeta}>{shown.projectName} · {shown.number} · {shown.date}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>TOTAL FINAL</Text>
            <Money value={shown.totals.total} currency={currency} />
          </View>
        </View>

        <View style={styles.actions}>
          {!editing ? (
            <Button title="Editar cotización" onPress={() => setEditing(true)} />
          ) : (
            <>
              <Button title={saving ? "Guardando…" : "Guardar cambios"} disabled={saving} onPress={() => void saveChanges()} />
              <Button title="Recalcular" variant="secondary" onPress={recalculate} />
              <Button
                title="Cancelar edición"
                variant="danger"
                onPress={() => {
                  setDraft({ ...quote, commercial: normalizedTerms(quote) });
                  setEditing(false);
                }}
              />
            </>
          )}
          {shown.breakdownId && (
            <Button
              title="Ver desglose asociado"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: "/breakdowns/[id]", params: { id: shown.breakdownId! } })
              }
            />
          )}
          <Button title="Borrador" variant="secondary" disabled={saving || shown.status === "draft"} onPress={() => void changeStatus("draft")} />
          <Button title="Aprobar" disabled={saving || shown.status === "approved"} onPress={() => void changeStatus("approved")} />
          <Button title="Cancelar" variant="danger" disabled={saving || shown.status === "cancelled"} onPress={() => void changeStatus("cancelled")} />
        </View>

        {editing && (
          <Card>
            <SectionHeader title="Editar valores comerciales" />
            <View style={styles.fieldGrid}>
              <Field label="Precio por pie²" value={String(terms.pricePerSquareFoot)} keyboardType="decimal-pad" onChangeText={(value) => setTerm("pricePerSquareFoot", value)} />
              <Field label="Instalación" value={String(terms.installation)} keyboardType="decimal-pad" onChangeText={(value) => setTerm("installation", value)} />
              <Field label="Transporte" value={String(terms.transport)} keyboardType="decimal-pad" onChangeText={(value) => setTerm("transport", value)} />
              <Field label="ITBIS %" value={String(terms.taxRate)} keyboardType="decimal-pad" onChangeText={(value) => setTerm("taxRate", value)} editable={terms.applyTax} />
              <Field label="Descuento %" value={String(terms.discountPercent)} keyboardType="decimal-pad" onChangeText={(value) => setTerm("discountPercent", value)} />
              <Field
                label="Total manual"
                value={String(shown.totals.total)}
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          totals: {
                            ...current.totals,
                            total: Number(value.replace(",", ".")) || 0,
                          },
                        }
                      : current,
                  )
                }
              />
            </View>
            <View style={[styles.switchRow, { backgroundColor: theme.surfaceAlt }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "800" }}>Aplicar ITBIS</Text>
                <Text style={{ color: theme.muted }}>
                  {terms.applyTax ? `Se sumará ${terms.taxRate}% al subtotal` : "No aplicado · total sin ITBIS"}
                </Text>
              </View>
              <Switch
                value={terms.applyTax}
                onValueChange={(applyTax) =>
                  setDraft((current) =>
                    current
                      ? recalculateQuoteCommercial(current, {
                          ...normalizedTerms(current),
                          applyTax,
                        })
                      : current,
                  )
                }
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
            <View style={[styles.switchRow, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={{ color: theme.text, flex: 1, fontWeight: "800" }}>Aplicar margen adicional</Text>
              <Switch value={terms.applyAdditionalMargin} onValueChange={(value) => setTerm("applyAdditionalMargin", value)} trackColor={{ false: theme.border, true: theme.primary }} />
            </View>
          </Card>
        )}

        <View style={[styles.columns, wide && styles.columnsWide]}>
          <Card style={{ flex: 1 }}>
            <SectionHeader title="Cliente y proyecto" />
            <Info label="Cliente" value={shown.client.name} />
            <Info label="Teléfono" value={shown.client.phone || "—"} />
            <Info label="Dirección" value={shown.client.address || "—"} />
            <Info label="Proyecto" value={shown.projectName} />
            <Info label="Estado" value={shown.status} />
          </Card>
          <Card style={{ flex: 1 }}>
            <SectionHeader title="Resumen comercial" />
            <Total label={`Precio por pie² (${terms.pricePerSquareFoot})`} value={squareFootTotal} currency={currency} />
            <Total label="Instalación" value={installation} currency={currency} />
            <Total label="Transporte" value={transport} currency={currency} />
            {shown.totals.margin > 0 && <Total label={`Margen adicional (${shown.settingsSnapshot.profitMargin}%)`} value={shown.totals.margin} currency={currency} />}
            {discount > 0 && <Total label={`Descuento (${terms?.discountPercent ?? 0}%)`} value={-discount} currency={currency} />}
            <Total label="Subtotal" value={shown.totals.subtotal} currency={currency} />
            <Total
              label={terms.applyTax ? `ITBIS aplicado (${terms.taxRate}%)` : "ITBIS no aplicado"}
              value={shown.totals.tax}
              currency={currency}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Total label="Total final" value={shown.totals.total} currency={currency} strong />
          </Card>
        </View>

        <Card>
          <SectionHeader title="Partidas cotizadas" action={`${shown.items.length} medida(s)`} />
          {shown.items.map((item, index) => (
            <View key={item.id} style={[styles.itemRow, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{index + 1}. {item.description}</Text>
                <Text style={{ color: theme.muted }}>
                  {formatMeasurement(item.opening.width, item.opening.unit)} ×{" "}
                  {formatMeasurement(item.opening.height, item.opening.unit)} · {item.opening.quantity} ud. · {item.squareFoot?.totalArea ?? 0} pie²
                </Text>
              </View>
              <Money value={item.lineTotal} currency={currency} />
            </View>
          ))}
        </Card>

        <Card>
          <SectionHeader title="Documentos" action="Próximamente" />
          <Text style={{ color: theme.muted }}>La estructura comercial queda preparada para exportación futura.</Text>
          <View style={styles.actions}>
            <Button title="Generar PDF (futuro)" variant="secondary" disabled onPress={() => undefined} />
            <Button title="Exportar Excel (futuro)" variant="secondary" disabled onPress={() => undefined} />
          </View>
        </Card>

        <Card>
          <SectionHeader title="Notas comerciales" />
          <Text style={{ color: theme.muted }}>{shown.notes || "Sin notas comerciales."}</Text>
        </Card>
      </ScrollView>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={{ color: theme.muted, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

function Total({ label, value, currency, strong }: { label: string; value: number; currency: string; strong?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[{ color: theme.muted, flex: 1 }, strong && { color: theme.text, fontSize: 18, fontWeight: "900" }]}>{label}</Text>
      <Money value={value} currency={currency} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1200, alignSelf: "center", padding: 20, gap: 16, paddingBottom: 60 },
  hero: { borderRadius: 24, padding: 24, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 16 },
  heroTitle: { color: "#FFFFFF", fontSize: 29, fontWeight: "900", marginTop: 8 },
  heroMeta: { color: "#DCE7F7", marginTop: 4 },
  totalBox: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, gap: 4 },
  totalLabel: { fontSize: 10, fontWeight: "900", color: "#61708A" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  columns: { gap: 14 },
  columnsWide: { flexDirection: "row", alignItems: "flex-start" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  divider: { height: 1 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  itemTitle: { fontSize: 14, fontWeight: "900" },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  switchRow: { flexDirection: "row", alignItems: "center", padding: 13, borderRadius: 13 },
});
