-- ==============================================================================
-- AURA WOMEN'S CLOTHING: COMPLETE ORDERS & WISHLIST TABLES CREATION
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- Ensure clean slate in case an incomplete table exists
DROP TABLE IF EXISTS public.wishlists CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- 1. CREATE ORDERS TABLE
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  shipping_fee numeric NOT NULL DEFAULT 150,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'GCASH',
  payment_status text NOT NULL DEFAULT 'PENDING',
  status text NOT NULL DEFAULT 'PENDING',
  xendit_invoice_id text,
  xendit_invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast search & filtering
CREATE INDEX idx_orders_reference ON public.orders(order_reference);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow guest & customer checkouts to insert orders
CREATE POLICY "Allow public insert to orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow reading orders (by customer or order tracking)
CREATE POLICY "Allow public select from orders"
ON public.orders FOR SELECT
TO anon, authenticated
USING (true);

-- Allow updating orders (status updates / payment completion)
CREATE POLICY "Allow public update to orders"
ON public.orders FOR UPDATE
TO anon, authenticated
USING (true);


-- 2. CREATE WISHLISTS TABLE
CREATE TABLE public.wishlists (
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Wishlist RLS Policies
CREATE POLICY "Allow public insert to wishlists"
ON public.wishlists FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public select from wishlists"
ON public.wishlists FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public update to wishlists"
ON public.wishlists FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public delete from wishlists"
ON public.wishlists FOR DELETE
TO anon, authenticated
USING (true);
