import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, SectionHeader } from "@/presentation/components";
import { useTheme } from "@/presentation/theme";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function BreakdownsScreen() {
  const theme = useTheme();
  const { breakdowns } = useApp();
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Badge label="Técnico" tone="red" />
          <Text style={[styles.title, { color: theme.text }]}>Desgloses</Text>
          <Text style={{ color: theme.muted }}>
            Medidas, materiales, accesorios, cristales y optimización.
          </Text>
        </View>
        <Button title="+ Nuevo desglose" onPress={() => router.push("/breakdowns/new")} />
      </View>
      <SectionHeader title="Desgloses guardados" action={`${breakdowns.length} total`} />
      {breakdowns.length === 0 ? (
        <Card>
          <Text style={[styles.itemTitle, { color: theme.text }]}>No hay desgloses guardados</Text>
          <Text style={{ color: theme.muted }}>Crea uno sin necesidad de definir precios.</Text>
        </Card>
      ) : (
        breakdowns.map((breakdown) => (
          <Card key={breakdown.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.number, { color: theme.primary }]}>{breakdown.number}</Text>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{breakdown.name}</Text>
                <Text style={{ color: theme.muted }}>
                  {breakdown.items.length} medida(s) · {breakdown.updatedAt.slice(0, 10)}
                </Text>
              </View>
              <Button
                title="Abrir"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: "/breakdowns/[id]", params: { id: breakdown.id } })
                }
              />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1200, alignSelf: "center", padding: 20, gap: 16, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 14 },
  title: { fontSize: 30, fontWeight: "900", marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  number: { fontSize: 11, fontWeight: "900", letterSpacing: 0.7 },
  itemTitle: { fontSize: 17, fontWeight: "900", marginVertical: 3 },
});
