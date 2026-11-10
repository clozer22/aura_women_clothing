-- ==============================================================================
-- AURA WOMEN'S CLOTHING: SECURITY RPC & CHAT RLS HARDENING
-- Restricts public execution on SECURITY DEFINER RPCs and hardens chat policies
-- ==============================================================================

-- 1. Tighten RPC execution privileges on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.deduct_product_inventory(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_product_inventory(jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.restore_product_inventory(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_product_inventory(jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_create_staff_user(text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_staff_user(text, text, text, text, text, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_delete_staff_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_staff_account(uuid) TO service_role;

-- 2. Harden chat_auto_replies RLS
DROP POLICY IF EXISTS "Allow public modify on chat_auto_replies" ON public.chat_auto_replies;
DROP POLICY IF EXISTS "Allow public select on chat_auto_replies" ON public.chat_auto_replies;
DROP POLICY IF EXISTS "Public read chat_auto_replies" ON public.chat_auto_replies;
DROP POLICY IF EXISTS "Only admins can modify chat_auto_replies" ON public.chat_auto_replies;

CREATE POLICY "Public read chat_auto_replies"
ON public.chat_auto_replies FOR SELECT
TO public
USING (true);

CREATE POLICY "Only admins can modify chat_auto_replies"
ON public.chat_auto_replies FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Harden chat_messages RLS
DROP POLICY IF EXISTS "Allow public update on chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Only admins can update chat_messages" ON public.chat_messages;

CREATE POLICY "Only admins can update chat_messages"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Harden chat_tickets RLS
DROP POLICY IF EXISTS "Allow public update on chat_tickets" ON public.chat_tickets;
DROP POLICY IF EXISTS "Admins can update chat_tickets" ON public.chat_tickets;
DROP POLICY IF EXISTS "Customers can update own chat_tickets" ON public.chat_tickets;

CREATE POLICY "Admins can update chat_tickets"
ON public.chat_tickets FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Customers can update own chat_tickets"
ON public.chat_tickets FOR UPDATE
TO public
USING (
  (customer_id IS NOT NULL AND customer_id = auth.uid())
  OR (customer_email IS NOT NULL AND LOWER(customer_email) = LOWER(auth.jwt() ->> 'email'))
);
