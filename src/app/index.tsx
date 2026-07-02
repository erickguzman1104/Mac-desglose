import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, Money, SectionHeader } from "@/presentation/components";
import { useTheme } from "@/presentation/theme";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

export default function HomeScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { breakdowns, quotes, settings } = useApp();
  const wide = width >= 760;
  const recent = [
    ...breakdowns.map((item) => ({ kind: "breakdown" as const, item, updatedAt: item.updatedAt })),
    ...quotes.map((item) => ({ kind: "quote" as const, item, updatedAt: item.updatedAt })),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
      <View style={[styles.hero, { backgroundColor: theme.brandBlue }]}>
        <View style={{ flex: 1 }}>
          <Badge label="Mac Desgloses" tone="red" />
          <Text style={styles.heroTitle}>Técnica y venta, claramente separadas.</Text>
          <Text style={styles.heroText}>
            Prepara materiales primero y convierte el trabajo en cotización cuando esté listo.
          </Text>
        </View>
        <View style={styles.stats}>
          <Text style={styles.statValue}>{breakdowns.length}</Text>
          <Text style={styles.statLabel}>desgloses</Text>
          <Text style={styles.statValue}>{quotes.length}</Text>
          <Text style={styles.statLabel}>cotizaciones</Text>
        </View>
      </View>

      <SectionHeader title="Accesos rápidos" />
      <View style={[styles.quickGrid, wide && styles.quickGridWide]}>
        <Card style={{ flex: 1 }}>
          <Badge label="Técnico" tone="red" />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Nuevo desglose</Text>
          <Text style={{ color: theme.muted, lineHeight: 20 }}>
            Sistemas, medidas, materiales, accesorios, cristales y optimizadores.
          </Text>
          <Button title="Crear desglose" onPress={() => router.push("/breakdowns/new")} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Badge label="Comercial" tone="blue" />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Nueva cotización</Text>
          <Text style={{ color: theme.muted, lineHeight: 20 }}>
            Cliente, precio por pie², instalación, transporte, impuestos y descuentos.
          </Text>
          <Button title="Crear cotización" onPress={() => router.push("/quotes/new")} />
        </Card>
      </View>

      <SectionHeader title="Trabajos recientes" action={`${recent.length} visibles`} />
      {recent.length === 0 ? (
        <Card><Text style={{ color: theme.muted }}>Todavía no hay trabajos guardados.</Text></Card>
      ) : recent.map(({ kind, item }) =>
        kind === "breakdown" ? (
          <Card key={`d-${item.id}`}>
            <View style={styles.recentRow}>
              <Badge label="Desglose" tone="red" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{item.name}</Text>
                <Text style={{ color: theme.muted }}>{item.number} · {item.items.length} medida(s)</Text>
              </View>
              <Button title="Abrir" variant="secondary" onPress={() => router.push({ pathname: "/breakdowns/[id]", params: { id: item.id } })} />
            </View>
          </Card>
        ) : (
          <Card key={`q-${item.id}`}>
            <View style={styles.recentRow}>
              <Badge label="Cotización" tone="blue" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{item.client.name}</Text>
                <Text style={{ color: theme.muted }}>{item.number} · {item.projectName}</Text>
              </View>
              <Money value={item.totals.total} currency={item.settingsSnapshot.currency || settings.prices.currency} />
              <Button title="Abrir" variant="secondary" onPress={() => router.push({ pathname: "/quotes/[id]", params: { id: item.id } })} />
            </View>
          </Card>
        ),
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1300, alignSelf: "center", padding: 20, gap: 18, paddingBottom: 60 },
  hero: { borderRadius: 27, padding: 28, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 20 },
  heroTitle: { color: "#FFFFFF", fontSize: 32, lineHeight: 38, fontWeight: "900", marginTop: 10, maxWidth: 650 },
  heroText: { color: "#DCE7F7", marginTop: 8, lineHeight: 21, maxWidth: 650 },
  stats: { minWidth: 150, alignItems: "center" },
  statValue: { color: "#FFFFFF", fontSize: 27, fontWeight: "900" },
  statLabel: { color: "#C7D9F5", fontSize: 11, marginBottom: 8 },
  quickGrid: { gap: 14 },
  quickGridWide: { flexDirection: "row" },
  cardTitle: { fontSize: 20, fontWeight: "900" },
  recentRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  itemTitle: { fontSize: 16, fontWeight: "900" },
});
