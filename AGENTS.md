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
