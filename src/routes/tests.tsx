import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckCircle2, ClipboardList, Download, FileText, History, Pencil, Plus,
  Search, Send, Trash2, Undo2, X, XCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ROLE_TITLE, useAccess } from "@/lib/roles";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ru, shift, TODAY, day } from "@/routes/equipment";

export const Route = createFileRoute("/tests")({
  head: () => ({
    meta: [
      { title: "Журнал испытаний — NDT Control" },
      { name: "description", content: "Журналы испытаний по методам неразрушающего контроля: ВИК, УЗК, РК, МПК, ПВК. Регистрация испытаний, дефектов, статусы протоколов и выгрузка реестра." },
      { property: "og:title", content: "Журнал испытаний — NDT Control" },
      { property: "og:description", content: "Реестр протоколов по каждому методу НК с фильтрами, дефектной ведомостью и маршрутом утверждения по ISO/IEC 17025." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TestsPage,
});

/* ---------------- model ---------------- */

export type Method = "ВИК" | "УЗК" | "РК" | "МПК" | "ПВК";
type Status = "Черновик" | "В работе" | "На утверждении" | "Утверждён" | "Отклонён";
type Grade = "Допустимый" | "Недопустимый";

type Defect = { id: string; kind: string; size: string; coord: string; grade: Grade };
type Change = { at: string; who: string; what: string };

type Test = {
  id: string;
  protocol: string;
  method: Method;
  object: string;
  customer: string;
  joint: string;
  material: string;
  thickness: string;
  standard: string;
  operator: string;
  equipment: string;
  date: string;
  scope: string;
  status: Status;
  params: Record<string, string>;
  defects: Defect[];
  changes: Change[];
};

export const METHODS: Method[] = ["ВИК", "УЗК", "РК", "МПК", "ПВК"];

const METHOD_TITLE: Record<Method, string> = {
  ВИК: "Визуальный и измерительный контроль",
  УЗК: "Ультразвуковой контроль",
  РК: "Радиографический контроль",
  МПК: "Магнитопорошковый контроль",
  ПВК: "Капиллярный (проникающими веществами) контроль",
};

const METHOD_STANDARDS: Record<Method, string[]> = {
  ВИК: ["РД 03-606-03", "ГОСТ Р ИСО 17637-2014", "СТО 00220256-005-2005"],
  УЗК: ["ГОСТ Р 55724-2013", "ГОСТ Р ИСО 17640-2016", "СТО Газпром 2-2.4-083-2006"],
  РК: ["ГОСТ 7512-82", "ГОСТ ISO 17636-1-2017", "РД 26.260.11-96"],
  МПК: ["ГОСТ Р 56512-2015", "ГОСТ Р ИСО 17638-2019"],
  ПВК: ["ГОСТ 18442-80", "ГОСТ Р ИСО 3452-1-2020"],
};

const METHOD_FIELDS: Record<Method, { key: string; label: string; ph: string }[]> = {
  ВИК: [
    { key: "tool", label: "Средство измерения", ph: "УШС-3, ШЦЦ-I-150" },
    { key: "light", label: "Освещённость, лк", ph: "520" },
    { key: "magn", label: "Увеличение", ph: "4×" },
    { key: "prep", label: "Подготовка поверхности", ph: "Зачистка до Ra 12,5" },
  ],
  УЗК: [
    { key: "probe", label: "Тип ПЭП", ph: "П121-5-70" },
    { key: "freq", label: "Частота, МГц", ph: "5,0" },
    { key: "angle", label: "Угол ввода, °", ph: "70" },
    { key: "sens", label: "Браковочный уровень, дБ", ph: "−6" },
    { key: "sample", label: "Образец настройки", ph: "СО-2 / V2" },
  ],
  РК: [
    { key: "source", label: "Источник излучения", ph: "РПД-200" },
    { key: "kv", label: "Напряжение, кВ", ph: "180" },
    { key: "exp", label: "Экспозиция, мА·мин", ph: "6,0" },
    { key: "film", label: "Плёнка / детектор", ph: "AGFA D7, Pb 0,1 мм" },
    { key: "iqi", label: "Чувствительность, мм", ph: "0,20" },
    { key: "fd", label: "Фокусное расстояние, мм", ph: "600" },
  ],
  МПК: [
    { key: "magn", label: "Способ намагничивания", ph: "Приложенное поле, ярмо" },
    { key: "current", label: "Ток / поле", ph: "3,5 кА/м" },
    { key: "susp", label: "Суспензия", ph: "МАГНУМ 2Ч, чёрная" },
    { key: "level", label: "Уровень чувствительности", ph: "Условный уровень «Б»" },
  ],
  ПВК: [
    { key: "pen", label: "Пенетрант", ph: "Sherwin DP-55" },
    { key: "dev", label: "Проявитель", ph: "Sherwin DR-60" },
    { key: "time", label: "Время пропитки, мин", ph: "15" },
    { key: "class", label: "Класс чувствительности", ph: "II класс" },
  ],
};

const DEFECT_KINDS = [
  "Трещина", "Непровар", "Несплавление", "Пора", "Цепочка пор",
  "Шлаковое включение", "Подрез", "Смещение кромок", "Утяжина", "Наплыв",
  "Вольфрамовое включение", "Прожог",
];

const OPERATORS = [
  "Соколов Д.М. (УЗК III ур.)",
  "Иванов А.П. (УЗК II ур.)",
  "Гончаров В.И. (РК II ур.)",
  "Петрова Е.С. (ВИК II ур.)",
  "Кузнецова И.В. (ПВК/МПК II ур.)",
];

const CUSTOMERS = [
  "ООО «СеверСталь-Монтаж»",
  "АО «Транснефть-Сибирь»",
  "ПАО «Газпром трансгаз Югорск»",
  "АО «Нефтехиммаш»",
  "ООО «ТеплоЭнергоСервис»",
];

const OBJECTS = [
  "Технологический трубопровод ДУ-273, узел №4",
  "Магистральный газопровод, участок 112–118 км",
  "Резервуар РВС-5000, пояс №1",
  "Сосуд под давлением В-102, обечайка",
  "Металлоконструкция эстакады, ферма Ф-7",
  "Паропровод ПП-14, гиб №3",
];

const STATUSES: Status[] = ["Черновик", "В работе", "На утверждении", "Утверждён", "Отклонён"];

const statusTone: Record<Status, string> = {
  "Черновик": "bg-muted text-muted-foreground",
  "В работе": "bg-blue/15 text-blue",
  "На утверждении": "bg-yellow/20 text-yellow",
  "Утверждён": "bg-green/15 text-green",
  "Отклонён": "bg-red/15 text-red",
};

const verdict = (t: Test) =>
  t.defects.some((d) => d.grade === "Недопустимый") ? "Брак" : "Годен";

/* ---------------- seed ---------------- */

const pick = <T,>(arr: T[], i: number) => arr[i % arr.length] as T;

const defaultParams = (m: Method, i: number): Record<string, string> => {
  const v: Record<Method, Record<string, string>> = {
    ВИК: { tool: "УШС-3, ШЦЦ-I-150-0,01", light: String(480 + i * 17), magn: "4×", prep: "Зачистка до Ra 12,5, обезжиривание" },
    УЗК: { probe: pick(["П121-5-70", "П121-5-65", "П111-2,5", "П121-2,5-50"], i), freq: pick(["5,0", "2,5", "4,0"], i), angle: pick(["70", "65", "50"], i), sens: "−6", sample: pick(["СО-2 (V2)", "СО-3 (V1)", "СОП-В3-10"], i) },
    РК: { source: pick(["РПД-200", "SITE-X C 3005", "Eresco 42 MF4"], i), kv: String(160 + (i % 5) * 10), exp: (4 + (i % 4)).toFixed(1).replace(".", ","), film: "AGFA D7, экраны Pb 0,1 мм", iqi: "0,20", fd: String(600 + (i % 3) * 100) },
    МПК: { magn: pick(["Приложенное поле, электромагнит Parker B-300S", "Циркулярное намагничивание"], i), current: `${(3 + (i % 3)).toFixed(1).replace(".", ",")} кА/м`, susp: "МАГНУМ 2Ч, чёрная", level: pick(["Условный уровень «А»", "Условный уровень «Б»"], i) },
    ПВК: { pen: "Sherwin DP-55", dev: "Sherwin DR-60", time: String(10 + (i % 3) * 5), class: pick(["I класс", "II класс"], i) },
  };
  return v[m];
};

const defaultEquip: Record<Method, string> = {
  ВИК: "ВИК-1 (ЛНК-ВИК-002), УШС-3",
  УЗК: "А1212 MASTER (ЛНК-УЗК-021)",
  РК: "РПД-200 (ЛНК-РК-004)",
  МПК: "Parker B-300S (ЛНК-МП-007)",
  ПВК: "Комплект Sherwin (ЛНК-ПВ-003)",
};

const seedDefects = (m: Method, i: number): Defect[] => {
  if (i % 4 === 0) return [];
  const kinds = m === "РК" ? ["Пора", "Шлаковое включение", "Непровар"]
    : m === "УЗК" ? ["Непровар", "Несплавление", "Трещина"]
    : m === "ВИК" ? ["Подрез", "Смещение кромок", "Наплыв"]
    : ["Трещина", "Пора", "Цепочка пор"];
  const n = (i % 3) + 1;
  return Array.from({ length: n }, (_, k) => ({
    id: `d${i}-${k}`,
    kind: pick(kinds, i + k),
    size: m === "УЗК" ? `L=${8 + k * 4} мм, H=${(1.5 + k).toFixed(1).replace(".", ",")} мм` : `${(1 + k * 0.8).toFixed(1).replace(".", ",")}×${(2 + k).toFixed(1).replace(".", ",")} мм`,
    coord: `шов ${300 + i * 7 + k * 45} мм от репера, ${pick(["корень", "заполнение", "облицовка"], i + k)}`,
    grade: (i % 5 === 1 && k === 0 ? "Недопустимый" : "Допустимый") as Grade,
  }));
};

const seed: Test[] = Array.from({ length: 30 }, (_, i) => {
  const method = pick(METHODS, i) as Method;
  const status = pick<Status>(["Утверждён", "Утверждён", "На утверждении", "В работе", "Черновик", "Отклонён"], i);
  const date = shift(-(i * 3 + (i % 5)));
  const operator = method === "РК" ? OPERATORS[2]! : method === "ВИК" ? OPERATORS[3]! : method === "УЗК" ? pick(OPERATORS.slice(0, 2), i)! : OPERATORS[4]!;
  return {
    id: `t${i + 1}`,
    protocol: `П-${method}-${String(2600 + i * 3).slice(0, 4)}/26`,
    method,
    object: pick(OBJECTS, i)!,
    customer: pick(CUSTOMERS, i)!,
    joint: `Сварное соединение С${(i % 9) + 10}, шов №${(i % 12) + 1}`,
    material: pick(["Ст20", "09Г2С", "12Х18Н10Т", "15Х5М", "Ст3сп"], i)!,
    thickness: `${6 + (i % 8) * 2} мм`,
    standard: pick(METHOD_STANDARDS[method], i)!,
    operator,
    equipment: defaultEquip[method],
    date,
    scope: `${100 - (i % 4) * 25} % (${(i % 6) + 1} шт.)`,
    status,
    params: defaultParams(method, i),
    defects: seedDefects(method, i),
    changes: [
      { at: `${ru(date)} 08:${String(15 + (i % 40)).padStart(2, "0")}`, who: operator, what: "Испытание зарегистрировано в журнале" },
      { at: `${ru(date)} 13:${String(5 + (i % 50)).padStart(2, "0")}`, who: operator, what: "Внесены результаты контроля" },
      ...(status === "Утверждён" ? [{ at: `${ru(shift(-(i * 3) + 1))} 10:20`, who: "Алексей Крылов (руководитель ЛНК)", what: "Протокол утверждён" }] : []),
    ],
  } satisfies Test;
});

const periods = ["За всё время", "За 30 дней", "За 90 дней", "За год"];
const periodDays: Record<string, number> = { "За 30 дней": 30, "За 90 дней": 90, "За год": 365 };

const stamp = () => {
  const n = new Date();
  return `${ru(TODAY.toISOString().slice(0, 10))} ${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
};

/* ---------------- page ---------------- */

function TestsPage() {
  const [tests, setTests] = useState<Test[]>(seed);
  const [tab, setTab] = useState<Method | "Все">("Все");
  const [status, setStatus] = useState("Все статусы");
  const [operator, setOperator] = useState("Все специалисты");
  const [customer, setCustomer] = useState("Все заказчики");
  const [period, setPeriod] = useState("За всё время");
  const [res, setRes] = useState("Любой результат");
  const [q, setQ] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Test | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { user, can, denyMessage } = useAccess();

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };
  const detail = tests.find((t) => t.id === detailId) ?? null;

  const byMethod = useMemo(
    () => tests.filter((t) => tab === "Все" || t.method === tab),
    [tests, tab],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return byMethod
      .filter((t) => status === "Все статусы" || t.status === status)
      .filter((t) => operator === "Все специалисты" || t.operator === operator)
      .filter((t) => customer === "Все заказчики" || t.customer === customer)
      .filter((t) => res === "Любой результат" || verdict(t) === res)
      .filter((t) => {
        const d = periodDays[period];
        return !d || (TODAY.getTime() - new Date(t.date).getTime()) / day <= d;
      })
      .filter((t) => !term || [t.protocol, t.object, t.customer, t.joint, t.material, t.operator, t.standard, t.equipment]
        .some((v) => v.toLowerCase().includes(term)))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [byMethod, status, operator, customer, res, period, q]);

  const stats = useMemo(() => ({
    total: rows.length,
    defects: rows.reduce((s, t) => s + t.defects.length, 0),
    bad: rows.filter((t) => verdict(t) === "Брак").length,
    approve: rows.filter((t) => t.status === "На утверждении").length,
  }), [rows]);

  const log = (id: string, what: string, who = "Алексей Крылов (руководитель ЛНК)") =>
    setTests((p) => p.map((t) => t.id === id ? { ...t, changes: [...t.changes, { at: stamp(), who, what }] } : t));

  const setStatusOf = (id: string, s: Status, note: string) => {
    setTests((p) => p.map((t) => t.id === id ? { ...t, status: s, changes: [...t.changes, { at: stamp(), who: "Алексей Крылов (руководитель ЛНК)", what: note }] } : t));
    flash(note);
  };

  const saveTest = (t: Test, isNew: boolean) => {
    setTests((p) => isNew ? [t, ...p] : p.map((x) => x.id === t.id ? t : x));
    setCreating(false);
    setEditing(null);
    flash(isNew ? `Испытание ${t.protocol} добавлено в журнал ${t.method}` : `Протокол ${t.protocol} обновлён`);
  };

  const removeTest = (id: string) => {
    const t = tests.find((x) => x.id === id);
    setTests((p) => p.filter((x) => x.id !== id));
    setDetailId(null);
    flash(`Запись ${t?.protocol ?? ""} удалена из журнала`);
  };

  const addDefect = (id: string, d: Omit<Defect, "id">) => {
    setTests((p) => p.map((t) => t.id === id ? {
      ...t,
      defects: [...t.defects, { ...d, id: `d-${Date.now()}` }],
      changes: [...t.changes, { at: stamp(), who: t.operator, what: `Добавлен дефект: ${d.kind} (${d.grade.toLowerCase()})` }],
    } : t));
    flash("Дефект добавлен в ведомость");
  };

  const delDefect = (id: string, did: string) => {
    setTests((p) => p.map((t) => t.id === id ? {
      ...t,
      defects: t.defects.filter((d) => d.id !== did),
      changes: [...t.changes, { at: stamp(), who: t.operator, what: "Удалена запись дефектной ведомости" }],
    } : t));
  };

  const exportCsv = () => {
    const head = ["Протокол", "Метод", "Дата", "Объект", "Заказчик", "Соединение", "Материал", "Толщина", "НД", "Специалист", "Оборудование", "Дефектов", "Результат", "Статус"];
    const body = rows.map((t) => [t.protocol, t.method, ru(t.date), t.object, t.customer, t.joint, t.material, t.thickness, t.standard, t.operator, t.equipment, String(t.defects.length), verdict(t), t.status]);
    const csv = "\uFEFF" + [head, ...body].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-${tab === "Все" ? "all" : tab}-${TODAY.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flash(`Выгружено записей: ${rows.length}`);
  };

  const printProtocol = (t: Test) => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { flash("Разрешите всплывающие окна для печати протокола"); return; }
    const rowsHtml = t.defects.length
      ? t.defects.map((d, i) => `<tr><td>${i + 1}</td><td>${d.kind}</td><td>${d.size}</td><td>${d.coord}</td><td>${d.grade}</td></tr>`).join("")
      : `<tr><td colspan="5">Недопустимых несплошностей не обнаружено</td></tr>`;
    w.document.write(`<html lang="ru"><head><meta charset="utf-8"><title>${t.protocol}</title>
      <style>body{font:12px/1.5 Arial;padding:32px}h1{font-size:15px}table{border-collapse:collapse;width:100%;margin-top:8px}td,th{border:1px solid #888;padding:4px 6px;text-align:left}dt{float:left;width:220px;color:#555}dd{margin:0 0 4px 230px}</style>
      </head><body>
      <h1>ПРОТОКОЛ ${t.protocol}<br>${METHOD_TITLE[t.method]} (${t.method})</h1>
      <p>Лаборатория неразрушающего контроля ЛНК-017 · ISO/IEC 17025:2017</p>
      <dl>
        <dt>Дата контроля</dt><dd>${ru(t.date)}</dd>
        <dt>Заказчик</dt><dd>${t.customer}</dd>
        <dt>Объект контроля</dt><dd>${t.object}</dd>
        <dt>Соединение</dt><dd>${t.joint}</dd>
        <dt>Материал / толщина</dt><dd>${t.material} / ${t.thickness}</dd>
        <dt>Объём контроля</dt><dd>${t.scope}</dd>
        <dt>Нормативный документ</dt><dd>${t.standard}</dd>
        <dt>Средства контроля</dt><dd>${t.equipment}</dd>
        ${METHOD_FIELDS[t.method].map((f) => `<dt>${f.label}</dt><dd>${t.params[f.key] ?? "—"}</dd>`).join("")}
        <dt>Специалист НК</dt><dd>${t.operator}</dd>
      </dl>
      <h3>Дефектная ведомость</h3>
      <table><tr><th>№</th><th>Тип</th><th>Размеры</th><th>Координаты</th><th>Оценка</th></tr>${rowsHtml}</table>
      <h3>Заключение: ${verdict(t)}</h3>
      <p>Статус: ${t.status}</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
    log(t.id, "Сформирован протокол испытания");
  };

  const operators = useMemo(() => ["Все специалисты", ...Array.from(new Set(byMethod.map((t) => t.operator)))], [byMethod]);
  const customers = useMemo(() => ["Все заказчики", ...Array.from(new Set(tests.map((t) => t.customer)))], [tests]);

  return (
    <AppShell active="Журнал испытаний" breadcrumb="Журнал испытаний" searchPlaceholder="Поиск по протоколу, объекту, заказчику…">
      <div className="mb-4 flex items-end gap-3">
        <div>
          <h1 className="text-lg font-bold">Журнал испытаний</h1>
          <p className="text-xs text-muted-foreground">
            Реестр протоколов по методам НК {tab !== "Все" && <>· {METHOD_TITLE[tab]}</>} · ISO/IEC 17025 п. 7.5, 7.8
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <span className="mr-1 self-center rounded-sm bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">{user.name} · {ROLE_TITLE[user.role]}</span>
          {can("tests.create")
            ? <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}><Plus className="size-3.5" />Новое испытание</Button>
            : <Button size="sm" className="h-8 text-xs" disabled title={denyMessage("tests.create")}><Plus className="size-3.5" />Новое испытание</Button>}
          {can("docs.export") && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportCsv}><Download className="size-3.5" />Экспорт журнала</Button>}
        </div>
      </div>

      <div className="mb-3 flex gap-1 rounded-sm border bg-card p-1 shadow-panel">
        {(["Все", ...METHODS] as const).map((m) => {
          const count = tests.filter((t) => m === "Все" || t.method === m).length;
          return (
            <button key={m} onClick={() => { setTab(m); setOperator("Все специалисты"); }}
              className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-sm px-3 text-xs font-semibold transition-colors ${tab === m ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              <ClipboardList className="size-3.5" />
              {m === "Все" ? "Все методы" : m}
              <span className={`rounded-sm px-1.5 text-[10px] ${tab === m ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-3 grid grid-cols-4 gap-3">
        <Stat label="Испытаний в выборке" value={stats.total} note="по текущим фильтрам" />
        <Stat label="Выявлено дефектов" value={stats.defects} note="записей дефектной ведомости" tone="text-blue" />
        <Stat label="Заключение «Брак»" value={stats.bad} note="есть недопустимые дефекты" tone="text-red" />
        <Stat label="Ожидают утверждения" value={stats.approve} note="на подписи у руководителя" tone="text-yellow" />
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-sm border bg-card p-3 shadow-panel">
        <Sel label="Статус" value={status} options={["Все статусы", ...STATUSES]} onChange={setStatus} />
        <Sel label="Специалист НК" value={operator} options={operators} onChange={setOperator} width="w-[230px]" />
        <Sel label="Заказчик" value={customer} options={customers} onChange={setCustomer} width="w-[250px]" />
        <Sel label="Результат" value={res} options={["Любой результат", "Годен", "Брак"]} onChange={setRes} />
        <Sel label="Период" value={period} options={periods} onChange={setPeriod} />
        <div className="ml-auto">
          <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Поиск</div>
          <div className="relative w-[260px]">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-full rounded-sm border bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring" placeholder="Протокол, объект, шов…" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border bg-card shadow-panel">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              {["Протокол", "Дата", "Метод", "Объект / соединение", "Заказчик", "Материал", "Специалист НК", "НД", "Дефектов", "Заключение", "Статус", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} onClick={() => setDetailId(t.id)} className="cursor-pointer border-t transition-colors hover:bg-accent/50">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] font-semibold">{t.protocol}</td>
                <td className="whitespace-nowrap px-3 py-2">{ru(t.date)}</td>
                <td className="px-3 py-2"><span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{t.method}</span></td>
                <td className="px-3 py-2"><div className="font-medium">{t.object}</div><div className="text-[10px] text-muted-foreground">{t.joint} · {t.thickness}</div></td>
                <td className="px-3 py-2 text-muted-foreground">{t.customer}</td>
                <td className="px-3 py-2">{t.material}</td>
                <td className="px-3 py-2">{t.operator}</td>
                <td className="px-3 py-2 text-[10px] text-muted-foreground">{t.standard}</td>
                <td className="px-3 py-2 text-center">{t.defects.length}</td>
                <td className="px-3 py-2"><span className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${verdict(t) === "Брак" ? "bg-red/15 text-red" : "bg-green/15 text-green"}`}>{verdict(t)}</span></td>
                <td className="px-3 py-2"><span className={`whitespace-nowrap rounded-sm px-2 py-0.5 text-[10px] font-semibold ${statusTone[t.status]}`}>{t.status}</span></td>
                <td className="px-2 py-2">
                  <Button size="icon" variant="ghost" className="size-7" title="Редактировать" onClick={(e) => { e.stopPropagation(); setEditing(t); }}><Pencil className="size-3.5" /></Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={12} className="px-3 py-10 text-center text-muted-foreground">Испытания не найдены — измените фильтры или добавьте запись</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 text-sm">
                  {detail.protocol} · {detail.method}
                  <span className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${statusTone[detail.status]}`}>{detail.status}</span>
                  <span className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${verdict(detail) === "Брак" ? "bg-red/15 text-red" : "bg-green/15 text-green"}`}>{verdict(detail)}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-sm border bg-muted/40 p-3 text-xs">
                <F l="Метод контроля" v={`${METHOD_TITLE[detail.method]} (${detail.method})`} />
                <F l="Дата контроля" v={ru(detail.date)} />
                <F l="Заказчик" v={detail.customer} />
                <F l="Объект" v={detail.object} />
                <F l="Соединение" v={detail.joint} />
                <F l="Материал / толщина" v={`${detail.material} / ${detail.thickness}`} />
                <F l="Объём контроля" v={detail.scope} />
                <F l="Нормативный документ" v={detail.standard} />
                <F l="Средства контроля" v={detail.equipment} />
                <F l="Специалист НК" v={detail.operator} />
              </div>

              <div className="rounded-sm border p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">Параметры контроля · {detail.method}</div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
                  {METHOD_FIELDS[detail.method].map((f) => <F key={f.key} l={f.label} v={detail.params[f.key] || "—"} />)}
                </div>
              </div>

              <DefectPanel test={detail} onAdd={(d) => addDefect(detail.id, d)} onDel={(did) => delDefect(detail.id, did)} />

              <div className="rounded-sm border p-3">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase text-muted-foreground"><History className="size-3" />История изменений</div>
                <ol className="space-y-2">
                  {detail.changes.map((c, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span><span className="block font-medium">{c.what}</span><span className="block text-[10px] text-muted-foreground">{c.at} · {c.who}</span></span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs text-red hover:text-red" onClick={() => removeTest(detail.id)}><Trash2 className="size-3.5" />Удалить</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditing(detail)}><Pencil className="size-3.5" />Редактировать</Button>
                {detail.status === "Черновик" && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setStatusOf(detail.id, "В работе", "Испытание взято в работу")}><Send className="size-3.5" />Взять в работу</Button>}
                {(detail.status === "В работе" || detail.status === "Отклонён") && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setStatusOf(detail.id, "На утверждении", "Протокол передан на утверждение")}><Send className="size-3.5" />На утверждение</Button>}
                {detail.status === "На утверждении" && <>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setStatusOf(detail.id, "Отклонён", "Протокол отклонён, возвращён на доработку")}><Undo2 className="size-3.5" />Отклонить</Button>
                  <Button size="sm" className="h-8 text-xs" onClick={() => setStatusOf(detail.id, "Утверждён", "Протокол утверждён")}><CheckCircle2 className="size-3.5" />Утвердить</Button>
                </>}
                <Button size="sm" className="h-8 text-xs" onClick={() => printProtocol(detail)}><FileText className="size-3.5" />Сформировать протокол</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <TestDialog
        open={creating || !!editing}
        initial={editing}
        defaultMethod={tab === "Все" ? "УЗК" : tab}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={saveTest}
      />

      {toast && <div className="fixed bottom-10 right-6 z-50 rounded-sm border bg-popover px-4 py-2 text-xs text-popover-foreground shadow-panel">{toast}</div>}
    </AppShell>
  );
}

/* ---------------- defects ---------------- */

function DefectPanel({ test, onAdd, onDel }: { test: Test; onAdd: (d: Omit<Defect, "id">) => void; onDel: (id: string) => void }) {
  const [kind, setKind] = useState(DEFECT_KINDS[0]!);
  const [size, setSize] = useState("");
  const [coord, setCoord] = useState("");
  const [grade, setGrade] = useState<Grade>("Допустимый");

  return (
    <div className="rounded-sm border p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">Дефектная ведомость ({test.defects.length})</div>
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase text-muted-foreground">
          <tr>{["№", "Тип несплошности", "Размеры", "Координаты", "Оценка", ""].map((h) => <th key={h} className="px-2 py-1 text-left font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {test.defects.map((d, i) => (
            <tr key={d.id} className="border-t">
              <td className="px-2 py-1.5">{i + 1}</td>
              <td className="px-2 py-1.5 font-medium">{d.kind}</td>
              <td className="px-2 py-1.5">{d.size}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{d.coord}</td>
              <td className="px-2 py-1.5"><span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${d.grade === "Недопустимый" ? "bg-red/15 text-red" : "bg-yellow/20 text-yellow"}`}>{d.grade}</span></td>
              <td className="px-2 py-1.5"><Button size="icon" variant="ghost" className="size-6" title="Удалить" onClick={() => onDel(d.id)}><Trash2 className="size-3" /></Button></td>
            </tr>
          ))}
          {test.defects.length === 0 && <tr><td colSpan={6} className="px-2 py-3 text-muted-foreground">Недопустимых несплошностей не обнаружено</td></tr>}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
        <label className="space-y-1"><span className="block text-[10px] font-semibold uppercase text-muted-foreground">Тип</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-8 w-[170px] rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
            {DEFECT_KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label className="space-y-1"><span className="block text-[10px] font-semibold uppercase text-muted-foreground">Размеры</span>
          <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="L=12 мм, H=2,0 мм" className="h-8 w-[170px] rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="flex-1 space-y-1"><span className="block text-[10px] font-semibold uppercase text-muted-foreground">Координаты</span>
          <input value={coord} onChange={(e) => setCoord(e.target.value)} placeholder="шов 420 мм от репера, корень" className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="space-y-1"><span className="block text-[10px] font-semibold uppercase text-muted-foreground">Оценка</span>
          <select value={grade} onChange={(e) => setGrade(e.target.value as Grade)} className="h-8 w-[150px] rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
            {["Допустимый", "Недопустимый"].map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <Button size="sm" className="h-8 text-xs" onClick={() => {
          onAdd({ kind, size: size || "—", coord: coord || "—", grade });
          setSize(""); setCoord("");
        }}><Plus className="size-3.5" />Добавить дефект</Button>
      </div>
    </div>
  );
}

/* ---------------- create / edit ---------------- */

function TestDialog({ open, initial, defaultMethod, onClose, onSave }: {
  open: boolean;
  initial: Test | null;
  defaultMethod: Method;
  onClose: () => void;
  onSave: (t: Test, isNew: boolean) => void;
}) {
  const blank = (m: Method): Test => ({
    id: `t-${Date.now()}`,
    protocol: `П-${m}-${String(Math.floor(Math.random() * 9000) + 1000)}/26`,
    method: m,
    object: OBJECTS[0]!,
    customer: CUSTOMERS[0]!,
    joint: "",
    material: "09Г2С",
    thickness: "8 мм",
    standard: METHOD_STANDARDS[m][0]!,
    operator: OPERATORS[0]!,
    equipment: defaultEquip[m],
    date: TODAY.toISOString().slice(0, 10),
    scope: "100 % (1 шт.)",
    status: "Черновик",
    params: defaultParams(m, 1),
    defects: [],
    changes: [],
  });

  const [form, setForm] = useState<Test>(initial ?? blank(defaultMethod));
  const [key, setKey] = useState("");
  const sig = `${initial?.id ?? "new"}-${open}-${defaultMethod}`;
  if (open && key !== sig) { setKey(sig); setForm(initial ?? blank(defaultMethod)); }

  const set = (patch: Partial<Test>) => setForm((f) => ({ ...f, ...patch }));
  const setParam = (k: string, v: string) => setForm((f) => ({ ...f, params: { ...f.params, [k]: v } }));

  const changeMethod = (m: Method) => setForm((f) => ({
    ...f,
    method: m,
    protocol: f.protocol.replace(/^П-[^-]+-/, `П-${m}-`),
    standard: METHOD_STANDARDS[m][0]!,
    equipment: defaultEquip[m],
    params: defaultParams(m, 1),
  }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-auto">
        <DialogHeader><DialogTitle className="text-sm">{initial ? `Редактирование ${initial.protocol}` : "Новое испытание"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <label className="space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Метод НК</span>
            <select value={form.method} onChange={(e) => changeMethod(e.target.value as Method)} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <Inp l="Протокол №" v={form.protocol} set={(v) => set({ protocol: v })} />
          <Inp l="Дата контроля" v={form.date} set={(v) => set({ date: v })} type="date" />

          <label className="col-span-2 space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Объект контроля</span>
            <input list="objects" value={form.object} onChange={(e) => set({ object: e.target.value })} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
            <datalist id="objects">{OBJECTS.map((o) => <option key={o} value={o} />)}</datalist>
          </label>
          <label className="space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Заказчик</span>
            <input list="customers" value={form.customer} onChange={(e) => set({ customer: e.target.value })} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
            <datalist id="customers">{CUSTOMERS.map((o) => <option key={o} value={o} />)}</datalist>
          </label>

          <Inp l="Соединение / шов" v={form.joint} set={(v) => set({ joint: v })} ph="Сварное соединение С17, шов №4" />
          <Inp l="Материал" v={form.material} set={(v) => set({ material: v })} />
          <Inp l="Толщина" v={form.thickness} set={(v) => set({ thickness: v })} />

          <label className="space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Нормативный документ</span>
            <select value={form.standard} onChange={(e) => set({ standard: e.target.value })} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
              {METHOD_STANDARDS[form.method].map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Специалист НК</span>
            <select value={form.operator} onChange={(e) => set({ operator: e.target.value })} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
              {OPERATORS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <Inp l="Объём контроля" v={form.scope} set={(v) => set({ scope: v })} />

          <label className="col-span-2 space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Средства контроля</span>
            <input value={form.equipment} onChange={(e) => set({ equipment: e.target.value })} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <label className="space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Статус</span>
            <select value={form.status} onChange={(e) => set({ status: e.target.value as Status })} className="h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>

          <div className="col-span-3 mt-1 text-[10px] font-semibold uppercase text-muted-foreground">Параметры метода · {form.method}</div>
          {METHOD_FIELDS[form.method].map((f) => (
            <Inp key={f.key} l={f.label} v={form.params[f.key] ?? ""} set={(v) => setParam(f.key, v)} ph={f.ph} />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onClose}><XCircle className="size-3.5" />Отмена</Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => {
            const isNew = !initial;
            const t: Test = {
              ...form,
              joint: form.joint || "Сварное соединение (без обозначения)",
              changes: [...form.changes, { at: stamp(), who: form.operator, what: isNew ? "Испытание зарегистрировано в журнале" : "Данные испытания изменены" }],
            };
            onSave(t, isNew);
          }}><CheckCircle2 className="size-3.5" />Сохранить</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- ui bits ---------------- */

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

function Sel({ label, value, options, onChange, width = "w-[180px]" }: { label: string; value: string; options: string[]; onChange: (v: string) => void; width?: string }) {
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
  return <div className="flex gap-2"><span className="shrink-0 text-muted-foreground">{l}:</span><span className="ml-auto text-right font-medium">{v}</span></div>;
}
