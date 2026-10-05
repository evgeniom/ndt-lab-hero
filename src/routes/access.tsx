import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, ShieldCheck, UserCog } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  PERMS, PERM_TITLE, ROLE_NOTE, ROLE_PERMS, ROLE_TITLE, formatSeen, useAccess, type Role,
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

function AccessPage() {
  const { people, user, setRoleOf, can } = useAccess();
  const [toast, setToast] = useState<string | null>(null);
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
      </div>

      {!editable && (
        <div className="mb-4 flex items-center gap-2 rounded-sm border border-yellow/40 bg-yellow/15 px-3 py-2 text-xs">
          <ShieldCheck className="size-4 text-yellow" />
          Роли ведёт руководитель ЛНК, логины и пароли — в разделе «Настройки». В роли «{ROLE_TITLE[user.role]}» страница доступна только для просмотра.
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
            <tr>{["Специалист", "Логин", "Должность / аттестация", "Статус", "Последний вход", "Роль в системе"].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
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


      {toast && <div className="fixed bottom-10 right-6 z-50 rounded-sm border bg-popover px-4 py-2 text-xs text-popover-foreground shadow-panel">{toast}</div>}
    </AppShell>
  );
}

