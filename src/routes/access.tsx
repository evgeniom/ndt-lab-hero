import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Check, KeyRound, Minus, ShieldCheck, UserCog, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createAccount, resetPassword } from "@/lib/accounts.functions";
import {
  PERMS, PERM_TITLE, ROLE_NOTE, ROLE_PERMS, ROLE_TITLE, formatSeen, useAccess, type Person, type Role,
} from "@/lib/roles";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Специалисты и права доступа — NDT Control" },
      { name: "description", content: "Учётные записи специалистов НК, руководителей лаборатории и аудиторов: статус входа, роли и матрица прав." },
      { property: "og:title", content: "Специалисты и права доступа — NDT Control" },
      { property: "og:description", content: "Учётные записи, статус в сети и матрица прав лаборатории неразрушающего контроля по ISO/IEC 17025." },
    ],
  }),
  component: AccessPage,
});

const ROLES: Role[] = ["head", "specialist", "auditor"];
const input = "h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring";

function AccessPage() {
  const { people, user, setRoleOf, can, reload } = useAccess();
  const [toast, setToast] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<Person | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };
  const editable = can("roles.manage");
  const onlineCount = people.filter((p) => p.online).length;

  return (
    <AppShell active="Специалисты и аттестация" breadcrumb="Специалисты и права доступа" searchPlaceholder="Поиск по специалисту, роли…">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-bold">Специалисты и права доступа</h1>
          <p className="text-xs text-muted-foreground">Учётные записи и ролевая модель лаборатории НК · ISO/IEC 17025 п. 6.2, 8.4 · в сети: {onlineCount} из {people.length}</p>
        </div>
        {editable && <Button size="sm" onClick={() => setCreating(true)}><UserPlus className="mr-1 size-3.5" />Новая учётная запись</Button>}
      </div>

      {!editable && (
        <div className="mb-4 flex items-center gap-2 rounded-sm border border-yellow/40 bg-yellow/15 px-3 py-2 text-xs">
          <ShieldCheck className="size-4 text-yellow" />
          Учётные записи и роли ведёт руководитель ЛНК. В роли «{ROLE_TITLE[user.role]}» страница доступна только для просмотра.
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-3">
        {ROLES.map((r) => (
          <div key={r} className="rounded-sm border bg-card p-3 shadow-panel">
            <div className="flex items-center gap-2 text-xs font-semibold"><UserCog className="size-4 text-primary" />{ROLE_TITLE[r]}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{ROLE_NOTE[r]}</div>
            <div className="mt-2 text-[10px] font-semibold text-muted-foreground">Прав: {ROLE_PERMS[r].length} из {PERMS.length} · сотрудников: {people.filter((p) => p.role === r).length}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 overflow-hidden rounded-sm border bg-card shadow-panel">
        <div className="border-b px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Персонал лаборатории</div>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
            <tr>{["Специалист", "Логин", "Должность / аттестация", "Статус", "Последний вход", "Роль в системе", ""].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="relative grid size-7 place-items-center rounded-full bg-accent text-[10px] font-bold">{p.initials}<span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card ${p.online ? "bg-green" : "bg-muted-foreground/40"}`} /></span>
                    <span className="font-medium">{p.name}{p.id === user.id && <span className="ml-1 text-[10px] text-muted-foreground">(вы)</span>}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{p.login}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.position}</td>
                <td className="px-3 py-2">
                  {p.online
                    ? <span className="rounded-sm bg-green/15 px-1.5 py-0.5 text-[11px] text-green">В сети</span>
                    : <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Не в сети</span>}
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatSeen(p.lastSignIn)}</td>
                <td className="px-3 py-2">
                  <select
                    value={p.role}
                    disabled={!editable || p.id === user.id}
                    onChange={async (e) => { const r = e.target.value as Role; const err = await setRoleOf(p.id, r); flash(err ?? `${p.name}: роль изменена на «${ROLE_TITLE[r]}»`); }}
                    className="h-8 w-[180px] rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_TITLE[r]}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  {editable && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setResetFor(p)}><KeyRound className="mr-1 size-3" />Сменить пароль</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-sm border bg-card shadow-panel">
        <div className="border-b px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Матрица прав доступа</div>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Полномочие</th>
              {ROLES.map((r) => <th key={r} className="px-3 py-2 text-center">{ROLE_TITLE[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMS.map((perm) => (
              <tr key={perm} className="border-t">
                <td className="px-3 py-2">{PERM_TITLE[perm]}</td>
                {ROLES.map((r) => (
                  <td key={r} className="px-3 py-2 text-center">
                    {ROLE_PERMS[r].includes(perm) ? <Check className="mx-auto size-4 text-green" /> : <Minus className="mx-auto size-4 text-muted-foreground" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateDialog open={creating} onClose={() => setCreating(false)} onDone={async (name) => { setCreating(false); await reload(); flash(`Учётная запись «${name}» создана`); }} />
      <ResetDialog person={resetFor} onClose={() => setResetFor(null)} onDone={(name) => { setResetFor(null); flash(`Пароль для «${name}» изменён`); }} />

      {toast && <div className="fixed bottom-10 right-6 z-50 rounded-sm border bg-popover px-4 py-2 text-xs text-popover-foreground shadow-panel">{toast}</div>}
    </AppShell>
  );
}

function errText(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  try { const j = JSON.parse(m) as { message?: string }[]; if (Array.isArray(j) && j[0]?.message) return j[0].message; } catch { /* plain */ }
  return m || "Ошибка";
}

function CreateDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (name: string) => void }) {
  const create = useServerFn(createAccount);
  const [f, setF] = useState({ name: "", position: "", login: "", password: "", role: "specialist" as Role });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await create({ data: f }); onDone(f.name); setF({ name: "", position: "", login: "", password: "", role: "specialist" }); }
    catch (err) { setError(errText(err)); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Новая учётная запись</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-2 text-xs">
          <label className="block"><span className="mb-1 block font-medium">ФИО</span><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Смирнов О.Л." /></label>
          <label className="block"><span className="mb-1 block font-medium">Должность / аттестация</span><input className={input} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} placeholder="Дефектоскопист МПК, II ур." /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="mb-1 block font-medium">Логин</span><input className={input} value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} placeholder="smirnov" /></label>
            <label className="block"><span className="mb-1 block font-medium">Пароль</span><input className={input} type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="не менее 8 символов" /></label>
          </div>
          <label className="block"><span className="mb-1 block font-medium">Роль</span>
            <select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_TITLE[r]}</option>)}</select></label>
          {error && <div className="rounded-sm border border-red/40 bg-red/8 px-2 py-1.5 text-red">{error}</div>}
          <div className="flex justify-end gap-2 pt-1"><Button type="button" size="sm" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit" size="sm" disabled={busy}>Создать</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ person, onClose, onDone }: { person: Person | null; onClose: () => void; onDone: (name: string) => void }) {
  const reset = useServerFn(resetPassword);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!person) return; setBusy(true); setError(null);
    try { await reset({ data: { userId: person.id, password: pw } }); setPw(""); onDone(person.name); }
    catch (err) { setError(errText(err)); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={!!person} onOpenChange={(o) => { if (!o) { setPw(""); setError(null); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Смена пароля · {person?.name}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-2 text-xs">
          <div className="text-muted-foreground">Логин: <span className="font-mono">{person?.login}</span></div>
          <input className={input} type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Новый пароль (не менее 8 символов)" />
          {error && <div className="rounded-sm border border-red/40 bg-red/8 px-2 py-1.5 text-red">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit" size="sm" disabled={busy || pw.length < 8}>Сохранить</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
