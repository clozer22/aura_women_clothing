-- ==========================================
-- AURA WORKSPACE DATABASE SCHEMA & POLICIES
-- ==========================================

-- Drop existing objects if they exist to allow clean migration runs
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.storefront_config CASCADE;
DROP TABLE IF EXISTS public.admin_profiles CASCADE;

-- 1. PRODUCTS TABLE
CREATE TABLE public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  subtitle text,
  category text,
  "mainCategory" text NOT NULL,
  "subType" text NOT NULL,
  price numeric NOT NULL,
  "originalPrice" numeric,
  "discountBadge" text,
  "statusBadge" text,
  rating numeric DEFAULT 4.9,
  "reviewsCount" integer DEFAULT 20,
  solds integer DEFAULT 120,
  "shopeeLink" text NOT NULL,
  "isNew" boolean DEFAULT true,
  "isBestSeller" boolean DEFAULT false,
  "isFeatured" boolean DEFAULT false,
  "descriptionLabel" text DEFAULT 'Description',
  description text,
  colors jsonb DEFAULT '[]'::jsonb,
  sizes text DEFAULT 'XXS-XS, S-M, L, XL',
  image text NOT NULL,
  "hoverImage" text,
  details text[] DEFAULT '{}'::text[],
  qty integer DEFAULT 24,
  "createdAt" timestamptz DEFAULT now()
);

-- 2. STOREFRONT CONFIG TABLE (For Theme customizer)
CREATE TABLE public.storefront_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "posterUrl" text NOT NULL,
  title text DEFAULT 'Aura',
  about_media_url text DEFAULT 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop',
  about_media_type text DEFAULT 'image', -- 'image' or 'video'
  about_title text DEFAULT 'Oh What?',
  about_subtitle text DEFAULT 'Sakura Blossom - Milky Lavender',
  about_description text DEFAULT 'The Brightening Secret. Lavender blushes are a viral beauty secret for a reason! This milky purple is a dream for fair skin and Asian skin tones, as the purple pigment acts as a color corrector to neutralize sallow or yellow tones, leaving a bright, "ethereal" glow.

On white skin with cool undertones, it creates a unique, high-fashion pastel flush. For darker skin, it can be used as a targeted brightening topper over a deeper blush to add a modern, multidimensional finish.',
  "createdAt" timestamptz DEFAULT now()
);

-- 3. ADMIN PROFILES TABLE (Elena Vance's profile details)
CREATE TABLE public.admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text DEFAULT 'Elena Vance',
  role_title text DEFAULT 'Owner & Head Atelier Designer',
  email text,
  avatar_url text DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
  bio text DEFAULT 'Bespoke designer commanding elegance for the modern profile.',
  updated_at timestamptz DEFAULT now()
);

-- Enable Row-Level Security (RLS) on all tables (Industry Standard)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create Policies: Public Read Access (Anyone can browse products & config)
CREATE POLICY "Allow public read access on products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on storefront_config" ON public.storefront_config
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on admin_profiles" ON public.admin_profiles
  FOR SELECT USING (true);

-- Create Policies: Admin Write Access (Only logged-in admins can write/mutate)
CREATE POLICY "Allow admin write access on products" ON public.products
  FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow admin write access on storefront_config" ON public.storefront_config
  FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow admin write access on admin_profiles" ON public.admin_profiles
  FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create trigger function to automatically set up the admin profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.admin_profiles (id, email, name, role_title, avatar_url, bio)
  VALUES (
    new.id,
    new.email,
    'Elena Vance',
    'Owner & Head Atelier Designer',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    'Bespoke designer commanding elegance for the modern profile.'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed Default Storefront Config settings
INSERT INTO public.storefront_config (id, "posterUrl", title)
VALUES (
  'd18d4dc0-5bfa-4c48-b4b9-1234567890ab',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1600&auto=format&fit=crop',
  'Aura' 
) ON CONFLICT DO NOTHING;

-- Seed Default Catalog Products
INSERT INTO public.products (
  id, name, subtitle, category, "mainCategory", "subType", price, "originalPrice", 
  "discountBadge", "statusBadge", rating, "reviewsCount", solds, "shopeeLink", 
  "isNew", "isBestSeller", description, colors, sizes, image, "hoverImage", details
) VALUES 
('aura-01', 'The Monogram Silk Trench', 'Signature Outerwear Collection', 'Suits & Coats', 'top', 'Blazers & Jackets', 480, 550, '-15%', null, 4.9, 38, 142, 'https://shopee.ph/Aura-Monogram-Silk-Trench-i.123456.78910', true, true, 'Crafted from 100% pure Mulberry silk with a liquid drape finish. Designed with clean architectural lines, a relaxed belt waist, and soft rose undertones.', '[{"name": "Warm Rose Taupe", "hex": "#D99B91"}, {"name": "Nude Beige", "hex": "#E6D7CD"}, {"name": "Espresso", "hex": "#362420"}]'::jsonb, 'XXS-XS, S-M, L, XL', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop', '{"100% Premium Mulberry Silk", "Hand-finished lapel embroidery", "Removable fabric belt included", "Dry clean only"}'),
('aura-02', 'Atelier Tailored Blush Blazer', 'Structured Power Suit', 'Suits & Coats', 'top', 'Blazers & Jackets', 360, 420, '-14%', null, 4.8, 29, 98, 'https://shopee.ph/Aura-Atelier-Blush-Blazer-i.123456.78911', true, false, 'Double-breasted tailoring in our iconic soft rose blush hue. Sharp structured shoulders meet soft feminine curves for effortless sophistication.', '[{"name": "Rose Blush", "hex": "#F0D4CD"}, {"name": "Ivory Cream", "hex": "#F9F6F0"}]'::jsonb, 'XXS-XS, S-M, L', 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1000&auto=format&fit=crop', '{"Italian Wool Blend", "Custom gold filigree buttons", "Fully lined with silk satin", "Internal secret welt pocket"}'),
('aura-03', 'Pink Fur Micro Halter Top', 'Atelier Runway Capsule', 'Silk Dresses', 'top', 'Micro Tops & Fur Tops', 240, 340, '-30%', null, 4.9, 41, 230, 'https://shopee.ph/Aura-Pink-Fur-Halter-i.123456.78912', true, true, 'Plush faux fur halter top with delicate rose velvet ties and a structured boned waist silhouette.', '[{"name": "Blush Pink", "hex": "#F3C5C5"}, {"name": "Silver Gray", "hex": "#D1D5DB"}]'::jsonb, 'XXS-XS, S-M', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop', '{"Eco-friendly plush faux fur", "Lined with Mulberry silk", "Adjustable neck halter ties"}'),
('aura-04', 'Gray Fur Micro Halter Top', 'Atelier Runway Capsule', 'Silk Dresses', 'top', 'Micro Tops & Fur Tops', 240, null, null, 'SOLD OUT', 4.7, 33, 114, 'https://shopee.ph/Aura-Gray-Fur-Halter-i.123456.78913', false, true, 'Monochrome slate gray plush fur top with custom metal emblem hardware details.', '[{"name": "Slate Gray", "hex": "#6B7280"}]'::jsonb, 'XXS-XS, S-M', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop', '{"Heavyweight faux fur", "Satin stretch lining"}'),
('aura-05', 'Pink Bardot Faux Fur Top', 'Off-the-Shoulder Luxury', 'Knitwear', 'top', 'Corsets & Halters', 380, null, null, 'PRE-ORDER', 5.0, 19, 47, 'https://shopee.ph/Aura-Pink-Bardot-Top-i.123456.78914', true, false, 'Dramatic voluminous off-the-shoulder sleeves knit from soft feathered mohair and faux fur yarns.', '[{"name": "Powder Pink", "hex": "#FBCFE8"}]'::jsonb, 'XXS-XS, S-M, L', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=1000&auto=format&fit=crop', '{"Feathered mohair & faux fur blend", "Elasticized Bardot shoulder line"}'),
('aura-06', 'Silk Corset Top & Halter', 'Structured Eveningwear', 'Silk Dresses', 'top', 'Corsets & Halters', 260, 300, '-13%', null, 4.8, 22, 85, 'https://shopee.ph/Aura-Silk-Corset-Top-i.123456.78915', true, true, 'Satin corset with boned bodice and sheer organza shoulder ribbons.', '[{"name": "Champagne Gold", "hex": "#E5D3B3"}, {"name": "Black Velvet", "hex": "#111827"}]'::jsonb, 'XXS-XS, S-M', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?q=80&w=1000&auto=format&fit=crop', '{"Flexible steel boning support", "Back lace-up ribbon ties"}'),
('aura-07', 'Aura Minimalist Cashmere Sweater', 'Everyday Luxury', 'Knitwear', 'top', 'Cashmere & Sweaters', 290, null, null, null, 4.9, 52, 173, 'https://shopee.ph/Aura-Cashmere-Sweater-i.123456.78916', false, true, 'Ultra-soft 12-gauge Grade A Mongolian Cashmere knit sweater.', '[{"name": "Oatmeal Milk", "hex": "#EDE4DC"}, {"name": "Dusty Mocha", "hex": "#A8928B"}]'::jsonb, 'XXS-XS, S-M, L, XL', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=1000&auto=format&fit=crop', '{"100% Grade A Cashmere", "Ribbed cuffs and dynamic hem"}'),
('aura-08', 'Pure Mulberry Silk Blouse', 'Effortless Draped Shirt', 'Silk Dresses', 'top', 'Silk Shirts & Blouses', 220, 240, '-8%', null, 4.8, 16, 62, 'https://shopee.ph/Aura-Silk-Blouse-i.123456.78917', false, false, 'Flowing silk blouse with french cuffs and mother-of-pearl buttons.', '[{"name": "Ivory White", "hex": "#FFFFFF"}, {"name": "Soft Taupe", "hex": "#D99B91"}]'::jsonb, 'XXS-XS, S-M, L', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop', '{"100% Mulberry silk twill", "Concealed front button placket"}'),
('aura-09', 'Pink Fur Micro Skirt', 'Runway Capsule Bottoms', 'Suits & Coats', 'bottom', 'Micro Skirts', 180, 260, '-30%', null, 4.9, 34, 88, 'https://shopee.ph/Aura-Pink-Fur-Skirt-i.123456.78918', true, true, 'Statement micro skirt in plush blush pink faux fur with side invisible zip.', '[{"name": "Blush Pink", "hex": "#F3C5C5"}]'::jsonb, 'XXS-XS, S-M', 'https://images.unsplash.com/photo-1551803091-e20673f15770?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop', '{"Low-rise micro cut", "Plush faux fur finish"}'),
('aura-10', 'Gray Fur Micro Set Bottom', 'Runway Capsule Bottoms', 'Suits & Coats', 'bottom', 'Fur Micro Sets & Shorts', 180, 260, '-30%', null, 4.8, 27, 53, 'https://shopee.ph/Aura-Gray-Fur-Set-i.123456.78919', true, false, 'Matching gray fur hot shorts with custom metallic crest badge.', '[{"name": "Slate Gray", "hex": "#6B7280"}]'::jsonb, 'XXS-XS, S-M', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1551803091-e20673f15770?q=80&w=1000&auto=format&fit=crop', '{"Tailored inner shorts lining", "Low waistband fit"}'),
('aura-11', 'Architectural Pleated Trouser', 'Tailored Essentials', 'Suits & Coats', 'bottom', 'Trousers & Tailored Pants', 240, 250, '-4%', null, 4.7, 18, 91, 'https://shopee.ph/Aura-Pleated-Trouser-i.123456.78920', true, false, 'High-waisted tailored trousers featuring deep double front pleats and a sweeping wide-leg silhouette.', '[{"name": "Sandstone Beige", "hex": "#DED3C9"}, {"name": "Espresso", "hex": "#362420"}]'::jsonb, 'XXS-XS, S-M, L, XL', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1551803091-e20673f15770?q=80&w=1000&auto=format&fit=crop', '{"Structured wool-cotton blend", "Deep functional side pockets"}'),
('aura-12', 'Fluid Silk Bias Midi Skirt', 'Contemporary Chic', 'Silk Dresses', 'bottom', 'Silk Midi Skirts', 210, null, null, 'SOLD OUT', 4.9, 30, 120, 'https://shopee.ph/Aura-Silk-Midi-Skirt-i.123456.78921', false, true, 'Bias-cut Mulberry silk midi skirt with invisible waistband drape.', '[{"name": "Rose Taupe", "hex": "#D99B91"}, {"name": "Black Onyx", "hex": "#111827"}]'::jsonb, 'XXS-XS, S-M, L', 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop', '{"100% Silk Satin", "Seamless waistband contour"}'),
('aura-13', 'Tailored High-Waist Shorts', 'Summer Atelier Essentials', 'Suits & Coats', 'bottom', 'Fur Micro Sets & Shorts', 170, 210, '-19%', null, 4.6, 14, 62, 'https://shopee.ph/Aura-High-Waist-Shorts-i.123456.78922', true, false, 'Crisp linen-blend tailored shorts with sharp front pleats and side belt loops.', '[{"name": "Nude Ivory", "hex": "#FAF5F2"}]'::jsonb, 'XXS-XS, S-M', 'https://images.unsplash.com/photo-1551803091-e20673f15770?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop', '{"Linen cotton blend", "Cuffed hem line"}'),
('aura-14', 'Cashmere Lounge Bottoms', 'Soft Comfort', 'Knitwear', 'bottom', 'Trousers & Tailored Pants', 230, null, null, 'PRE-ORDER', 4.9, 25, 75, 'https://shopee.ph/Aura-Cashmere-Lounge-Bottoms-i.123456.78923', false, true, 'Relaxed wide-leg trousers knit from 100% Mongolian Cashmere.', '[{"name": "Oatmeal Milk", "hex": "#EDE4DC"}]'::jsonb, 'XXS-XS, S-M, L', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=1000&auto=format&fit=crop', 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=1000&auto=format&fit=crop', '{"100% Mongolian Cashmere", "Drawstring elastic waistband"}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  "shopeeLink" = EXCLUDED."shopeeLink",
  image = EXCLUDED.image;

-- ==========================================
-- 4. STORAGE SETUP (Create storefront bucket)
-- ==========================================

-- Insert bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('storefront', 'storefront', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public storage bucket access
DROP POLICY IF EXISTS "Public Read Access storefront" ON storage.objects;
CREATE POLICY "Public Read Access storefront" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'storefront');

DROP POLICY IF EXISTS "Admin CRUD Access storefront" ON storage.objects;
CREATE POLICY "Admin CRUD Access storefront" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'storefront') WITH CHECK (bucket_id = 'storefront');
