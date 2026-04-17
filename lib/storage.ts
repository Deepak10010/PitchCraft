import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Melody } from "./melodies";

const KEY = "pitchcraft.customMelodies.v1";

export async function loadCustomMelodies(): Promise<Melody[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Melody[];
  } catch {
    return [];
  }
}

export async function saveCustomMelody(melody: Melody): Promise<void> {
  const existing = await loadCustomMelodies();
  const next = [...existing.filter((m) => m.id !== melody.id), melody];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function deleteCustomMelody(id: string): Promise<void> {
  const existing = await loadCustomMelodies();
  const next = existing.filter((m) => m.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export function newMelodyId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
