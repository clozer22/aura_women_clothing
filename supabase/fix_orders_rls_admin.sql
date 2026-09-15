-- ==============================================================================
-- AURA ATELIER: FIX ORDERS ROW-LEVEL SECURITY (RLS) FOR ADMIN ACCESS
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Ensure table exists & enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop any restrictive select policies that prevent admin from viewing orders
DROP POLICY IF EXISTS "Allow public select from orders" ON public.orders;
DROP POLICY IF EXISTS "Users can only view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow select for users" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated view orders" ON public.orders;

-- 3. Create permissive SELECT policy so the Admin Dashboard can load all orders
CREATE POLICY "Allow public select from orders"
ON public.orders FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Ensure INSERT permissions for checkout
DROP POLICY IF EXISTS "Allow public insert to orders" ON public.orders;
CREATE POLICY "Allow public insert to orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 5. Ensure UPDATE permissions for status updates & Shipmates courier bookings
DROP POLICY IF EXISTS "Allow public update to orders" ON public.orders;
CREATE POLICY "Allow public update to orders"
ON public.orders FOR UPDATE
TO anon, authenticated
USING (true);

-- 6. Verify table columns exist for tracking
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS courier_name text DEFAULT 'J&T Express',
  ADD COLUMN IF NOT EXISTS shipment_id text,
  ADD COLUMN IF NOT EXISTS waybill_url text,
  ADD COLUMN IF NOT EXISTS shipment_status text DEFAULT 'UNBOOKED',
  ADD COLUMN IF NOT EXISTS shipment_payload jsonb;
