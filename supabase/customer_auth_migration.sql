-- ==============================================================================
-- AURA WOMEN'S CLOTHING: CUSTOMER AUTHENTICATION & USER PROFILES MIGRATION
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. CREATE USER PROFILES TABLE (With 3 Roles: customer, admin, superadmin)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'superadmin')),
  has_set_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow public read of profiles if needed for storefront avatars
DROP POLICY IF EXISTS "Public can view basic profiles" ON public.user_profiles;
CREATE POLICY "Public can view basic profiles"
ON public.user_profiles FOR SELECT
TO anon
USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Allow insert by trigger / authenticated user
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT
TO anon, authenticated
WITH CHECK (true);


-- Grant table permissions
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_profiles TO authenticated, anon;


-- 2. AUTOMATIC DATABASE TRIGGER: Create user_profile upon Auth sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_google boolean;
  default_name text;
  avatar text;
BEGIN
  -- Safe provider detection (auth.users only has raw_app_meta_data, NOT app_metadata)
  is_google := coalesce(new.raw_app_meta_data->>'provider', '') = 'google';
  
  -- Extract full name safely
  default_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, 'client'), '@', 1)
  );

  -- Extract avatar safely
  avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    null
  );

  -- Insert profile with customer role (customer by default)
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    has_set_password
  )
  VALUES (
    new.id,
    coalesce(new.email, ''),
    default_name,
    avatar,
    'customer',
    CASE WHEN is_google THEN false ELSE true END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = coalesce(public.user_profiles.full_name, EXCLUDED.full_name),
    avatar_url = coalesce(public.user_profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: Do not block Supabase auth user creation if an error occurs
    RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
    RETURN new;
END;
$$;

-- Recreate trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. LINK ORDERS TO USER PROFILES (Optional user_id in orders)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

