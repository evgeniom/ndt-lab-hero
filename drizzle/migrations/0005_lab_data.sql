CREATE TABLE public.lab_data (
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  kind text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (lab_id, kind)
);
GRANT SELECT, INSERT, UPDATE ON public.lab_data TO authenticated;
GRANT ALL ON public.lab_data TO service_role;
ALTER TABLE public.lab_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab members read own lab data" ON public.lab_data FOR SELECT TO authenticated
  USING (lab_id = public.user_lab_id(auth.uid()));
CREATE POLICY "Lab staff insert own lab data" ON public.lab_data FOR INSERT TO authenticated
  WITH CHECK (lab_id = public.user_lab_id(auth.uid()) AND NOT public.has_role(auth.uid(), 'auditor'));
CREATE POLICY "Lab staff update own lab data" ON public.lab_data FOR UPDATE TO authenticated
  USING (lab_id = public.user_lab_id(auth.uid()) AND NOT public.has_role(auth.uid(), 'auditor'))
  WITH CHECK (lab_id = public.user_lab_id(auth.uid()) AND NOT public.has_role(auth.uid(), 'auditor'));