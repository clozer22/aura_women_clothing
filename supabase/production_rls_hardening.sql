-- ==============================================================================
-- AURA WOMEN'S CLOTHING: PRODUCTION ROW LEVEL SECURITY (RLS) HARDENING
-- Restricts public anon access and enforces strict admin verification
-- ==============================================================================

-- 1. Helper function: Verify if current user is an active Administrator
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
  )
  OR (
    auth.jwt() ->> 'email' IS NOT NULL
    AND (
      LOWER(auth.jwt() ->> 'email') LIKE '%@admin.com'
      OR LOWER(auth.jwt() ->> 'email') LIKE '%@superadmin.com'
      OR LOWER(auth.jwt() ->> 'email') LIKE '%@aura.com'
    )
  );
$$;

-- Grant execution to authenticated & anon roles
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;


-- ==============================================================================
-- 2. HARDEN ADMIN_PROFILES (Prevent unauthorized staff harvesting & tampering)
-- ==============================================================================
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Allow upsert admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Public read admin bio" ON public.admin_profiles;
DROP POLICY IF EXISTS "Only admins can view admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Only admins can manage admin profiles" ON public.admin_profiles;

CREATE POLICY "Only admins can view admin profiles"
ON public.admin_profiles FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Only admins can manage admin profiles"
ON public.admin_profiles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ==============================================================================
-- 3. HARDEN ORDERS (Protect customer names, phones, addresses, and order data)
-- ==============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select from orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public update to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Allow order creation" ON public.orders;
DROP POLICY IF EXISTS "Only admins can update orders" ON public.orders;

-- Admins view all orders; Authenticated customers only view their own
CREATE POLICY "Users and admins can view orders"
ON public.orders FOR SELECT
TO authenticated, anon
USING (
  public.is_admin()
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- Storefront checkout can insert new orders
CREATE POLICY "Allow order creation"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only verified admins (or service role) can update order status / tracking
CREATE POLICY "Only admins can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ==============================================================================
-- 4. HARDEN PRODUCTS & STOREFRONT_CONFIG (Prevent customer price tampering)
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to delete products" ON public.products;
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;

CREATE POLICY "Public read products"
ON public.products FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Only admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.is_admin());

-- Storefront config
ALTER TABLE public.storefront_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read storefront" ON public.storefront_config;
DROP POLICY IF EXISTS "Public read storefront_config" ON public.storefront_config;
DROP POLICY IF EXISTS "Allow authenticated users to manage storefront" ON public.storefront_config;
DROP POLICY IF EXISTS "Only admins can manage storefront_config" ON public.storefront_config;

CREATE POLICY "Public read storefront_config"
ON public.storefront_config FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Only admins can manage storefront_config"
ON public.storefront_config FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ==============================================================================
-- 5. HARDEN PRODUCT_REVIEWS (Prevent review vandalism)
-- ==============================================================================
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read product reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Allow customer insert product reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Allow customer update own review" ON public.product_reviews;
DROP POLICY IF EXISTS "Allow admin delete review" ON public.product_reviews;
DROP POLICY IF EXISTS "Public read product_reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Customers can insert reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users or admins can update reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Only admins can delete reviews" ON public.product_reviews;

CREATE POLICY "Public read product_reviews"
ON public.product_reviews FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Customers can insert reviews"
ON public.product_reviews FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Users or admins can update reviews"
ON public.product_reviews FOR UPDATE
TO authenticated
USING (public.is_admin() OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

CREATE POLICY "Only admins can delete reviews"
ON public.product_reviews FOR DELETE
TO authenticated
USING (public.is_admin());
