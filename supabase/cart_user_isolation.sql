-- =========================================================================
-- AURA WOMEN'S CLOTHING: STRICT USER-ISOLATED CARTS & WISHLISTS
-- Run this in your Supabase Dashboard SQL Editor
-- =========================================================================

-- 1. Ensure wishlists table exists with user_id foreign key
CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_image text,
  price numeric NOT NULL DEFAULT 0,
  size text DEFAULT 'Standard',
  color text DEFAULT 'Standard',
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- 3. Drop open / permissive policies
DROP POLICY IF EXISTS "Allow public select from wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Allow public insert to wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Allow public update to wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Allow public delete from wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Users can manage own wishlist" ON public.wishlists;

-- 4. Create strict user isolation policy:
-- Authenticated users can ONLY read, insert, update, and delete their own items!
CREATE POLICY "Users can manage own wishlist"
ON public.wishlists FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: index for performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);
