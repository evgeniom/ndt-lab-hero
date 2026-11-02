import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/roles";
import { reviewRequest } from "@/lib/portal.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Портал — заявки и новости · NDT Portal" },
      { name: "description", content: "Администрирование портала: одобрение заявок лабораторий и публикация новостей." },
      { property: "og:title", content: "Администрирование портала NDT" },
      { property: "og:description", content: "Заявки лабораторий и новости портала." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Req = { id: string; org_name: string; lab_name: string; kind: string; parent_org: string; head_name: string; email: string; login: string; status: string; created_at: string };
type Post = { id: string; title: string; summary: string; url: string; source: string; published_at: string };
const input = "h-8 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring";

function usePortalAdmin() {
  const { user } = useAccess();
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => { void supabase.rpc("is_portal_admin", { _user_id: user.id }).then(({ data }) => setOk(!!data)); }, [user.id]);
  return ok;
}

function AdminPage() {
  const isAdmin = usePortalAdmin();
  const review = useServerFn(reviewRequest);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState({ title: "", summary: "", url: "", source: "NDT Portal" });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([
      supabase.from("lab_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("news_posts").select("*").order("published_at", { ascending: false }),
    ]);
    setReqs((r.data ?? []) as Req[]); setPosts((p.data ?? []) as Post[]);
  }, []);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  if (isAdmin === null) return <AppShell active="Портал" breadcrumb="Портал"><div /></AppShell>;
  if (!isAdmin) return (
    <AppShell active="Портал" breadcrumb="Портал">
      <div className="mx-auto mt-20 max-w-md rounded-sm border bg-card p-6 text-center shadow-panel"><Lock className="mx-auto mb-2 size-6 text-muted-foreground" /><div className="text-sm font-semibold">Только для администратора портала</div></div>
    </AppShell>
  );

  const act = async (id: string, approve: boolean) => {
    try { await review({ data: { id, approve } }); setMsg(approve ? "Лаборатория одобрена — руководитель может войти" : "Заявка отклонена"); }
    catch { setMsg("Не удалось обработать заявку"); }
    await load();
  };
  const addPost = async () => {
    if (draft.title.trim().length < 3) return;
    const { error } = await supabase.from("news_posts").insert({ title: draft.title.trim().slice(0, 200), summary: draft.summary.trim().slice(0, 600), url: /^https?:\/\//.test(draft.url) ? draft.url.trim() : "", source: draft.source.trim().slice(0, 60) || "NDT Portal" });
    setMsg(error ? "Не удалось опубликовать" : "Новость опубликована");
    if (!error) setDraft({ title: "", summary: "", url: "", source: "NDT Portal" });
    await load();
  };

  return (
    <AppShell active="Портал" breadcrumb="Администрирование портала">
      <h1 className="mb-4 text-lg font-bold">Администрирование портала</h1>
      <div className="mb-6 overflow-hidden rounded-sm border bg-card shadow-panel">
        <div className="border-b px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Заявки лабораторий · {reqs.filter((r) => r.status === "pending").length} на рассмотрении</div>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground"><tr>{["Дата", "Организация / лаборатория", "Подчинённость", "Руководитель", "Контакт", "Статус", ""].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {reqs.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">Заявок пока нет</td></tr>}
            {reqs.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 tabular-nums">{new Date(r.created_at).toLocaleDateString("ru-RU")}</td>
                <td className="px-3 py-2"><div className="font-medium">{r.org_name}</div><div className="text-muted-foreground">{r.lab_name}</div></td>
                <td className="px-3 py-2">{r.kind === "independent" ? "Независимая" : `В составе: ${r.parent_org}`}</td>
                <td className="px-3 py-2">{r.head_name}<div className="font-mono text-muted-foreground">{r.login}</div></td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.status === "pending" ? "На рассмотрении" : r.status === "approved" ? "Одобрена" : "Отклонена"}</td>
                <td className="px-3 py-2 text-right">{r.status === "pending" && <div className="flex justify-end gap-1"><Button size="sm" className="h-7" onClick={() => act(r.id, true)}><Check className="size-3" />Одобрить</Button><Button size="sm" variant="outline" className="h-7" onClick={() => act(r.id, false)}><X className="size-3" />Отклонить</Button></div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-sm border bg-card shadow-panel">
        <div className="border-b px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Новости на главной странице</div>
        <div className="grid grid-cols-[2fr_3fr_2fr_1fr_auto] gap-2 border-b p-3">
          <input className={input} placeholder="Заголовок" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <input className={input} placeholder="Кратко" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
          <input className={input} placeholder="https://… (необязательно)" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          <input className={input} placeholder="Источник" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} />
          <Button size="sm" onClick={addPost}>Опубликовать</Button>
        </div>
        {posts.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b px-3 py-2 text-xs last:border-0">
            <span className="w-20 tabular-nums text-muted-foreground">{new Date(p.published_at).toLocaleDateString("ru-RU")}</span>
            <span className="w-24 font-semibold text-primary">{p.source}</span>
            <span className="flex-1 font-medium">{p.title}</span>
            <Button size="icon" variant="ghost" className="size-7" onClick={async () => { await supabase.from("news_posts").delete().eq("id", p.id); await load(); }}><Trash2 className="size-3.5" /></Button>
          </div>
        ))}
      </div>
      {msg && <div className="fixed bottom-10 right-6 z-50 rounded-sm border bg-popover px-4 py-2 text-xs shadow-panel" onAnimationEnd={() => setMsg(null)}>{msg}</div>}
    </AppShell>
  );
}
