CREATE TABLE public.labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name text NOT NULL,
  lab_name text NOT NULL,
  kind text NOT NULL DEFAULT 'independent',
  parent_org text NOT NULL DEFAULT '',
  head_name text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.labs TO authenticated;
GRANT ALL ON public.labs TO service_role;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;

INSERT INTO public.labs (id, org_name, lab_name, kind, head_name, is_demo)
VALUES ('00000000-0000-0000-0000-000000000017', 'Demo NDT Company', 'Лаборатория НК ЛНК-017', 'independent', 'Крылов А.', true);

ALTER TABLE public.profiles ADD COLUMN lab_id uuid REFERENCES public.labs(id) DEFAULT '00000000-0000-0000-0000-000000000017';
UPDATE public.profiles SET lab_id = '00000000-0000-0000-0000-000000000017' WHERE lab_id IS NULL;

CREATE TABLE public.portal_admins (user_id uuid PRIMARY KEY);
GRANT ALL ON public.portal_admins TO service_role;
ALTER TABLE public.portal_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_portal_admin(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.portal_admins WHERE user_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.user_lab_id(_user_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lab_id FROM public.profiles WHERE id = _user_id
$$;

CREATE POLICY "Members read own lab" ON public.labs FOR SELECT TO authenticated
  USING (id = public.user_lab_id(auth.uid()) OR public.is_portal_admin(auth.uid()));

CREATE TABLE public.lab_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name text NOT NULL,
  lab_name text NOT NULL,
  kind text NOT NULL,
  parent_org text NOT NULL DEFAULT '',
  head_name text NOT NULL,
  email text NOT NULL,
  login text NOT NULL,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
GRANT SELECT, UPDATE ON public.lab_requests TO authenticated;
GRANT ALL ON public.lab_requests TO service_role;
ALTER TABLE public.lab_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portal admin reads requests" ON public.lab_requests FOR SELECT TO authenticated USING (public.is_portal_admin(auth.uid()));
CREATE POLICY "Portal admin updates requests" ON public.lab_requests FOR UPDATE TO authenticated USING (public.is_portal_admin(auth.uid())) WITH CHECK (public.is_portal_admin(auth.uid()));

CREATE TABLE public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'NDT Portal',
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT ON public.news_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_posts TO authenticated;
GRANT ALL ON public.news_posts TO service_role;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads news" ON public.news_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Portal admin inserts news" ON public.news_posts FOR INSERT TO authenticated WITH CHECK (public.is_portal_admin(auth.uid()));
CREATE POLICY "Portal admin updates news" ON public.news_posts FOR UPDATE TO authenticated USING (public.is_portal_admin(auth.uid())) WITH CHECK (public.is_portal_admin(auth.uid()));
CREATE POLICY "Portal admin deletes news" ON public.news_posts FOR DELETE TO authenticated USING (public.is_portal_admin(auth.uid()));

GRANT EXECUTE ON FUNCTION public.is_portal_admin(uuid) TO authenticated;
