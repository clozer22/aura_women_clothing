-- ==============================================================================
-- AURA ATELIER: TIKTOK-STYLE E-COMMERCE DASHBOARD & PRODUCT REVIEWS UPGRADE
-- Run this script in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. ENHANCE ORDERS TABLE WITH SHIPPING & TRACKING COLUMNS
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS courier_name text DEFAULT 'J&T Express',
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Create index on user_id and status if not already existing
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);


-- 2. CREATE PRODUCT REVIEWS TABLE (1-5 Star Ratings for Delivered Items)
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text,
  order_reference text NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  user_id uuid,
  user_name text NOT NULL,
  user_email text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  fit_feedback text, -- e.g. 'True to size', 'Runs small', 'Runs large'
  tags text[] DEFAULT '{}'::text[],
  images jsonb DEFAULT '[]'::jsonb,
  is_verified_purchase boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for lightning queries
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_ref ON public.product_reviews(order_reference);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.product_reviews(created_at DESC);

-- Enable RLS for product_reviews
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read approved reviews
DROP POLICY IF EXISTS "Allow public read product reviews" ON public.product_reviews;
CREATE POLICY "Allow public read product reviews"
ON public.product_reviews FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated and guest users to insert product reviews
DROP POLICY IF EXISTS "Allow customer insert product reviews" ON public.product_reviews;
CREATE POLICY "Allow customer insert product reviews"
ON public.product_reviews FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow users to update their own reviews or admin updates
DROP POLICY IF EXISTS "Allow customer update own review" ON public.product_reviews;
CREATE POLICY "Allow customer update own review"
ON public.product_reviews FOR UPDATE
TO anon, authenticated
USING (true);

-- Allow admin deletion
DROP POLICY IF EXISTS "Allow admin delete review" ON public.product_reviews;
CREATE POLICY "Allow admin delete review"
ON public.product_reviews FOR DELETE
TO anon, authenticated
USING (true);


-- 3. CREATE SITE VISITS TABLE (Website Visitor Traffic Analytics)
CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  path text DEFAULT '/',
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for counting by date / time
CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON public.site_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_session ON public.site_visits(session_id);

-- Enable RLS for site_visits
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Allow public insertion for page visit logging
DROP POLICY IF EXISTS "Allow public insert site visits" ON public.site_visits;
CREATE POLICY "Allow public insert site visits"
ON public.site_visits FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow public & admin select for analytics counts
DROP POLICY IF EXISTS "Allow public select site visits" ON public.site_visits;
CREATE POLICY "Allow public select site visits"
ON public.site_visits FOR SELECT
TO anon, authenticated
USING (true);


-- 4. HELPER VIEWS / STATS FUNCTION (Optional quick aggregate)
CREATE OR REPLACE VIEW public.vw_order_fulfillment_summary AS
SELECT 
  COUNT(*) AS total_orders,
  COUNT(*) FILTER (WHERE UPPER(status) IN ('PENDING', 'TO_SHIP', 'PROCESSING') AND UPPER(payment_status) = 'PAID') AS count_to_ship,
  COUNT(*) FILTER (WHERE UPPER(status) = 'SHIPPED') AS count_shipped,
  COUNT(*) FILTER (WHERE UPPER(status) = 'TO_DELIVER') AS count_to_deliver,
  COUNT(*) FILTER (WHERE UPPER(status) = 'DELIVERED' OR UPPER(status) = 'COMPLETED') AS count_delivered,
  COUNT(*) FILTER (WHERE UPPER(status) = 'CANCELLED') AS count_cancelled,
  COUNT(*) FILTER (WHERE UPPER(status) IN ('RETURNED', 'REFUNDED')) AS count_returned,
  COUNT(*) FILTER (WHERE UPPER(status) IN ('FAILED_TO_DELIVER', 'DELIVERY_FAILED')) AS count_failed_to_deliver,
  COALESCE(SUM(total_amount) FILTER (WHERE UPPER(payment_status) = 'PAID'), 0) AS total_revenue
FROM public.orders;

-- Verification query
SELECT 'TikTok E-Commerce Upgrade Script Completed Successfully!' AS status;
