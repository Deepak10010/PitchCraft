import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LabelMode } from "../lib/intervals";

type LabelModeContextValue = {
  mode: LabelMode;
  toggle: () => void;
  setMode: (m: LabelMode) => void;
};

const LabelModeContext = createContext<LabelModeContextValue>({
  mode: "western",
  toggle: () => {},
  setMode: () => {},
});

const STORAGE_KEY = "pitchcraft.labelMode.v1";

export function LabelModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<LabelMode>("western");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "western" || saved === "sargam") setModeState(saved);
    });
  }, []);

  const setMode = useCallback((m: LabelMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setModeState((cur) => {
      const next: LabelMode = cur === "western" ? "sargam" : "western";
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<LabelModeContextValue>(
    () => ({ mode, toggle, setMode }),
    [mode, toggle, setMode]
  );

  return <LabelModeContext.Provider value={value}>{children}</LabelModeContext.Provider>;
}

export const useLabelMode = () => useContext(LabelModeContext);
