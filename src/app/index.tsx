import { SYSTEM_CATALOG } from "@/domain/systemCatalog";
import { Badge, Button, Card, Field, Money, SectionHeader } from "@/presentation/components";
import { useApp } from "@/presentation/AppContext";
import { useTheme } from "@/presentation/theme";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export default function HomeScreen() {
  const theme = useTheme();
  const { quotes, loading, refreshQuotes, settings } = useApp();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const wide = width >= 760;
  const cardWidth = width >= 1280 ? "23.5%" : wide ? "31.5%" : width >= 520 ? "48%" : "100%";

  const updateSearch = (value: string) => {
    setSearch(value);
    void refreshQuotes(value);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.banner, { backgroundColor: theme.brandBlue }]}>
        <View style={styles.bannerAccent} />
        <View style={styles.bannerContent}>
          <View style={styles.brandLine}>
            <View style={[styles.bannerLogo, { backgroundColor: theme.brandRed }]}>
              <Text style={styles.bannerLogoText}>MAC</Text>
            </View>
            <Text style={styles.brandName}>Mac Desgloses</Text>
          </View>
          <Text style={styles.bannerTitle}>Medidas claras.{"\n"}Trabajos más rápidos.</Text>
          <Text style={styles.bannerText}>
            Cotiza, organiza medidas y prepara materiales desde cualquier dispositivo.
          </Text>
          <View style={styles.bannerActions}>
            <Button title="+ Nuevo trabajo" onPress={() => router.push("/quotes/new")} />
            <View style={styles.bannerStat}>
              <Text style={styles.bannerStatValue}>{quotes.length}</Text>
              <Text style={styles.bannerStatLabel}>trabajos guardados</Text>
            </View>
          </View>
        </View>
        {wide && (
          <View style={styles.bannerGraphic}>
            <View style={styles.windowFrame}>
              <View style={styles.windowPane} />
              <View style={styles.windowPane} />
            </View>
            <Text style={styles.graphicCaption}>ALUMINIO · VIDRIO · CONTROL</Text>
          </View>
        )}
      </View>

      <View style={styles.searchRow}>
        <Field
          label="Buscar trabajo"
          value={search}
          placeholder="Cliente, proyecto o número de cotización"
          onChangeText={updateSearch}
        />
        {wide && <Button title="Crear cotización" onPress={() => router.push("/quotes/new")} />}
      </View>

      <SectionHeader title="Sistemas disponibles" action={`${SYSTEM_CATALOG.length} opciones`} />
      <View style={styles.systemGrid}>
        {SYSTEM_CATALOG.map((system) => (
          <Pressable
            key={system.id}
            onPress={() =>
              router.push({ pathname: "/quotes/new", params: { systemId: system.id } })
            }
            style={({ pressed }) => [
              styles.systemCard,
              {
                width: cardWidth,
                backgroundColor: theme.surface,
                borderColor: pressed ? theme.primary : theme.border,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <SystemGlyph category={system.category} accent={system.accent} />
            <View style={styles.systemInfo}>
              <Text style={[styles.systemTitle, { color: theme.text }]}>{system.label}</Text>
              <Badge label="Configurable" tone="neutral" />
            </View>
            <View style={[styles.addButton, { backgroundColor: theme.primary }]}>
              <Text style={styles.addButtonText}>+</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Trabajos recientes" action={search ? "Resultados" : "Últimos guardados"} />
      {loading ? (
        <ActivityIndicator color={theme.primary} />
      ) : quotes.length === 0 ? (
        <Card>
          <Badge label="Sin trabajos" tone="neutral" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Tu próximo desglose empieza aquí</Text>
          <Text style={{ color: theme.muted, lineHeight: 21 }}>
            Selecciona un sistema o crea una cotización para guardar clientes, medidas y materiales.
          </Text>
          <Button title="Crear primer trabajo" onPress={() => router.push("/quotes/new")} />
        </Card>
      ) : (
        <FlatList
          data={quotes.slice(0, 8)}
          scrollEnabled={false}
          keyExtractor={(quote) => quote.id}
          contentContainerStyle={styles.recentList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/quotes/[id]", params: { id: item.id } })}
            >
              <Card style={styles.jobCard}>
                <View style={[styles.jobStripe, { backgroundColor: theme.brandRed }]} />
                <View style={styles.jobMain}>
                  <View style={styles.jobTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.quoteNumber, { color: theme.primary }]}>{item.number}</Text>
                      <Text style={[styles.client, { color: theme.text }]}>{item.client.name}</Text>
                      <Text style={{ color: theme.muted }}>
                        {item.projectName} · {item.items.length} medida(s) · {item.date}
                      </Text>
                    </View>
                    <Money value={item.totals.total} currency={settings.prices.currency} />
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </ScrollView>
  );
}

function SystemGlyph({
  category,
  accent,
}: {
  category: "Ventana" | "Puerta";
  accent: "blue" | "red";
}) {
  const theme = useTheme();
  const color = accent === "red" ? theme.brandRed : theme.primary;
  return (
    <View style={[styles.systemIcon, { backgroundColor: `${color}12`, borderColor: color }]}>
      <View style={[category === "Puerta" ? styles.doorShape : styles.windowShape, { borderColor: color }]}>
        <View style={[styles.glyphDivider, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1440, alignSelf: "center", padding: 20, gap: 20, paddingBottom: 54 },
  banner: { minHeight: 285, borderRadius: 28, overflow: "hidden", flexDirection: "row", position: "relative" },
  bannerAccent: { position: "absolute", width: 120, top: 0, bottom: 0, right: 0, backgroundColor: "#D62828", transform: [{ skewX: "-13deg" }, { translateX: 42 }] },
  bannerContent: { flex: 1, padding: 28, gap: 14, zIndex: 2, justifyContent: "center" },
  brandLine: { flexDirection: "row", alignItems: "center", gap: 12 },
  bannerLogo: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bannerLogoText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  brandName: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  bannerTitle: { color: "#FFFFFF", fontSize: 34, lineHeight: 39, fontWeight: "900", letterSpacing: -0.7 },
  bannerText: { color: "#DCE7F8", fontSize: 15, lineHeight: 22, maxWidth: 570 },
  bannerActions: { flexDirection: "row", alignItems: "center", gap: 20, flexWrap: "wrap" },
  bannerStat: { borderLeftWidth: 1, borderLeftColor: "#FFFFFF42", paddingLeft: 18 },
  bannerStatValue: { color: "#FFFFFF", fontSize: 23, fontWeight: "900" },
  bannerStatLabel: { color: "#DCE7F8", fontSize: 11 },
  bannerGraphic: { width: "34%", minWidth: 280, alignItems: "center", justifyContent: "center", zIndex: 2, gap: 12 },
  windowFrame: { width: 220, height: 150, borderWidth: 8, borderColor: "#FFFFFF", padding: 6, flexDirection: "row", gap: 6, transform: [{ perspective: 700 }, { rotateY: "-8deg" }] },
  windowPane: { flex: 1, borderWidth: 3, borderColor: "#FFFFFF", backgroundColor: "#FFFFFF18" },
  graphicCaption: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  searchRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  systemGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  systemCard: { minHeight: 126, borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 13 },
  systemIcon: { width: 54, height: 54, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  systemInfo: { flex: 1, alignItems: "flex-start", gap: 8 },
  systemTitle: { fontSize: 15, fontWeight: "900", lineHeight: 19 },
  addButton: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  addButtonText: { color: "#FFFFFF", fontSize: 27, lineHeight: 30, fontWeight: "700" },
  windowShape: { width: 30, height: 25, borderWidth: 2, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  doorShape: { width: 22, height: 32, borderWidth: 2, alignItems: "flex-end", justifyContent: "center" },
  glyphDivider: { width: 2, height: "100%" },
  recentList: { gap: 10 },
  jobCard: { padding: 0, flexDirection: "row", overflow: "hidden" },
  jobStripe: { width: 5 },
  jobMain: { flex: 1, padding: 17 },
  jobTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  quoteNumber: { fontSize: 11, fontWeight: "900", letterSpacing: 0.7 },
  client: { fontSize: 17, fontWeight: "900", marginVertical: 3 },
  emptyTitle: { fontSize: 19, fontWeight: "900" },
});
