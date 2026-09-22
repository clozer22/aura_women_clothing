-- SQL Script to create the `promotions` table for Discount Codes

CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  usage_limit integer,
  times_used integer DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by text
);

-- RLS Policies
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active promotions (so CheckoutPage can validate them)
CREATE POLICY "Public can view active promotions"
  ON public.promotions
  FOR SELECT
  USING (is_active = true);

-- Allow authenticated admins to do everything
CREATE POLICY "Admins can insert promotions"
  ON public.promotions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update promotions"
  ON public.promotions
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view all promotions"
  ON public.promotions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete promotions"
  ON public.promotions
  FOR DELETE
  USING (auth.role() = 'authenticated');
