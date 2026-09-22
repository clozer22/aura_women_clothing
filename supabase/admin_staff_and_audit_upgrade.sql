-- ==============================================================================
-- AURA ATELIER: STAFF ROLES & ORDER AUDIT TRAIL UPGRADE
-- Run this script in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. CREATE OR ENHANCE ADMIN_PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT 'Administrator',
  role text NOT NULL DEFAULT 'Admin', -- 'Super Admin' or 'Admin'
  role_title text DEFAULT 'Staff',
  avatar_url text,
  bio text,
  permissions jsonb DEFAULT '["dashboard", "products", "orders", "reviews", "customize", "profile"]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure all columns exist if table already existed previously
ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'Admin',
  ADD COLUMN IF NOT EXISTS role_title text DEFAULT 'Staff',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '["dashboard", "products", "orders", "reviews", "customize", "profile"]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Enable RLS for admin_profiles
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and anon to select/read staff profiles
DROP POLICY IF EXISTS "Allow read admin_profiles" ON public.admin_profiles;
CREATE POLICY "Allow read admin_profiles"
ON public.admin_profiles FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to insert/update admin_profiles
DROP POLICY IF EXISTS "Allow upsert admin_profiles" ON public.admin_profiles;
CREATE POLICY "Allow upsert admin_profiles"
ON public.admin_profiles FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


-- 2. ENHANCE ORDERS TABLE WITH AUDIT TRAIL & LAST TOUCHED TRACKING
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS last_touched_by jsonb,
  ADD COLUMN IF NOT EXISTS audit_trail jsonb DEFAULT '[]'::jsonb;

-- Index for querying audit updates
CREATE INDEX IF NOT EXISTS idx_orders_last_touched ON public.orders USING gin (last_touched_by);


-- 3. AUTO-CONFIRM ADMIN & STAFF EMAILS (@admin.com & @superadmin.com)
-- Prevents "Email not confirmed" error for internal accounts
CREATE OR REPLACE FUNCTION public.auto_confirm_admin_staff()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email ILIKE '%@admin.com' OR NEW.email ILIKE '%@superadmin.com' THEN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_admin_staff ON auth.users;
CREATE TRIGGER trg_auto_confirm_admin_staff
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_admin_staff();

-- Instantly confirm all existing staff accounts (including sarah@admin.com):
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email ILIKE '%@admin.com' OR email ILIKE '%@superadmin.com';


-- 4. VERIFICATION
SELECT 'Staff Management, Auto-Confirm Trigger, and Order Audit Trail Migration Completed Successfully!' AS status;

