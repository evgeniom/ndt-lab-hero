import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createAccount, resetPassword } from "@/lib/accounts.functions";
import { ROLE_TITLE, type Person, type Role } from "@/lib/roles";

const ROLES: Role[] = ["head", "specialist", "auditor"];
const input = "h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring";

export function genPassword() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const r = new Uint32Array(10); crypto.getRandomValues(r);
  return Array.from(r, (n) => a[n % a.length]).join("").replace(/^(.{3})(.{4})/, "$1-$2-") + "!";
}

function errText(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  try { const j = JSON.parse(m) as { message?: string }[]; if (Array.isArray(j) && j[0]?.message) return j[0].message; } catch { /* plain */ }
  return m || "Ошибка";
}

export function CreateDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (name: string) => void }) {
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

export function ResetDialog({ person, onClose, onDone }: { person: Person | null; onClose: () => void; onDone: (name: string) => void }) {
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
