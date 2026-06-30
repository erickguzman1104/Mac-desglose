import { useColorScheme } from "react-native";

const palettes = {
  light: {
    background: "#F4F7FB",
    surface: "#FFFFFF",
    surfaceAlt: "#EAF0F8",
    text: "#15233A",
    muted: "#66758C",
    primary: "#123B7A",
    primarySoft: "#E5EDFA",
    accent: "#D62828",
    border: "#DCE4EF",
    danger: "#C81E2B",
    warning: "#A65D00",
    brandBlue: "#123B7A",
    brandRed: "#D62828",
    white: "#FFFFFF",
  },
  dark: {
    background: "#0B1424",
    surface: "#121F35",
    surfaceAlt: "#1B2D49",
    text: "#F6F8FC",
    muted: "#A8B5C8",
    primary: "#78A7F0",
    primarySoft: "#182F53",
    accent: "#FF5C64",
    border: "#2A3C58",
    danger: "#FF6B72",
    warning: "#FFC56E",
    brandBlue: "#2C62B3",
    brandRed: "#D9363E",
    white: "#FFFFFF",
  },
};

export type Theme = typeof palettes.light;

export function useTheme(): Theme {
  return palettes[useColorScheme() === "dark" ? "dark" : "light"];
}
