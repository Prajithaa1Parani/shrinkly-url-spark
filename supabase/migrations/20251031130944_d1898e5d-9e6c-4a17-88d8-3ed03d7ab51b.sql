-- Fix Critical Issue 1: Restrict clicks table access to admins only
-- Remove public access to sensitive analytics data
DROP POLICY IF EXISTS "Anyone can view clicks" ON public.clicks;

CREATE POLICY "Admins can view all clicks" ON public.clicks
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix Critical Issue 2: Create mechanism for first admin user
-- Automatically make the first user who signs up an admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Make first user admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();