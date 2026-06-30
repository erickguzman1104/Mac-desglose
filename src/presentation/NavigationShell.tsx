import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, usePathname } from "expo-router";
import { useTheme } from "./theme";

const NAV_ITEMS = [
  { label: "Inicio", symbol: "⌂", path: "/" as const },
  { label: "Nuevo trabajo", symbol: "+", path: "/quotes/new" as const },
  { label: "Configuración", symbol: "⚙", path: "/settings" as const },
];

export function NavigationShell({ children }: PropsWithChildren) {
  const theme = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const desktop = width >= 960;

  const navigation = (
    <View
      style={[
        desktop ? styles.sidebar : styles.bottomBar,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      {desktop && (
        <View style={styles.brand}>
          <View style={[styles.brandMark, { backgroundColor: theme.brandRed }]}>
            <Text style={styles.brandLetters}>MAC</Text>
          </View>
          <View>
            <Text style={[styles.brandName, { color: theme.text }]}>Desgloses</Text>
            <Text style={[styles.brandCaption, { color: theme.muted }]}>Taller inteligente</Text>
          </View>
        </View>
      )}
      <View style={desktop ? styles.desktopLinks : styles.mobileLinks}>
        {NAV_ITEMS.map((item) => {
          const active =
            item.path === "/"
              ? pathname === "/"
              : pathname.startsWith(item.path);
          return (
            <Pressable
              key={item.path}
              accessibilityRole="button"
              onPress={() => router.push(item.path)}
              style={[
                styles.navItem,
                desktop ? styles.desktopNavItem : styles.mobileNavItem,
                active && { backgroundColor: theme.primarySoft },
              ]}
            >
              <Text style={[styles.navSymbol, { color: active ? theme.brandRed : theme.muted }]}>
                {item.symbol}
              </Text>
              <Text style={[styles.navLabel, { color: active ? theme.primary : theme.muted }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {desktop && (
        <View style={[styles.demoNotice, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.demoTitle, { color: theme.primary }]}>Modo demostrativo</Text>
          <Text style={[styles.demoText, { color: theme.muted }]}>
            Valida las fórmulas antes de fabricar.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.shell, { backgroundColor: theme.background }, desktop && styles.desktopShell]}>
      {desktop && navigation}
      <View style={[styles.content, !desktop && styles.mobileContent]}>{children}</View>
      {!desktop && navigation}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  desktopShell: { flexDirection: "row" },
  content: { flex: 1, minWidth: 0 },
  mobileContent: { paddingBottom: 72 },
  sidebar: { width: 238, borderRightWidth: 1, padding: 20, gap: 28 },
  bottomBar: { height: 72, borderTopWidth: 1, flexDirection: "row", position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 20 },
  brand: { flexDirection: "row", gap: 11, alignItems: "center" },
  brandMark: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  brandLetters: { color: "#FFFFFF", fontWeight: "900", fontSize: 13, letterSpacing: 0.7 },
  brandName: { fontSize: 18, fontWeight: "900" },
  brandCaption: { fontSize: 11, marginTop: 2 },
  desktopLinks: { gap: 7 },
  mobileLinks: { flex: 1, flexDirection: "row" },
  navItem: { alignItems: "center" },
  desktopNavItem: { flexDirection: "row", gap: 12, minHeight: 48, paddingHorizontal: 13, borderRadius: 13 },
  mobileNavItem: { flex: 1, justifyContent: "center", gap: 3 },
  navSymbol: { fontSize: 22, fontWeight: "900", minWidth: 23, textAlign: "center" },
  navLabel: { fontSize: 12, fontWeight: "800" },
  demoNotice: { marginTop: "auto", padding: 14, borderRadius: 14, gap: 4 },
  demoTitle: { fontSize: 12, fontWeight: "900" },
  demoText: { fontSize: 11, lineHeight: 16 },
});
