import { GlassSheetPlan } from "@/domain/models";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "./theme";

const MAX_WIDTH = 310;
const MAX_HEIGHT = 220;

export function GlassSheetSketch({ sheet }: { sheet: GlassSheetPlan }) {
  const theme = useTheme();
  const scale = Math.min(MAX_WIDTH / sheet.widthMm, MAX_HEIGHT / sheet.heightMm);
  const width = sheet.widthMm * scale;
  const height = sheet.heightMm * scale;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.sheet,
          { width, height, borderColor: theme.primary, backgroundColor: theme.primarySoft },
        ]}
      >
        {sheet.cuts.map((cut) => (
          <View
            key={cut.id}
            style={[
              styles.cut,
              {
                left: cut.xMm * scale,
                top: cut.yMm * scale,
                width: cut.widthMm * scale,
                height: cut.heightMm * scale,
                borderColor: theme.accent,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              style={[styles.cutText, { color: theme.text }]}
            >
              {(cut.originalWidthMm / 25.4).toFixed(1)}″×
              {(cut.originalHeightMm / 25.4).toFixed(1)}″
              {cut.rotated ? " ↻" : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", paddingVertical: 5 },
  sheet: { position: "relative", borderWidth: 2, overflow: "hidden" },
  cut: {
    position: "absolute",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  cutText: { fontSize: 9, fontWeight: "800", textAlign: "center" },
});
