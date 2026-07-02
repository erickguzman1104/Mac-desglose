import { createQuoteFromBreakdown } from "@/application/quoteFactory";
import { Breakdown, QuoteCommercialTerms } from "@/domain/models";
import { useApp } from "@/presentation/AppContext";
import { Badge, Button, Card, Field, SectionHeader } from "@/presentation/components";
import { useTheme } from "@/presentation/theme";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from "react-native";

export default function NewQuoteScreen() {
  const { breakdownId } = useLocalSearchParams<{ breakdownId?: string }>();
  const { breakdowns, settings, saveQuote } = useApp();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState(breakdownId ?? "");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState<QuoteCommercialTerms>({
    pricePerSquareFoot: 0,
    transport: settings.prices.transport,
    installation: 0,
    taxRate: settings.prices.taxRate,
    applyTax: false,
    applyAdditionalMargin: false,
    discountPercent: 0,
  });
  const [saving, setSaving] = useState(false);
  const wide = width >= 900;
  const selected = breakdowns.find(({ id }) => id === selectedId);

  useEffect(() => {
    if (breakdownId) setSelectedId(breakdownId);
  }, [breakdownId]);

  const setNumber = (key: keyof QuoteCommercialTerms, value: string) =>
    setTerms((current) => ({
      ...current,
      [key]: Number(value.replace(",", ".")) || 0,
    }));

  const save = async () => {
    if (!selected) {
      Alert.alert("Selecciona un desglose", "La cotización debe partir de un desglose guardado.");
      return;
    }
    if (!clientName.trim()) {
      Alert.alert("Cliente requerido", "Escribe el nombre del cliente.");
      return;
    }
    setSaving(true);
    try {
      const quote = createQuoteFromBreakdown(
        selected,
        { name: clientName.trim(), phone, address },
        projectName,
        notes,
        terms,
        settings.prices,
      );
      await saveQuote(quote);
      router.replace({ pathname: "/quotes/[id]", params: { id: quote.id } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
      <View>
        <Badge label="Nueva cotización comercial" tone="blue" />
        <Text style={[styles.title, { color: theme.text }]}>Cliente y precio final</Text>
        <Text style={{ color: theme.muted }}>
          Selecciona un desglose técnico existente y define sus condiciones comerciales.
        </Text>
      </View>

      <SectionHeader title="1. Desglose asociado" />
      {breakdowns.length === 0 ? (
        <Card>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Primero crea un desglose</Text>
          <Text style={{ color: theme.muted }}>Las cotizaciones usan las medidas de un desglose guardado.</Text>
          <Button title="Nuevo desglose" onPress={() => router.push("/breakdowns/new")} />
        </Card>
      ) : (
        <View style={styles.breakdownGrid}>
          {breakdowns.map((breakdown) => (
            <BreakdownOption
              key={breakdown.id}
              breakdown={breakdown}
              selected={breakdown.id === selectedId}
              onPress={() => {
                setSelectedId(breakdown.id);
                if (!projectName) setProjectName(breakdown.name);
              }}
            />
          ))}
        </View>
      )}

      <View style={[styles.columns, wide && styles.columnsWide]}>
        <Card style={{ flex: 1 }}>
          <SectionHeader title="2. Cliente y proyecto" />
          <Field label="Cliente *" value={clientName} onChangeText={setClientName} />
          <Field label="Proyecto" value={projectName} onChangeText={setProjectName} />
          <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Dirección" value={address} onChangeText={setAddress} />
          <Field label="Notas comerciales" value={notes} onChangeText={setNotes} />
        </Card>
        <Card style={{ flex: 1 }}>
          <SectionHeader title="3. Condiciones comerciales" />
          <View style={styles.fields}>
            <Field label={`Precio por pie² (${settings.prices.currency})`} value={String(terms.pricePerSquareFoot)} onChangeText={(value) => setNumber("pricePerSquareFoot", value)} keyboardType="decimal-pad" />
            <Field label="Transporte" value={String(terms.transport)} onChangeText={(value) => setNumber("transport", value)} keyboardType="decimal-pad" />
            <Field label="Instalación" value={String(terms.installation)} onChangeText={(value) => setNumber("installation", value)} keyboardType="decimal-pad" />
            <Field label="ITBIS %" value={String(terms.taxRate)} onChangeText={(value) => setNumber("taxRate", value)} keyboardType="decimal-pad" editable={terms.applyTax} />
            <Field label="Descuento %" value={String(terms.discountPercent)} onChangeText={(value) => setNumber("discountPercent", value)} keyboardType="decimal-pad" />
          </View>
          <View style={[styles.switchRow, { backgroundColor: theme.surfaceAlt }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Aplicar ITBIS</Text>
              <Text style={{ color: theme.muted }}>
                {terms.applyTax
                  ? `Se sumará ${terms.taxRate}% al subtotal`
                  : "No aplicado · total sin ITBIS"}
              </Text>
            </View>
            <Switch
              value={terms.applyTax}
              onValueChange={(applyTax) =>
                setTerms((current) => ({ ...current, applyTax }))
              }
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
          <View style={[styles.switchRow, { backgroundColor: theme.surfaceAlt }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Aplicar margen adicional</Text>
              <Text style={{ color: theme.muted }}>
                {terms.applyAdditionalMargin
                  ? `${settings.prices.profitMargin}% configurado`
                  : "El precio por pie² ya incluye ganancia"}
              </Text>
            </View>
            <Switch
              value={terms.applyAdditionalMargin}
              onValueChange={(applyAdditionalMargin) =>
                setTerms((current) => ({ ...current, applyAdditionalMargin }))
              }
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
        </Card>
      </View>

      <Button title={saving ? "Guardando…" : "Guardar cotización"} disabled={saving || !selected} onPress={() => void save()} />
    </ScrollView>
  );
}

function BreakdownOption({ breakdown, selected, onPress }: { breakdown: Breakdown; selected: boolean; onPress(): void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.breakdownOption,
        {
          backgroundColor: selected ? theme.primarySoft : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <Text style={[styles.number, { color: theme.primary }]}>{breakdown.number}</Text>
      <Text style={[styles.cardTitle, { color: theme.text }]}>{breakdown.name}</Text>
      <Text style={{ color: theme.muted }}>{breakdown.items.length} medida(s)</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1250, alignSelf: "center", padding: 20, gap: 17, paddingBottom: 60 },
  title: { fontSize: 29, fontWeight: "900", marginTop: 8 },
  columns: { gap: 14 },
  columnsWide: { flexDirection: "row", alignItems: "flex-start" },
  breakdownGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  breakdownOption: { flexGrow: 1, flexBasis: 210, maxWidth: 350, borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  number: { fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  cardTitle: { fontSize: 15, fontWeight: "900" },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  switchRow: { flexDirection: "row", alignItems: "center", padding: 13, borderRadius: 13, gap: 12 },
});
