import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileText, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAccess } from "@/lib/roles";
import { TODAY, ru } from "./equipment";

export const Route = createFileRoute("/quality")({
  head: () => ({
    meta: [
      { title: "Качество и аудит ISO/IEC 17025 — NDT Control" },
      { name: "description", content: "Внутренние аудиты, несоответствия и корректирующие действия, документы СМК и готовность лаборатории НК к аккредитации." },
      { property: "og:title", content: "Качество и аудит ISO/IEC 17025 — NDT Control" },
      { property: "og:description", content: "Аудиты, CAPA, документы СМК и чек-лист соответствия ISO/IEC 17025." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QualityPage,
});

type AuditStatus = "Запланирован" | "Проводится" | "Завершён";
type Audit = { id: string; title: string; kind: "Внутренний" | "Внешний (Росаккредитация)" | "Надзорный"; scope: string; clauses: string; date: string; lead: string; status: AuditStatus; findings: number };
type NcStatus = "Открыто" | "Анализ причин" | "Выполнение CAPA" | "Проверка результативности" | "Закрыто";
type Nc = { id: string; num: string; title: string; clause: string; severity: "Значительное" | "Малозначительное" | "Замечание"; source: string; owner: string; due: string; status: NcStatus; cause: string; action: string; log: { at: string; who: string; what: string }[] };
type Doc = { id: string; code: string; title: string; version: string; approved: string; review: string; owner: string };
type Req = { id: string; clause: string; title: string; ok: boolean };

const NC_FLOW: NcStatus[] = ["Открыто", "Анализ причин", "Выполнение CAPA", "Проверка результативности", "Закрыто"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plus = (n: number) => { const d = new Date(TODAY); d.setDate(d.getDate() + n); return iso(d); };
const daysTo = (s: string) => Math.round((new Date(s).getTime() - TODAY.getTime()) / 864e5);

const SEED = {
  audits: [
    { id: "a1", title: "Внутренний аудит: раздел 6 «Ресурсы»", kind: "Внутренний", scope: "Метрологическое обеспечение, персонал", clauses: "6.2, 6.4, 6.5", date: plus(-62), lead: "Кузнецова И.В.", status: "Завершён", findings: 3 },
    { id: "a2", title: "Внутренний аудит: процессы УЗК и РК", kind: "Внутренний", scope: "Методики, протоколы, прослеживаемость", clauses: "7.2, 7.5, 7.8", date: plus(-4), lead: "Кузнецова И.В.", status: "Проводится", findings: 1 },
    { id: "a3", title: "Анализ со стороны руководства", kind: "Внутренний", scope: "Результаты СМК за 2026 г.", clauses: "8.9", date: plus(12), lead: "Алексей Крылов", status: "Запланирован", findings: 0 },
    { id: "a4", title: "Инспекционный контроль Росаккредитации", kind: "Внешний (Росаккредитация)", scope: "Область аккредитации ЛНК-017", clauses: "4–8", date: plus(41), lead: "Эксперт ФСА", status: "Запланирован", findings: 0 },
    { id: "a5", title: "Внутренний аудит: ВИК, МПК, ПВК", kind: "Внутренний", scope: "Условия окружающей среды, материалы", clauses: "6.3, 6.6, 7.4", date: plus(75), lead: "Кузнецова И.В.", status: "Запланирован", findings: 0 },
  ] as Audit[],
  ncs: [
    { id: "n1", num: "НС-14/26", title: "Использование дефектоскопа USN 60 с истёкшей поверкой", clause: "6.4.6", severity: "Значительное", source: "Внутренний аудит", owner: "Соколов Д.М.", due: plus(5), status: "Выполнение CAPA", cause: "Отсутствие автоматического контроля сроков поверки", action: "Прибор изъят, внедрён контроль сроков в реестре оборудования", log: [{ at: ru(new Date(plus(-60))), who: "Кузнецова И.В.", what: "Зарегистрировано по итогам аудита" }] },
    { id: "n2", num: "НС-15/26", title: "Не указана неопределённость в протоколе РК", clause: "7.8.3", severity: "Малозначительное", source: "Внутренний аудит", owner: "Гончаров В.И.", due: plus(-3), status: "Анализ причин", cause: "", action: "", log: [{ at: ru(new Date(plus(-58))), who: "Кузнецова И.В.", what: "Зарегистрировано" }] },
    { id: "n3", num: "НС-16/26", title: "Просрочена аттестация специалиста ПВК II уровня", clause: "6.2.5", severity: "Значительное", source: "Мониторинг персонала", owner: "Алексей Крылов", due: plus(20), status: "Открыто", cause: "", action: "", log: [{ at: ru(new Date(plus(-10))), who: "Алексей Крылов", what: "Зарегистрировано" }] },
    { id: "n4", num: "НС-12/26", title: "Отсутствует запись температуры в помещении РК", clause: "6.3.3", severity: "Замечание", source: "Жалоба заказчика", owner: "Петрова Е.С.", due: plus(-30), status: "Закрыто", cause: "Неисправный термогигрометр", action: "Замена прибора, журнал условий", log: [{ at: ru(new Date(plus(-90))), who: "Кузнецова И.В.", what: "Зарегистрировано" }, { at: ru(new Date(plus(-30))), who: "Алексей Крылов", what: "Закрыто, результативность подтверждена" }] },
  ] as Nc[],
  docs: [
    { id: "d1", code: "РК-ЛНК-01", title: "Руководство по качеству лаборатории", version: "5.0", approved: plus(-300), review: plus(65), owner: "Алексей Крылов" },
    { id: "d2", code: "СТО-ЛНК-04", title: "Управление оборудованием и метрологическая прослеживаемость", version: "3.2", approved: plus(-380), review: plus(-15), owner: "Петрова Е.С." },
    { id: "d3", code: "МИ-УЗК-02", title: "Методика УЗК сварных соединений по ГОСТ Р 55724-2013", version: "2.1", approved: plus(-200), review: plus(165), owner: "Соколов Д.М." },
    { id: "d4", code: "МИ-РК-01", title: "Методика РК по ГОСТ ISO 17636-1-2017", version: "1.4", approved: plus(-340), review: plus(25), owner: "Гончаров В.И." },
    { id: "d5", code: "СТО-ЛНК-07", title: "Управление несоответствующей работой и CAPA", version: "2.0", approved: plus(-120), review: plus(245), owner: "Кузнецова И.В." },
    { id: "d6", code: "СТО-ЛНК-09", title: "Обеспечение достоверности результатов (МСИ, контроль качества)", version: "1.1", approved: plus(-400), review: plus(-35), owner: "Кузнецова И.В." },
  ] as Doc[],
  reqs: [
    ["4.1", "Беспристрастность"], ["4.2", "Конфиденциальность"], ["5", "Требования к структуре"], ["6.2", "Персонал и аттестация"],
    ["6.3", "Помещения и условия окружающей среды"], ["6.4", "Оборудование"], ["6.5", "Метрологическая прослеживаемость"], ["6.6", "Внешние продукция и услуги"],
    ["7.2", "Выбор и валидация методик"], ["7.4", "Обращение с объектами испытаний"], ["7.5", "Технические записи"], ["7.6", "Неопределённость измерений"],
    ["7.7", "Обеспечение достоверности результатов"], ["7.8", "Отчётность о результатах"], ["7.9", "Жалобы"], ["7.10", "Несоответствующая работа"],
    ["8.3", "Управление документами"], ["8.4", "Управление записями"], ["8.5", "Риски и возможности"], ["8.7", "Корректирующие действия"],
    ["8.8", "Внутренние аудиты"], ["8.9", "Анализ со стороны руководства"],
  ].map(([clause, title], i) => ({ id: `r${i}`, clause: clause!, title: title!, ok: ![3, 11, 13, 16].includes(i) })) as Req[],
};
type State = typeof SEED;
const KEY = "ndt-quality-v1";

const sevTone = { "Значительное": "bg-red/15 text-red", "Малозначительное": "bg-yellow/20 text-yellow", "Замечание": "bg-blue/15 text-blue" } as const;
const auditTone = { "Запланирован": "bg-blue/15 text-blue", "Проводится": "bg-yellow/20 text-yellow", "Завершён": "bg-green/15 text-green" } as const;
const Pill = ({ c, children }: { c: string; children: React.ReactNode }) => <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
const input = "h-8 w-full rounded-sm border bg-background px-2 text-xs";

function QualityPage() {
  const { user, can } = useAccess();
  const manage = user.role === "head" || user.role === "auditor";
  const [s, setS] = useState<State>(SEED);
  const [tab, setTab] = useState<"audits" | "ncs" | "docs" | "reqs">("audits");
  const [toast, setToast] = useState<string | null>(null);
  const [openNc, setOpenNc] = useState<string | null>(null);
  const [newAudit, setNewAudit] = useState(false);
  const [newNc, setNewNc] = useState(false);
  const [ncFilter, setNcFilter] = useState("Все");

  useEffect(() => { try { const r = localStorage.getItem(KEY); if (r) setS(JSON.parse(r)); } catch { /* */ } }, []);
  const save = (fn: (p: State) => State) => setS((p) => { const n = fn(p); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* */ } return n; });
  const notify = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2500); };
  const stamp = () => ru(new Date());

  const readiness = Math.round((s.reqs.filter((r) => r.ok).length / s.reqs.length) * 100);
  const openNcs = s.ncs.filter((n) => n.status !== "Закрыто");
  const overdueNcs = openNcs.filter((n) => daysTo(n.due) < 0);
  const docsDue = s.docs.filter((d) => daysTo(d.review) < 30);
  const nc = s.ncs.find((n) => n.id === openNc);

  const exportCsv = () => {
    const rows = [["№", "Несоответствие", "Пункт", "Категория", "Источник", "Ответственный", "Срок", "Статус", "Причина", "Действие"],
      ...s.ncs.map((n) => [n.num, n.title, n.clause, n.severity, n.source, n.owner, ru(new Date(n.due)), n.status, n.cause, n.action])];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `capa-register-${iso(new Date())}.csv`; a.click();
    notify("Реестр несоответствий выгружен");
  };

  const advance = (id: string) => save((p) => ({ ...p, ncs: p.ncs.map((n) => {
    if (n.id !== id) return n;
    const next = NC_FLOW[Math.min(NC_FLOW.indexOf(n.status) + 1, NC_FLOW.length - 1)]!;
    return { ...n, status: next, log: [...n.log, { at: stamp(), who: user.name, what: `Статус → «${next}»` }] };
  }) }));

  const tabs = [
    { k: "audits", l: "Программа аудитов", n: s.audits.length },
    { k: "ncs", l: "Несоответствия и CAPA", n: openNcs.length },
    { k: "docs", l: "Документы СМК", n: s.docs.length },
    { k: "reqs", l: "Чек-лист ISO/IEC 17025", n: `${readiness}%` },
  ] as const;

  return (
    <AppShell active="Качество и аудит ISO 17025" breadcrumb="Качество и аудит ISO 17025">
      <div className="space-y-3 p-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-lg font-semibold">Качество и аудит ISO/IEC 17025</h1>
            <p className="text-xs text-muted-foreground">Система менеджмента качества ЛНК-017 · вы вошли как {user.name}{manage ? "" : " (только просмотр и выполнение назначенных действий)"}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!can("docs.export")} onClick={exportCsv}><Download className="mr-1 h-3.5 w-3.5" />Экспорт CAPA</Button>
            <Button size="sm" variant="outline" disabled={!manage} onClick={() => setNewNc(true)}><AlertTriangle className="mr-1 h-3.5 w-3.5" />Несоответствие</Button>
            <Button size="sm" disabled={!manage} onClick={() => setNewAudit(true)}><Plus className="mr-1 h-3.5 w-3.5" />Запланировать аудит</Button>
          </div>
        </div>

        {(overdueNcs.length > 0 || docsDue.length > 0) && (
          <div className="flex items-center gap-3 rounded-sm border border-red/40 bg-red/8 px-3 py-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-red" />
            <span><b>{overdueNcs.length}</b> CAPA с нарушенным сроком · <b>{docsDue.length}</b> документов требуют пересмотра (&lt;30 дн.)</span>
            <button className="ml-auto underline" onClick={() => { setTab("ncs"); setNcFilter("Просрочено"); }}>Показать просроченные</button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          {[
            { l: "Готовность к аккредитации", v: `${readiness}%`, i: ShieldCheck, t: readiness >= 90 ? "text-green" : "text-yellow" },
            { l: "Открытые несоответствия", v: openNcs.length, i: AlertTriangle, t: "text-red" },
            { l: "Ближайший аудит", v: (() => { const a = s.audits.filter((x) => x.status === "Запланирован").sort((a, b) => a.date.localeCompare(b.date))[0]; return a ? `через ${daysTo(a.date)} дн.` : "—"; })(), i: ClipboardCheck, t: "text-blue" },
            { l: "Документов на пересмотр", v: docsDue.length, i: FileText, t: "text-yellow" },
          ].map(({ l, v, i: I, t }) => (
            <div key={l} className="rounded-sm border bg-card p-3 shadow-panel">
              <div className="flex items-center justify-between text-xs text-muted-foreground">{l}<I className={`h-4 w-4 ${t}`} /></div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`-mb-px border-b-2 px-3 py-2 text-xs ${tab === t.k ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.l} <span className="ml-1 rounded-sm bg-muted px-1 tabular-nums">{t.n}</span>
            </button>
          ))}
        </div>

        <div className="rounded-sm border bg-card shadow-panel">
          {tab === "audits" && (
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left text-muted-foreground"><tr>{["Аудит", "Вид", "Область", "Пункты", "Дата", "Руководитель", "Выявлено", "Статус", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {[...s.audits].sort((a, b) => a.date.localeCompare(b.date)).map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{a.title}</td><td className="px-3 py-2">{a.kind}</td><td className="px-3 py-2 text-muted-foreground">{a.scope}</td>
                    <td className="px-3 py-2 tabular-nums">{a.clauses}</td><td className="px-3 py-2 tabular-nums">{ru(new Date(a.date))}</td><td className="px-3 py-2">{a.lead}</td>
                    <td className="px-3 py-2 tabular-nums">{a.findings}</td><td className="px-3 py-2"><Pill c={auditTone[a.status]}>{a.status}</Pill></td>
                    <td className="px-3 py-2 text-right">
                      {manage && a.status !== "Завершён" && (
                        <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => { save((p) => ({ ...p, audits: p.audits.map((x) => x.id === a.id ? { ...x, status: x.status === "Запланирован" ? "Проводится" : "Завершён" } : x) })); notify(a.status === "Запланирован" ? "Аудит начат" : "Аудит завершён, отчёт сформирован"); }}>
                          {a.status === "Запланирован" ? "Начать" : "Завершить"}
                        </Button>
                      )}
                      {manage && a.status === "Проводится" && (
                        <Button size="sm" variant="ghost" className="ml-1 h-6 text-[11px]" onClick={() => save((p) => ({ ...p, audits: p.audits.map((x) => x.id === a.id ? { ...x, findings: x.findings + 1 } : x) }))}>+ находка</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "ncs" && (
            <>
              <div className="flex gap-2 border-b p-2">
                {["Все", "Открытые", "Просрочено", "Закрыто"].map((f) => (
                  <button key={f} onClick={() => setNcFilter(f)} className={`rounded-sm px-2 py-1 text-xs ${ncFilter === f ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{f}</button>
                ))}
              </div>
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left text-muted-foreground"><tr>{["№", "Несоответствие", "Пункт", "Категория", "Источник", "Ответственный", "Срок", "Статус"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {s.ncs.filter((n) => ncFilter === "Все" || (ncFilter === "Открытые" && n.status !== "Закрыто") || (ncFilter === "Закрыто" && n.status === "Закрыто") || (ncFilter === "Просрочено" && n.status !== "Закрыто" && daysTo(n.due) < 0)).map((n) => {
                    const late = n.status !== "Закрыто" && daysTo(n.due) < 0;
                    return (
                      <tr key={n.id} onClick={() => setOpenNc(n.id)} className="cursor-pointer border-t hover:bg-muted/40">
                        <td className="px-3 py-2 font-mono">{n.num}</td><td className="px-3 py-2 font-medium">{n.title}</td><td className="px-3 py-2">{n.clause}</td>
                        <td className="px-3 py-2"><Pill c={sevTone[n.severity]}>{n.severity}</Pill></td><td className="px-3 py-2">{n.source}</td><td className="px-3 py-2">{n.owner}</td>
                        <td className={`px-3 py-2 tabular-nums ${late ? "font-medium text-red" : ""}`}>{ru(new Date(n.due))}{late && ` (−${-daysTo(n.due)} дн.)`}</td>
                        <td className="px-3 py-2"><Pill c={n.status === "Закрыто" ? "bg-green/15 text-green" : "bg-yellow/20 text-yellow"}>{n.status}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {tab === "docs" && (
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left text-muted-foreground"><tr>{["Код", "Наименование", "Ред.", "Утверждён", "Пересмотр", "Владелец", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {s.docs.map((d) => {
                  const left = daysTo(d.review);
                  return (
                    <tr key={d.id} className="border-t">
                      <td className="px-3 py-2 font-mono">{d.code}</td><td className="px-3 py-2 font-medium">{d.title}</td><td className="px-3 py-2 tabular-nums">{d.version}</td>
                      <td className="px-3 py-2 tabular-nums">{ru(new Date(d.approved))}</td>
                      <td className="px-3 py-2"><Pill c={left < 0 ? "bg-red/15 text-red" : left < 30 ? "bg-yellow/20 text-yellow" : "bg-green/15 text-green"}>{ru(new Date(d.review))} · {left < 0 ? `просрочен ${-left} дн.` : `${left} дн.`}</Pill></td>
                      <td className="px-3 py-2">{d.owner}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="outline" className="h-6 text-[11px]" disabled={user.role !== "head"} onClick={() => { save((p) => ({ ...p, docs: p.docs.map((x) => x.id === d.id ? { ...x, version: `${Math.floor(parseFloat(x.version)) + 1}.0`, approved: iso(TODAY), review: plus(365) } : x) })); notify(`${d.code}: утверждена новая редакция`); }}>Пересмотреть</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === "reqs" && (
            <div className="p-3">
              <div className="mb-3 h-2 rounded-sm bg-muted"><div className={`h-2 rounded-sm ${readiness >= 90 ? "bg-green" : "bg-yellow"}`} style={{ width: `${readiness}%` }} /></div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {s.reqs.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted/40">
                    <Checkbox checked={r.ok} disabled={!manage} onCheckedChange={(v) => save((p) => ({ ...p, reqs: p.reqs.map((x) => x.id === r.id ? { ...x, ok: !!v } : x) }))} />
                    <span className="w-10 font-mono text-muted-foreground">п. {r.clause}</span>
                    <span className="flex-1">{r.title}</span>
                    {r.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green" /> : <span className="text-[11px] text-red">требует действий</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!nc} onOpenChange={(o) => !o && setOpenNc(null)}>
        <DialogContent className="max-w-2xl">
          {nc && (() => {
            const mine = user.name.startsWith(nc.owner.split(" ")[0]!) || nc.owner === user.name;
            const mayWork = manage || mine;
            const upd = (patch: Partial<Nc>) => save((p) => ({ ...p, ncs: p.ncs.map((x) => x.id === nc.id ? { ...x, ...patch } : x) }));
            const next = NC_FLOW[NC_FLOW.indexOf(nc.status) + 1];
            const needManage = next === "Закрыто";
            return (
              <>
                <DialogHeader><DialogTitle className="text-sm">{nc.num} · {nc.title}</DialogTitle></DialogHeader>
                <div className="flex gap-1">
                  {NC_FLOW.map((st, i) => <div key={st} className={`flex-1 rounded-sm px-1 py-1 text-center text-[10px] ${i <= NC_FLOW.indexOf(nc.status) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{st}</div>)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-muted-foreground">Пункт стандарта</div>п. {nc.clause}</div>
                  <div><div className="text-muted-foreground">Ответственный</div>{nc.owner}</div>
                  <div><div className="text-muted-foreground">Срок</div>{ru(new Date(nc.due))}</div>
                </div>
                <label className="text-xs">Анализ коренной причины
                  <textarea className="mt-1 w-full rounded-sm border bg-background p-2 text-xs" rows={2} disabled={!mayWork || nc.status === "Закрыто"} value={nc.cause} onChange={(e) => upd({ cause: e.target.value })} />
                </label>
                <label className="text-xs">Корректирующее действие
                  <textarea className="mt-1 w-full rounded-sm border bg-background p-2 text-xs" rows={2} disabled={!mayWork || nc.status === "Закрыто"} value={nc.action} onChange={(e) => upd({ action: e.target.value })} />
                </label>
                <div className="max-h-28 overflow-auto rounded-sm border p-2 text-[11px]">
                  {nc.log.map((l, i) => <div key={i}><span className="tabular-nums text-muted-foreground">{l.at}</span> · {l.who}: {l.what}</div>)}
                </div>
                <div className="flex justify-between">
                  <Button size="sm" variant="ghost" disabled={user.role !== "head"} onClick={() => { save((p) => ({ ...p, ncs: p.ncs.filter((x) => x.id !== nc.id) })); setOpenNc(null); notify("Запись удалена"); }}><Trash2 className="mr-1 h-3.5 w-3.5" />Удалить</Button>
                  {next && (
                    <Button size="sm" disabled={needManage ? !manage : !mayWork} onClick={() => {
                      if (next === "Выполнение CAPA" && !nc.cause.trim()) return notify("Заполните анализ причин");
                      if (next === "Проверка результативности" && !nc.action.trim()) return notify("Опишите корректирующее действие");
                      advance(nc.id); notify(`Статус: ${next}`);
                    }}>→ {next}</Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <FormDialog open={newAudit} onClose={() => setNewAudit(false)} title="Запланировать аудит"
        fields={[["title", "Наименование", "Внутренний аудит: "], ["scope", "Область", ""], ["clauses", "Пункты ISO/IEC 17025", "7.2, 7.8"], ["date", "Дата", plus(30), "date"], ["lead", "Руководитель аудита", "Кузнецова И.В."]]}
        onSubmit={(v) => { save((p) => ({ ...p, audits: [...p.audits, { id: `a${Date.now()}`, title: v.title!, scope: v.scope!, clauses: v.clauses!, date: v.date!, lead: v.lead!, kind: "Внутренний", status: "Запланирован", findings: 0 }] })); notify("Аудит добавлен в программу"); }} />

      <FormDialog open={newNc} onClose={() => setNewNc(false)} title="Регистрация несоответствия"
        fields={[["title", "Описание", ""], ["clause", "Пункт стандарта", "7.8"], ["severity", "Категория", "Малозначительное", ["Значительное", "Малозначительное", "Замечание"]], ["source", "Источник", "Внутренний аудит"], ["owner", "Ответственный", "Соколов Д.М."], ["due", "Срок устранения", plus(30), "date"]]}
        onSubmit={(v) => { save((p) => ({ ...p, ncs: [{ id: `n${Date.now()}`, num: `НС-${17 + p.ncs.length - 4}/26`, title: v.title!, clause: v.clause!, severity: v.severity as Nc["severity"], source: v.source!, owner: v.owner!, due: v.due!, status: "Открыто", cause: "", action: "", log: [{ at: stamp(), who: user.name, what: "Зарегистрировано" }] }, ...p.ncs] })); setTab("ncs"); notify("Несоответствие зарегистрировано"); }} />

      {toast && <div className="fixed bottom-10 right-6 z-50 rounded-sm border bg-popover px-4 py-2 text-xs text-popover-foreground shadow-panel">{toast}</div>}
    </AppShell>
  );
}

type Field = [string, string, string, ("date" | string[])?];
function FormDialog({ open, onClose, title, fields, onSubmit }: { open: boolean; onClose: () => void; title: string; fields: Field[]; onSubmit: (v: Record<string, string>) => void }) {
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => { if (open) setV(Object.fromEntries(fields.map((f) => [f[0], f[2]]))); }, [open]); // eslint-disable-line
  const valid = useMemo(() => fields.every((f) => (v[f[0]] ?? "").trim()), [v, fields]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-sm">{title}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {fields.map(([k, label, , type]) => (
            <label key={k} className="block text-xs">{label}
              {Array.isArray(type)
                ? <select className={input} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })}>{type.map((o) => <option key={o}>{o}</option>)}</select>
                : <input type={type ?? "text"} className={input} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>Отмена</Button>
          <Button size="sm" disabled={!valid} onClick={() => { onSubmit(v); onClose(); }}>Сохранить</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
