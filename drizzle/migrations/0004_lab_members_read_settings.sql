CREATE POLICY "Lab staff read settings" ON public.app_settings FOR SELECT TO authenticated
  USING (public.user_lab_id(auth.uid()) = '00000000-0000-0000-0000-000000000017'::uuid);
GRANT EXECUTE ON FUNCTION public.user_lab_id(uuid) TO authenticated;