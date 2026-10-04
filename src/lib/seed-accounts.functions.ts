import { createServerFn } from "@tanstack/react-start";

// One-time bootstrap: removed after initial accounts are created.
const SEED = [
  { login: "krylov", password: "Krl-UZK-7413!", name: "Алексей Крылов", position: "Руководитель ЛНК", initials: "АК", role: "head" },
  { login: "sokolov", password: "Skl-USN60-2958!", name: "Соколов Д.М.", position: "Дефектоскопист УЗК, III ур.", initials: "СД", role: "specialist" },
  { login: "ivanov", password: "Ivn-A1212-6031!", name: "Иванов А.П.", position: "Дефектоскопист УЗК, II ур.", initials: "ИА", role: "specialist" },
  { login: "petrova", password: "Ptr-VIK1-8846!", name: "Петрова Е.С.", position: "Метролог / ВИК, II ур.", initials: "ПЕ", role: "specialist" },
  { login: "goncharov", password: "Gnc-RPD200-3175!", name: "Гончаров В.И.", position: "Дефектоскопист РК, II ур.", initials: "ГВ", role: "specialist" },
  { login: "kuznetsova", password: "Kzn-SMK17025-5520!", name: "Кузнецова И.В.", position: "Аудитор СМК ISO 17025", initials: "КИ", role: "auditor" },
] as const;

export const seedAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
  if (count) return { skipped: true };
  const out: string[] = [];
  for (const s of SEED) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: `${s.login}@ndt-lab.local`, password: s.password, email_confirm: true });
    if (error || !data.user) { out.push(`${s.login}: ${error?.message}`); continue; }
    await supabaseAdmin.from("profiles").insert({ id: data.user.id, login: s.login, name: s.name, position: s.position, initials: s.initials });
    await supabaseAdmin.from("user_roles").insert({ user_id: data.user.id, role: s.role });
    out.push(`${s.login}: ok`);
  }
  return { out };
});
