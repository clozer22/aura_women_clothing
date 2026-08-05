# Aura Atelier — Admin Portal Blueprint

This document records the exact specifications for the Aura Admin Portal. We will use this blueprint as the reference specification when initializing the backend development phase.

---

## 1. Core Visual Design & Identity
- **Theme**: Unified with the main customer portal: soft light rose pink background (`#FAF0EC`), dark espresso accents (`#2C1E1B`), pure white panels, and clean Didone fashion display serif typography.
- **Borders & Shapes**: Strictly **rectangular and square** (`rounded-none`). No curves, including inputs, tables, images, modals, and buttons.
- **Header Identity**: Company branding ("Aura") remains prominent.
- **Layout**: Split-view screen:
  - **Left Sidebar**: Side navigation links containing Admin Profile, Product Management, and Storefront Customization.
  - **Right Main Panel**: Content area displaying the selected view.
- **Dashboard**: Excluded (per client specification).

---

## 2. Admin Profile Page (`/admin/profile`)
- **Purpose**: Identity card for the current Atelier owner.
- **Access Level**: Super Admin.
- **Account Creation**: No registration or sign-up forms. The account is created directly by the developer as a super admin seed in the Supabase authentication dashboard.
- **Database Table Specification (`admin_profiles`)**:
  - `id` (uuid, primary key, references `auth.users.id` in Supabase)
  - `name` (text, e.g. "Elena Vance")
  - `role_title` (text, e.g. "Owner & Head Atelier Designer")
  - `email` (text, e.g. "elena.vance@aura.com")
  - `avatar_url` (text, URL to company profile image)
  - `bio` (text, biography summary description)
  - `updated_at` (timestamp with timezone)
- **UI Details**:
  - **Avatar**: Managed via the database `avatar_url` field.
  - **Details**: Displays the name, role title, email, and biography loaded from the `admin_profiles` table.

---

## 3. Product Management Page (`/admin/products`)
- **Product Table Columns**:
  - `Image` (small thumbnail)
  - `Name`
  - `Category` (Tops vs. Bottoms + Sub-type details)
  - `Colors` (swatch badges list)
  - `Sizes` (available sizing tokens)
  - `Price` (retail cost)
  - `Fake Rating` (custom attraction rating)
  - `Fake Solds` (simulated count of items sold)
  - `Shopee Link` (direct external store connection)
  - `Status` (In Stock, Pre-Order, Sold Out)
- **Top Actions**:
  - **Search Bar**: Real-time filtering by text.
  - **Category Select**: Dropdown filter (All, Tops, Bottoms).
  - **"Add Product" Button**: Opens the product creation modal.
- **"Add Product" Modal Fields**:
  - `Product Name` (text)
  - `Quantity` (stock count number)
  - `Colors` (comma-separated list, e.g. "Pink, Ivory, Espresso")
  - `Category` (select Tops / Bottoms)
  - `Sizes` (XXS-XS, S-M, L, XL checkboxes)
  - `Description` (textarea)
  - `Shopee Link` (direct external purchase link URL)
  - `Product Image` (text URL)
  - `Ratings` (fake rating float, e.g. 4.9, to attract customers)
  - `Solds` (fake solds integer, e.g. 142, to attract customers)

---

## 4. Frontpage Customization Page (`/admin/customize`)
- **Purpose**: Modifying the frontpage aesthetic and marketing sections without altering the layout structure.
- **Interactive UI Capabilities**:
  - **Poster Image Editor**: Swap banner media URLs. Supports standard static images, animated GIFs, and looping videos (e.g. `.mp4`, `.webm` formats) to render dynamic background content.
  - **Marketing Text Editor**: Edit titles, cursive script overlays, and paragraph blurbs.
  - **Discounts & Events Section Manager**: Toggle and customize promo badges, holiday event text, and seasonal collection labels.
  - **Layout Constraint**: The layout format itself is hardcoded and cannot be modified by the admin.

---

## 5. Checkout & Shopee Redirection Architecture
- **No Cart Logic**: The system does **not** feature any local cart state, checkout drawer, bag count, or item checkout logic.
- **Direct Buying Flow**:
  - Every product card or details modal has a prominent direct **"Buy Now on Shopee"** CTA button.
  - Clicking this button retrieves the product's `shopeeLink` URL entered by the admin, opening the Shopee listing in a new browser tab for immediate purchase.

---

## 6. Backend Security & Best Practices (Phase 2 Transition)

Even with a transactionless storefront, securing the admin write channels and domain integrity is critical to prevent website defacement, catalog spoofing, or denial-of-service abuses. The backend architecture should adhere to the following best practices:

### A. Strict Database Access Control (Row-Level Security)
* **Principle**: Enforce security rules at the database level rather than relying solely on the application code.
* **Supabase/Postgres Configuration**:
  * Enable **Row-Level Security (RLS)** on all tables (`products`, `admin_profiles`, `storefront_config`).
  * Create **Select Policies**: Allow public anonymous read access (`SELECT`) to everyone.
  * Create **Write Policies**: Allow insert/update/delete requests (`INSERT`, `UPDATE`, `DELETE`) **only** if the request contains a verified JWT auth token belonging to Elena's admin user ID.

### B. Input Validation & Sanitization
* **XSS Prevention**: Sanitize all admin inputs (Product Name, Description, Shopee Link, Image URL) using standard backend library middleware to escape HTML and strip script tags before writing to the database.
* **Type Validation**: Enforce strict schema constraints in the database (e.g., ratings must be a decimal between 1.0 and 5.0; solds and price must be positive numbers).

### C. Authentication Security
* **Access Tokens**: Use secure JSON Web Tokens (JWT) with a short expiration time (e.g., 1 hour) paired with secure HTTP-only refresh tokens.
* **Password Hashing**: If building a custom server (Node/Express), passwords must be hashed using a strong hashing function like **bcrypt** or **Argon2** with a unique salt. (If using Supabase, this is handled automatically under their encrypted Auth system).

### D. CORS and API Constraints
* **Cross-Origin Resource Sharing (CORS)**: Configure the backend API to only accept requests originating from the production storefront domain (`auraclothing.com`) and your local dev port.
* **Rate Limiting**: Apply API rate-limiting middleware (e.g., `express-rate-limit`) on the login route to protect against brute-force password guessing, and on catalog endpoints to prevent scrapers from draining database resources.

### E. Environment Secrets Protection
* **No Hardcoded Keys**: Private API keys, database connection strings, and JWT secrets must be loaded dynamically using environment variables (`.env` files in development; Vercel Dashboard secrets in production). They must never be checked into Git repositories.


