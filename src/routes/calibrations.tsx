import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckCircle2, Download, FileText, History, Paperclip, Plus, Search, X, XCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { data as equipment, ru, shift, TODAY, day, type Item } from "@/routes/equipment";

export const Route = createFileRoute("/calibrations")({
  head: () => ({
    meta: [
      { title: "Журнал поверок и калибровок — NDT Control" },
      { name: "description", content: "Интерактивный журнал поверок и калибровок средств контроля: история изменений записей, прикреплённые свидетельства и фильтрация по оборудованию." },
      { property: "og:title", content: "Журнал поверок и калибровок — NDT Control" },
      { property: "og:description", content: "История изменений, сертификаты и фильтры по оборудованию, методу НК и результату поверки." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalibrationsPage,
});

type Attachment = { name: string; kind: "PDF" | "JPG" | "XLSX"; size: string };
type Change = { at: string; who: string; what: string };

type Entry = {
  id: string;
  equipId: string;
  equipName: string;
  equipModel: string;
  method: Item["method"];
  serial: string;
  inv: string;
  date: string;
  type: string;
  cert: string;
  org: string;
  result: "Годен" | "Не годен" | "В работе";
  nextDate: string;
  performer: string;
  note: string;
  attachments: Attachment[];
  changes: Change[];
};

const performers = ["Соколов Д.М.", "Петрова Е.С. (метролог)", "Гончаров В.И.", "Иванов А.П.", "Кузнецова И.В. (СМК)"];
const typeIntervalDays = 365;

const seed: Entry[] = equipment.flatMap((it, ei) =>
  it.history.map((h, hi) => {
    const certFile = `${h.cert.replace(/\//g, "_")}.pdf`;
    const performer = performers[(ei + hi) % performers.length];
    const nextDate = new Date(new Date(h.date).getTime() + typeIntervalDays * day).toISOString().slice(0, 10);
    return {
      id: `${it.id}-h${hi}`,
      equipId: it.id,
      equipName: it.name,
      equipModel: it.model,
      method: it.method,
      serial: it.serial,
      inv: it.inv,
      date: h.date,
      type: h.type,
      cert: h.cert,
      org: h.org,
      result: h.result as Entry["result"],
      nextDate,
      performer,
      note: hi === 0
        ? `Проверка по методике поверки, отклонений не выявлено. Условия: t = ${20 + (ei % 4)} °C, влажность ${45 + (ei % 10)} %.`
        : "Поверка выполнена в полном объёме, средство контроля признано пригодным.",
      attachments: [
        { name: `Свидетельство ${h.cert}`, kind: "PDF", size: `${(180 + ei * 17) % 900 + 120} КБ` },
        ...(hi === 0 ? [{ name: `Протокол измерений ${h.cert}`, kind: "XLSX" as const, size: `${(40 + ei * 7) % 90 + 24} КБ` }] : []),
        ...(it.method === "УЗК" && hi === 0 ? [{ name: "Фото пломбы и шильда", kind: "JPG" as const, size: "1,2 МБ" }] : []),
      ],
      changes: [
        { at: `${h.date} 09:${(12 + ei) % 60}`.replace(/^(\d{4})-(\d{2})-(\d{2})/, "$3.$2.$1"), who: performer, what: "Создана запись журнала поверок" },
        { at: `${h.date} 14:${(30 + hi * 7) % 60}`.replace(/^(\d{4})-(\d{2})-(\d{2})/, "$3.$2.$1"), who: "Петрова Е.С. (метролог)", what: `Прикреплено свидетельство ${h.cert}` },
        ...(hi === 0 ? [{ at: ru(shift(-5)) + " 11:05", who: "Кузнецова И.В. (СМК)", what: "Запись проверена при внутреннем аудите ISO/IEC 17025 (п. 6.4)" }] : []),
      ],
    } satisfies Entry;
  }),
);

const resultTone: Record<Entry["result"], string> = {
  "Годен": "bg-green/15 text-green",
  "Не годен": "bg-red/15 text-red",
  "В работе": "bg-blue/15 text-blue",
};

const methods = ["Все методы", "ВИК", "УЗК", "РК", "МПК", "ПВК", "Образцы и калибры"];
const results = ["Все результаты", "Годен", "Не годен", "В работе"];
const periods = ["За всё время", "За 30 дней", "За 90 дней", "За год"];
const periodDays: Record<string, number> = { "За 30 дней": 30, "За 90 дней": 90, "За год": 365 };

function CalibrationsPage() {
  const [entries, setEntries] = useState<Entry[]>(seed);
  const [equip, setEquip] = useState("Всё оборудование");
  const [method, setMethod] = useState("Все методы");
  const [result, setResult] = useState("Все результаты");
  const [period, setPeriod] = useState("За всё время");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Entry | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const equipOptions = useMemo(
    () => ["Всё оборудование", ...equipment.map((e) => `${e.model} · ${e.inv}`)],
    [],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return entries
      .filter((e) => equip === "Всё оборудование" || `${e.equipModel} · ${e.inv}` === equip)
      .filter((e) => method === "Все методы" || e.method === method)
      .filter((e) => result === "Все результаты" || e.result === result)
      .filter((e) => {
        const d = periodDays[period];
        if (!d) return true;
        return (TODAY.getTime() - new Date(e.date).getTime()) / day <= d;
      })
      .filter((e) =>
        !term ||
        [e.equipName, e.equipModel, e.serial, e.inv, e.cert, e.org, e.performer, e.type]
          .some((v) => v.toLowerCase().includes(term)),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, equip, method, result, period, q]);

  const stats = useMemo(() => ({
    total: rows.length,
    ok: rows.filter((r) => r.result === "Годен").length,
    bad: rows.filter((r) => r.result === "Не годен").length,
    files: rows.reduce((s, r) => s + r.attachments.length, 0),
  }), [rows]);

  const addEntry = (form: { equipId: string; type: string; cert: string; org: string; result: Entry["result"]; date: string; performer: string; note: string }) => {
    const it = equipment.find((e) => e.id === form.equipId)!;
    const now = new Date();
    const stamp = `${ru(TODAY.toISOString().slice(0, 10))} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const entry: Entry = {
      id: `new-${Date.now()}`,
      equipId: it.id, equipName: it.name, equipModel: it.model, method: it.method,
      serial: it.serial, inv: it.inv,
      date: form.date, type: form.type, cert: form.cert || "б/н", org: form.org,
      result: form.result,
      nextDate: new Date(new Date(form.date).getTime() + typeIntervalDays * day).toISOString().slice(0, 10),
      performer: form.performer, note: form.note,
      attachments: form.cert ? [{ name: `Свидетельство ${form.cert}`, kind: "PDF", size: "—" }] : [],
      changes: [{ at: stamp, who: form.performer, what: "Создана запись журнала поверок" }],
    };
    setEntries((p) => [entry, ...p]);
    setAdding(false);
    flash("Запись журнала добавлена");
  };

  const attachFile = (id: string) => {
    const now = new Date();
    const stamp = `${ru(TODAY.toISOString().slice(0, 10))} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setEntries((p) => p.map((e) => e.id === id ? {
      ...e,
      attachments: [...e.attachments, { name: `Скан документа №${e.attachments.length + 1}`, kind: "PDF", size: "310 КБ" }],
      changes: [...e.changes, { at: stamp, who: "Петрова Е.С. (метролог)", what: "Прикреплён документ к записи" }],
    } : e));
    setDetail((d) => d && d.id === id ? { ...d, attachments: [...d.attachments, { name: `Скан документа №${d.attachments.length + 1}`, kind: "PDF", size: "310 КБ" }], changes: [...d.changes, { at: stamp, who: "Петрова Е.С. (метролог)", what: "Прикреплён документ к записи" }] } : d);
    flash("Документ прикреплён к записи");
  };

  return (
    <AppShell active="Журнал поверок" breadcrumb="Журнал поверок и калибровок" searchPlaceholder="Поиск по свидетельству, прибору, метрологу…">
      <div className="mb-4 flex items-end gap-3">
        <div>
          <h1 className="text-lg font-bold">Журнал поверок и калибровок</h1>
          <p className="text-xs text-muted-foreground">Хронология метрологических работ · история изменений записей · прикреплённые свидетельства · ISO/IEC 17025 п. 6.4, 8.4</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" className="h-8 text-xs" onClick={() => setAdding(true)}><Plus className="size-3.5" />Новая запись</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => flash("Журнал выгружен в Excel (демо)")}><Download className="size-3.5" />Экспорт журнала</Button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-3">
        <Stat label="Записей в выборке" value={stats.total} note="по текущим фильтрам" />
        <Stat label="Результат «Годен»" value={stats.ok} note="признаны пригодными" tone="text-green" />
        <Stat label="Результат «Не годен»" value={stats.bad} note="изъяты из эксплуатации" tone="text-red" />
        <Stat label="Прикреплено файлов" value={stats.files} note="свидетельства и протоколы" tone="text-blue" />
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-sm border bg-card p-3 shadow-panel">
        <Sel label="Оборудование" value={equip} options={equipOptions} onChange={setEquip} width="w-[300px]" />
        <Sel label="Метод НК" value={method} options={methods} onChange={setMethod} />
        <Sel label="Результат" value={result} options={results} onChange={setResult} />
        <Sel label="Период" value={period} options={periods} onChange={setPeriod} />
        <div className="ml-auto">
          <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Поиск</div>
          <div className="relative w-[280px]">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-full rounded-sm border bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring" placeholder="Свидетельство, зав. №, метролог…" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border bg-card shadow-panel">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              {["Дата", "Оборудование", "Метод", "Вид работ", "Свидетельство", "Организация", "Исполнитель", "След. поверка", "Файлы", "Результат"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} onClick={() => setDetail(e)} className="cursor-pointer border-t transition-colors hover:bg-accent/50">
                <td className="whitespace-nowrap px-3 py-2 font-medium">{ru(e.date)}</td>
                <td className="px-3 py-2"><div className="font-semibold">{e.equipModel}</div><div className="text-[10px] text-muted-foreground">{e.equipName} · зав. № {e.serial} · {e.inv}</div></td>
                <td className="px-3 py-2"><span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{e.method}</span></td>
                <td className="px-3 py-2">{e.type}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">{e.cert}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.org}</td>
                <td className="px-3 py-2">{e.performer}</td>
                <td className="whitespace-nowrap px-3 py-2">{ru(e.nextDate)}</td>
                <td className="px-3 py-2"><span className="inline-flex items-center gap-1 text-muted-foreground"><Paperclip className="size-3" />{e.attachments.length}</span></td>
                <td className="px-3 py-2"><span className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${resultTone[e.result]}`}>{e.result}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">Записи не найдены — измените фильтры</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  Запись журнала · {detail.cert}
                  <span className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${resultTone[detail.result]}`}>{detail.result}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-sm border bg-muted/40 p-3 text-xs">
                <F l="Оборудование" v={`${detail.equipName}, ${detail.equipModel}`} />
                <F l="Зав. № / инв. №" v={`${detail.serial} / ${detail.inv}`} />
                <F l="Метод НК" v={detail.method} />
                <F l="Вид работ" v={detail.type} />
                <F l="Дата поверки" v={ru(detail.date)} />
                <F l="Действительно до" v={ru(detail.nextDate)} />
                <F l="Организация" v={detail.org} />
                <F l="Исполнитель" v={detail.performer} />
              </div>
              <div className="rounded-sm border p-3 text-xs">
                <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Заключение</div>
                {detail.note}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border p-3">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase text-muted-foreground"><Paperclip className="size-3" />Прикреплённые документы</div>
                  <div className="space-y-1.5">
                    {detail.attachments.map((a) => (
                      <div key={a.name} className="flex items-center gap-2 rounded-sm border bg-muted/40 px-2 py-1.5 text-xs">
                        <FileText className="size-3.5 shrink-0 text-blue" />
                        <span className="min-w-0 flex-1 truncate">{a.name}</span>
                        <span className="text-[10px] text-muted-foreground">{a.kind} · {a.size}</span>
                        <Button size="icon" variant="ghost" className="size-6" title="Скачать" onClick={() => flash(`Файл «${a.name}» выгружен (демо)`)}><Download className="size-3" /></Button>
                      </div>
                    ))}
                    {detail.attachments.length === 0 && <div className="text-[11px] text-muted-foreground">Файлы не прикреплены</div>}
                  </div>
                  <Button size="sm" variant="outline" className="mt-2 h-7 w-full text-[11px]" onClick={() => attachFile(detail.id)}><Plus className="size-3" />Прикрепить документ</Button>
                </div>

                <div className="rounded-sm border p-3">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase text-muted-foreground"><History className="size-3" />История изменений записи</div>
                  <ol className="space-y-2">
                    {detail.changes.map((c, i) => (
                      <li key={i} className="flex gap-2 text-xs">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="min-w-0">
                          <span className="block font-medium">{c.what}</span>
                          <span className="block text-[10px] text-muted-foreground">{c.at} · {c.who}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDetail(null)}><X className="size-3.5" />Закрыть</Button>
                <Button size="sm" className="h-8 text-xs" onClick={() => flash("Свидетельство выгружено (демо)")}><Download className="size-3.5" />Скачать свидетельство</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddDialog open={adding} onClose={() => setAdding(false)} onSave={addEntry} />

      {toast && <div className="fixed bottom-10 right-6 z-50 rounded-sm border bg-popover px-4 py-2 text-xs text-popover-foreground shadow-panel">{toast}</div>}
    </AppShell>
  );
}

function AddDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (f: any) => void }) {
  const [equipId, setEquipId] = useState(equipment[0].id);
  const [type, setType] = useState("Периодическая поверка");
  const [cert, setCert] = useState("");
  const [org, setOrg] = useState("ФБУ «Ростест-Москва»");
  const [result, setResult] = useState<Entry["result"]>("Годен");
  const [date, setDate] = useState(TODAY.toISOString().slice(0, 10));
  const [performer, setPerformer] = useState(performers[1]);
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle className="text-sm">Зарегистрировать поверку / калибровку</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <label className="col-span-2 space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Оборудование</span>
            <select value={equipId} onChange={(e) => setEquipId(e.target.value)} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
              {equipment.map((e) => <option key={e.id} value={e.id}>{e.model} · {e.inv}</option>)}
            </select>
          </label>
          <Inp l="Вид работ" v={type} set={setType} />
          <Inp l="Дата" v={date} set={setDate} type="date" />
          <Inp l="Свидетельство №" v={cert} set={setCert} ph="С-УЗ/26-…" />
          <Inp l="Организация" v={org} set={setOrg} />
          <label className="space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Результат</span>
            <select value={result} onChange={(e) => setResult(e.target.value as Entry["result"])} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
              {["Годен", "Не годен", "В работе"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Исполнитель</span>
            <select value={performer} onChange={(e) => setPerformer(e.target.value)} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
              {performers.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="col-span-2 space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Заключение</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-sm border bg-background p-2 text-xs outline-none focus:ring-2 focus:ring-ring" placeholder="Отклонений не выявлено, средство контроля пригодно к применению" />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onClose}><XCircle className="size-3.5" />Отмена</Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => onSave({ equipId, type, cert, org, result, date, performer, note: note || "Отклонений не выявлено, средство контроля пригодно к применению." })}><CheckCircle2 className="size-3.5" />Сохранить запись</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Inp({ l, v, set, type = "text", ph }: { l: string; v: string; set: (s: string) => void; type?: string; ph?: string }) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{l}</span>
      <input type={type} value={v} placeholder={ph} onChange={(e) => set(e.target.value)} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}

function Stat({ label, value, note, tone = "text-foreground" }: { label: string; value: number; note: string; tone?: string }) {
  return (
    <div className="rounded-sm border bg-card p-3 shadow-panel">
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{note}</div>
    </div>
  );
}

function Sel({ label, value, options, onChange, width = "w-[190px]" }: { label: string; value: string; options: string[]; onChange: (v: string) => void; width?: string }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${width} h-8 rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring`}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function F({ l, v }: { l: string; v: string }) {
  return <div className="flex gap-2"><span className="text-muted-foreground">{l}:</span><span className="ml-auto text-right font-medium">{v}</span></div>;
}
