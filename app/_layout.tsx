import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemeProvider, useTheme } from "../theme/ThemeContext";

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
            headerRight: () => <ThemeToggleButton />,
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ title: "PitchCraft" }} />
          <Stack.Screen name="decoder" options={{ title: "Decoder" }} />
          <Stack.Screen name="custom" options={{ title: "New Tune" }} />
        </Stack>
      </View>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
