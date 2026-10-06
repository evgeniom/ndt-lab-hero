CREATE TABLE public.app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Head inserts settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'head'));
CREATE POLICY "Head updates settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'head')) WITH CHECK (public.has_role(auth.uid(), 'head'));
INSERT INTO public.app_settings (id) VALUES (1);