-- ==============================================================================
-- AURA ATELIER: SHIPMATES COURIER INTEGRATION MIGRATION
-- Run this script in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. ADD SHIPMENT & WAYBILL COLUMNS TO ORDERS TABLE
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS courier_name text DEFAULT 'J&T Express',
  ADD COLUMN IF NOT EXISTS shipment_id text,
  ADD COLUMN IF NOT EXISTS waybill_url text,
  ADD COLUMN IF NOT EXISTS shipment_status text DEFAULT 'UNBOOKED',
  ADD COLUMN IF NOT EXISTS shipment_payload jsonb;

-- 2. CREATE INDEX FOR TRACKING LOOKUPS
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_shipment_id ON public.orders(shipment_id);
CREATE INDEX IF NOT EXISTS idx_orders_shipment_status ON public.orders(shipment_status);

COMMENT ON COLUMN public.orders.tracking_number IS 'Tracking code assigned by Shipmates / Courier';
COMMENT ON COLUMN public.orders.shipment_id IS 'Unique shipment identifier returned by Shipmates API';
COMMENT ON COLUMN public.orders.waybill_url IS 'Downloadable or viewable PDF waybill link';
COMMENT ON COLUMN public.orders.shipment_status IS 'UNBOOKED | BOOKED | PENDING_PICKUP | IN_TRANSIT | DELIVERED | FAILED';
COMMENT ON COLUMN public.orders.shipment_payload IS 'Full JSON response returned from the Shipmates booking request';
