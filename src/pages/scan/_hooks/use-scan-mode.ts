import { useCallback, useState } from "react";

export type ScanMode = "standard" | "hijri";

const STORAGE_KEY = "passport-desk:scan-mode";

function loadScanMode(): ScanMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "hijri" ? "hijri" : "standard";
  } catch {
    return "standard";
  }
}

/** The chosen scan mode, remembered on this device between visits. */
export default function useScanMode(): [ScanMode, (mode: ScanMode) => void] {
  const [mode, setMode] = useState<ScanMode>(loadScanMode);
  const changeMode = useCallback((next: ScanMode) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice just won't stick.
    }
  }, []);
  return [mode, changeMode];
}
