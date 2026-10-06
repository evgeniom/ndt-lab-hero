import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FlaskConical, Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LOGIN_DOMAIN } from "@/lib/accounts.functions";

export type Role = "head" | "specialist" | "auditor";

export type Perm =
  | "tests.create"
  | "tests.edit"
  | "tests.delete"
  | "tests.submit"
  | "tests.approve"
  | "equipment.manage"
  | "equipment.calibrate"
  | "docs.view"
  | "docs.export"
  | "roles.manage";

export const ROLE_TITLE: Record<Role, string> = {
  head: "Руководитель ЛНК",
  specialist: "Специалист НК",
  auditor: "Аудитор СМК",
};

export const ROLE_NOTE: Record<Role, string> = {
  head: "Полный доступ: утверждение протоколов, метрологический парк, управление ролями и учётными записями",
  specialist: "Ведение испытаний своего метода, передача протоколов на утверждение",
  auditor: "Только просмотр записей и выгрузка документов (ISO/IEC 17025 п. 8.8)",
};

export const PERM_TITLE: Record<Perm, string> = {
  "tests.create": "Создание испытаний",
  "tests.edit": "Редактирование испытаний и дефектных ведомостей",
  "tests.delete": "Удаление записей журнала",
  "tests.submit": "Передача протокола на утверждение",
  "tests.approve": "Утверждение / отклонение протоколов",
  "equipment.manage": "Ведение реестра оборудования",
  "equipment.calibrate": "Регистрация поверок и калибровок",
  "docs.view": "Просмотр документов и паспортов",
  "docs.export": "Выгрузка протоколов и реестров",
  "roles.manage": "Управление ролями, логинами и паролями",
};

export const PERMS: Perm[] = Object.keys(PERM_TITLE) as Perm[];

export const ROLE_PERMS: Record<Role, Perm[]> = {
  head: [...PERMS],
  specialist: ["tests.create", "tests.edit", "tests.submit", "docs.view", "docs.export", "equipment.calibrate"],
  auditor: ["docs.view", "docs.export"],
};

export type Person = {
  id: string; login: string; name: string; position: string; role: Role; initials: string;
  lastSignIn: string | null; lastSeen: string | null; online: boolean;
};

const ONLINE_MS = 2 * 60 * 1000;
const HEARTBEAT_MS = 45 * 1000;

type Ctx = {
  people: Person[];
  user: Person;
  setRoleOf: (id: string, role: Role) => Promise<string | null>;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
  can: (p: Perm) => boolean;
  denyMessage: (p: Perm) => string;
};

const RolesContext = createContext<Ctx | null>(null);

export function RolesProvider({ children }: { children: ReactNode }) {
  const [sessionUserId, setSessionUserId] = useState<string | null | undefined>(undefined);
  const [people, setPeople] = useState<Person[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleOf = new Map((roles ?? []).map((r) => [r.user_id, r.role as Role]));
    const t = Date.now();
    setNow(t);
    setPeople((profiles ?? []).map((p) => ({
      id: p.id, login: p.login, name: p.name, position: p.position, initials: p.initials,
      role: roleOf.get(p.id) ?? "specialist",
      lastSignIn: p.last_sign_in_at, lastSeen: p.last_seen_at,
      online: !!p.last_seen_at && t - new Date(p.last_seen_at).getTime() < ONLINE_MS,
    })));
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setSessionUserId(session?.user.id ?? null);
      if (event === "SIGNED_OUT") setPeople([]);
    });
    supabase.auth.getSession().then(({ data }) => setSessionUserId(data.session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // presence heartbeat + refresh of colleagues' status
  useEffect(() => {
    if (!sessionUserId) return;
    let alive = true;
    const beat = async () => {
      await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", sessionUserId);
      if (alive) await reload();
    };
    void beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => { alive = false; clearInterval(id); };
  }, [sessionUserId, reload]);

  const signOut = useCallback(async () => {
    if (sessionUserId) await supabase.from("profiles").update({ last_seen_at: null }).eq("id", sessionUserId);
    await supabase.auth.signOut();
  }, [sessionUserId]);

  const user = people.find((p) => p.id === sessionUserId);

  const value = useMemo<Ctx | null>(() => {
    if (!user) return null;
    const allowed = ROLE_PERMS[user.role];
    return {
      people: people.map((p) => (p.id === user.id ? { ...p, online: true } : p)),
      user: { ...user, online: true },
      reload,
      signOut,
      setRoleOf: async (id, role) => {
        const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", id);
        if (error) return "Не удалось изменить роль";
        await reload();
        return null;
      },
      can: (p) => allowed.includes(p),
      denyMessage: (p) => `Недостаточно прав: «${PERM_TITLE[p]}» недоступно для роли «${ROLE_TITLE[user.role]}»`,
    };
  }, [people, user, reload, signOut, now]);

  const loading = sessionUserId === undefined || (!!sessionUserId && !value && people.length === 0);
  return (
    <>
      <Splash visible={loading} />
      {!loading && (!sessionUserId || !value ? <LoginScreen noProfile={!!sessionUserId} /> : <RolesContext.Provider value={value}>{children}</RolesContext.Provider>)}
    </>
  );
}

const SPLASH_MIN_MS = 1700;
const SPLASH_FADE_MS = 600;

function Splash({ visible }: { visible: boolean }) {
  const [mounted, setMounted] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const shownAt = useMemo(() => Date.now(), []);

  useEffect(() => {
    if (visible) return;
    const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - shownAt));
    const t1 = setTimeout(() => setLeaving(true), wait);
    const t2 = setTimeout(() => setMounted(false), wait + SPLASH_FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible, shownAt]);

  if (!mounted) return null;
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[oklch(0.16_0.02_250)]"
      style={{ animation: leaving ? `splash-fade-out ${SPLASH_FADE_MS}ms ease forwards` : "splash-fade-in 300ms ease" }}
    >
      <div className="flex flex-col items-center">
        <div
          className="grid size-16 place-items-center rounded-md bg-primary text-primary-foreground"
          style={{ animation: "splash-logo 700ms cubic-bezier(0.22,1,0.36,1) both, splash-glow 2.2s ease-in-out 700ms infinite" }}
        >
          <FlaskConical className="size-8" />
        </div>
        <div className="mt-5 text-lg font-bold tracking-[0.22em] text-white" style={{ animation: "splash-rise 600ms ease 250ms both" }}>
          NDT CONTROL
        </div>
        <div className="mt-1 text-[11px] tracking-[0.3em] text-white/50" style={{ animation: "splash-rise 600ms ease 400ms both" }}>
          ЛАБОРАТОРИЯ НК · ЛНК-017
        </div>
        <div className="mt-7 h-[3px] w-52 overflow-hidden rounded-full bg-white/10" style={{ animation: "splash-rise 500ms ease 550ms both" }}>
          <div className="h-full w-1/4 rounded-full bg-primary" style={{ animation: "splash-scan 1.1s ease-in-out infinite" }} />
        </div>
        <div className="mt-3 text-[10px] text-white/40" style={{ animation: "splash-rise 500ms ease 700ms both" }}>
          Загрузка данных лаборатории…
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ noProfile }: { noProfile: boolean }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(noProfile ? "Учётная запись не привязана к сотруднику лаборатории" : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: `${login.trim().toLowerCase()}@${LOGIN_DOMAIN}`, password });
    if (err || !data.user) { setError("Неверный логин или пароль"); setBusy(false); return; }
    await supabase.from("profiles").update({ last_sign_in_at: new Date().toISOString(), last_seen_at: new Date().toISOString() }).eq("id", data.user.id);
    setBusy(false);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
      <form onSubmit={submit} className="w-[360px] rounded-sm border bg-card p-6 shadow-panel">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-sm bg-primary text-primary-foreground"><FlaskConical className="size-5" /></div>
          <div><div className="text-sm font-bold tracking-wide">NDT CONTROL</div><div className="text-[10px] text-muted-foreground">ЛАБОРАТОРИЯ НК · ЛНК-017</div></div>
        </div>
        <h1 className="mb-1 text-base font-semibold">Вход в систему</h1>
        <p className="mb-4 text-xs text-muted-foreground">Используйте логин и пароль, выданные руководителем лаборатории.</p>
        <label className="mb-3 block text-xs"><span className="mb-1 block font-medium">Логин</span>
          <input autoFocus autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} className="h-9 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="например, ivanov" /></label>
        <label className="mb-4 block text-xs"><span className="mb-1 block font-medium">Пароль</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
        {error && <div className="mb-3 rounded-sm border border-red/40 bg-red/8 px-3 py-2 text-xs text-red">{error}</div>}
        <button type="submit" disabled={busy || !login || !password} className="flex h-9 w-full items-center justify-center gap-2 rounded-sm bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}Войти
        </button>
        {noProfile && <button type="button" onClick={() => supabase.auth.signOut()} className="mt-2 w-full text-xs text-muted-foreground underline">Выйти</button>}
      </form>
    </div>
  );
}

export function useAccess() {
  const ctx = useContext(RolesContext);
  if (!ctx) throw new Error("useAccess must be used within RolesProvider");
  return ctx;
}

export function formatSeen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
