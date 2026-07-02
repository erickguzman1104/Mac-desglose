import { StorageProvider } from "@/infrastructure/storage/StorageProvider";
import { AppProvider } from "@/presentation/AppContext";
import { NavigationShell } from "@/presentation/NavigationShell";
import { useTheme } from "@/presentation/theme";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Text, TextInput } from "react-native";

const globalText = Text as typeof Text & { defaultProps?: { style?: unknown } };
const globalInput = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };
globalText.defaultProps = {
  ...globalText.defaultProps,
  style: [{ fontFamily: "Inter_400Regular" }, globalText.defaultProps?.style],
};
globalInput.defaultProps = {
  ...globalInput.defaultProps,
  style: [{ fontFamily: "Inter_400Regular" }, globalInput.defaultProps?.style],
};

function Navigation() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: { fontFamily: "Inter_700Bold", fontWeight: "700" },
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTitleAlign: "left",
        }}
      >
        <Stack.Screen name="index" options={{ title: "Mac desgloses" }} />
        <Stack.Screen name="breakdowns/index" options={{ title: "Desgloses" }} />
        <Stack.Screen name="breakdowns/new" options={{ title: "Nuevo desglose" }} />
        <Stack.Screen name="breakdowns/[id]" options={{ title: "Desglose técnico" }} />
        <Stack.Screen name="quotes/index" options={{ title: "Cotizaciones" }} />
        <Stack.Screen name="quotes/new" options={{ title: "Nueva cotización" }} />
        <Stack.Screen name="quotes/[id]" options={{ title: "Cotización" }} />
        <Stack.Screen name="settings" options={{ title: "Configuración" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!fontsLoaded) return null;

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
