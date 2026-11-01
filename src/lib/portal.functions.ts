import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DOMAIN = "ndt-lab.local";
export const DEMO_LOGIN = "demo";
export const DEMO_PASSWORD = "Demo-NDT-Portal-2026!";
const DEMO_LAB = "00000000-0000-0000-0000-000000000017";

export type NewsItem = { id: string; title: string; summary: string; url: string; source: string; date: string };

let feedCache: { at: number; items: NewsItem[] } | null = null;
const FEEDS = [
  { url: "https://www.iso.org/contents/data/rss/news.xml", source: "ISO" },
  { url: "https://www.ndt.net/rss/news.xml", source: "NDT.net" },
];

function tag(xml: string, t: string) {
  const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"));
  return (m?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
}

async function readFeeds(): Promise<NewsItem[]> {
  if (feedCache && Date.now() - feedCache.at < 3 * 3600_000) return feedCache.items;
  const out: NewsItem[] = [];
  await Promise.all(FEEDS.map(async (f) => {
    try {
      const r = await fetch(f.url, { signal: AbortSignal.timeout(4000), headers: { "user-agent": "NDT-Portal/1.0" } });
      if (!r.ok) return;
      const xml = await r.text();
      if (!xml.includes("<item")) return;
      for (const it of xml.split(/<item[\s>]/i).slice(1, 9)) {
        const title = tag(it, "title");
        if (!title) continue;
        const d = new Date(tag(it, "pubDate") || Date.now());
        out.push({ id: `${f.source}-${title}`, title, summary: tag(it, "description").slice(0, 240), url: tag(it, "link"), source: f.source, date: isNaN(+d) ? new Date().toISOString() : d.toISOString() });
      }
    } catch { /* source unavailable */ }
  }));
  feedCache = { at: Date.now(), items: out };
  return out;
}

export const getNews = createServerFn({ method: "GET" }).handler(async (): Promise<NewsItem[]> => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
      h.set("apikey", key);
      return fetch(input, { ...init, headers: h });
    } },
  });
  const [{ data }, feed] = await Promise.all([
    sb.from("news_posts").select("id,title,summary,url,source,published_at").order("published_at", { ascending: false }).limit(20),
    readFeeds(),
  ]);
  const manual = (data ?? []).map((n) => ({ id: n.id, title: n.title, summary: n.summary, url: n.url, source: n.source, date: n.published_at }));
  return [...manual, ...feed].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
});

export const registerLab = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    orgName: z.string().trim().min(2).max(160),
    labName: z.string().trim().min(2).max(160),
    kind: z.enum(["independent", "subordinate"]),
    parentOrg: z.string().trim().max(160),
    headName: z.string().trim().min(3).max(120),
    email: z.string().trim().email().max(200),
    login: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/),
    password: z.string().min(8).max(72),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({ email: `${data.login}@${DOMAIN}`, password: data.password, email_confirm: true, user_metadata: { contact_email: data.email } });
    if (error || !u.user) return { ok: false as const, error: error?.message.includes("already") ? "login_taken" : error?.message.includes("weak") || error?.message.includes("pwned") ? "weak_password" : "failed" };
    const { error: e2 } = await supabaseAdmin.from("lab_requests").insert({
      org_name: data.orgName, lab_name: data.labName, kind: data.kind, parent_org: data.kind === "subordinate" ? data.parentOrg : "",
      head_name: data.headName, email: data.email, login: data.login, user_id: u.user.id,
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
      const { data: lab, error } = await supabaseAdmin.from("labs").insert({ org_name: r.org_name, lab_name: r.lab_name, kind: r.kind, parent_org: r.parent_org, head_name: r.head_name }).select("id").single();
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
