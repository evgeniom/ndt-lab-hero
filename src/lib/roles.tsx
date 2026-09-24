import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "head" | "specialist" | "auditor";

export type Perm =
  | "tests.create"
  | "tests.edit"
  | "tests.delete"
  | "tests.submit"
  | "tests.approve"
  | "equipment.manage"
  | "equipment.calibrate"
  | "docs.view"
  | "docs.export"
  | "roles.manage";

export const ROLE_TITLE: Record<Role, string> = {
  head: "Руководитель ЛНК",
  specialist: "Специалист НК",
  auditor: "Аудитор СМК",
};

export const ROLE_NOTE: Record<Role, string> = {
  head: "Полный доступ: утверждение протоколов, метрологический парк, управление ролями",
  specialist: "Ведение испытаний своего метода, передача протоколов на утверждение",
  auditor: "Только просмотр записей и выгрузка документов (ISO/IEC 17025 п. 8.8)",
};

export const PERM_TITLE: Record<Perm, string> = {
  "tests.create": "Создание испытаний",
  "tests.edit": "Редактирование испытаний и дефектных ведомостей",
  "tests.delete": "Удаление записей журнала",
  "tests.submit": "Передача протокола на утверждение",
  "tests.approve": "Утверждение / отклонение протоколов",
  "equipment.manage": "Ведение реестра оборудования",
  "equipment.calibrate": "Регистрация поверок и калибровок",
  "docs.view": "Просмотр документов и паспортов",
  "docs.export": "Выгрузка протоколов и реестров",
  "roles.manage": "Управление ролями и правами",
};

export const PERMS: Perm[] = Object.keys(PERM_TITLE) as Perm[];

export const ROLE_PERMS: Record<Role, Perm[]> = {
  head: [...PERMS],
  specialist: [
    "tests.create",
    "tests.edit",
    "tests.submit",
    "docs.view",
    "docs.export",
    "equipment.calibrate",
  ],
  auditor: ["docs.view", "docs.export"],
};

export type Person = { id: string; name: string; position: string; role: Role; initials: string };

export const PEOPLE: Person[] = [
  { id: "u1", name: "Алексей Крылов", position: "Руководитель ЛНК", role: "head", initials: "АК" },
  { id: "u2", name: "Соколов Д.М.", position: "Дефектоскопист УЗК, III ур.", role: "specialist", initials: "СД" },
  { id: "u3", name: "Иванов А.П.", position: "Дефектоскопист УЗК, II ур.", role: "specialist", initials: "ИА" },
  { id: "u4", name: "Петрова Е.С.", position: "Метролог / ВИК, II ур.", role: "specialist", initials: "ПЕ" },
  { id: "u5", name: "Гончаров В.И.", position: "Дефектоскопист РК, II ур.", role: "specialist", initials: "ГВ" },
  { id: "u6", name: "Кузнецова И.В.", position: "Аудитор СМК ISO 17025", role: "auditor", initials: "КИ" },
];

type Ctx = {
  people: Person[];
  user: Person;
  setUserId: (id: string) => void;
  setRoleOf: (id: string, role: Role) => void;
  can: (p: Perm) => boolean;
  denyMessage: (p: Perm) => string;
};

const RolesContext = createContext<Ctx | null>(null);
const STORAGE = "ndt-access-v1";

export function RolesProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>(PEOPLE);
  const [userId, setUserId] = useState("u1");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const saved = JSON.parse(raw) as { userId?: string; roles?: Record<string, Role> };
      if (saved.roles) setPeople((ps) => ps.map((p) => ({ ...p, role: saved.roles![p.id] ?? p.role })));
      if (saved.userId) setUserId(saved.userId);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const roles = Object.fromEntries(people.map((p) => [p.id, p.role]));
    try { localStorage.setItem(STORAGE, JSON.stringify({ userId, roles })); } catch { /* ignore */ }
  }, [people, userId]);

  const value = useMemo<Ctx>(() => {
    const user = people.find((p) => p.id === userId) ?? people[0]!;
    const allowed = ROLE_PERMS[user.role];
    return {
      people,
      user,
      setUserId,
      setRoleOf: (id, role) => setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, role } : p))),
      can: (p) => allowed.includes(p),
      denyMessage: (p) =>
        `Недостаточно прав: «${PERM_TITLE[p]}» недоступно для роли «${ROLE_TITLE[user.role]}»`,
    };
  }, [people, userId]);

  return <RolesContext.Provider value={value}>{children}</RolesContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(RolesContext);
  if (!ctx) throw new Error("useAccess must be used within RolesProvider");
  return ctx;
}
