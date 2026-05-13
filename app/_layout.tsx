import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemeProvider, useTheme } from "../theme/ThemeContext";
import { LabelModeProvider, useLabelMode } from "../theme/LabelModeContext";

function ThemeToggleButton() {
  const { scheme, toggle, colors } = useTheme();
  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons
        name={scheme === "dark" ? "sunny" : "moon"}
        size={14}
        color={colors.text}
      />
    </Pressable>
  );
}

function LabelModeToggleButton() {
  const { mode, toggle } = useLabelMode();
  const { colors } = useTheme();
  const isSargam = mode === "sargam";
  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      accessibilityLabel={
        isSargam ? "Switch to Western interval labels" : "Switch to Sargam interval labels"
      }
      style={({ pressed }) => ({
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: isSargam ? colors.goldTint : colors.border,
        borderWidth: 1,
        borderColor: isSargam ? colors.goldTintBorder : "transparent",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        opacity: pressed ? 0.7 : 1,
        minWidth: 38,
        justifyContent: "center",
      })}
    >
      <Text
        style={{
          color: isSargam ? colors.gold : colors.textMuted,
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.3,
        }}
      >
        {isSargam ? "Sa" : "W"}
      </Text>
    </Pressable>
  );
}

function HeaderRight() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <LabelModeToggleButton />
      <ThemeToggleButton />
    </View>
  );
}

function ThemedStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: colors.bg },
            headerRight: () => <HeaderRight />,
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ title: "PitchCraft" }} />
          <Stack.Screen name="decoder" options={{ title: "Decoder" }} />
          <Stack.Screen name="custom" options={{ title: "New Tune" }} />
          <Stack.Screen name="drill" options={{ title: "Drill" }} />
        </Stack>
      </View>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LabelModeProvider>
          <ThemedStack />
        </LabelModeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
