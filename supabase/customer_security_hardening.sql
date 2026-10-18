-- ==============================================================================
-- AURA WOMEN'S CLOTHING: CUSTOMER & DATABASE SECURITY HARDENING
-- ==============================================================================

-- 1. Harden is_admin() function to strictly require verified admin_profiles entry
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
      AND is_active = true
  );
$$;

-- 2. Add discount and promo tracking to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_code text;

-- 3. Harden promotions table RLS (prevent regular customer tampering)
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert promotions" ON public.promotions;
DROP POLICY IF EXISTS "Admins can update promotions" ON public.promotions;
DROP POLICY IF EXISTS "Admins can view all promotions" ON public.promotions;
DROP POLICY IF EXISTS "Admins can delete promotions" ON public.promotions;
DROP POLICY IF EXISTS "Public can view active promotions" ON public.promotions;
DROP POLICY IF EXISTS "Only admins can view all promotions" ON public.promotions;
DROP POLICY IF EXISTS "Only admins can insert promotions" ON public.promotions;
DROP POLICY IF EXISTS "Only admins can update promotions" ON public.promotions;
DROP POLICY IF EXISTS "Only admins can delete promotions" ON public.promotions;

CREATE POLICY "Public can view active promotions"
  ON public.promotions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can view all promotions"
  ON public.promotions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Only admins can insert promotions"
  ON public.promotions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update promotions"
  ON public.promotions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete promotions"
  ON public.promotions FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 4. Harden user_profiles table RLS & prevent privilege escalation
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view basic profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users and admins can view user_profiles" ON public.user_profiles;

CREATE POLICY "Users and admins can view user_profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- Database-level Trigger: Prevent non-admins/service_role from tampering with 'role'
CREATE OR REPLACE FUNCTION public.protect_user_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT (auth.role() = 'service_role' OR public.is_admin()) THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_profile_role ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profile_role
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_profile_role();

-- 5. Harden site_visits table RLS (prevent public harvesting of visitor analytics)
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select site visits" ON public.site_visits;
DROP POLICY IF EXISTS "Only admins can view site visits" ON public.site_visits;

CREATE POLICY "Only admins can view site visits"
ON public.site_visits FOR SELECT
TO authenticated
USING (public.is_admin());
