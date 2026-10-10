import { useCallback, useState } from "react";
import { DEFAULT_SETTINGS } from "../lib/constants";

const KEY = "radiologyai.settings";

const load = () => {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

// Letterhead / physician settings, remembered in this browser.
export function useSettings() {
  const [settings, setSettings] = useState(load);

  const save = useCallback((next) => {
    setSettings(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — keep in memory only */
    }
  }, []);

  return [settings, save];
}
