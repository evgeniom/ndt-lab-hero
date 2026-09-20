import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, AlertTriangle, BarChart3, Bell, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, Clock3, FileCheck2,
  FlaskConical, Gauge, Menu, Moon, Plus, Search, Settings, ShieldCheck, Sun,
  Users, Wrench, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "NDT Control — Дашборд лаборатории" },
    { name: "description", content: "Управление испытаниями, метрологией и качеством лаборатории НК по ISO/IEC 17025." },
    { property: "og:title", content: "NDT Control — Дашборд лаборатории" },
    { property: "og:description", content: "Единый рабочий экран лаборатории неразрушающего контроля." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Dashboard,
});

const methods = [
  { name: "ВИК", value: 84 }, { name: "УЗК", value: 68 }, { name: "РК", value: 42 },
  { name: "МПК", value: 35 }, { name: "ПВК", value: 28 },
];
const dynamics = [
  { m: "Апр", total: 142, fit: 93, defects: 7 }, { m: "Май", total: 158, fit: 91, defects: 9 },
  { m: "Июн", total: 151, fit: 94, defects: 6 }, { m: "Июл", total: 176, fit: 92, defects: 8 },
  { m: "Авг", total: 169, fit: 95, defects: 5 }, { m: "Сен", total: 188, fit: 93, defects: 7 },
];
const defects = [
  { name: "Трещины", value: 31, color: "var(--chart-1)" }, { name: "Непровары", value: 27, color: "var(--chart-2)" },
  { name: "Поры", value: 24, color: "var(--chart-3)" }, { name: "Шлак. включения", value: 18, color: "var(--chart-4)" },
];
const equipment = [
  { name: "В строю", value: 38, color: "var(--success)" }, { name: "Калибровка", value: 7, color: "var(--info)" },
  { name: "Требует поверки", value: 4, color: "var(--warning)" },
];
type Task = { id: number; day: number; type: "red" | "blue" | "yellow" | "green"; time: string; title: string; meta: string; priority: string; done: boolean };
const seedTasks: Task[] = [
  { id: 1, day: 20, type: "red", time: "09:00", title: "Поверка дефектоскопа USN 60", meta: "Зав. № 40673 · ФГУП ВНИИФТРИ", priority: "Высокий", done: false },
  { id: 2, day: 20, type: "blue", time: "11:30", title: "Выездной УЗК — ООО «СеверСталь»", meta: "Трубопровод ТК-12 · бригада №2", priority: "Средний", done: false },
  { id: 3, day: 20, type: "green", time: "15:00", title: "Проверка записей СМК", meta: "П. 7.5 ISO/IEC 17025", priority: "Средний", done: true },
  { id: 4, day: 22, type: "yellow", time: "10:00", title: "Продление аттестации Иванова А.П.", meta: "УЗК II уровень · ПБ 03-440", priority: "Высокий", done: false },
  { id: 5, day: 25, type: "green", time: "14:00", title: "Внутренний аудит лаборатории", meta: "Аудитор: Кузнецова И.В.", priority: "Средний", done: false },
  { id: 6, day: 28, type: "red", time: "09:30", title: "Калибровка образца V2", meta: "Инв. № КО-114", priority: "Высокий", done: false },
];

const nav = [
  [BarChart3, "Дашборд", "Обзор лаборатории"], [ClipboardList, "Журнал испытаний", "Реестр протоколов"],
  [Wrench, "Оборудование и поверки", "Метрологический парк"], [Users, "Специалисты и аттестация", "Допуски и уровни"],
  [ShieldCheck, "Качество и аудит ISO 17025", "СМК и несоответствия"],
] as const;

function Dashboard() {
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedDay, setSelectedDay] = useState(20);
  const [view, setView] = useState<"month" | "week">("month");
  const [tasks, setTasks] = useState(seedTasks);
  const [newTask, setNewTask] = useState("");
  const [detail, setDetail] = useState<Task | null>(null);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  const selectedTasks = tasks.filter((task) => task.day === selectedDay);
  const days = useMemo(() => view === "month" ? Array.from({ length: 35 }, (_, i) => i < 2 ? null : i - 1) : [20,21,22,23,24,25,26], [view]);
  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((current) => [...current, { id: Date.now(), day: selectedDay, type: "blue", time: "16:00", title: newTask.trim(), meta: "Добавлено вручную", priority: "Средний", done: false }]);
    setNewTask("");
  };

  return (
    <AppShell active="Дашборд" breadcrumb="Дашборд">
      <>

            <div className="mb-4 flex items-end justify-between"><div><h1 className="text-xl font-bold">Дашборд лаборатории</h1><p className="mt-0.5 text-xs text-muted-foreground">Оперативная сводка · 20 сентября 2026 · смена 1</p></div><div className="flex gap-2">{([{icon:Plus,label:"Новое испытание"},{icon:Gauge,label:"Внести замер"},{icon:FileCheck2,label:"Сформировать протокол"},{icon:Wrench,label:"Журнал калибровок"}]).map(({icon:Icon,label},i)=><Button key={label} variant={i===0?"default":"outline"} size="sm" className="h-8 text-xs"><Icon className="size-3.5" />{label}</Button>)}</div></div>

            <section className="mb-4 grid grid-cols-4 gap-3">
              <Stat icon={Activity} label="Активные испытания" value="24" note="6 выездных · 18 в лаборатории" tone="info" />
              <Stat icon={FileCheck2} label="Готовы к утверждению" value="7" note="ISO 17025 · требуется ЭП" tone="success" />
              <Stat icon={AlertTriangle} label="Поверка менее 30 дней" value="4" note="2 критично · ближайшая 22 сен" tone="warning" />
              <Stat icon={ShieldCheck} label="Индекс соответствия СМК" value="94%" note="Готовность к аудиту: высокая" tone="success" progress={94} />
            </section>

            <section className="mb-4 grid grid-cols-[1.05fr_1.5fr_0.9fr_0.9fr] gap-3">
              <Panel title="Испытания по методам НК" subtitle="За текущий месяц" action="277 всего">
                <ResponsiveContainer width="100%" height={174}><BarChart data={methods} layout="vertical" margin={{ left: 0, right: 12 }}><CartesianGrid stroke="var(--border)" horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={38} tick={{fontSize:10,fill:"var(--muted-foreground)"}} axisLine={false} tickLine={false}/><ChartTooltip contentStyle={tipStyle}/><Bar dataKey="value" fill="var(--primary)" radius={[0,2,2,0]} barSize={13}/></BarChart></ResponsiveContainer>
              </Panel>
              <Panel title="Динамика контроля" subtitle="Объём испытаний и показатели годности" action="6 месяцев">
                <ResponsiveContainer width="100%" height={174}><AreaChart data={dynamics} margin={{left:-22,right:8,top:8}}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity={.28}/><stop offset="1" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false}/><YAxis tick={axisTick} axisLine={false} tickLine={false}/><ChartTooltip contentStyle={tipStyle}/><Area type="monotone" dataKey="total" stroke="var(--primary)" fill="url(#area)" strokeWidth={2}/><Line type="monotone" dataKey="fit" stroke="var(--success)" dot={false} strokeWidth={2}/></AreaChart></ResponsiveContainer>
              </Panel>
              <Panel title="Категории дефектов" subtitle="61 выявлено" action="Сентябрь">
                <Donut data={defects} center="61" />
              </Panel>
              <Panel title="Метрологический парк" subtitle="49 единиц" action="Обновлено 08:40">
                <Donut data={equipment} center="49" />
              </Panel>
            </section>

            <section className="grid grid-cols-[1.55fr_1fr] gap-3">
              <Panel title="Календарь лаборатории" subtitle="Поверки, выезды, аттестации и аудит" action={null}>
                <div className="mb-3 flex items-center gap-3 border-b pb-3"><Button variant="ghost" size="icon" className="size-7"><ChevronLeft className="size-4" /></Button><strong className="min-w-32 text-sm">Сентябрь 2026</strong><Button variant="ghost" size="icon" className="size-7"><ChevronRight className="size-4" /></Button><Button variant="outline" size="sm" className="h-7 text-[11px]">Сегодня</Button><div className="ml-auto flex rounded-sm border p-0.5"><Button onClick={()=>setView("month")} variant={view==="month"?"secondary":"ghost"} size="sm" className="h-6 text-[10px]">Месяц</Button><Button onClick={()=>setView("week")} variant={view==="week"?"secondary":"ghost"} size="sm" className="h-6 text-[10px]">Неделя</Button></div></div>
                <div className="grid grid-cols-7 border-l border-t">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(d=><div key={d} className="border-b border-r bg-muted/50 py-1.5 text-center text-[9px] font-semibold uppercase text-muted-foreground">{d}</div>)}{days.map((day,i)=><button key={`${day}-${i}`} onClick={()=>day&&setSelectedDay(day)} className={`relative h-[48px] border-b border-r p-1.5 text-left align-top text-[10px] transition-colors hover:bg-accent ${day===selectedDay?"bg-primary/8 ring-1 ring-inset ring-primary":""} ${day===null?"bg-muted/20":""}`} disabled={!day}><span className={`${day===20?"inline-grid size-5 place-items-center rounded-full bg-primary text-primary-foreground":""}`}>{day}</span>{day && <div className="absolute bottom-1.5 left-1.5 flex gap-1">{tasks.filter(t=>t.day===day).slice(0,4).map(t=><span key={t.id} className={`size-1.5 rounded-full bg-${t.type}`} />)}</div>}</button>)}</div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-muted-foreground"><Legend color="red" text="Поверка / калибровка"/><Legend color="blue" text="Выездной контроль"/><Legend color="yellow" text="Аттестация"/><Legend color="green" text="Аудит ISO 17025"/></div>
              </Panel>

              <Panel title={`Задачи · ${selectedDay} сентября`} subtitle={`${selectedTasks.filter(t=>!t.done).length} открыто · ${selectedTasks.filter(t=>t.done).length} выполнено`} action={null}>
                <div className="max-h-[245px] space-y-1 overflow-auto pr-1">{selectedTasks.length ? selectedTasks.map(task=><div key={task.id} className="group flex items-start gap-2 rounded-sm border p-2 hover:bg-muted/40"><Checkbox checked={task.done} onCheckedChange={(checked)=>setTasks(current=>current.map(t=>t.id===task.id?{...t,done:checked===true}:t))} className="mt-0.5"/><button onClick={()=>setDetail(task)} className="min-w-0 flex-1 text-left"><div className="flex items-center gap-2"><span className={`size-2 rounded-full bg-${task.type}`}/><span className={`truncate text-[11px] font-semibold ${task.done?"text-muted-foreground line-through":""}`}>{task.title}</span><span className="ml-auto shrink-0 text-[9px] text-muted-foreground">{task.time}</span></div><div className="mt-1 truncate pl-4 text-[9px] text-muted-foreground">{task.meta}</div></button></div>) : <div className="grid h-24 place-items-center text-xs text-muted-foreground">На выбранную дату задач нет</div>}</div>
                <div className="mt-3 flex gap-2 border-t pt-3"><input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} className="h-8 min-w-0 flex-1 rounded-sm border bg-background px-2 text-[11px] outline-none focus:ring-2 focus:ring-ring" placeholder="Добавить задачу…"/><Button size="sm" className="h-8" onClick={addTask}><Plus className="size-3.5" />Добавить</Button></div>
              </Panel>
            </section>
          </div>
        </main>
        <footer className="flex h-7 shrink-0 items-center gap-5 border-t bg-card px-4 text-[9px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-success"/>Система работает штатно</span><span>Последняя синхронизация: 22:15</span><span>ISO/IEC 17025:2017</span><span className="ml-auto">БД: подключено · v2.8.4</span></footer>
      </div>

      <Dialog open={!!detail} onOpenChange={(open)=>!open&&setDetail(null)}><DialogContent className="max-w-lg rounded-sm"><DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="size-5 text-primary"/>Карточка задачи</DialogTitle></DialogHeader>{detail&&<div className="space-y-4"><div className="border-l-2 border-primary pl-3"><div className="text-sm font-semibold">{detail.title}</div><div className="mt-1 text-xs text-muted-foreground">{detail.meta}</div></div><div className="grid grid-cols-2 gap-3 text-xs"><Detail label="Дата и время" value={`${detail.day} сентября · ${detail.time}`}/><Detail label="Приоритет" value={detail.priority}/><Detail label="Ответственный" value="А. Крылов"/><Detail label="Статус" value={detail.done?"Выполнено":"К выполнению"}/></div><div className="rounded-sm border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">Связанные документы: методика УЗК-07, журнал оборудования №12, форма записи ЛНК-Ф-14.</div><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={()=>setDetail(null)}>Закрыть</Button><Button size="sm" onClick={()=>{setTasks(c=>c.map(t=>t.id===detail.id?{...t,done:true}:t));setDetail(null)}}><Check className="size-4"/>Отметить выполненной</Button></div></div>}</DialogContent></Dialog>
    </div>
  );
}

const axisTick = { fontSize: 9, fill: "var(--muted-foreground)" };
const tipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 3, fontSize: 10, color: "var(--popover-foreground)" };
function Panel({title,subtitle,action,children}:{title:string;subtitle:string;action:string|null;children:React.ReactNode}) { return <div className="min-w-0 rounded-sm border bg-card p-3 shadow-panel"><div className="mb-2 flex items-start"><div><h2 className="text-xs font-bold">{title}</h2><p className="mt-0.5 text-[9px] text-muted-foreground">{subtitle}</p></div>{action&&<span className="ml-auto rounded-sm bg-muted px-1.5 py-1 text-[9px] text-muted-foreground">{action}</span>}</div>{children}</div> }
function Stat({icon:Icon,label,value,note,tone,progress}:{icon:React.ElementType;label:string;value:string;note:string;tone:string;progress?:number}) { return <div className="rounded-sm border bg-card p-3 shadow-panel"><div className="flex items-start"><div className={`grid size-8 place-items-center rounded-sm bg-${tone}/12 text-${tone}`}><Icon className="size-4"/></div><span className="ml-auto flex items-center gap-1 text-[9px] text-success"><Activity className="size-3"/>актуально</span></div><div className="mt-2 text-[10px] font-medium text-muted-foreground">{label}</div><div className="mt-0.5 text-2xl font-bold tabular-nums">{value}</div><div className="mt-1 text-[9px] text-muted-foreground">{note}</div>{progress&&<div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-success" style={{width:`${progress}%`}}/></div>}</div> }
function Donut({data,center}:{data:{name:string;value:number;color:string}[];center:string}) { return <div className="flex h-[174px] items-center"><div className="relative h-28 w-28 shrink-0"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" innerRadius={36} outerRadius={51} stroke="var(--card)" strokeWidth={2}>{data.map(x=><Cell key={x.name} fill={x.color}/>)}</Pie></PieChart></ResponsiveContainer><strong className="absolute inset-0 grid place-items-center text-lg">{center}</strong></div><div className="min-w-0 flex-1 space-y-2">{data.map(x=><div key={x.name} className="flex items-center gap-1.5 text-[9px]"><span className="size-2 shrink-0 rounded-full" style={{background:x.color}}/><span className="truncate text-muted-foreground">{x.name}</span><strong className="ml-auto">{x.value}</strong></div>)}</div></div> }
function Legend({color,text}:{color:string;text:string}) { return <span className="flex items-center gap-1.5"><span className={`size-2 rounded-full bg-${color}`}/>{text}</span> }
function Detail({label,value}:{label:string;value:string}) { return <div className="rounded-sm border p-2"><div className="text-[9px] uppercase text-muted-foreground">{label}</div><div className="mt-1 font-semibold">{value}</div></div> }