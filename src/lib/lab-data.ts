import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAccess } from "@/lib/roles";

export type LabDataKind = "equipment" | "tests" | "quality" | "tasks";

/** Per-lab dataset stored in the database. The demo lab falls back to sample data; real labs start empty. */
export function pickInitial<T>(stored: T | undefined, isDemo: boolean, seed: T, empty: T): T {
  if (stored !== undefined) return stored;
  return isDemo ? seed : empty;
}

export function useLabData<T>(kind: LabDataKind, seed: T, empty: T): [T, (fn: T | ((p: T) => T)) => void, boolean] {
  const { labId, isDemo, user } = useAccess();
  const [value, setValue] = useState<T>(isDemo ? seed : empty);
  const [ready, setReady] = useState(false);
  const canWrite = user.login !== "demo" && (user.role !== "auditor" || kind === "quality");
  const latest = useRef(value);

  useEffect(() => {
    let alive = true;
    setReady(false);
    if (!labId) { setValue(empty); setReady(true); return; }
    void supabase.from("lab_data").select("items").eq("lab_id", labId).eq("kind", kind).maybeSingle().then(({ data }) => {
      if (!alive) return;
      const v = pickInitial(data ? (data.items as T) : undefined, isDemo, seed, empty);
      latest.current = v;
      setValue(v);
      setReady(true);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId, kind, isDemo]);

  const update = useCallback((fn: T | ((p: T) => T)) => {
    const next = typeof fn === "function" ? (fn as (p: T) => T)(latest.current) : fn;
    latest.current = next;
    setValue(next);
    if (labId && canWrite) {
      void supabase.from("lab_data").upsert({ lab_id: labId, kind, items: next as unknown as Json, updated_at: new Date().toISOString(), updated_by: user.id });
    }
  }, [labId, kind, canWrite, user.id]);

  return [value, update, ready];
}
