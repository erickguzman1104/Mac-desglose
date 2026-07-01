import { optimizeCuts } from "@/domain/calculations/cutOptimizer";
import { compareGlassSheetSizes } from "@/domain/calculations/glassOptimizer";
import { MaterialCut, Quote } from "@/domain/models";
import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, Money, SectionHeader } from "@/presentation/components";
import { GlassSheetSketch } from "@/presentation/GlassSheetSketch";
import { useTheme } from "@/presentation/theme";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const round = (value: number, precision = 1) =>
  Math.round(value * 10 ** precision) / 10 ** precision;

function formatFeetAndInches(mm: number) {
  const totalInches = mm / 25.4;
  const feet = Math.floor(totalInches / 12);
  const inches = round(totalInches - feet * 12, 2);
  return `${feet}′ ${inches}″ (${round(totalInches, 2)} pulg)`;
}

export default function QuoteSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { settings, findQuote, saveQuote } = useApp();
  const [quote, setQuote] = useState<Quote | null>();
  const [converting, setConverting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const aluminumY = useRef(0);
  const glassY = useRef(0);
  const wide = width >= 900;

  useEffect(() => {
    findQuote(id).then(setQuote);
  }, [findQuote, id]);

  const projectCuts = useMemo(
    () => quote?.items.flatMap((item) => item.breakdown.cuts) ?? [],
    [quote],
  );

  const materialGroups = useMemo(() => {
    const groups = new Map<
      string,
      { code: string; name: string; cuts: MaterialCut[]; totalMm: number; pieces: number }
    >();
    for (const cut of projectCuts) {
      const group = groups.get(cut.materialCode) ?? {
        code: cut.materialCode,
        name: cut.materialName,
        cuts: [],
        totalMm: 0,
        pieces: 0,
      };
      group.cuts.push(cut);
      group.totalMm += cut.lengthMm * cut.pieces;
      group.pieces += cut.pieces;
      groups.set(cut.materialCode, group);
    }
    return [...groups.values()];
  }, [projectCuts]);

  const aluminumPlan = useMemo(
    () =>
      materialGroups.flatMap((material) =>
        optimizeCuts(material.cuts, quote?.settingsSnapshot.barLengthMm ?? 6000).map(
          (bar) => ({ ...bar, materialCode: material.code, materialName: material.name }),
        ),
      ),
    [materialGroups, quote],
  );

  const glassPlan = useMemo(
    () =>
      compareGlassSheetSizes(
        quote?.items.flatMap((item) => item.breakdown.glass) ?? [],
      ),
    [quote],
  );

  if (quote === undefined) {
    return <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />;
  }
  if (quote === null) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>No se encontró el trabajo.</Text>
        <Button title="Volver" onPress={() => router.replace("/")} />
      </View>
    );
  }

  const currency = quote.settingsSnapshot.currency || settings.prices.currency;
  const squareFootTotal = quote.items.reduce(
    (sum, item) => sum + (item.squareFoot?.total ?? 0),
    0,
  );
  const hasMargin = quote.totals.margin > 0;
  const subtotalBeforeMargin = quote.totals.subtotal - quote.totals.margin;
  const totalAluminumWaste = aluminumPlan.reduce(
    (sum, bar) => sum + bar.remainderMm,
    0,
  );

  const convertToQuote = async () => {
    if (quote.status === "approved") return;
    setConverting(true);
    try {
      const converted: Quote = {
        ...quote,
        status: "approved",
        updatedAt: new Date().toISOString(),
      };
      await saveQuote(converted);
      setQuote(converted);
      Alert.alert("Cotización creada", "El desglose quedó guardado como cotización.");
    } catch {
      Alert.alert("No se pudo convertir", "Inténtalo de nuevo.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: quote.number }} />
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.page}
      >
        <SectionHeader title="Resumen del proyecto" action={quote.number} />
        <View style={[styles.hero, { backgroundColor: theme.brandBlue }]}>
          <View style={styles.heroMain}>
            <Badge
              label={quote.status === "draft" ? "Desglose" : "Cotización"}
              tone="red"
            />
            <Text style={styles.heroClient}>{quote.client.name}</Text>
            <Text style={styles.heroMeta}>
              {quote.projectName} · {quote.date} · {quote.items.length} medida(s)
            </Text>
          </View>
          <View style={styles.heroTotal}>
            <Text style={styles.heroLabel}>TOTAL</Text>
            <View style={styles.heroMoney}>
              <Money value={quote.totals.total} currency={currency} />
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              title="Ver optimizador de aluminio"
              variant="secondary"
              onPress={() => scrollRef.current?.scrollTo({ y: aluminumY.current, animated: true })}
            />
          </View>
          <View style={styles.action}>
            <Button
              title="Ver optimizador de cristales"
              variant="secondary"
              onPress={() => scrollRef.current?.scrollTo({ y: glassY.current, animated: true })}
            />
          </View>
          <View style={styles.action}>
            <Button
              title={
                quote.status === "approved"
                  ? "Cotización creada"
                  : converting
                    ? "Convirtiendo…"
                    : "Convertir en cotización"
              }
              disabled={quote.status === "approved" || converting}
              onPress={() => void convertToQuote()}
            />
          </View>
        </View>

        <View style={[styles.columns, wide && styles.columnsWide]}>
          <Card style={{ flex: 1 }}>
            <SectionHeader title="Resumen económico" />
            <TotalRow label="Precio por pie²" value={squareFootTotal} currency={currency} />
            <TotalRow label="Subtotal" value={subtotalBeforeMargin} currency={currency} />
            {hasMargin && (
              <TotalRow
                label={`Margen adicional (${quote.settingsSnapshot.profitMargin}%)`}
                value={quote.totals.margin}
                currency={currency}
              />
            )}
            <TotalRow
              label={`ITBIS (${quote.settingsSnapshot.taxRate}%)`}
              value={quote.totals.tax}
              currency={currency}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <TotalRow label="Total" value={quote.totals.total} currency={currency} strong />
          </Card>
          <Card style={{ flex: 1 }}>
            <SectionHeader
              title="Materiales estimados"
              action={`${materialGroups.length} referencias`}
            />
            {materialGroups.map((material) => (
              <View
                key={material.code}
                style={[styles.row, { borderBottomColor: theme.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{material.name}</Text>
                  <Text style={[styles.code, { color: theme.primary }]}>
                    {material.code} · {material.pieces} cortes
                  </Text>
                </View>
                <Text style={[styles.value, { color: theme.text }]}>
                  {formatFeetAndInches(material.totalMm)}
                </Text>
              </View>
            ))}
          </Card>
        </View>

        <SectionHeader title="Medidas agregadas" action={`${quote.items.length} total`} />
        {quote.items.map((item, index) => {
          const accessories = item.breakdown.materials.filter(
            ({ category }) => category === "accessory",
          );
          return (
            <Card key={item.id}>
              <View style={styles.itemHeader}>
                <View style={[styles.number, { backgroundColor: theme.brandRed }]}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{item.description}</Text>
                  <Text style={{ color: theme.muted }}>
                    {item.opening.width} × {item.opening.height} {item.opening.unit} ·{" "}
                    {item.opening.quantity} ud.
                  </Text>
                </View>
                <Money value={item.lineTotal} currency={currency} />
              </View>
              <View style={[styles.columns, wide && styles.columnsWide]}>
                <View style={{ flex: 1, gap: 7 }}>
                  <Text style={[styles.subheading, { color: theme.text }]}>Precio</Text>
                  {item.squareFoot && (
                    <Text style={{ color: theme.muted }}>
                      {item.squareFoot.totalArea} pie² × {item.squareFoot.pricePerSquareFoot}{" "}
                      {currency} = {item.squareFoot.total} {currency}
                    </Text>
                  )}
                  <Text style={{ color: theme.muted }}>
                    Margen adicional: {item.opening.applyAdditionalMargin ? "Sí" : "No"}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 7 }}>
                  <Text style={[styles.subheading, { color: theme.text }]}>Accesorios</Text>
                  {accessories.length ? (
                    accessories.map((accessory) => (
                      <Text key={accessory.code} style={{ color: theme.muted }}>
                        {accessory.name}: {accessory.quantity} {accessory.unit}
                      </Text>
                    ))
                  ) : (
                    <Text style={{ color: theme.muted }}>Sin accesorios configurados.</Text>
                  )}
                </View>
              </View>
            </Card>
          );
        })}

        <View
          onLayout={({ nativeEvent }) => {
            glassY.current = nativeEvent.layout.y;
          }}
        >
          <Card style={{ borderColor: theme.primary }}>
            <View style={styles.optimizerHeader}>
              <View style={{ flex: 1 }}>
                <Badge label="Optimizador de cristales" tone="blue" />
                <Text style={[styles.optimizerTitle, { color: theme.text }]}>
                  Comparación de planchas
                </Text>
                <Text style={{ color: theme.muted }}>
                  Cortes, sobrante y desperdicio aproximados para todo el proyecto.
                </Text>
              </View>
              <Text style={[styles.recommendation, { color: theme.primary }]}>
                {glassPlan.recommendedSizeId
                  ? `Recomendada: ${glassPlan.options.find(
                      ({ sizeId }) => sizeId === glassPlan.recommendedSizeId,
                    )?.label}`
                  : "Ninguna plancha admite todos los cortes"}
              </Text>
            </View>
            <View style={[styles.planGrid, wide && styles.columnsWide]}>
              {glassPlan.options.map((option) => (
                <View
                  key={option.sizeId}
                  style={[
                    styles.plan,
                    {
                      backgroundColor: theme.background,
                      borderColor:
                        option.sizeId === glassPlan.recommendedSizeId
                          ? theme.primary
                          : theme.border,
                    },
                  ]}
                >
                  <View style={styles.planHeading}>
                    <Text style={[styles.subheading, { color: theme.text }]}>
                      Plancha {option.label}
                    </Text>
                    {option.sizeId === glassPlan.recommendedSizeId && (
                      <Badge label="Mejor opción" tone="blue" />
                    )}
                  </View>
                  <Text style={{ color: theme.muted }}>
                    {option.sheets.length} plancha(s) · desperdicio {option.totalWasteAreaM2} m² (
                    {option.wastePercent}%)
                  </Text>
                  {!!option.error && <Text style={{ color: theme.danger }}>{option.error}</Text>}
                  {option.sheets.map((sheet) => (
                    <View key={sheet.id} style={{ gap: 5 }}>
                      <Text style={[styles.code, { color: theme.muted }]}>
                        PLANCHA #{sheet.id} · {sheet.cuts.length} cortes · sobrante{" "}
                        {sheet.wasteAreaM2} m²
                      </Text>
                      <GlassSheetSketch sheet={sheet} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </Card>
        </View>

        <View
          onLayout={({ nativeEvent }) => {
            aluminumY.current = nativeEvent.layout.y;
          }}
        >
          <Card>
            <View style={styles.optimizerHeader}>
              <View style={{ flex: 1 }}>
                <Badge label="Optimizador de aluminio" tone="red" />
                <Text style={[styles.optimizerTitle, { color: theme.text }]}>
                  {aluminumPlan.length} barras necesarias
                </Text>
                <Text style={{ color: theme.muted }}>
                  Desperdicio total: {formatFeetAndInches(totalAluminumWaste)}
                </Text>
              </View>
            </View>
            <View style={styles.barGrid}>
              {aluminumPlan.map((bar, index) => {
                const stockLength = quote.settingsSnapshot.barLengthMm;
                return (
                  <View
                    key={`${bar.materialCode}-${bar.id}-${index}`}
                    style={[styles.barCard, { backgroundColor: theme.surfaceAlt }]}
                  >
                    <Text style={[styles.rowTitle, { color: theme.text }]}>
                      {bar.materialName}
                    </Text>
                    <Text style={[styles.code, { color: theme.primary }]}>
                      {bar.materialCode} · BARRA #{bar.id}
                    </Text>
                    <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                      {bar.cuts.map((cut, cutIndex) => (
                        <View
                          key={`${cut.lengthMm}-${cutIndex}`}
                          style={[
                            styles.barCut,
                            {
                              flex: cut.lengthMm,
                              backgroundColor:
                                cutIndex % 2 === 0 ? theme.primary : theme.brandRed,
                            },
                          ]}
                        />
                      ))}
                      {bar.remainderMm > 0 && (
                        <View
                          style={{
                            flex: bar.remainderMm,
                            backgroundColor: theme.background,
                          }}
                        />
                      )}
                    </View>
                    <Text style={{ color: theme.muted }}>
                      Cortes:{" "}
                      {bar.cuts
                        .map(
                          (cut) =>
                            `${round(cut.lengthMm / 25.4, 2)}″ (${cut.label})`,
                        )
                        .join(" + ")}
                    </Text>
                    <Text style={{ color: theme.warning, fontWeight: "800" }}>
                      Sobrante: {formatFeetAndInches(bar.remainderMm)} · uso{" "}
                      {round(((stockLength - bar.remainderMm) / stockLength) * 100)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>

        <Card>
          <SectionHeader title="Observaciones" />
          <Text style={{ color: theme.muted, lineHeight: 21 }}>
            {quote.notes || "No se agregaron observaciones a este proyecto."}
          </Text>
          <Button title="Volver al inicio" variant="secondary" onPress={() => router.replace("/")} />
        </Card>
      </ScrollView>
    </>
  );
}

function TotalRow({
  label,
  value,
  currency,
  strong,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[{ flex: 1, color: strong ? theme.text : theme.muted }, strong && styles.strong]}>
        {label}
      </Text>
      <Money value={value} currency={currency} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1440, alignSelf: "center", padding: 20, gap: 18, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  hero: { borderRadius: 26, padding: 26, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 22 },
  heroMain: { flex: 1, minWidth: 250, gap: 7 },
  heroClient: { color: "#FFFFFF", fontSize: 29, fontWeight: "900" },
  heroMeta: { color: "#DCE7F7" },
  heroTotal: { alignItems: "flex-end", gap: 7 },
  heroLabel: { color: "#C7D9F5", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  heroMoney: { backgroundColor: "#FFFFFF", paddingHorizontal: 15, paddingVertical: 12, borderRadius: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  action: { flexGrow: 1, flexBasis: 220 },
  columns: { gap: 14 },
  columnsWide: { flexDirection: "row", alignItems: "flex-start" },
  divider: { height: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  rowTitle: { fontSize: 13, fontWeight: "800" },
  code: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4, marginTop: 3 },
  value: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  strong: { fontSize: 18, fontWeight: "900" },
  itemHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  number: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  numberText: { color: "#FFFFFF", fontWeight: "900" },
  itemTitle: { fontSize: 18, fontWeight: "900", marginBottom: 3 },
  subheading: { fontSize: 15, fontWeight: "900" },
  optimizerHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  optimizerTitle: { fontSize: 20, fontWeight: "900", marginTop: 8, marginBottom: 3 },
  recommendation: { fontWeight: "900", fontSize: 12 },
  planGrid: { gap: 12 },
  plan: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 13, gap: 9, minWidth: 0 },
  planHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  barGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  barCard: { flexGrow: 1, flexBasis: 260, maxWidth: 440, borderRadius: 14, padding: 14, gap: 7 },
  barTrack: { height: 28, borderRadius: 8, overflow: "hidden", flexDirection: "row" },
  barCut: { borderRightWidth: 2, borderRightColor: "#FFFFFF" },
});
