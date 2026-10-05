import { useEffect, useState } from "react";

export type AppSettings = {
  labName: string;
  labCode: string;
  accreditation: string;
  verifyWarnDays: number;
  certWarnDays: number;
  blockOverdue: boolean;
  protocolPrefix: string;
  requireSecondSign: boolean;
  lockApproved: boolean;
  defaultTheme: "light" | "dark";
  dateFormat: "dd.mm.yyyy" | "yyyy-mm-dd";
  exportSeparator: ";" | ",";
  sessionTimeoutMin: number;
  minPasswordLen: number;
  aiEnabled: boolean;
  notifyEmail: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  labName: "Лаборатория НК",
  labCode: "ЛНК-017",
  accreditation: "RA.RU.21АБ17",
  verifyWarnDays: 30,
  certWarnDays: 60,
  blockOverdue: true,
  protocolPrefix: "П",
  requireSecondSign: true,
  lockApproved: true,
  defaultTheme: "light",
  dateFormat: "dd.mm.yyyy",
  exportSeparator: ";",
  sessionTimeoutMin: 60,
  minPasswordLen: 8,
  aiEnabled: true,
  notifyEmail: false,
};

const KEY = "ndt-settings-v1";
const EVT = "ndt-settings";

export function readSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<AppSettings>) }; }
  catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVT));
}

export function useSettings() {
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    const up = () => setS(readSettings());
    up();
    window.addEventListener(EVT, up);
    return () => window.removeEventListener(EVT, up);
  }, []);
  return s;
}
