import { PropsWithChildren } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "./theme";

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {!!action && <Text style={[styles.sectionAction, { color: theme.primary }]}>{action}</Text>}
    </View>
  );
}

export function Badge({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "red" | "neutral";
}) {
  const theme = useTheme();
  const background =
    tone === "red" ? `${theme.brandRed}18` : tone === "blue" ? theme.primarySoft : theme.surfaceAlt;
  const color = tone === "red" ? theme.brandRed : tone === "blue" ? theme.primary : theme.muted;
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.muted}
        {...props}
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
          props.style,
        ]}
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
}: {
  title: string;
  onPress(): void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const theme = useTheme();
  const background =
    variant === "primary"
      ? theme.primary
      : variant === "danger"
        ? theme.danger
        : theme.surfaceAlt;
  const color = variant === "secondary" ? theme.text : "#FFFFFF";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function Money({ value, currency }: { value: number; currency: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.money, { color: theme.text }]}>
      {new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value)}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    shadowColor: "#102545",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  field: { gap: 6, flex: 1 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, fontSize: 16 },
  button: { minHeight: 50, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  buttonText: { fontWeight: "800", fontSize: 15 },
  money: { fontSize: 16, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "900" },
  sectionAction: { fontSize: 13, fontWeight: "800" },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
});
