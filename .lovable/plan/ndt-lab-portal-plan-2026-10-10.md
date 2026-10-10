# NDT Lab Portal — plan

Turn the app into a public portal for many NDT labs. The current lab becomes the read-only demo.

## Phase 1 — Public portal (landing page)
- New one-page English landing at `/`: hero, NDT news feed, "How it works", "Register your lab", "Try demo", "Sign in", footer.
- Language switcher EN / FR / DE / PL / ES / RU (landing first; remembered per visitor).
- News: automatic feed from open sources (ISO news, NDT.net RSS), refreshed every few hours, merged with manual posts published by the portal admin.
- The current dashboard moves to `/app` (all lab pages stay the same, under the signed-in area).

## Phase 2 — Lab registration with approval
- "Register your lab" form: organization name, lab name, independent or subordinate (+ parent organization), head's full name, email, desired login, password.
- Request goes to "Pending"; a new **portal admin** role sees a requests list and approves or rejects.
- On approval the lab is created and the head can sign in to an empty lab of their own.

## Phase 3 — Separate data per lab
- Each lab has its own staff, settings, equipment, tests, audits and CAPA in the database; one lab never sees another's data.
- Current demo data is moved into the database as the "Demo lab".
- "Try demo" signs in as a read-only demo user (no password, cannot change anything).

## Phase 4 — Equipment import in Settings
- New "Equipment" tab in Settings: above the "Add" row, a rules block describing the file format (columns, required fields, date format, examples) and a downloadable template.
- Upload .xlsx or .csv, preview with row-by-row errors, then import. Manual add/edit rows stay available.

## Phase 5 — Translation of the working area
- All lab pages translated into the 6 languages with the same switcher.

## Technical details
- New tables: `labs`, `lab_requests`, `news_posts`, `equipment` (+ later tests, audits, capa), all with `lab_id`; RLS by membership via a security-definer `user_lab_id()` helper; new role `portal_admin`.
- News feed fetched in a server function with caching; manual posts in `news_posts`.
- File parsing in the browser (SheetJS), validated rows saved via an authenticated server function.
- i18n: lightweight dictionary per language, no external service.

Phases are delivered in order; each one is usable on its own.
