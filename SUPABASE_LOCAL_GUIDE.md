# Guide: Local Setup & Running Supabase Backend

This document details how to configure your Supabase project, initialize the database tables, and run the **Aura** storefront project locally.

---

## Prerequisites
* A [Supabase](https://supabase.com) account.
* Node.js (v20+ or v22+) installed on your machine.

---

## Step 1: Set Up your Environment Variables
In the root directory of this project, you will find a file named `.env`. It is already populated with your unique project credentials:

```env
VITE_SUPABASE_URL=https://sylfhockkibohntgcswb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bGZob2Nra2lib2hudGdjc3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMzA3MjIsImV4cCI6MjEwMDcwNjcyMn0.audxFrkyQoBMhkN72WGF0LP_ip7eYnpCHVwkY3RXfVs
```

These parameters will load automatically into Vite during your development and build tasks.

---

## Step 2: Initialize Database Tables (Schema & Seeds)
To create the necessary tables (`products`, `storefront_config`, `admin_profiles`) and seed them with default garments:

1. Log in to your [Supabase Console](https://supabase.com/dashboard).
2. Open your project **`sylfhockkibohntgcswb`**.
3. In the left navigation sidebar, click on **SQL Editor** (the console code block terminal icon).
4. Click **"New query"** at the top.
5. Open your local file [schema.sql](file:///Users/mj.aballe/Development/aura-clothing/schema.sql) in your text editor and **copy all of its contents**.
6. Paste the SQL code into the Supabase SQL editor.
7. Click the green **"Run"** button in the bottom right corner of the editor.
8. Verify that the output shows `Success. No rows returned` or list entries created. The tables are now fully populated and secured!

---

## Step 3: Register Elena's Admin Account
Because the dashboard operates on high security (Row-Level Security), you must register Elena Vance's account to allow her to log in and write to the database:

1. In your Supabase dashboard sidebar, click on **Authentication** (the user badge icon).
2. Click **"Add User"** ➜ **"Create User"**.
3. Enter Elena's credentials:
   * **Email**: Elena's admin email address.
   * **Password**: Create a secure password for her.
4. **Uncheck** the box *“Send an invite email”* (this registers her email instantly without waiting for a validation link confirmation).
5. Click **"Create User"**.
6. **Important**: Under the hood, the SQL trigger we installed (`on_auth_user_created`) will automatically intercept this insertion and create her default owner profile in the `admin_profiles` table!

---

## Step 4: Run the Storefront Locally
With the database initialized and credentials created:

1. Install project packages:
   ```bash
   npm install
   ```
2. Start the Vite local development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.
4. Go to **Atelier Portal** in the navigation bar, type Elena's credentials, and click **Login**. You can now edit the theme banners, add new products, adjust inventory quantities, and manage the live database safely!
