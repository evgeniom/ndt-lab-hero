import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { approvedLabRecord, registrationSchema } from "@/lib/portal-registration";

const DOMAIN = "ndt-lab.local";
export const DEMO_LOGIN = "demo";
export const DEMO_PASSWORD = "Demo-NDT-Portal-2026!";
const DEMO_LAB = "00000000-0000-0000-0000-000000000017";

export type { NewsItem } from "./portal-news";

export const getNews = createServerFn({ method: "GET" }).handler(async () => {
  const { readAutomaticNews } = await import("./portal-news.server");
  return readAutomaticNews();
});

export const registerLab = createServerFn({ method: "POST" })
  .inputValidator((d) => registrationSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({ email: `${data.login}@${DOMAIN}`, password: data.password, email_confirm: true, user_metadata: { contact_email: data.email } });
    if (error || !u.user) return { ok: false as const, error: error?.message.includes("already") ? "login_taken" : error?.message.includes("weak") || error?.message.includes("pwned") ? "weak_password" : "failed" };
    const { error: e2 } = await supabaseAdmin.from("lab_requests").insert({
      org_name: data.orgName, lab_name: data.labName, kind: data.kind, parent_org: data.kind === "subordinate" ? data.parentOrg : "",
      head_name: data.headName, email: data.email, login: data.login, user_id: u.user.id, accreditation_number: data.accreditationNumber,
    });
    if (e2) { await supabaseAdmin.auth.admin.deleteUser(u.user.id); return { ok: false as const, error: "failed" }; }
    return { ok: true as const };
  });

export const startDemo = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: p } = await supabaseAdmin.from("profiles").select("id").eq("login", DEMO_LOGIN).maybeSingle();
  if (p) return { ok: true };
  const { data: u, error } = await supabaseAdmin.auth.admin.createUser({ email: `${DEMO_LOGIN}@${DOMAIN}`, password: DEMO_PASSWORD, email_confirm: true });
  if (error || !u.user) throw new Error("Demo unavailable");
  await supabaseAdmin.from("profiles").insert({ id: u.user.id, login: DEMO_LOGIN, name: "Demo visitor", position: "Read-only demo", initials: "DV", lab_id: DEMO_LAB });
  await supabaseAdmin.from("user_roles").insert({ user_id: u.user.id, role: "auditor" });
  return { ok: true };
});

async function assertPortalAdmin(sb: unknown, userId: string) {
  const { data } = await (sb as { rpc: (f: string, a: object) => Promise<{ data: boolean }> }).rpc("is_portal_admin", { _user_id: userId });
  if (!data) throw new Error("Forbidden");
}

export const reviewRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPortalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin.from("lab_requests").select("*").eq("id", data.id).eq("status", "pending").maybeSingle();
    if (!r || !r.user_id) throw new Error("Request not found");
    if (data.approve) {
      const { data: lab, error } = await supabaseAdmin.from("labs").insert(approvedLabRecord(r)).select("id").single();
      if (error || !lab) throw new Error("Could not create lab");
      const initials = r.head_name.split(/\s+/).map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
      await supabaseAdmin.from("profiles").insert({ id: r.user_id, login: r.login, name: r.head_name, position: "Head of laboratory", initials, lab_id: lab.id });
      await supabaseAdmin.from("user_roles").insert({ user_id: r.user_id, role: "head" });
      await supabaseAdmin.from("app_settings").select("id").limit(1);
    } else {
      await supabaseAdmin.auth.admin.deleteUser(r.user_id);
    }
    await supabaseAdmin.from("lab_requests").update({ status: data.approve ? "approved" : "rejected", reviewed_at: new Date().toISOString(), reviewed_by: context.userId }).eq("id", r.id);
    return { ok: true };
  });
