import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Download,
  FileSpreadsheet, FileText, Filter, Plus, Search, ShieldAlert, Wrench, X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ROLE_TITLE, useAccess } from "@/lib/roles";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "Реестр оборудования и поверок — NDT Control" },
      { name: "description", content: "Реестр средств контроля лаборатории НК: поверки, калибровки, ответственные и предупреждения о просроченной калибровке по ISO/IEC 17025." },
      { property: "og:title", content: "Реестр оборудования и поверок — NDT Control" },
      { property: "og:description", content: "Фильтры по методу НК, ответственному и срокам поверки, паспорта приборов и журнал калибровок." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquipmentPage,
});

export const TODAY = new Date("2026-09-20T00:00:00Z");

export type Item = {
  id: string;
  name: string;
  model: string;
  method: "ВИК" | "УЗК" | "РК" | "МПК" | "ПВК" | "Образцы и калибры";
  serial: string;
  inv: string;
  owner: string;
  location: string;
  cert: string;
  lastDate: string;
  nextDate: string;
  interval: string;
  inService: boolean;
  specs: [string, string][];
  history: { date: string; type: string; cert: string; org: string; result: string }[];
};

export const day = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const ru = (s: string) => s.split("-").reverse().join(".");
export const shift = (days: number) => iso(new Date(TODAY.getTime() + days * day));

export const data: Item[] = [
  {
    id: "e1", name: "Дефектоскоп ультразвуковой", model: "USN 60 (GE)", method: "УЗК",
    serial: "40673", inv: "ЛНК-УЗК-014", owner: "Соколов Д.М. (ведущий дефектоскопист)",
    location: "Лаборатория, шкаф №2", cert: "С-УЗ/24-4117", lastDate: shift(-353), nextDate: shift(-12),
    interval: "12 мес.", inService: false,
    specs: [["Диапазон толщин", "1…1000 мм (сталь)"], ["Частоты ПЭП", "0,5…20 МГц"], ["Развёртка", "A-Scan, 400 мм"], ["Погрешность глубиномера", "±0,1 мм"], ["Методика поверки", "МП 2512-0091-2015"]],
    history: [
      { date: shift(-353), type: "Периодическая поверка", cert: "С-УЗ/24-4117", org: "ФБУ «Ростест-Москва»", result: "Годен" },
      { date: shift(-718), type: "Периодическая поверка", cert: "С-УЗ/23-2210", org: "ФБУ «Ростест-Москва»", result: "Годен" },
    ],
  },
  {
    id: "e2", name: "Дефектоскоп ультразвуковой", model: "А1212 MASTER", method: "УЗК",
    serial: "12-0876", inv: "ЛНК-УЗК-021", owner: "Соколов Д.М. (ведущий дефектоскопист)",
    location: "Выездная бригада №2", cert: "С-УЗ/26-1180", lastDate: shift(-347), nextDate: shift(18),
    interval: "12 мес.", inService: true,
    specs: [["Диапазон толщин", "1…6000 мм"], ["Частоты ПЭП", "0,4…15 МГц"], ["Питание", "Li-Ion, 9 ч"], ["Память", "до 20 000 A-Scan"], ["Методика поверки", "МП 45-221-2019"]],
    history: [
      { date: shift(-347), type: "Периодическая поверка", cert: "С-УЗ/26-1180", org: "ФГУП «ВНИИФТРИ»", result: "Годен" },
      { date: shift(-712), type: "Периодическая поверка", cert: "С-УЗ/25-0934", org: "ФГУП «ВНИИФТРИ»", result: "Годен" },
    ],
  },
  {
    id: "e3", name: "Дефектоскоп ультразвуковой", model: "Epoch 650 (Olympus)", method: "УЗК",
    serial: "EP650-3391", inv: "ЛНК-УЗК-030", owner: "Иванов А.П. (дефектоскопист УЗК II ур.)",
    location: "Лаборатория, стенд УЗК", cert: "—", lastDate: shift(-366), nextDate: shift(-1),
    interval: "12 мес.", inService: false,
    specs: [["Диапазон толщин", "1…12 000 мм"], ["Каналы", "1, ФАР нет"], ["Частоты", "0,2…20 МГц"], ["Класс защиты", "IP66"], ["Состояние", "Передан на поверку 19.09.2026"]],
    history: [
      { date: shift(-366), type: "Периодическая поверка", cert: "С-УЗ/25-7712", org: "ФБУ «Ростест-Москва»", result: "Годен" },
      { date: shift(-1), type: "Сдан на поверку", cert: "заявка №ЛНК-441", org: "ФБУ «Ростест-Москва»", result: "В работе" },
    ],
  },
  {
    id: "e4", name: "Толщиномер ультразвуковой", model: "DM5E (GE)", method: "УЗК",
    serial: "DM5-22194", inv: "ЛНК-УЗК-045", owner: "Петрова Е.С. (метролог)",
    location: "Лаборатория, шкаф №1", cert: "С-Т/26-0318", lastDate: shift(-180), nextDate: shift(185),
    interval: "12 мес.", inService: true,
    specs: [["Диапазон", "0,5…500 мм"], ["Дискретность", "0,01 мм"], ["Погрешность", "±0,05 мм"], ["Методика поверки", "МП 2512-0027-2014"]],
    history: [{ date: shift(-180), type: "Периодическая поверка", cert: "С-Т/26-0318", org: "ФБУ «Ростест-Москва»", result: "Годен" }],
  },
  {
    id: "e5", name: "Толщиномер ультразвуковой", model: "Булат 1S", method: "УЗК",
    serial: "B1S-7704", inv: "ЛНК-УЗК-046", owner: "Петрова Е.С. (метролог)",
    location: "Выездная бригада №1", cert: "С-Т/26-0455", lastDate: shift(-337), nextDate: shift(28),
    interval: "12 мес.", inService: true,
    specs: [["Диапазон", "0,8…300 мм"], ["Дискретность", "0,01 мм"], ["Режим", "через покрытие до 3 мм"], ["Методика поверки", "МП 40-2018"]],
    history: [{ date: shift(-337), type: "Периодическая поверка", cert: "С-Т/26-0455", org: "ФГУП «ВНИИФТРИ»", result: "Годен" }],
  },
  {
    id: "e6", name: "Аппарат рентгеновский импульсный", model: "РПД-200", method: "РК",
    serial: "РПД-200-118", inv: "ЛНК-РК-003", owner: "Гончаров В.И. (инженер РК I ур.)",
    location: "Бокс РК, помещение 12", cert: "С-РК/26-0771", lastDate: shift(-300), nextDate: shift(65),
    interval: "12 мес.", inService: true,
    specs: [["Напряжение на трубке", "200 кВ"], ["Просвечиваемая толщина", "до 40 мм (сталь)"], ["Фокусное пятно", "2,0 мм"], ["Разрешение", "по ГОСТ 7512-82"], ["Дозиметрический контроль", "выполнен 11.06.2026"]],
    history: [
      { date: shift(-300), type: "Периодическая поверка", cert: "С-РК/26-0771", org: "ФБУ «ЦСМ Росстандарта»", result: "Годен" },
      { date: shift(-665), type: "Периодическая поверка", cert: "С-РК/25-0612", org: "ФБУ «ЦСМ Росстандарта»", result: "Годен" },
    ],
  },
  {
    id: "e7", name: "Аппарат рентгеновский", model: "SITE-X C 3005", method: "РК",
    serial: "SX-3005-441", inv: "ЛНК-РК-007", owner: "Гончаров В.И. (инженер РК I ур.)",
    location: "Выездной комплект РК", cert: "С-РК/25-2214", lastDate: shift(-358), nextDate: shift(7),
    interval: "12 мес.", inService: true,
    specs: [["Напряжение", "300 кВ"], ["Ток", "3,0 мА"], ["Просвечивание", "до 55 мм (сталь)"], ["Охлаждение", "воздушное"], ["Норматив", "ГОСТ ISO 17636-1-2017"]],
    history: [{ date: shift(-358), type: "Периодическая поверка", cert: "С-РК/25-2214", org: "ФБУ «ЦСМ Росстандарта»", result: "Годен" }],
  },
  {
    id: "e8", name: "Кроулер / аппарат рентгеновский", model: "Eresco 42 MF4", method: "РК",
    serial: "ER42-0093", inv: "ЛНК-РК-011", owner: "Гончаров В.И. (инженер РК I ур.)",
    location: "Бокс РК, помещение 12", cert: "—", lastDate: shift(-410), nextDate: shift(-45),
    interval: "12 мес.", inService: false,
    specs: [["Напряжение", "200 кВ"], ["Ток", "4,5 мА"], ["Фокусное пятно", "3,0 мм"], ["Статус", "просрочена поверка, опломбирован"]],
    history: [
      { date: shift(-410), type: "Периодическая поверка", cert: "С-РК/25-0090", org: "ФБУ «ЦСМ Росстандарта»", result: "Годен" },
      { date: shift(-40), type: "Внутренняя проверка", cert: "акт ЛНК-А-77", org: "ЛНК-017", result: "Изъят из эксплуатации" },
    ],
  },
  {
    id: "e9", name: "Магнитопорошковый дефектоскоп (ярмо)", model: "Parker B-300S", method: "МПК",
    serial: "B300-5521", inv: "ЛНК-МПК-002", owner: "Кузнецова И.В. (дефектоскопист МПК II ур.)",
    location: "Участок МПК", cert: "С-МП/26-1042", lastDate: shift(-120), nextDate: shift(245),
    interval: "12 мес.", inService: true,
    specs: [["Тип поля", "переменное, AC"], ["Подъёмная сила", "≥ 4,5 кг (75 мм)"], ["Межполюсное расстояние", "50…150 мм"], ["Норматив", "ГОСТ Р 56512-2015"]],
    history: [{ date: shift(-120), type: "Периодическая поверка", cert: "С-МП/26-1042", org: "ФБУ «Ростест-Москва»", result: "Годен" }],
  },
  {
    id: "e10", name: "Дефектоскоп магнитный", model: "МД-М (МЭТ)", method: "МПК",
    serial: "MDM-0317", inv: "ЛНК-МПК-008", owner: "Кузнецова И.В. (дефектоскопист МПК II ур.)",
    location: "Участок МПК", cert: "С-МП/26-0830", lastDate: shift(-344), nextDate: shift(21),
    interval: "12 мес.", inService: true,
    specs: [["Намагничивание", "циркулярное / продольное"], ["Ток", "до 1200 А"], ["Индикаторы", "суспензия МК-1"], ["Норматив", "ГОСТ 21105-87"]],
    history: [{ date: shift(-344), type: "Периодическая поверка", cert: "С-МП/26-0830", org: "ФГУП «ВНИИФТРИ»", result: "Годен" }],
  },
  {
    id: "e11", name: "Комплект визуально-измерительного контроля", model: "ВИК-1", method: "ВИК",
    serial: "ВИК1-2291", inv: "ЛНК-ВИК-005", owner: "Иванов А.П. (дефектоскопист ВИК II ур.)",
    location: "Лаборатория, шкаф №3", cert: "С-ВИ/26-0229", lastDate: shift(-210), nextDate: shift(155),
    interval: "12 мес.", inService: true,
    specs: [["Состав", "УШС-3, лупа ЛИ-3-10х, набор щупов"], ["Шероховатость", "образцы сравнения"], ["Норматив", "РД 03-606-03"]],
    history: [{ date: shift(-210), type: "Периодическая поверка", cert: "С-ВИ/26-0229", org: "ФБУ «ЦСМ Росстандарта»", result: "Годен" }],
  },
  {
    id: "e12", name: "Штангенциркуль", model: "ШЦЦ-I-150-0,01", method: "ВИК",
    serial: "SHC-88104", inv: "ЛНК-ВИК-019", owner: "Петрова Е.С. (метролог)",
    location: "Лаборатория, шкаф №3", cert: "С-ВИ/25-9930", lastDate: shift(-372), nextDate: shift(-7),
    interval: "12 мес.", inService: false,
    specs: [["Диапазон", "0…150 мм"], ["Дискретность", "0,01 мм"], ["Класс", "по ГОСТ 166-89"], ["Статус", "просрочена поверка"]],
    history: [{ date: shift(-372), type: "Периодическая поверка", cert: "С-ВИ/25-9930", org: "ФБУ «Ростест-Москва»", result: "Годен" }],
  },
  {
    id: "e13", name: "Шаблон сварщика", model: "УШС-3", method: "ВИК",
    serial: "USHS-4417", inv: "ЛНК-ВИК-024", owner: "Иванов А.П. (дефектоскопист ВИК II ур.)",
    location: "Выездная бригада №2", cert: "С-ВИ/26-0611", lastDate: shift(-95), nextDate: shift(270),
    interval: "12 мес.", inService: true,
    specs: [["Измерения", "высота шва, катет, зазор"], ["Диапазон", "0…50 мм"], ["Погрешность", "±0,2 мм"], ["Норматив", "ГОСТ Р ИСО 17637-2014"]],
    history: [{ date: shift(-95), type: "Периодическая поверка", cert: "С-ВИ/26-0611", org: "ФБУ «ЦСМ Росстандарта»", result: "Годен" }],
  },
  {
    id: "e14", name: "Комплект капиллярного контроля", model: "Sherwin DP-55 / DR-60", method: "ПВК",
    serial: "SHW-2026-08", inv: "ЛНК-ПВК-004", owner: "Кузнецова И.В. (дефектоскопист ПВК II ур.)",
    location: "Участок ПВК", cert: "С-ПВ/26-0187", lastDate: shift(-60), nextDate: shift(26),
    interval: "6 мес.", inService: true,
    specs: [["Класс чувствительности", "II (по ГОСТ 18442-80)"], ["Контрольный образец", "КО-1 с трещинами 1,5 мкм"], ["Температура применения", "+5…+50 °C"]],
    history: [{ date: shift(-60), type: "Аттестация комплекта", cert: "С-ПВ/26-0187", org: "ЛНК-017 (внутренняя)", result: "Годен" }],
  },
  {
    id: "e15", name: "Стандартный образец", model: "СО-2 (V2)", method: "Образцы и калибры",
    serial: "V2-1147", inv: "ЛНК-КО-114", owner: "Петрова Е.С. (метролог)",
    location: "Метрологический сейф", cert: "К-ОБ/26-0044", lastDate: shift(-706), nextDate: shift(24),
    interval: "24 мес.", inService: true,
    specs: [["Материал", "сталь 20, V≈5920 м/с"], ["Назначение", "настройка угла ввода и чувствительности"], ["Норматив", "ГОСТ Р ИСО 7963-2012"]],
    history: [{ date: shift(-706), type: "Калибровка", cert: "К-ОБ/26-0044", org: "ФГУП «ВНИИФТРИ»", result: "Годен" }],
  },
  {
    id: "e16", name: "Стандартный образец", model: "СО-3 (V1)", method: "Образцы и калибры",
    serial: "V1-0982", inv: "ЛНК-КО-097", owner: "Петрова Е.С. (метролог)",
    location: "Метрологический сейф", cert: "К-ОБ/25-0311", lastDate: shift(-500), nextDate: shift(230),
    interval: "24 мес.", inService: true,
    specs: [["Материал", "сталь 20"], ["Назначение", "определение точки выхода луча, стрелы ПЭП"], ["Норматив", "ГОСТ Р ИСО 2400-2013"]],
    history: [{ date: shift(-500), type: "Калибровка", cert: "К-ОБ/25-0311", org: "ФГУП «ВНИИФТРИ»", result: "Годен" }],
  },
  {
    id: "e17", name: "Образец предприятия (СОП)", model: "СОП-В3-10 сварной шов Ø325×8", method: "Образцы и калибры",
    serial: "SOP-325-08", inv: "ЛНК-КО-131", owner: "Соколов Д.М. (ведущий дефектоскопист)",
    location: "Метрологический сейф", cert: "К-ОБ/26-0129", lastDate: shift(-310), nextDate: shift(-20),
    interval: "12 мес.", inService: false,
    specs: [["Отражатели", "зарубка 2×1 мм, плоскодонное сверление Ø3"], ["Материал", "сталь 09Г2С"], ["Статус", "просрочена калибровка"]],
    history: [{ date: shift(-310), type: "Калибровка", cert: "К-ОБ/26-0129", org: "ЛНК-017 (внутренняя)", result: "Годен" }],
  },
  {
    id: "e18", name: "Ступенчатый клин (мера толщины)", model: "КУСОТ-180", method: "Образцы и калибры",
    serial: "KUS-180-12", inv: "ЛНК-КО-140", owner: "Петрова Е.С. (метролог)",
    location: "Метрологический сейф", cert: "К-ОБ/26-0402", lastDate: shift(-150), nextDate: shift(215),
    interval: "12 мес.", inService: true,
    specs: [["Ступени", "2 / 4 / 6 / 8 / 10 мм"], ["Погрешность", "±0,02 мм"], ["Назначение", "настройка толщиномеров"]],
    history: [{ date: shift(-150), type: "Калибровка", cert: "К-ОБ/26-0402", org: "ФБУ «Ростест-Москва»", result: "Годен" }],
  },
];

const methods = ["Все методы", "ВИК", "УЗК", "РК", "МПК", "ПВК", "Образцы и калибры"] as const;
const owners = ["Все ответственные", ...Array.from(new Set(data.map((i) => i.owner)))];
const statuses = ["Все", "Действует", "Истекает (<30 дней)", "Просрочена", "На калибровке/поверке"] as const;

const daysLeft = (item: Item) => Math.round((new Date(item.nextDate).getTime() - TODAY.getTime()) / day);
type Status = "ok" | "soon" | "overdue" | "service";
const statusOf = (item: Item): Status => {
  const left = daysLeft(item);
  if (left < 0) return "overdue";
  if (!item.inService) return "service";
  return left <= 30 ? "soon" : "ok";
};

function EquipmentPage() {
  const [method, setMethod] = useState<string>("Все методы");
  const [owner, setOwner] = useState<string>("Все ответственные");
  const [status, setStatus] = useState<string>("Все");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Item | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { user, can } = useAccess();

  const counts = useMemo(() => ({
    overdue: data.filter((i) => statusOf(i) === "overdue").length,
    soon: data.filter((i) => statusOf(i) === "soon").length,
    service: data.filter((i) => statusOf(i) === "service").length,
    ok: data.filter((i) => statusOf(i) === "ok").length,
  }), []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((item) => {
      if (method !== "Все методы" && item.method !== method) return false;
      if (owner !== "Все ответственные" && item.owner !== owner) return false;
      const st = statusOf(item);
      if (status === "Действует" && st !== "ok") return false;
      if (status === "Истекает (<30 дней)" && st !== "soon") return false;
      if (status === "Просрочена" && st !== "overdue") return false;
      if (status === "На калибровке/поверке" && st !== "service") return false;
      if (q && ![item.name, item.model, item.serial, item.inv, item.cert].some((f) => f.toLowerCase().includes(q))) return false;
      return true;
    }).sort((a, b) => daysLeft(a) - daysLeft(b));
  }, [method, owner, status, query]);

  const fire = (message: string) => { setToast(message); setTimeout(() => setToast(null), 3200); };

  return (
    <AppShell active="Оборудование и поверки" breadcrumb="Оборудование и поверки" searchPlaceholder="Поиск по прибору, зав. №, инв. №…">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold">Реестр оборудования и средств контроля</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Метрологический парк ЛНК-017 · {data.length} ед. · актуально на 20.09.2026 · ISO/IEC 17025:2017, п. 6.4</p>
        </div>
        <div className="flex gap-2">
          <span className="mr-1 self-center rounded-sm bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">{user.name} · {ROLE_TITLE[user.role]}</span>
          {can("equipment.manage") && <Button size="sm" className="h-8 text-xs" onClick={() => fire("Форма «Добавить оборудование» откроется в карточке паспорта (демо-данные)")}><Plus className="size-3.5" />Добавить оборудование</Button>}
          {can("equipment.calibrate") && <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fire("Регистрация поверки: выберите прибор в таблице и внесите свидетельство")}><ClipboardCheck className="size-3.5" />Зарегистрировать поверку</Button>}
          {can("docs.export") && <>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fire(`Экспорт в Excel: ${rows.length} записей выгружено (демо)`)}><FileSpreadsheet className="size-3.5" />Excel</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fire(`Экспорт в PDF: ${rows.length} записей выгружено (демо)`)}><FileText className="size-3.5" />PDF</Button>
          </>}
        </div>
      </div>

      {(counts.overdue > 0 || counts.soon > 0) && (
        <div className="mb-3 flex items-center gap-3 rounded-sm border border-destructive/40 bg-destructive/8 p-3">
          <ShieldAlert className="size-5 shrink-0 text-destructive" />
          <div className="min-w-0 text-xs">
            <div className="font-bold text-destructive">Внимание: нарушение метрологического обеспечения — {counts.overdue} ед. с просроченной калибровкой</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Оборудование с истёкшим сроком поверки запрещено к применению в испытаниях (ISO/IEC 17025:2017, п. 6.4.6). Ещё {counts.soon} ед. требуют поверки в ближайшие 30 дней.</div>
          </div>
          <div className="ml-auto flex shrink-0 gap-2">
            <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={() => setStatus("Просрочена")}><AlertTriangle className="size-3.5" />Показать просроченные ({counts.overdue})</Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus("Истекает (<30 дней)")}><CalendarClock className="size-3.5" />Истекают ({counts.soon})</Button>
          </div>
        </div>
      )}

      <div className="mb-3 grid grid-cols-4 gap-3">
        <Tile tone="red" icon={AlertTriangle} label="Просрочена калибровка" value={counts.overdue} note="Запрещено к испытаниям" onClick={() => setStatus("Просрочена")} />
        <Tile tone="yellow" icon={CalendarClock} label="Истекает менее 30 дней" value={counts.soon} note="Планировать поверку" onClick={() => setStatus("Истекает (<30 дней)")} />
        <Tile tone="blue" icon={Wrench} label="На калибровке / поверке" value={counts.service} note="Временно изъято" onClick={() => setStatus("На калибровке/поверке")} />
        <Tile tone="green" icon={CheckCircle2} label="Поверка действует" value={counts.ok} note="Допущено к испытаниям" onClick={() => setStatus("Действует")} />
      </div>

      <div className="rounded-sm border bg-card shadow-panel">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-muted-foreground"><Filter className="size-3.5" />Фильтры</div>
          <Select label="Метод НК" value={method} options={[...methods]} onChange={setMethod} />
          <Select label="Ответственный" value={owner} options={owners} onChange={setOwner} width="w-[280px]" />
          <Select label="Срок поверки" value={status} options={[...statuses]} onChange={setStatus} />
          <div className="relative ml-auto w-[300px]">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 w-full rounded-sm border bg-background pl-8 pr-3 text-[11px] outline-none focus:ring-2 focus:ring-ring" placeholder="Наименование, зав. №, инв. №, свидетельство…" />
          </div>
          {(method !== "Все методы" || owner !== "Все ответственные" || status !== "Все" || query) && (
            <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={() => { setMethod("Все методы"); setOwner("Все ответственные"); setStatus("Все"); setQuery(""); }}><X className="size-3.5" />Сбросить</Button>
          )}
        </div>

        <div className="max-h-[520px] overflow-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="text-left text-[9px] uppercase tracking-wide text-muted-foreground">
                {["Наименование / модель", "Метод", "Зав. № / инв. №", "Ответственный", "Свидетельство", "Последняя поверка", "След. поверка", "МПИ", "Статус"].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b px-3 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const st = statusOf(item);
                const left = daysLeft(item);
                return (
                  <tr key={item.id} onClick={() => setDetail(item)} className={`cursor-pointer border-b transition-colors hover:bg-accent/60 ${st === "overdue" ? "bg-red/8" : ""}`}>
                    <td className="px-3 py-2"><div className="font-semibold">{item.name}</div><div className="text-[10px] text-muted-foreground">{item.model} · {item.location}</div></td>
                    <td className="px-3 py-2"><span className="rounded-sm border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{item.method}</span></td>
                    <td className="px-3 py-2 tabular-nums"><div>зав. № {item.serial}</div><div className="text-[10px] text-muted-foreground">{item.inv}</div></td>
                    <td className="px-3 py-2">{item.owner}</td>
                    <td className="px-3 py-2 tabular-nums">{item.cert}</td>
                    <td className="px-3 py-2 tabular-nums">{ru(item.lastDate)}</td>
                    <td className={`px-3 py-2 tabular-nums font-semibold ${st === "overdue" ? "text-destructive" : st === "soon" ? "text-warning" : ""}`}>{ru(item.nextDate)}</td>
                    <td className="px-3 py-2 tabular-nums">{item.interval}</td>
                    <td className="px-3 py-2"><StatusBadge status={st} left={left} /></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-xs text-muted-foreground">По заданным фильтрам оборудование не найдено</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 border-t px-3 py-2 text-[10px] text-muted-foreground">
          <span>Показано {rows.length} из {data.length} записей</span>
          <span className="ml-auto">Записи ведутся по ISO/IEC 17025:2017 п. 6.4.13 · ГОСТ Р 8.568-2017</span>
        </div>
      </div>

      {toast && <div className="fixed bottom-10 right-6 z-50 rounded-sm border bg-popover px-4 py-2 text-xs text-popover-foreground shadow-panel">{toast}</div>}

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-3xl rounded-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base"><Wrench className="size-5 text-primary" />Паспорт средства контроля</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 border-l-2 border-primary pl-3">
                <div>
                  <div className="text-sm font-semibold">{detail.name} · {detail.model}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">зав. № {detail.serial} · {detail.inv} · {detail.location}</div>
                </div>
                <div className="ml-auto"><StatusBadge status={statusOf(detail)} left={daysLeft(detail)} /></div>
              </div>

              {statusOf(detail) === "overdue" && (
                <div className="flex items-center gap-2 rounded-sm border border-destructive/40 bg-destructive/8 px-3 py-2 text-[11px] font-semibold text-destructive">
                  <ShieldAlert className="size-4" />Просрочена калибровка — запрещено к испытаниям по ISO/IEC 17025 (п. 6.4.6)
                </div>
              )}

              <div className="grid grid-cols-4 gap-3 text-[11px]">
                <Field label="Метод НК" value={detail.method} />
                <Field label="Ответственный" value={detail.owner} />
                <Field label="Свидетельство" value={detail.cert} />
                <Field label="Межповерочный интервал" value={detail.interval} />
                <Field label="Последняя поверка" value={ru(detail.lastDate)} />
                <Field label="Следующая поверка" value={ru(detail.nextDate)} />
                <Field label="Остаток срока" value={`${daysLeft(detail)} дн.`} />
                <Field label="Допуск к работам" value={statusOf(detail) === "overdue" ? "Запрещено" : statusOf(detail) === "service" ? "Изъято (поверка)" : "Разрешено"} />
              </div>

              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">Технические характеристики</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-sm border bg-muted/30 p-3 text-[11px]">
                  {detail.specs.map(([k, v]) => <div key={k} className="flex gap-2"><span className="text-muted-foreground">{k}:</span><span className="ml-auto text-right font-medium">{v}</span></div>)}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">Журнал поверок и калибровок</div>
                <table className="w-full border-collapse text-[11px]">
                  <thead><tr className="text-left text-[9px] uppercase text-muted-foreground">{["Дата", "Вид работ", "Документ", "Организация", "Результат"].map((h) => <th key={h} className="border-b px-2 py-1.5">{h}</th>)}</tr></thead>
                  <tbody>
                    {detail.history.map((h) => (
                      <tr key={h.date + h.cert} className="border-b last:border-0">
                        <td className="px-2 py-1.5 tabular-nums">{ru(h.date)}</td>
                        <td className="px-2 py-1.5">{h.type}</td>
                        <td className="px-2 py-1.5 tabular-nums">{h.cert}</td>
                        <td className="px-2 py-1.5">{h.org}</td>
                        <td className="px-2 py-1.5 font-semibold">{h.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetail(null)}>Закрыть</Button>
                {can("docs.export") && <Button variant="outline" size="sm" onClick={() => fire(`Паспорт ${detail.inv} выгружен в PDF (демо)`)}><Download className="size-4" />Выгрузить паспорт</Button>}
                {can("equipment.calibrate")
                  ? <Button size="sm" onClick={() => { fire(`Поверка для ${detail.inv} зарегистрирована в журнале (демо)`); setDetail(null); }}><ClipboardCheck className="size-4" />Зарегистрировать поверку</Button>
                  : <span className="self-center text-[11px] text-muted-foreground">Регистрация поверок недоступна для роли «{ROLE_TITLE[user.role]}»</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StatusBadge({ status, left }: { status: Status; left: number }) {
  if (status === "overdue") return <span className="inline-flex flex-col rounded-sm bg-red/15 px-2 py-1 text-[10px] font-bold text-red"><span>Просрочена ({Math.abs(left)} дн.)</span><span className="text-[8px] font-medium opacity-80">Запрещено к испытаниям</span></span>;
  if (status === "service") return <span className="inline-flex rounded-sm bg-blue/15 px-2 py-1 text-[10px] font-bold text-blue">На поверке</span>;
  if (status === "soon") return <span className="inline-flex rounded-sm bg-yellow/20 px-2 py-1 text-[10px] font-bold text-yellow">Истекает через {left} дн.</span>;
  return <span className="inline-flex rounded-sm bg-green/15 px-2 py-1 text-[10px] font-bold text-green">Действует</span>;
}

function Tile({ tone, icon: Icon, label, value, note, onClick }: { tone: string; icon: React.ElementType; label: string; value: number; note: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-sm border bg-card p-3 text-left shadow-panel transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-2">
        <span className={`grid size-7 place-items-center rounded-sm bg-${tone}/15 text-${tone}`}><Icon className="size-4" /></span>
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
        <strong className="ml-auto text-2xl tabular-nums">{value}</strong>
      </div>
      <div className="mt-1 text-[9px] text-muted-foreground">{note}</div>
    </button>
  );
}

function Select({ label, value, options, onChange, width = "w-[190px]" }: { label: string; value: string; options: string[]; onChange: (v: string) => void; width?: string }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${width} h-8 rounded-sm border bg-background px-2 text-[11px] outline-none focus:ring-2 focus:ring-ring`}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="rounded-sm border bg-muted/30 p-2"><div className="text-[9px] uppercase text-muted-foreground">{label}</div><div className="mt-0.5 font-semibold">{value}</div></div>;
}
