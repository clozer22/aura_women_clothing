import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, X, Tag } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const LOCAL_STORAGE_KEY = 'aura_custom_vouchers';

export default function LandingPromoToast({ onSelectPromo }) {
  const [activePromo, setActivePromo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isPromoDismissed = (code) => {
    try {
      return sessionStorage.getItem(`aura_dismissed_promo_${code?.toUpperCase()}`) === 'true';
    } catch {
      return false;
    }
  };

  const findActivePromo = useCallback(async () => {
    try {
      const now = new Date();

      // 1. Fetch from Supabase
      let supaPromos = [];
      try {
        const { data, error } = await supabase
          .from('promotions')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          supaPromos = data;
        }
      } catch (e) {
        console.warn('Could not query Supabase promotions:', e);
      }

      // 2. Fallback / Merge with local storage custom vouchers
      let localPromos = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          localPromos = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Could not read local vouchers:', e);
      }

      // Combine, prioritizing Supabase entries
      const promoMap = new Map();
      localPromos.forEach((p) => {
        if (p.is_active !== false) {
          promoMap.set(p.code?.toUpperCase(), p);
        }
      });
      supaPromos.forEach((p) => {
        if (p.is_active !== false) {
          promoMap.set(p.code?.toUpperCase(), p);
        }
      });

      const allPromos = Array.from(promoMap.values());

      // Filter valid non-expired promos
      const validPromos = allPromos.filter((p) => {
        if (!p.code || p.is_active === false) return false;
        if (p.expires_at) {
          const expDate = new Date(p.expires_at);
          if (expDate <= now) return false;
        }
        return true;
      });

      // Filter out any dismissed in this session
      const undismissed = validPromos.filter((p) => !isPromoDismissed(p.code));

      if (undismissed.length > 0) {
        // Pick the freshest promo
        setActivePromo(undismissed[0]);
        setIsVisible(true);
      } else {
        setActivePromo(null);
        setIsVisible(false);
      }
    } catch (err) {
      console.warn('Error finding active promo for toast:', err);
    }
  }, []);

  useEffect(() => {
    findActivePromo();

    // Listen to local window events dispatched by AdminPromotionsTab
    const handleLocalUpdate = (e) => {
      findActivePromo();
    };
    window.addEventListener('aura_vouchers_updated', handleLocalUpdate);

    // Subscribe to Supabase realtime changes on promotions table
    let channel;
    try {
      channel = supabase
        .channel('public:promotions_toast')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'promotions' },
          () => {
            findActivePromo();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Could not subscribe to promotions realtime:', e);
    }

    return () => {
      window.removeEventListener('aura_vouchers_updated', handleLocalUpdate);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [findActivePromo]);

  const handleDismiss = () => {
    if (activePromo?.code) {
      try {
        sessionStorage.setItem(`aura_dismissed_promo_${activePromo.code.toUpperCase()}`, 'true');
      } catch (e) {}
    }
    setIsVisible(false);
  };

  const handleCopyCode = async (e) => {
    e.stopPropagation();
    if (!activePromo?.code) return;
    try {
      await navigator.clipboard.writeText(activePromo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
      if (onSelectPromo) {
        onSelectPromo(activePromo);
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  if (!isVisible || !activePromo) return null;

  const isPercentage = activePromo.discount_type === 'percentage';
  const discountLabel = isPercentage
    ? `${activePromo.discount_value}% OFF`
    : `₱${Number(activePromo.discount_value).toLocaleString()} OFF`;

  const minOrderValue = Number(activePromo.min_order_value) || 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-[88px] sm:top-[94px] right-4 sm:right-8 lg:right-12 z-40 w-[calc(100vw-2rem)] sm:w-auto sm:max-w-md bg-white/95 backdrop-blur-md border border-[#E8DCD7] shadow-[0_12px_36px_rgba(44,30,27,0.12)] p-4 sm:p-5 select-none"
          role="region"
          aria-label="Ongoing Promotion Toast"
        >
          {/* Header Row: Label & Close Button */}
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#FAF5F2]">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#FAF0EC] flex items-center justify-center text-[#B86B60]">
                <Sparkles className="w-3 h-3 text-[#B86B60]" />
              </span>
              <span className="text-[10px] font-brand font-bold uppercase tracking-[0.2em] text-[#B86B60]">
                Ongoing Exclusive Privilege
              </span>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-[#705B56] hover:text-[#2C1E1B] p-1 -mr-1 transition-colors cursor-pointer rounded-none"
              title="Dismiss for this session"
              aria-label="Dismiss discount notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="pt-2.5 pb-3">
            <h4 className="font-editorial text-base sm:text-lg text-[#2C1E1B] font-normal leading-snug">
              Save <span className="font-semibold text-[#B86B60]">{discountLabel}</span> on Your Order
            </h4>
            <p className="text-[11px] text-[#705B56] mt-1 leading-relaxed">
              {minOrderValue > 0
                ? `Special discount voucher valid on runway purchases ₱${minOrderValue.toLocaleString()}+.`
                : 'Special discount voucher valid across our entire handcrafted runway collection.'}
            </p>
          </div>

          {/* Action Row: Voucher Code Chip + Copy Button */}
          <div className="pt-2.5 border-t border-[#FAF5F2] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#705B56]">
                Code:
              </span>
              <span className="font-mono text-xs font-bold text-[#2C1E1B] tracking-wider px-2.5 py-1 bg-[#FAF5F2] border border-[#E8DCD7]">
                {activePromo.code}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3.5 py-1.5 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-[10px] font-bold uppercase tracking-[0.16em] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
