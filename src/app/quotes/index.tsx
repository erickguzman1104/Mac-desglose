import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, Money, SectionHeader } from "@/presentation/components";
import { useTheme } from "@/presentation/theme";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function QuotesScreen() {
  const theme = useTheme();
  const { quotes, settings } = useApp();
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Badge label="Comercial" tone="blue" />
          <Text style={[styles.title, { color: theme.text }]}>Cotizaciones</Text>
          <Text style={{ color: theme.muted }}>Clientes, precios, impuestos y estado comercial.</Text>
        </View>
        <Button title="+ Nueva cotización" onPress={() => router.push("/quotes/new")} />
      </View>
      <SectionHeader title="Cotizaciones guardadas" action={`${quotes.length} total`} />
      {quotes.length === 0 ? (
        <Card><Text style={{ color: theme.muted }}>No hay cotizaciones guardadas.</Text></Card>
      ) : quotes.map((quote) => (
        <Card key={quote.id}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.number, { color: theme.primary }]}>{quote.number}</Text>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{quote.client.name}</Text>
              <Text style={{ color: theme.muted }}>{quote.projectName} · {quote.status}</Text>
            </View>
            <Money value={quote.totals.total} currency={quote.settingsSnapshot.currency || settings.prices.currency} />
            <Button title="Abrir" variant="secondary" onPress={() => router.push({ pathname: "/quotes/[id]", params: { id: quote.id } })} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1200, alignSelf: "center", padding: 20, gap: 16, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 14 },
  title: { fontSize: 30, fontWeight: "900", marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 14 },
  number: { fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  itemTitle: { fontSize: 17, fontWeight: "900", marginVertical: 3 },
});
