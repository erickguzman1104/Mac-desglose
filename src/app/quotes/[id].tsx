import { optimizeCuts } from "@/domain/calculations/cutOptimizer";
import { compareGlassSheetSizes } from "@/domain/calculations/glassOptimizer";
import { Quote } from "@/domain/models";
import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, Money, SectionHeader } from "@/presentation/components";
import { GlassSheetSketch } from "@/presentation/GlassSheetSketch";
import { useTheme } from "@/presentation/theme";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export default function QuoteSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { settings, findQuote } = useApp();
  const [quote, setQuote] = useState<Quote | null>();
  const wide = width >= 900;

  useEffect(() => {
    findQuote(id).then(setQuote);
  }, [findQuote, id]);

  const barsByItem = useMemo(() => {
    if (!quote) return [];
    return quote.items.map((item) => {
      const groups = Object.values(
        item.breakdown.cuts.reduce<Record<string, typeof item.breakdown.cuts>>(
          (result, cut) => {
            (result[cut.materialCode] ??= []).push(cut);
            return result;
          },
          {},
        ),
      );
      return groups.flatMap((cuts) =>
        optimizeCuts(cuts, quote.settingsSnapshot.barLengthMm).map((bar) => ({
          ...bar,
          materialCode: cuts[0].materialCode,
        })),
      );
    });
  }, [quote]);

  const glassPlansByItem = useMemo(
    () => quote?.items.map((item) => compareGlassSheetSizes(item.breakdown.glass)) ?? [],
    [quote],
  );

  if (quote === undefined) {
    return <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />;
  }
  if (quote === null) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>No se encontró la cotización.</Text>
        <Button title="Volver" onPress={() => router.replace("/")} />
      </View>
    );
  }

  const currency = quote.settingsSnapshot.currency || settings.prices.currency;

  return (
    <>
      <Stack.Screen options={{ title: quote.number }} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.page}
      >
        <View style={[styles.hero, { backgroundColor: theme.brandBlue }]}>
          <View style={styles.heroMain}>
            <Badge label={`${quote.status === "draft" ? "Borrador" : quote.status}`} tone="red" />
            <Text style={styles.heroNumber}>{quote.number}</Text>
            <Text style={styles.heroClient}>{quote.client.name}</Text>
            <Text style={styles.heroMeta}>
              {quote.projectName} · {quote.date}
              {quote.client.phone ? ` · ${quote.client.phone}` : ""}
            </Text>
          </View>
          <View style={styles.heroTotal}>
            <Text style={styles.heroTotalLabel}>TOTAL GENERAL</Text>
            <View style={styles.heroMoney}>
              <Money value={quote.totals.total} currency={currency} />
            </View>
            <Text style={styles.heroTotalMeta}>{quote.items.length} medida(s)</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <View style={[styles.noticeBar, { backgroundColor: theme.brandRed }]} />
          <Text style={[styles.noticeText, { color: theme.muted }]}>
            Desglose demostrativo. Las referencias y descuentos técnicos deben validarse antes de fabricar.
          </Text>
        </View>

        {quote.items.map((item, itemIndex) => {
          const profiles = item.breakdown.materials.filter(({ category }) => category === "profile");
          const accessories = item.breakdown.materials.filter(({ category }) => category === "accessory");
          const glassPlan = glassPlansByItem[itemIndex];
          return (
            <View key={item.id} style={styles.itemSection}>
              <View style={styles.itemHeading}>
                <View style={[styles.itemIndex, { backgroundColor: theme.brandRed }]}>
                  <Text style={styles.itemIndexText}>{itemIndex + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{item.description}</Text>
                  <Text style={{ color: theme.muted }}>
                    {item.opening.widthMm} × {item.opening.heightMm} mm · {item.opening.quantity} ud. · {item.opening.leaves} hojas
                    {item.opening.railType && item.opening.railType !== "no-aplica"
                      ? ` · ${item.opening.railType}`
                      : ""}
                  </Text>
                </View>
                <Money value={item.lineTotal} currency={currency} />
              </View>

              <View style={[styles.contentGrid, wide && styles.contentGridWide]}>
                <View style={styles.gridColumn}>
                  <Card>
                    <SectionHeader title="Materiales" action={`${profiles.length} grupos`} />
                    <TableHeader columns={["Referencia", "Material", "Cantidad"]} />
                    {profiles.map((material) => (
                      <TableRow
                        key={material.code}
                        values={[material.code, material.name, `${material.quantity} ${material.unit}`]}
                      />
                    ))}
                  </Card>

                  <Card>
                    <SectionHeader title="Cortes" action={`${item.breakdown.cuts.length} referencias`} />
                    <TableHeader columns={["Código", "Uso", "Medida / piezas"]} />
                    {item.breakdown.cuts.map((cut) => (
                      <TableRow
                        key={`${cut.id}-${cut.materialCode}`}
                        values={[cut.materialCode, cut.purpose, `${cut.lengthMm} mm · ${cut.pieces} pzs`]}
                      />
                    ))}
                  </Card>
                </View>

                <View style={styles.gridColumn}>
                  <Card>
                    <SectionHeader title="Cristales" action={`${item.breakdown.glass.length} medidas`} />
                    <View style={styles.tileGrid}>
                      {item.breakdown.glass.map((glass, index) => (
                        <View key={`${glass.widthMm}-${index}`} style={[styles.dataTile, { backgroundColor: theme.primarySoft }]}>
                          <Text style={[styles.dataTileLabel, { color: theme.primary }]}>CRISTAL {index + 1}</Text>
                          <Text style={[styles.dataTileValue, { color: theme.text }]}>
                            {glass.widthMm} × {glass.heightMm} mm
                          </Text>
                          <Text style={{ color: theme.muted }}>
                            {glass.pieces} piezas · {glass.areaM2} m²
                          </Text>
                        </View>
                      ))}
                    </View>
                  </Card>

                  <Card>
                    <SectionHeader title="Accesorios" action={`${accessories.length} activos`} />
                    {accessories.length === 0 ? (
                      <Text style={{ color: theme.muted }}>No se agregaron accesorios a esta medida.</Text>
                    ) : (
                      accessories.map((accessory) => (
                        <View key={accessory.code} style={[styles.cleanRow, { borderBottomColor: theme.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.rowTitle, { color: theme.text }]}>{accessory.name}</Text>
                            <Text style={[styles.rowCode, { color: theme.muted }]}>{accessory.code}</Text>
                          </View>
                          <Text style={[styles.rowValue, { color: theme.primary }]}>
                            {accessory.quantity} {accessory.unit}
                          </Text>
                        </View>
                      ))
                    )}
                  </Card>
                </View>
              </View>

              <Card style={{ borderColor: theme.primary }}>
                <View style={styles.optimizerHeading}>
                  <View style={{ flex: 1 }}>
                    <Badge label="Optimizador de cristal" tone="blue" />
                    <Text style={[styles.optimizerTitle, { color: theme.text }]}>Comparación de planchas</Text>
                    <Text style={{ color: theme.muted }}>
                      Espacio preparado para validar colocación, sobrante y tamaño recomendado.
                    </Text>
                  </View>
                  <Text style={[styles.recommended, { color: theme.primary }]}>
                    {glassPlan.recommendedSizeId
                      ? `Recomendada: ${glassPlan.options.find(({ sizeId }) => sizeId === glassPlan.recommendedSizeId)?.label}`
                      : "Sin recomendación"}
                  </Text>
                </View>
                <View style={[styles.planGrid, wide && styles.planGridWide]}>
                  {glassPlan.options.map((option) => (
                    <View
                      key={option.sizeId}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: theme.background,
                          borderColor:
                            glassPlan.recommendedSizeId === option.sizeId
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                    >
                      <View style={styles.planHeader}>
                        <Text style={[styles.planTitle, { color: theme.text }]}>Plancha {option.label}</Text>
                        {glassPlan.recommendedSizeId === option.sizeId && <Badge label="Mejor opción" tone="blue" />}
                      </View>
                      <Text style={{ color: theme.muted }}>
                        {option.sheets.length} plancha(s) · {option.wastePercent}% sobrante
                      </Text>
                      {!!option.error && <Text style={{ color: theme.danger }}>{option.error}</Text>}
                      {option.sheets.map((sheet) => (
                        <View key={sheet.id} style={styles.sheet}>
                          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "800" }}>
                            Plancha #{sheet.id} · sobrante {sheet.wasteAreaM2} m²
                          </Text>
                          <GlassSheetSketch sheet={sheet} />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </Card>

              <Card>
                <SectionHeader title="Optimizador de barras" action={`${barsByItem[itemIndex].length} barras estimadas`} />
                <View style={styles.barGrid}>
                  {barsByItem[itemIndex].map((bar, index) => (
                    <View key={`${bar.materialCode}-${bar.id}-${index}`} style={[styles.barCard, { backgroundColor: theme.surfaceAlt }]}>
                      <Text style={[styles.rowCode, { color: theme.primary }]}>{bar.materialCode}</Text>
                      <Text style={[styles.rowTitle, { color: theme.text }]}>Barra #{bar.id}</Text>
                      <Text style={{ color: theme.muted, lineHeight: 19 }}>
                        {bar.cuts.map((cut) => `${cut.lengthMm} mm`).join(" + ")}
                      </Text>
                      <Text style={{ color: theme.warning, fontWeight: "800" }}>Sobrante: {bar.remainderMm} mm</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </View>
          );
        })}

        <View style={[styles.footerGrid, wide && styles.footerGridWide]}>
          <Card style={{ flex: 1 }}>
            <SectionHeader title="Resumen económico" />
            <TotalRow label="Costo directo" value={quote.totals.directCost} currency={currency} />
            <TotalRow label="Margen" value={quote.totals.margin} currency={currency} />
            <TotalRow label="Subtotal" value={quote.totals.subtotal} currency={currency} />
            <TotalRow label={`ITBIS (${quote.settingsSnapshot.taxRate}%)`} value={quote.totals.tax} currency={currency} />
            <View style={[styles.totalDivider, { backgroundColor: theme.border }]} />
            <View style={styles.cleanRow}>
              <Text style={[styles.grandTotal, { color: theme.text }]}>Total general</Text>
              <Money value={quote.totals.total} currency={currency} />
            </View>
          </Card>
          <Card style={{ flex: 1 }}>
            <SectionHeader title="Observaciones" />
            <Text style={{ color: theme.muted, lineHeight: 21 }}>
              {quote.notes || "No se agregaron observaciones a este trabajo."}
            </Text>
            <View style={styles.actionRow}>
              <View style={{ flex: 1 }}>
                <Button title="Nuevo trabajo" onPress={() => router.push("/quotes/new")} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Volver al inicio" variant="secondary" onPress={() => router.replace("/")} />
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}

function TableHeader({ columns }: { columns: [string, string, string] }) {
  const theme = useTheme();
  return (
    <View style={[styles.tableHeader, { backgroundColor: theme.surfaceAlt }]}>
      {columns.map((column) => (
        <Text key={column} style={[styles.tableHeaderText, { color: theme.muted }]}>{column}</Text>
      ))}
    </View>
  );
}

function TableRow({ values }: { values: [string, string, string] }) {
  const theme = useTheme();
  return (
    <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
      {values.map((value, index) => (
        <Text key={`${value}-${index}`} style={[styles.tableCell, { color: index === 0 ? theme.primary : theme.text }]}>
          {value}
        </Text>
      ))}
    </View>
  );
}

function TotalRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  const theme = useTheme();
  return (
    <View style={styles.cleanRow}>
      <Text style={{ flex: 1, color: theme.muted }}>{label}</Text>
      <Money value={value} currency={currency} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1440, alignSelf: "center", padding: 20, gap: 18, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  hero: { borderRadius: 26, padding: 26, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 22 },
  heroMain: { flex: 1, minWidth: 260, gap: 5 },
  heroNumber: { color: "#C7D9F5", fontSize: 12, fontWeight: "900", letterSpacing: 1, marginTop: 7 },
  heroClient: { color: "#FFFFFF", fontSize: 29, fontWeight: "900" },
  heroMeta: { color: "#DCE7F7", lineHeight: 20 },
  heroTotal: { alignItems: "flex-end", gap: 6 },
  heroTotalLabel: { color: "#C7D9F5", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  heroMoney: { backgroundColor: "#FFFFFF", paddingHorizontal: 15, paddingVertical: 12, borderRadius: 13 },
  heroTotalMeta: { color: "#FFFFFF", fontSize: 12 },
  notice: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 6 },
  noticeBar: { width: 4, height: 34, borderRadius: 3 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17 },
  itemSection: { gap: 14 },
  itemHeading: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 6 },
  itemIndex: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemIndexText: { color: "#FFFFFF", fontWeight: "900" },
  itemTitle: { fontSize: 19, fontWeight: "900", marginBottom: 3 },
  contentGrid: { gap: 14 },
  contentGridWide: { flexDirection: "row", alignItems: "flex-start" },
  gridColumn: { flex: 1, gap: 14, minWidth: 0 },
  tableHeader: { flexDirection: "row", padding: 10, borderRadius: 9 },
  tableHeaderText: { flex: 1, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 11, borderBottomWidth: 1 },
  tableCell: { flex: 1, fontSize: 12, paddingRight: 7 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  dataTile: { flexGrow: 1, flexBasis: 190, padding: 13, borderRadius: 13, gap: 4 },
  dataTileLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  dataTileValue: { fontSize: 15, fontWeight: "900" },
  cleanRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1 },
  rowTitle: { fontSize: 13, fontWeight: "800" },
  rowCode: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  rowValue: { fontWeight: "900" },
  optimizerHeading: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  optimizerTitle: { fontSize: 19, fontWeight: "900", marginTop: 8, marginBottom: 3 },
  recommended: { fontWeight: "900", fontSize: 12 },
  planGrid: { gap: 12 },
  planGridWide: { flexDirection: "row" },
  planCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 13, gap: 8, minWidth: 0 },
  planHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  planTitle: { fontWeight: "900" },
  sheet: { gap: 5 },
  barGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  barCard: { flexGrow: 1, flexBasis: 190, maxWidth: 320, borderRadius: 13, padding: 13, gap: 4 },
  footerGrid: { gap: 14 },
  footerGridWide: { flexDirection: "row", alignItems: "stretch" },
  totalDivider: { height: 1 },
  grandTotal: { flex: 1, fontSize: 19, fontWeight: "900" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: "auto" },
});
