import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  RotateCw,
  AlertCircle,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function TrackingModal({
  isOpen,
  onClose,
  trackingNumber,
  orderReference,
  initialOrder = null,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [order, setOrder] = useState(initialOrder);

  // Fetch live tracking from /api/jt-track
  const fetchTracking = async () => {
    if (!trackingNumber && !orderReference) return;
    setLoading(true);
    setError(null);
    try {
      const queryParam = trackingNumber
        ? `tracking=${encodeURIComponent(trackingNumber)}`
        : `ref=${encodeURIComponent(orderReference)}`;

      const res = await fetch(`/api/jt-track?${queryParam}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to query J&T Express tracking');
      }

      setTrackingData(data);
      if (data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.warn('J&T Track fetch error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTracking();
    }
  }, [isOpen, trackingNumber, orderReference]);

  // Real-Time Supabase Subscription: Listen for live order fulfillment changes
  useEffect(() => {
    if (!isOpen || !orderReference) return;

    const channel = supabase
      .channel(`tracking_realtime_${orderReference}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_reference=eq.${orderReference}`,
        },
        (payload) => {
          console.log('[TrackingModal] Realtime order change received:', payload.new);
          setOrder((prev) => ({ ...prev, ...payload.new }));
          // Refresh tracking details when status advances
          fetchTracking();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, orderReference]);

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const currentStatus = order?.status || trackingData?.orderStatus || 'TO_SHIP';
  const effectiveTracking = trackingNumber || trackingData?.trackingNumber || order?.tracking_number || 'Pending Dispatch';
  const officialUrl = trackingData?.officialTrackingUrl || `https://www.jtexpress.ph/trajectoryQuery?bills=${effectiveTracking}`;

  // Milestone Stages
  const stages = [
    { key: 'ORDER_PLACED', label: 'Order Placed', desc: 'Atelier Salcedo Verified', active: true },
    {
      key: 'TO_SHIP',
      label: 'Scheduled',
      desc: 'Courier Collection Booked',
      active: true,
    },
    {
      key: 'SHIPPED',
      label: 'In Transit',
      desc: 'At J&T Mega Hub',
      active: currentStatus === 'SHIPPED' || currentStatus === 'TO_DELIVER' || currentStatus === 'DELIVERED',
    },
    {
      key: 'TO_DELIVER',
      label: 'Out for Delivery',
      desc: 'With Courier Rider',
      active: currentStatus === 'TO_DELIVER' || currentStatus === 'DELIVERED',
    },
    {
      key: 'DELIVERED',
      label: 'Delivered',
      desc: 'Doorstep Received',
      active: currentStatus === 'DELIVERED',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E8DCD7] overflow-hidden rounded-none"
        >
          {/* Header */}
          <div className="bg-[#2C1E1B] text-white px-6 py-4 flex items-center justify-between border-b border-[#3D2C28]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-none bg-[#DA291C] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                J&T
              </div>
              <div>
                <h3 className="font-brand uppercase tracking-wider text-xs font-bold flex items-center gap-2">
                  <span>J&T Express Philippines</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 border border-emerald-800">
                    Live Courier Tracking
                  </span>
                </h3>
                <p className="text-[11px] text-[#A38E88]">
                  Order Ref: <strong className="text-white">{orderReference || order?.order_reference || 'Aura Order'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchTracking}
                title="Refresh Tracking"
                className="p-1.5 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tracking Number Bar */}
          <div className="bg-[#FAF5F2] px-6 py-3 border-b border-[#E8DCD7] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-[#705B56] font-bold">
                J&T Waybill (AWB):
              </span>
              <strong className="font-mono text-xs tracking-wider text-[#2C1E1B] font-bold">
                {effectiveTracking}
              </strong>
              {effectiveTracking !== 'Pending Dispatch' && (
                <button
                  onClick={() => handleCopy(effectiveTracking)}
                  className="p-1 hover:bg-[#E8DCD7] transition-colors text-[#705B56] cursor-pointer"
                  title="Copy Tracking Number"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {effectiveTracking !== 'Pending Dispatch' && (
              <a
                href={officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B86B60] hover:text-[#2C1E1B] uppercase tracking-wider transition-colors"
              >
                <span>Track on J&T Web</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Visual Milestones Stepper */}
            <div className="bg-[#FAF5F2] border border-[#E8DCD7] p-4">
              <div className="flex items-center justify-between relative">
                {/* Horizontal progress line */}
                <div className="absolute left-4 right-4 top-4 -translate-y-1/2 h-0.5 bg-[#E8DCD7] z-0" />
                <div
                  className="absolute left-4 top-4 -translate-y-1/2 h-0.5 bg-[#B86B60] transition-all duration-500 z-0"
                  style={{
                    width:
                      currentStatus === 'DELIVERED'
                        ? '90%'
                        : currentStatus === 'TO_DELIVER'
                        ? '70%'
                        : currentStatus === 'SHIPPED'
                        ? '45%'
                        : '15%',
                  }}
                />

                {stages.map((stg) => (
                  <div key={stg.key} className="flex flex-col items-center relative z-10 text-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                        stg.active
                          ? 'bg-[#2C1E1B] text-white ring-4 ring-[#FAF5F2]'
                          : 'bg-white border-2 border-[#E8DCD7] text-[#A38E88]'
                      }`}
                    >
                      {stg.active ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <span
                      className={`text-[10px] font-brand uppercase tracking-wider font-bold mt-2 ${
                        stg.active ? 'text-[#2C1E1B]' : 'text-[#A38E88]'
                      }`}
                    >
                      {stg.label}
                    </span>
                    <span className="text-[9px] text-[#A38E88] hidden sm:block">
                      {stg.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Real-Time Status Pill */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    {currentStatus === 'DELIVERED'
                      ? 'Parcel Successfully Delivered'
                      : currentStatus === 'TO_DELIVER'
                      ? 'Out for Doorstep Delivery'
                      : currentStatus === 'SHIPPED'
                      ? 'In Transit with J&T Express'
                      : 'Parcel Ready for Courier Pickup'}
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    {trackingData?.latestLocation || 'Aura Salcedo Atelier, Makati'} • {trackingData?.latestUpdate ? new Date(trackingData.latestUpdate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Live J&T Sync Active'}
                  </p>
                </div>
              </div>
              <Truck className="w-5 h-5 text-emerald-800" />
            </div>

            {/* Checkpoints Trajectory Timeline */}
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#705B56] mb-3 flex items-center justify-between">
                <span>Detailed Trajectory Scans</span>
                <span className="text-[10px] text-[#A38E88] font-normal">Real-Time Courier Checkpoints</span>
              </h4>

              {loading ? (
                <div className="py-8 text-center text-xs text-[#705B56] flex items-center justify-center gap-2">
                  <RotateCw className="w-4 h-4 animate-spin text-[#B86B60]" />
                  <span>Connecting to J&T Express Philippines network...</span>
                </div>
              ) : error ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ) : trackingData?.checkpoints?.length > 0 ? (
                <div className="space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8DCD7]">
                  {trackingData.checkpoints.map((cp, idx) => (
                    <div key={idx} className="relative text-xs">
                      <div
                        className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          idx === 0 ? 'bg-[#B86B60]' : 'bg-[#E8DCD7]'
                        }`}
                      />
                      <div className="bg-[#FAF5F2] border border-[#E8DCD7] p-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <strong className="text-[#2C1E1B] font-bold">
                            {cp.location || 'J&T Hub'}
                          </strong>
                          <span className="text-[10px] text-[#A38E88]">
                            {cp.time ? new Date(cp.time).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#705B56] leading-relaxed">
                          {cp.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#A38E88] py-4 text-center">
                  Tracking checkpoints will appear once the J&T courier rider scans the package at the Salcedo Atelier.
                </p>
              )}
            </div>

            {/* Security Assurance */}
            <div className="bg-[#FAF5F2] p-3 border border-[#E8DCD7] flex items-center gap-3 text-[11px] text-[#705B56]">
              <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0" />
              <span>
                Protected under Aura Luxury Garment Transit Insurance. Sealed and authenticated from Salcedo Atelier to your doorstep.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-[#FAF5F2] border-t border-[#E8DCD7] flex items-center justify-between">
            <span className="text-[10px] text-[#A38E88]">
              J&T Express Philippines • UAT / Live Synchronized
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs font-brand uppercase tracking-wider font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
