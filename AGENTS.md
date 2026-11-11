<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- AI features call Lovable AI Gateway from server-only *.server.ts modules exposed via createServerFn in *.functions.ts; why: keeps the API key off the client.
- Auth is DB-backed (Lovable Cloud): profiles + user_roles tables, username login via synthetic emails <login>@ndt-lab.local; account create/reset via createServerFn in src/lib/accounts.functions.ts guarded by has_role('head').
- RolesProvider loads session/profiles from the DB and renders the inline login screen; presence = profiles.last_seen_at heartbeat (45s, online <2min). Do not re-add a localStorage user picker.
- App settings live in DB table app_settings (single row id=1, jsonb data; read by all staff, written only by head); localStorage is just a startup cache. Why: settings must follow the lab across computers.
- Multi-lab portal: public landing at / (no RolesProvider), lab workspace from /app; labs table, profiles.lab_id, user_lab_id()/is_portal_admin() helpers; registrations go to lab_requests and become labs only via reviewRequest (portal admin). Why: one site serves many labs with isolated staff.
- Registration validation and approval mapping live in portal-registration; workspace lab identity comes from the member's labs row through RolesProvider, not shared settings. Why: registered identity must follow each lab without leaking demo defaults.
- Demo lab has fixed id 00000000-0000-0000-0000-000000000017; read-only demo user (auditor) is created on demand by startDemo.
- Lab working data (equipment, tests, quality/CAPA, tasks) lives in lab_data (lab_id, kind, jsonb items) via useLabData in src/lib/lab-data.ts; demo lab falls back to code samples, real labs start empty. Why: per-lab isolation by RLS on user_lab_id().
- Portal news is fetched server-side through the linked Firecrawl gateway from ISO and NDT.net, with per-source three-hour caching and no manual-post fallback; why: direct feeds are blocked and the public feed must reflect actual source publications.
