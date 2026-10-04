import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const LOGIN_DOMAIN = "ndt-lab.local";

async function assertHead(supabase: { rpc: (...a: never[]) => unknown }, userId: string) {
  const { data } = (await (supabase.rpc as unknown as (f: string, a: object) => Promise<{ data: boolean }>)("has_role", { _user_id: userId, _role: "head" }));
  if (!data) throw new Error("Недостаточно прав: только руководитель ЛНК управляет учётными записями");
}

const loginRe = /^[a-z0-9._-]{3,32}$/;

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    login: z.string().trim().toLowerCase().regex(loginRe, "Логин: 3–32 латинских символа, цифры, . _ -"),
    password: z.string().min(8, "Пароль не короче 8 символов").max(72),
    name: z.string().trim().min(2).max(80),
    position: z.string().trim().max(120),
    role: z.enum(["head", "specialist", "auditor"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertHead(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({ email: `${data.login}@${LOGIN_DOMAIN}`, password: data.password, email_confirm: true });
    if (error || !u.user) throw new Error(error?.message.includes("already") ? "Такой логин уже существует" : error?.message.includes("weak") || error?.message.includes("pwned") ? "Пароль слишком простой или найден в утечках" : "Не удалось создать учётную запись");
    const initials = data.name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
    const { error: pe } = await supabaseAdmin.from("profiles").insert({ id: u.user.id, login: data.login, name: data.name, position: data.position, initials });
    if (pe) { await supabaseAdmin.auth.admin.deleteUser(u.user.id); throw new Error("Не удалось сохранить профиль"); }
    await supabaseAdmin.from("user_roles").insert({ user_id: u.user.id, role: data.role });
    return { ok: true };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), password: z.string().min(8, "Пароль не короче 8 символов").max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertHead(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message.includes("weak") || error.message.includes("pwned") ? "Пароль слишком простой или найден в утечках" : "Не удалось сменить пароль");
    return { ok: true };
  });
