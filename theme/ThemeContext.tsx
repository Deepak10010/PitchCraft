import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  darkColors,
  getColors,
  type ColorScheme,
  type ThemeColors,
} from "./tokens";

type ThemeContextValue = {
  scheme: ColorScheme;
  colors: ThemeColors;
  toggle: () => void;
  setScheme: (s: ColorScheme) => void;
  isLoaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  scheme: "dark",
  colors: darkColors,
  toggle: () => {},
  setScheme: () => {},
  isLoaded: false,
});

const STORAGE_KEY = "pitchcraft.theme.v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>("dark");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "light" || saved === "dark") setSchemeState(saved);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const setScheme = useCallback((s: ColorScheme) => {
    setSchemeState(s);
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setSchemeState((cur) => {
      const next: ColorScheme = cur === "dark" ? "light" : "dark";
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      colors: getColors(scheme),
      toggle,
      setScheme,
      isLoaded,
    }),
    [scheme, toggle, setScheme, isLoaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
