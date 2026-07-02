import {
  combineInches,
  formatInches,
  INCH_FRACTIONS,
  splitInches,
} from "@/domain/calculations/inchFractions";
import { toInches } from "@/domain/calculations/measurement";
import { MeasurementUnit } from "@/domain/models";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "./theme";

interface FractionMeasureFieldProps {
  label: string;
  value: number;
  unit: MeasurementUnit;
  onChange(value: number): void;
}

export function FractionMeasureField({
  label,
  value,
  unit,
  onChange,
}: FractionMeasureFieldProps) {
  const theme = useTheme();
  const [fractionsOpen, setFractionsOpen] = useState(false);
  const { whole, sixteenths } = splitInches(value);
  const selectedFraction =
    INCH_FRACTIONS.find((option) => option.sixteenths === sixteenths) ??
    INCH_FRACTIONS[0];

  if (unit === "cm") {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
        <TextInput
          value={value ? String(value) : ""}
          keyboardType="decimal-pad"
          onChangeText={(text) =>
            onChange(Number(text.replace(",", ".")) || 0)
          }
          placeholder="0"
          placeholderTextColor={theme.muted}
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.background,
            },
          ]}
        />
        <Text style={[styles.helper, { color: theme.muted }]}>
          Equivale a {formatInches(toInches(value, "cm"))}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <View style={styles.measureRow}>
        <TextInput
          value={value ? String(whole) : ""}
          keyboardType="number-pad"
          onChangeText={(text) =>
            onChange(
              combineInches(
                Number(text.replace(/[^\d]/g, "")) || 0,
                sixteenths,
              ),
            )
          }
          placeholder="0"
          placeholderTextColor={theme.muted}
          style={[
            styles.input,
            styles.wholeInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.background,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${selectedFraction.label}`}
          onPress={() => setFractionsOpen((open) => !open)}
          style={({ pressed }) => [
            styles.selector,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: fractionsOpen ? theme.primary : theme.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.text, fontWeight: "800" }}>
            {selectedFraction.label}
          </Text>
          <Text style={{ color: theme.primary }}>▼</Text>
        </Pressable>
      </View>
      {fractionsOpen && (
        <View
          style={[
            styles.fractionMenu,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          {INCH_FRACTIONS.map((fraction) => {
            const selected = fraction.sixteenths === sixteenths;
            return (
              <Pressable
                key={fraction.label}
                onPress={() => {
                  onChange(combineInches(whole, fraction.sixteenths));
                  setFractionsOpen(false);
                }}
                style={[
                  styles.fractionOption,
                  {
                    backgroundColor: selected ? theme.primary : theme.surface,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? theme.white : theme.text,
                    fontWeight: "800",
                  }}
                >
                  {fraction.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <Text style={[styles.helper, { color: theme.primary }]}>
        Resultado: {formatInches(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, minWidth: 240, gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  measureRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    fontSize: 17,
  },
  wholeInput: { flex: 1, minWidth: 80 },
  selector: {
    flex: 1.35,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  fractionMenu: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  fractionOption: {
    minHeight: 38,
    minWidth: 62,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  helper: { fontSize: 12, fontWeight: "600" },
});
