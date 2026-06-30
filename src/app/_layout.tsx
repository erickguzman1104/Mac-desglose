import { StorageProvider } from "@/infrastructure/storage/StorageProvider";
import { AppProvider } from "@/presentation/AppContext";
import { NavigationShell } from "@/presentation/NavigationShell";
import { useTheme } from "@/presentation/theme";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

function Navigation() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTitleAlign: "left",
        }}
      >
        <Stack.Screen name="index" options={{ title: "Mac desgloses" }} />
        <Stack.Screen name="quotes/new" options={{ title: "Nueva cotización" }} />
        <Stack.Screen name="quotes/[id]" options={{ title: "Resumen" }} />
        <Stack.Screen name="settings" options={{ title: "Configuración" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <StorageProvider>
      <AppProvider>
        <NavigationShell>
          <Navigation />
        </NavigationShell>
      </AppProvider>
    </StorageProvider>
  );
}
