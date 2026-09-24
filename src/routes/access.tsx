import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, ShieldCheck, UserCog } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  PERMS, PERM_TITLE, ROLE_NOTE, ROLE_PERMS, ROLE_TITLE, useAccess, type Role,
} from "@/lib/roles";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Специалисты и права доступа — NDT Control" },
      { name: "description", content: "Роли специалистов НК, руководителей лаборатории и аудиторов: матрица прав на редактирование испытаний, утверждение протоколов и просмотр документов." },
      { property: "og:title", content: "Специалисты и права доступа — NDT Control" },
      { property: "og:description", content: "Матрица ролей и прав доступа лаборатории неразрушающего контроля по ISO/IEC 17025." },
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

  return (
    <AppShell active="Специалисты и аттестация" breadcrumb="Специалисты и права доступа" searchPlaceholder="Поиск по специалисту, роли…">
      <div className="mb-4">
        <h1 className="text-lg font-bold">Специалисты и права доступа</h1>
        <p className="text-xs text-muted-foreground">Ролевая модель лаборатории НК · ISO/IEC 17025 п. 6.2, 8.4</p>
      </div>

      {!editable && (
        <div className="mb-4 flex items-center gap-2 rounded-sm border border-yellow/40 bg-yellow/15 px-3 py-2 text-xs">
          <ShieldCheck className="size-4 text-yellow" />
          Роли назначает руководитель ЛНК. В текущей роли «{ROLE_TITLE[user.role]}» матрица доступна только для просмотра.
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-3">
        {ROLES.map((r) => (
          <div key={r} className="rounded-sm border bg-card p-3 shadow-panel">
            <div className="flex items-center gap-2 text-xs font-semibold"><UserCog className="size-4 text-primary" />{ROLE_TITLE[r]}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{ROLE_NOTE[r]}</div>
            <div className="mt-2 text-[10px] font-semibold text-muted-foreground">Прав: {ROLE_PERMS[r].length} из {PERMS.length}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 overflow-hidden rounded-sm border bg-card shadow-panel">
        <div className="border-b px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Персонал лаборатории</div>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">Специалист</th><th className="px-3 py-2 text-left">Должность / аттестация</th><th className="px-3 py-2 text-left">Роль в системе</th><th className="px-3 py-2 text-left">Права</th></tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-accent text-[10px] font-bold">{p.initials}</span>
                    <span className="font-medium">{p.name}{p.id === user.id && <span className="ml-1 text-[10px] text-muted-foreground">(вы)</span>}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.position}</td>
                <td className="px-3 py-2">
                  <select
                    value={p.role}
                    disabled={!editable}
                    onChange={(e) => { setRoleOf(p.id, e.target.value as Role); flash(`${p.name}: роль изменена на «${ROLE_TITLE[e.target.value as Role]}»`); }}
                    className="h-8 w-[190px] rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_TITLE[r]}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-[10px] text-muted-foreground">{ROLE_PERMS[p.role].length} из {PERMS.length}</td>
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
                    {ROLE_PERMS[r].includes(perm)
                      ? <Check className="mx-auto size-4 text-green" />
                      : <Minus className="mx-auto size-4 text-muted-foreground" />}
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
