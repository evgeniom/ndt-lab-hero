import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, Lock, RotateCcw, Save, Settings2, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CreateDialog, ResetDialog } from "@/components/account-dialogs";
import { Button } from "@/components/ui/button";
import { ROLE_TITLE, formatSeen, useAccess, type Person } from "@/lib/roles";
import { DEFAULT_SETTINGS, fetchSettings, readSettings, saveSettings, type AppSettings } from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки — NDT Control" },
      { name: "description", content: "Настройки лаборатории НК: учётные записи персонала, логины и пароли, параметры приложения." },
      { property: "og:title", content: "Настройки — NDT Control" },
      { property: "og:description", content: "Управление учётными записями и параметрами приложения лаборатории НК." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const input = "h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring";

function SettingsPage() {
  const { people, user, can, reload } = useAccess();
  const [tab, setTab] = useState<"accounts" | "app">("accounts");
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<Person | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  if (!can("roles.manage")) {
    return (
      <AppShell active="Настройки" breadcrumb="Настройки">
        <div className="mx-auto mt-20 max-w-md rounded-sm border bg-card p-6 text-center shadow-panel">
          <Lock className="mx-auto mb-2 size-6 text-muted-foreground" />
          <div className="text-sm font-semibold">Нет доступа</div>
          <div className="mt-1 text-xs text-muted-foreground">Раздел «Настройки» доступен только руководителю лаборатории.</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Настройки" breadcrumb="Настройки" searchPlaceholder="Поиск по сотруднику, логину…">
      <div className="mb-4">
        <h1 className="text-lg font-bold">Настройки</h1>
        <p className="text-xs text-muted-foreground">Доступно только руководителю лаборатории · учётные записи персонала и параметры приложения</p>
      </div>
      <div className="mb-4 flex gap-1 border-b">
        {([["accounts", Users, "Учётные записи"], ["app", Settings2, "Параметры приложения"]] as const).map(([k, Icon, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}><Icon className="size-3.5" />{l}</button>
        ))}
      </div>

      {tab === "accounts" ? (
        <div className="overflow-hidden rounded-sm border bg-card shadow-panel">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Логины и пароли персонала · {people.length}</span>
            <Button size="sm" onClick={() => setCreating(true)}><UserPlus className="mr-1 size-3.5" />Новая учётная запись</Button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
              <tr>{["Сотрудник", "Логин", "Должность", "Роль", "Последний вход", ""].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{p.name}{p.id === user.id && <span className="ml-1 text-[10px] text-muted-foreground">(вы)</span>}</td>
                  <td className="px-3 py-2 font-mono">{p.login}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.position}</td>
                  <td className="px-3 py-2">{ROLE_TITLE[p.role]}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatSeen(p.lastSignIn)}</td>
                  <td className="px-3 py-2 text-right"><Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setResetFor(p)}><KeyRound className="mr-1 size-3" />Задать пароль</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">Пароли хранятся на сервере в зашифрованном виде и не отображаются. Сообщите новый пароль сотруднику лично.</div>
        </div>
      ) : <AppSettingsForm onSaved={flash} />}

      <CreateDialog open={creating} onClose={() => setCreating(false)} onDone={async (name) => { setCreating(false); await reload(); flash(`Учётная запись «${name}» создана`); }} />
      <ResetDialog person={resetFor} onClose={() => setResetFor(null)} onDone={(name) => { setResetFor(null); flash(`Пароль для «${name}» изменён`); }} />
      {toast && <div className="fixed bottom-10 right-6 z-50 rounded-sm border bg-popover px-4 py-2 text-xs text-popover-foreground shadow-panel">{toast}</div>}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-sm border bg-card shadow-panel">
      <div className="border-b px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">{title}</div>
      <div className="space-y-3 p-3">{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_200px] items-center gap-3 text-xs">
      <div><div className="font-medium">{label}</div>{hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}</div>
      <div>{children}</div>
    </div>
  );
}

function AppSettingsForm({ onSaved }: { onSaved: (m: string) => void }) {
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  useEffect(() => { setS(readSettings()); void fetchSettings(true).then(setS); }, []);
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setS((p) => ({ ...p, [k]: v }));
  const num = (k: keyof AppSettings, min: number, max: number) => (
    <input type="number" min={min} max={max} className={input} value={s[k] as number} onChange={(e) => set(k, Math.min(max, Math.max(min, Number(e.target.value) || min)) as never)} />
  );
  const tog = (k: keyof AppSettings) => (
    <button type="button" role="switch" aria-checked={!!s[k]} onClick={() => set(k, !s[k] as never)} className={`relative h-5 w-9 rounded-full transition-colors ${s[k] ? "bg-primary" : "bg-muted-foreground/30"}`}>
      <span className={`absolute top-0.5 size-4 rounded-full bg-background transition-all ${s[k] ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <Section title="Лаборатория">
          <Row label="Название"><input className={input} value={s.labName} onChange={(e) => set("labName", e.target.value)} /></Row>
          <Row label="Шифр лаборатории"><input className={input} value={s.labCode} onChange={(e) => set("labCode", e.target.value)} /></Row>
          <Row label="Номер аттестата аккредитации"><input className={input} value={s.accreditation} onChange={(e) => set("accreditation", e.target.value)} /></Row>
        </Section>
        <Section title="Метрология и аттестация">
          <Row label="Предупреждать об окончании поверки за, дн.">{num("verifyWarnDays", 1, 180)}</Row>
          <Row label="Предупреждать об окончании аттестации за, дн.">{num("certWarnDays", 1, 365)}</Row>
          <Row label="Запрет испытаний просроченным оборудованием" hint="ISO/IEC 17025 п. 6.4.6">{tog("blockOverdue")}</Row>
        </Section>
        <Section title="Протоколы">
          <Row label="Префикс номера протокола" hint="Пример: П-УЗК-0001/26"><input className={input} value={s.protocolPrefix} onChange={(e) => set("protocolPrefix", e.target.value)} /></Row>
          <Row label="Утверждение вторым лицом" hint="Автор не может утвердить свой протокол">{tog("requireSecondSign")}</Row>
          <Row label="Блокировать утверждённые протоколы">{tog("lockApproved")}</Row>
        </Section>
        <Section title="Безопасность">
          <Row label="Автовыход при бездействии, мин">{num("sessionTimeoutMin", 5, 480)}</Row>
          <Row label="Минимальная длина пароля">{num("minPasswordLen", 8, 32)}</Row>
          <Row label="ИИ-анализ несоответствий">{tog("aiEnabled")}</Row>
        </Section>
        <Section title="Интерфейс и экспорт">
          <Row label="Тема по умолчанию">
            <select className={input} value={s.defaultTheme} onChange={(e) => set("defaultTheme", e.target.value as AppSettings["defaultTheme"])}><option value="light">Светлая</option><option value="dark">Тёмная</option></select>
          </Row>
          <Row label="Формат даты">
            <select className={input} value={s.dateFormat} onChange={(e) => set("dateFormat", e.target.value as AppSettings["dateFormat"])}><option value="dd.mm.yyyy">дд.мм.гггг</option><option value="yyyy-mm-dd">гггг-мм-дд</option></select>
          </Row>
          <Row label="Разделитель в CSV/Excel">
            <select className={input} value={s.exportSeparator} onChange={(e) => set("exportSeparator", e.target.value as AppSettings["exportSeparator"])}><option value=";">Точка с запятой (;)</option><option value=",">Запятая (,)</option></select>
          </Row>
        </Section>
        <Section title="Уведомления">
          <Row label="Дублировать уведомления на почту">{tog("notifyEmail")}</Row>
        </Section>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setS(DEFAULT_SETTINGS)}><RotateCcw className="mr-1 size-3.5" />По умолчанию</Button>
        <Button size="sm" onClick={async () => { const err = await saveSettings(s); onSaved(err ?? "Настройки сохранены на сервере"); }}><Save className="mr-1 size-3.5" />Сохранить</Button>
      </div>
    </div>
  );
}
