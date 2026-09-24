import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3, Bell, ClipboardList, FlaskConical, Menu, Moon, Search,
  ShieldCheck, Sun, Users, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_TITLE, useAccess } from "@/lib/roles";

const nav = [
  { to: "/", icon: BarChart3, label: "Дашборд", sub: "Обзор лаборатории" },
  { to: "/tests", icon: ClipboardList, label: "Журнал испытаний", sub: "Реестр протоколов" },
  { to: "/equipment", icon: Wrench, label: "Оборудование и поверки", sub: "Метрологический парк" },
  { to: "/access", icon: Users, label: "Специалисты и аттестация", sub: "Роли и права доступа" },
  { to: "/", icon: ShieldCheck, label: "Качество и аудит ISO 17025", sub: "СМК и несоответствия" },
] as const;

export function AppShell({
  active,
  breadcrumb,
  searchPlaceholder = "Поиск по протоколу, объекту, прибору…",
  children,
}: {
  active: string;
  breadcrumb: string;
  searchPlaceholder?: string;
  children: ReactNode;
}) {
  const { people, user, setUserId } = useAccess();
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  return (
    <div className="flex h-screen min-w-[1120px] overflow-hidden bg-background text-foreground">
      <aside className={`${collapsed ? "w-[68px]" : "w-[244px]"} flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200`}>
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground"><FlaskConical className="size-5" /></div>
          {!collapsed && <div><div className="text-sm font-bold tracking-wide">NDT CONTROL</div><div className="text-[10px] text-muted-foreground">ЛАБОРАТОРИЯ НК · ЛНК-017</div></div>}
        </div>
        <nav className="flex-1 space-y-1 p-2">
          <div className={`${collapsed ? "hidden" : "block"} px-2 pb-2 pt-3 text-[10px] font-semibold uppercase text-muted-foreground`}>Рабочее пространство</div>
          {nav.map(({ to, icon: Icon, label, sub }) => {
            const isActive = label === active;
            return (
              <Link key={label} to={to} title={collapsed ? label : undefined} className={`group flex h-12 w-full items-center gap-3 rounded-sm px-3 text-left transition-colors ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                <Icon className="size-[18px] shrink-0" />
                {!collapsed && <span className="min-w-0"><span className="block truncate text-xs font-semibold">{label}</span><span className={`block truncate text-[10px] ${isActive ? "opacity-70" : "text-muted-foreground"}`}>{sub}</span></span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 flex items-center gap-2"><div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold">{user.initials}</div>{!collapsed && <div className="min-w-0"><div className="truncate text-xs font-semibold">{user.name}</div><div className="text-[10px] text-muted-foreground">{ROLE_TITLE[user.role]}</div></div>}</div>
          {!collapsed && (
            <label className="mb-3 block space-y-1">
              <span className="block text-[9px] font-semibold uppercase text-muted-foreground">Вход в систему как</span>
              <select value={user.id} onChange={(e) => setUserId(e.target.value)} className="h-8 w-full rounded-sm border bg-background px-2 text-[11px] outline-none focus:ring-2 focus:ring-ring">
                {people.map((p) => <option key={p.id} value={p.id}>{p.name} — {ROLE_TITLE[p.role]}</option>)}
              </select>
            </label>
          )}
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="w-full justify-center"><Menu className="size-4" />{!collapsed && "Свернуть"}</Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-card px-5">
          <div className="text-xs text-muted-foreground">Лаборатория НК <span className="px-1">/</span> <strong className="text-foreground">{breadcrumb}</strong></div>
          <div className="relative ml-auto w-[320px]"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><input className="h-9 w-full rounded-sm border bg-background pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring" placeholder={searchPlaceholder} /></div>
          <div className="flex items-center rounded-sm border bg-background p-0.5"><Button variant={!dark ? "secondary" : "ghost"} size="icon" onClick={() => setDark(false)} className="size-7" title="Светлая тема"><Sun className="size-3.5" /></Button><Button variant={dark ? "secondary" : "ghost"} size="icon" onClick={() => setDark(true)} className="size-7" title="Тёмная тема"><Moon className="size-3.5" /></Button></div>
          <Button variant="ghost" size="icon" className="relative size-9"><Bell className="size-4" /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" /></Button>
        </header>

        <main className="flex-1 overflow-auto bg-muted/30 p-5">
          <div className="mx-auto max-w-[1720px]">{children}</div>
        </main>
        <footer className="flex h-7 shrink-0 items-center gap-5 border-t bg-card px-4 text-[9px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-success" />Система работает штатно</span><span>Последняя синхронизация: 22:15</span><span>ISO/IEC 17025:2017</span><span className="ml-auto">БД: подключено · v2.8.4</span></footer>
      </div>
    </div>
  );
}
