-- Profiles: each user reads only their own profile
DROP POLICY "Staff can view profiles" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Roles: users read only their own role; head reads all
DROP POLICY "Staff can view roles" ON public.user_roles;
CREATE POLICY "Users view own role"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'head'));

-- Settings: only head reads shared lab settings
DROP POLICY "Staff read settings" ON public.app_settings;
CREATE POLICY "Head reads settings"
ON public.app_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'head'));