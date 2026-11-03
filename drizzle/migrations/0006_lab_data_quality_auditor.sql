CREATE OR REPLACE FUNCTION public.can_write_lab_data(_user_id uuid, _lab_id uuid, _kind text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _lab_id = public.user_lab_id(_user_id)
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND login = 'demo')
    AND (NOT public.has_role(_user_id, 'auditor') OR _kind = 'quality')
$$;
DROP POLICY "Lab staff insert own lab data" ON public.lab_data;
DROP POLICY "Lab staff update own lab data" ON public.lab_data;
CREATE POLICY "Lab staff insert own lab data" ON public.lab_data FOR INSERT TO authenticated
  WITH CHECK (public.can_write_lab_data(auth.uid(), lab_id, kind));
CREATE POLICY "Lab staff update own lab data" ON public.lab_data FOR UPDATE TO authenticated
  USING (public.can_write_lab_data(auth.uid(), lab_id, kind))
  WITH CHECK (public.can_write_lab_data(auth.uid(), lab_id, kind));