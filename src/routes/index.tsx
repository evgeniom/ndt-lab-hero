import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, FlaskConical, Globe, Loader2, Newspaper, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LANGS, useLang } from "@/lib/i18n";
import { DEMO_LOGIN, DEMO_PASSWORD, getNews, registerLab, startDemo, type NewsItem } from "@/lib/portal.functions";
import labQualityImage from "@/assets/news-lab-quality.jpg";
import ultrasonicImage from "@/assets/news-ultrasonic-testing.jpg";
import metrologyImage from "@/assets/news-metrology.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NDT Portal — workspace for ISO/IEC 17025 NDT laboratories" },
      { name: "description", content: "Register your non-destructive testing lab: test journals, calibration control, personnel certification and ISO/IEC 17025 audits. NDT news included." },
      { property: "og:title", content: "NDT Portal — for ISO/IEC 17025 NDT laboratories" },
      { property: "og:description", content: "One platform for NDT labs: journals, equipment, calibration, audits — plus NDT and standards news." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const field = "h-10 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function newsIllustration(news: NewsItem) {
  const topic = `${news.title} ${news.summary}`;
  if (/ultrasonic|phased.array|\bUT\b|ультразвук|УЗК/i.test(topic)) return ultrasonicImage;
  if (/calibrat|metrolog|equipment|поверк|калибр|метролог|прибор/i.test(topic)) return metrologyImage;
  return labQualityImage;
}

function Landing() {
  const { lang, setLang, t } = useLang();
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [regOpen, setRegOpen] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const navigate = useNavigate();
  const demo = useServerFn(startDemo);
  const loadNews = useServerFn(getNews);

  useEffect(() => { void loadNews().then(setNews).catch(() => setNews([])); }, [loadNews]);

  const tryDemo = async () => {
    setDemoBusy(true);
    try {
      await demo();
      await supabase.auth.signInWithPassword({ email: `${DEMO_LOGIN}@ndt-lab.local`, password: DEMO_PASSWORD });
      await navigate({ to: "/app" });
    } finally { setDemoBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" lang={lang}>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5">
          <div className="grid size-9 place-items-center rounded-sm bg-primary text-primary-foreground"><FlaskConical className="size-5" /></div>
          <div className="font-bold tracking-[0.18em]">NDT PORTAL</div>
          <nav className="ml-8 hidden gap-5 text-sm text-muted-foreground md:flex">
            <a href="#news" className="hover:text-foreground">{t.news}</a>
            <a href="#how" className="hover:text-foreground">{t.howTitle}</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted-foreground"><Globe className="size-4" />
              <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} className="rounded-sm border bg-background px-1 py-1 text-xs uppercase">
                {LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </label>
            <Link to="/app" className="rounded-sm border px-3 py-2 text-sm font-medium hover:bg-accent">{t.signIn}</Link>
            <button onClick={() => setRegOpen(true)} className="rounded-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t.register}</button>
          </div>
        </div>
      </header>

      <section className="border-b bg-sidebar">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t.tagline}</div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">{t.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">{t.heroText}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => setRegOpen(true)} className="flex items-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t.register}<ArrowRight className="size-4" /></button>
              <button onClick={tryDemo} disabled={demoBusy} className="flex items-center gap-2 rounded-sm border bg-card px-5 py-3 text-sm font-semibold hover:bg-accent disabled:opacity-60">{demoBusy && <Loader2 className="size-4 animate-spin" />}{t.demo}</button>
            </div>
          </div>
          <div className="rounded-sm border bg-card p-5 shadow-panel">
            <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{t.featTitle}</div>
            <ul className="space-y-3 text-sm">
              {[t.f1, t.f2, t.f3, t.f4].map((f) => <li key={f} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{f}</li>)}
            </ul>
            <div className="mt-5 grid grid-cols-5 gap-1 text-center font-mono text-[11px]">
              {["VT", "UT", "RT", "MT", "PT"].map((m) => <div key={m} className="rounded-sm bg-muted py-2 font-semibold">{m}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="news" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold"><Newspaper className="size-6 text-primary" />{t.news}</h2>
        {news === null ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : news.length === 0 ? <p className="text-sm text-muted-foreground">{t.noNews}</p> : (
          <div className="grid gap-4 md:grid-cols-3">
            {news.map((n) => (
              <article key={n.id} className="flex flex-col overflow-hidden rounded-sm border bg-card shadow-panel">
                <img src={newsIllustration(n)} alt="" loading="lazy" decoding="async" width={1200} height={768} className="aspect-[25/16] w-full border-b object-cover" />
                <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground"><span className="font-semibold uppercase text-primary">{n.source}</span><span>{new Date(n.date).toLocaleDateString(lang)}</span></div>
                <h3 className="font-semibold leading-snug">{n.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{n.summary}</p>
                {n.url && <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm font-medium text-primary hover:underline">{t.readMore} →</a>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="how" className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="mb-8 text-2xl font-bold">{t.howTitle}</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {[[t.how1, t.how1t], [t.how2, t.how2t], [t.how3, t.how3t], [t.how4, t.how4t]].map(([h, d], i) => (
              <div key={h} className="rounded-sm border bg-card p-4">
                <div className="font-mono text-2xl font-bold text-primary">0{i + 1}</div>
                <div className="mt-2 font-semibold">{h}</div>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">{t.footer} · ISO/IEC 17025:2017</footer>
      {regOpen && <RegisterDialog onClose={() => setRegOpen(false)} />}
    </div>
  );
}

function RegisterDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const register = useServerFn(registerLab);
  const [f, setF] = useState({ orgName: "", labName: "", accreditationNumber: "", kind: "independent" as "independent" | "subordinate", parentOrg: "", headName: "", email: "", login: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const r = await register({ data: f });
      setMsg(r.ok ? { ok: true, text: t.sent } : { ok: false, text: r.error === "login_taken" ? t.errTaken : r.error === "weak_password" ? t.errWeak : t.errFail });
    } catch { setMsg({ ok: false, text: t.errFail }); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-sm border bg-card p-6 shadow-panel">
        <div className="mb-1 flex items-center justify-between"><h2 className="text-lg font-bold">{t.regTitle}</h2><button type="button" onClick={onClose} aria-label="Close"><X className="size-5" /></button></div>
        <p className="mb-4 text-sm text-muted-foreground">{t.regText}</p>
        {msg?.ok ? <div className="rounded-sm border border-primary/40 bg-primary/10 p-4 text-sm">{msg.text}</div> : (
          <div className="space-y-3 text-sm">
            <label className="block"><span className="mb-1 block font-medium">{t.org}</span><input required minLength={2} maxLength={160} className={field} value={f.orgName} onChange={(e) => set("orgName", e.target.value)} /></label>
            <label className="block"><span className="mb-1 block font-medium">{t.lab}</span><input required minLength={2} maxLength={160} className={field} value={f.labName} onChange={(e) => set("labName", e.target.value)} /></label>
            <label className="block"><span className="mb-1 block font-medium">{t.accreditation}</span><input required maxLength={160} className={field} value={f.accreditationNumber} onChange={(e) => set("accreditationNumber", e.target.value)} /></label>
            <fieldset><legend className="mb-1 font-medium">{t.status}</legend>
              <div className="flex gap-4">
                {(["independent", "subordinate"] as const).map((k) => <label key={k} className="flex items-center gap-2"><input type="radio" checked={f.kind === k} onChange={() => set("kind", k)} />{t[k]}</label>)}
              </div>
            </fieldset>
            {f.kind === "subordinate" && <label className="block"><span className="mb-1 block font-medium">{t.parent}</span><input required maxLength={160} className={field} value={f.parentOrg} onChange={(e) => set("parentOrg", e.target.value)} /></label>}
            <label className="block"><span className="mb-1 block font-medium">{t.head}</span><input required minLength={3} maxLength={120} className={field} value={f.headName} onChange={(e) => set("headName", e.target.value)} /></label>
            <label className="block"><span className="mb-1 block font-medium">{t.email}</span><input required type="email" maxLength={200} className={field} value={f.email} onChange={(e) => set("email", e.target.value)} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block font-medium">{t.login}</span><input required pattern="[a-zA-Z0-9._\-]{3,32}" className={field} value={f.login} onChange={(e) => set("login", e.target.value)} /></label>
              <label className="block"><span className="mb-1 block font-medium">{t.password}</span><input required type="password" minLength={8} maxLength={72} className={field} value={f.password} onChange={(e) => set("password", e.target.value)} /></label>
            </div>
            {msg && <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">{msg.text}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded-sm border px-4 py-2">{t.cancel}</button>
              <button disabled={busy} className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="size-4 animate-spin" />}{t.submit}</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
