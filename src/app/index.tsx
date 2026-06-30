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
  const cardWidth = width >= 1280 ? "23.5%" : wide ? "31.5%" : "48%";

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
          <Badge label="MAC · Taller digital" tone="red" />
          <Text style={styles.bannerTitle}>Desgloses claros.{"\n"}Trabajos más rápidos.</Text>
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
        {SYSTEM_CATALOG.map((system, index) => (
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
            <View
              style={[
                styles.systemIcon,
                { backgroundColor: system.accent === "red" ? `${theme.brandRed}18` : theme.primarySoft },
              ]}
            >
              <Text style={{ color: system.accent === "red" ? theme.brandRed : theme.primary, fontWeight: "900" }}>
                {String(index + 1).padStart(2, "0")}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.systemTitle, { color: theme.text }]}>{system.label}</Text>
              <Text style={[styles.systemMeta, { color: theme.muted }]}>
                {system.category} · Plantilla demo
              </Text>
            </View>
            <Text style={[styles.arrow, { color: theme.primary }]}>›</Text>
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

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1440, alignSelf: "center", padding: 20, gap: 20, paddingBottom: 54 },
  banner: { minHeight: 285, borderRadius: 28, overflow: "hidden", flexDirection: "row", position: "relative" },
  bannerAccent: { position: "absolute", width: 120, top: 0, bottom: 0, right: 0, backgroundColor: "#D62828", transform: [{ skewX: "-13deg" }, { translateX: 42 }] },
  bannerContent: { flex: 1, padding: 28, gap: 14, zIndex: 2, justifyContent: "center" },
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
  systemCard: { minHeight: 102, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  systemIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  systemTitle: { fontSize: 14, fontWeight: "900", lineHeight: 18 },
  systemMeta: { fontSize: 11, marginTop: 4 },
  arrow: { fontSize: 27, fontWeight: "500" },
  recentList: { gap: 10 },
  jobCard: { padding: 0, flexDirection: "row", overflow: "hidden" },
  jobStripe: { width: 5 },
  jobMain: { flex: 1, padding: 17 },
  jobTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  quoteNumber: { fontSize: 11, fontWeight: "900", letterSpacing: 0.7 },
  client: { fontSize: 17, fontWeight: "900", marginVertical: 3 },
  emptyTitle: { fontSize: 19, fontWeight: "900" },
});
