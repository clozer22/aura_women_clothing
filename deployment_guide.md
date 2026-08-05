# Aura Storefront Deployment Guide

This guide details the step-by-step process for deploying the **Aura Storefront** to **Vercel** (frontend), configuring your **Supabase** backend, and linking your custom domain.

---

## Part 1: Supabase Configuration

Supabase hosts your backend database, admin authentication, and media storage.

### 1. Database Schema
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and navigate to your project.
2. Click on the **SQL Editor** (`>_` icon) in the left sidebar.
3. Click **New Query**.
4. Open the local [`schema.sql`](file:///Users/mj.aballe/Development/aura-clothing/schema.sql) file, copy its contents, paste them into the SQL editor, and click **Run**.
5. *Note: If you have already configured the database, execute only this script to ensure the new dynamic description label column exists:*
   ```sql
   ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "descriptionLabel" text DEFAULT 'Description';
   ```

### 2. Media Storage Bucket
1. Click the **Storage** icon (bucket icon) in the left sidebar.
2. Click **New Bucket** at the top.
3. Set the **Bucket Name** to exactly: `storefront`
4. Toggle **Public bucket** to **ON** (allows visitors to load product images).
5. Click **Create bucket**.

### 3. Storage Security Policies (RLS)
To secure your uploaded product images so that only your Admin can modify them while customers can view them:
1. Navigate back to the **SQL Editor**.
2. Click **New Query**.
3. Paste the following script and click **Run**:
   ```sql
   -- Allow public access to view/read product photos
   CREATE POLICY "Public Access" ON storage.objects
     FOR SELECT TO public USING (bucket_id = 'storefront');

   -- Allow logged-in Admins to upload/edit product photos
   CREATE POLICY "Admin Upload Access" ON storage.objects
     FOR ALL TO authenticated 
     USING (bucket_id = 'storefront')
     WITH CHECK (bucket_id = 'storefront');
   ```

---

## Part 2: GitHub Repository Setup

To deploy to Vercel, your codebase needs to be hosted on a GitHub repository.

1. Create a new repository on [GitHub](https://github.com/) (private or public).
2. Open your terminal in the project root directory and run:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit for deployment"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

---

## Part 3: Frontend Deployment on Vercel

Vercel will compile and host your Vite/React frontend code.

1. Go to [Vercel](https://vercel.com/) and log in with your GitHub account.
2. Click **Add New... ➔ Project**.
3. Import your `aura-clothing` repository from the list.
4. In the **Configure Project** screen, expand the **Environment Variables** section and add the following keys from your local `.env` file:
   * **`VITE_SUPABASE_URL`**: Your Supabase project URL (e.g. `https://xxx.supabase.co`).
   * **`VITE_SUPABASE_ANON_KEY`**: Your Supabase anonymous API key.
   * **`VITE_WEB3FORMS_ACCESS_KEY`**: Your Web3Forms contact form access key (register for free at [web3forms.com](https://web3forms.com/) using your client's email address).
5. Click **Deploy**. Vercel will build and launch your application in under a minute!

---

## Part 4: Custom Domain Configuration

To link your owned custom domain (e.g., `www.auraclassic.com` or `auraclassic.com`):

### 1. Add Domain in Vercel
1. In your Vercel Project Dashboard, navigate to **Settings ➔ Domains**.
2. Type your domain name (e.g., `auraclassic.com`) in the input box and click **Add**.
3. Vercel will recommend adding both the root domain (`auraclassic.com`) and the subdomain (`www.auraclassic.com`). Click **Add** to accept.

### 2. Configure DNS Records with your Registrar (e.g., z.com)
Log in to your domain registrar account. If you bought the domain on **z.com**, follow these steps:

1. Log in to the [z.com member area](https://cloud.z.com/ph/login/) (or the z.com portal for your country).
2. Click **DNS** on the top/side navigation menu.
3. Select your domain (e.g., `auraclassic.com`).
4. In the DNS record settings section, click the **Edit** (pencil) icon or **Add Record** button.
5. Add/Update the following two records:

* **For the Root Domain (`auraclassic.com`)**:
  * **Type**: `A`
  * **Name / Host**: `@` (If z.com doesn't accept `@`, leave it blank or enter your domain name `auraclassic.com`)
  * **TTL**: `3600` (or default)
  * **Value / Destination**: `76.76.21.21` (Vercel's global IP address)
* **For the Subdomain (`www.auraclassic.com`)**:
  * **Type**: `CNAME`
  * **Name / Host**: `www`
  * **TTL**: `3600` (or default)
  * **Value / Destination**: `cname.vercel-dns.com`

6. Click **Save** or **Save Settings** to apply.

*Once saved, DNS changes can take anywhere from a few minutes to 24 hours to propagate globally. Vercel will automatically generate and configure a free SSL certificate once propagation completes.*

---

## Part 5: Verification & Launch Checklist

After deployment, perform these quick sanity checks:
1. **Landing Page**: Ensure the animated lowercase-first-capital splash screen (`Aura`) runs and transitions smoothly.
2. **Product Catalog**: Verify that the `"Collection Under Refinement"` placeholder displays if no garments are seeded yet, or that newly added products load correctly.
3. **Admin Dashboard**: Navigate to `yourdomain.com/admin-dashboard`, log in using your Supabase credentials, and test uploading a product photo manually. Ensure it is saved and shown on the storefront grid.
4. **Contact Form**: Send a test email from the contact section and verify it is delivered to the configured Web3Forms inbox.
