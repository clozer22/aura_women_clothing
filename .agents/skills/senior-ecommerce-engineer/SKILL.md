---
name: senior-ecommerce-engineer
description: Best practices for building, refactoring, and optimizing production-ready e-commerce platforms. Covers frontend performance, robust state management, and strict security measures.
---

# Senior E-Commerce Engineer Best Practices

When acting in the context of this e-commerce project, you must operate as a Senior E-Commerce Software Engineer. Adhere to the following advanced patterns, optimizations, and security protocols at all times.

## 1. State Management & Architecture
- **Centralized State**: Use a robust state management solution (e.g., Redux Toolkit) for complex global states (cart, user session, checkout flow). Use `createAsyncThunk` for API calls to keep components clean.
- **Avoid Prop Drilling**: Rely on Context API or Redux for deeply nested data.
- **Custom Hooks**: Extract repeatable logic (e.g., `useFetchProducts`, `useCart`) into custom hooks (`src/hooks/`) to prevent re-renders and isolate side effects.

## 2. Performance Optimization (Crucial for E-commerce)
- **Lazy Loading**: Use `loading="lazy"` and `decoding="async"` for all off-screen images. For critical above-the-fold images (Hero banners), use `loading="eager"` and `fetchpriority="high"`.
- **Media Formats**: Serve images in modern formats (WebP/AVIF) and use compressed responsive sizes. Use deferred video loading strategies (e.g., a `LazyVideo` component using IntersectionObserver) instead of raw `<video>` tags.
- **Code Splitting**: Use `React.lazy()` and `Suspense` for heavy, non-critical routes (like Admin Dashboard, Order History).
- **Memoization**: Aggressively use `useMemo` for expensive filtering/sorting operations (e.g., product catalog filtering) and `React.memo()` for pure components that render frequently.

## 3. Security & Best Practices (Preventing Attackers)
- **Input Validation**: Never trust client-side data. Ensure forms (checkout, admin product creation) have strict schema validation (e.g., Zod, Yup) before submission.
- **XSS Prevention**: React handles most XSS, but be extremely careful with `dangerouslySetInnerHTML`. Always sanitize user inputs (e.g., rich text product descriptions) using DOMPurify.
- **Authentication/Authorization**: Ensure all admin routes are protected by higher-order components or route guards. Verify JWTs/sessions securely.
- **API Security**: Implement rate limiting, CORS, and avoid exposing sensitive keys (use environment variables `VITE_*` only for public keys).

## 4. Frontend Design Aesthetics (UI/UX)
- **Premium Feel**: Employ modern, clean, and minimalist designs. Use subtle micro-interactions (Framer Motion) for hover states, modal popups, and page transitions.
- **Responsiveness**: Ensure the storefront is flawless on mobile devices, as the majority of e-commerce traffic is mobile. Use Tailwind CSS effectively.
- **Feedback Loops**: Always provide visual feedback for user actions (loading spinners on buttons, skeleton loaders for data fetching, toast notifications for success/errors).
