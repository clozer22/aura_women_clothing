import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, X, Check, Sliders, ExternalLink } from 'lucide-react';
import { getCookieConsent, setCookieConsent, recordSiteVisit } from '../lib/visitorTracking';

export default function CookieConsentBanner({ onOpenLegal }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    // Check if consent has already been given
    const existing = getCookieConsent();
    if (!existing) {
      // Delay display slightly so it doesn't jarringly block initial page paint
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }

    // Listen for custom event to re-open cookie preferences from the footer
    const handleReopen = () => {
      setIsVisible(true);
      setIsPreferencesOpen(true);
    };

    window.addEventListener('aura:open-cookie-settings', handleReopen);
    return () => window.removeEventListener('aura:open-cookie-settings', handleReopen);
  }, []);

  const handleAcceptAll = () => {
    setCookieConsent('all');
    setIsVisible(false);
    setIsPreferencesOpen(false);
    // Immediately log the current visit since consent is granted
    recordSiteVisit(window.location.pathname);
  };

  const handleRejectNonEssential = () => {
    setCookieConsent('essential_only');
    setIsVisible(false);
    setIsPreferencesOpen(false);
  };

  const handleSaveCustomPreferences = () => {
    if (analyticsEnabled) {
      handleAcceptAll();
    } else {
      handleRejectNonEssential();
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 select-none"
        role="dialog"
        aria-live="polite"
        aria-label="Cookie consent banner"
      >
        <div className="bg-white/95 backdrop-blur-md border border-[#E8DCD7] shadow-2xl p-5 sm:p-6 space-y-4 rounded-none text-[#2C1E1B]">
          
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] flex items-center justify-center text-[#B86B60] flex-shrink-0">
                <Cookie className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-[#2C1E1B]">
                  Cookie & Privacy Preferences
                </h3>
                <span className="text-[10px] text-[#A38E88] block">
                  Republic Act No. 10173 (Data Privacy Act)
                </span>
              </div>
            </div>

            <button
              onClick={handleRejectNonEssential}
              className="p-1 text-[#A38E88] hover:text-[#2C1E1B] transition-colors"
              title="Decline non-essential cookies"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          {!isPreferencesOpen ? (
            <p className="text-[11px] leading-relaxed text-[#705B56]">
              Aura Atelier uses strictly necessary cookies to ensure seamless bag checkout and account sessions, and privacy-first analytics to improve your atelier shopping experience.
              {onOpenLegal && (
                <button
                  onClick={() => onOpenLegal('privacy')}
                  className="text-[#B86B60] underline underline-offset-2 ml-1 hover:text-[#2C1E1B] font-medium"
                >
                  Read Privacy Policy
                </button>
              )}
            </p>
          ) : (
            /* Detailed Custom Preferences */
            <div className="space-y-3 pt-1 border-t border-[#E8DCD7]/60 text-xs">
              <div className="p-3 bg-[#FAF0EC]/60 border border-[#E8DCD7] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-[#2C1E1B]">
                    Strictly Necessary
                  </span>
                  <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5">
                    ALWAYS ACTIVE
                  </span>
                </div>
                <p className="text-[10px] text-[#705B56]">
                  Essential for shopping cart, wish list, security tokens, and Xendit payment handoffs.
                </p>
              </div>

              <div className="p-3 bg-[#FAF0EC]/60 border border-[#E8DCD7] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-[#2C1E1B]">
                    Anonymous Analytics
                  </span>
                  <input
                    type="checkbox"
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#2C1E1B] cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-[#705B56]">
                  Aggregated page visit counts to optimize atelier garment availability.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            {!isPreferencesOpen ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 py-2.5 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Accept All
                </button>
                <button
                  onClick={handleRejectNonEssential}
                  className="flex-1 py-2.5 bg-[#FAF0EC] hover:bg-[#E8DCD7]/60 border border-[#E8DCD7] text-[#705B56] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Essential Only
                </button>
                <button
                  onClick={() => setIsPreferencesOpen(true)}
                  className="p-2.5 bg-white hover:bg-slate-50 border border-[#E8DCD7] text-[#705B56] hover:text-[#2C1E1B] transition-colors"
                  title="Customize Preferences"
                  aria-label="Settings"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveCustomPreferences}
                  className="flex-1 py-2.5 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Save Choices
                </button>
                <button
                  onClick={() => setIsPreferencesOpen(false)}
                  className="px-4 py-2.5 bg-[#FAF0EC] hover:bg-[#E8DCD7]/60 border border-[#E8DCD7] text-[#705B56] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
