import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

// Server (app_settings row id=1) is the source of truth; localStorage is only a fast-start cache.
const KEY = "ndt-settings-v1";
const EVT = "ndt-settings";
let loaded: Promise<AppSettings> | null = null;

function cache(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVT));
}

export function readSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<AppSettings>) }; }
  catch { return DEFAULT_SETTINGS; }
}

export function fetchSettings(force = false): Promise<AppSettings> {
  if (!loaded || force) {
    loaded = (async () => {
      const { data } = await supabase.from("app_settings").select("data").eq("id", 1).maybeSingle();
      const s = { ...DEFAULT_SETTINGS, ...((data?.data ?? {}) as Partial<AppSettings>) };
      if (data) cache(s);
      return data ? s : readSettings();
    })().catch(() => readSettings());
  }
  return loaded;
}

export async function saveSettings(s: AppSettings): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("app_settings").upsert({ id: 1, data: s, updated_at: new Date().toISOString(), updated_by: u.user?.id ?? null });
  if (error) return "Не удалось сохранить настройки на сервере";
  loaded = Promise.resolve(s);
  cache(s);
  return null;
}

export function useSettings() {
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    const up = () => setS(readSettings());
    up();
    void fetchSettings().then(setS);
    window.addEventListener(EVT, up);
    return () => window.removeEventListener(EVT, up);
  }, []);
  return s;
}
