import React from 'react';
import { motion } from 'framer-motion';
import { Instagram, Facebook, ShieldCheck, Lock, RefreshCw, Cookie, Award } from 'lucide-react';

export default function Footer({ onNavigateAdmin, onOpenLegal }) {
  const handleOpenLegal = (tab) => {
    if (onOpenLegal) {
      onOpenLegal(tab);
    }
  };

  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new CustomEvent('aura:open-cookie-settings'));
  };

  return (
    <footer className="bg-white text-[#705B56] pt-14 pb-10 border-t border-[#E8DCD7]/60 relative select-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col items-center gap-8">

        {/* Top: Centered Instagram, Facebook, Shopee & TikTok Social Icons */}
        <div className="flex items-center gap-6">
          <motion.a
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            href="https://www.instagram.com/auraofficial.ph?igsh=MXBtZnY1aHQ1a3o2eA=="
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#705B56] hover:text-[#2C1E1B] transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5 stroke-[1.6]" />
          </motion.a>

          <motion.a
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            href="https://www.facebook.com/share/191s36EH1r/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#705B56] hover:text-[#2C1E1B] transition-colors"
            aria-label="Facebook"
          >
            <Facebook className="w-5 h-5 stroke-[1.6]" />
          </motion.a>

          <motion.a
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            href="https://shopee.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#705B56] hover:text-[#2C1E1B] transition-colors"
            aria-label="Shopee"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.18 8.01a.63.63 0 0 1 .42.59l.86 11.23a1.86 1.86 0 0 1-1.85 2H5.39a1.86 1.86 0 0 1-1.85-2L4.4 8.6a.63.63 0 0 1 .42-.59L12 5.09l7.18 2.92zM12 1.34a3.86 3.86 0 0 0-3.86 3.86.64.64 0 0 0 1.28 0 2.58 2.58 0 0 1 5.16 0 .64.64 0 0 0 1.28 0A3.86 3.86 0 0 0 12 1.34z" />
            </svg>
          </motion.a>

          <motion.a
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            href="https://www.tiktok.com/@auraofficial.ph?_r=1&_t=ZS-98U6FijS6ia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#705B56] hover:text-[#2C1E1B] transition-colors"
            aria-label="TikTok"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.52-4.06-1.39-.77-.57-1.39-1.34-1.87-2.19-.07 1.69-.05 3.37-.07 5.06-.05 1.79-.31 3.59-1.07 5.2-1.22 2.65-3.89 4.67-6.85 4.98-2.6.31-5.32-.42-7.23-2.22C1.2 17.37.26 14.54.49 11.75c.22-2.9 1.95-5.69 4.68-6.85 1.52-.66 3.22-.89 4.87-.7v4.26c-1.2-.23-2.5-.02-3.51.66-1.12.74-1.78 2.06-1.88 3.39-.1 1.59.67 3.19 2.01 3.97 1.14.68 2.58.74 3.76.2 1.05-.46 1.79-1.48 2.04-2.61.16-.69.13-1.4.13-2.11-.01-3.95-.01-7.9 0-11.85-.02-.12-.02-.24.06-.35z" />
            </svg>
          </motion.a>
        </div>

        {/* Trust Badges & Buyer Guarantees Strip */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 py-3 px-4 rounded-xl bg-[#FAF6F4] border border-[#E8DCD7]/60 text-xs">
          <div className="flex items-center gap-2.5 justify-center p-2 text-[#705B56]">
            <ShieldCheck className="w-4 h-4 text-[#8C7A76] flex-shrink-0" />
            <span className="font-medium tracking-wide">PCI-DSS Secured Payments</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center p-2 text-[#705B56]">
            <Lock className="w-4 h-4 text-[#8C7A76] flex-shrink-0" />
            <span className="font-medium tracking-wide">256-Bit SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center p-2 text-[#705B56]">
            <RefreshCw className="w-4 h-4 text-[#8C7A76] flex-shrink-0" />
            <span className="font-medium tracking-wide">7-Day Replacement Policy</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center p-2 text-[#705B56]">
            <Award className="w-4 h-4 text-[#8C7A76] flex-shrink-0" />
            <span className="font-medium tracking-wide">DTI & BIR Registered Entity</span>
          </div>
        </div>

        {/* Legal Policies Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#705B56]">
          <button
            type="button"
            onClick={() => handleOpenLegal('privacy')}
            className="hover:text-[#2C1E1B] transition-colors underline-offset-4 hover:underline"
          >
            Privacy Policy
          </button>
          <span className="text-[#E8DCD7]">•</span>
          <button
            type="button"
            onClick={() => handleOpenLegal('terms')}
            className="hover:text-[#2C1E1B] transition-colors underline-offset-4 hover:underline"
          >
            Terms of Service
          </button>
          <span className="text-[#E8DCD7]">•</span>
          <button
            type="button"
            onClick={() => handleOpenLegal('refund')}
            className="hover:text-[#2C1E1B] transition-colors underline-offset-4 hover:underline"
          >
            Return & Refund Policy
          </button>
          <span className="text-[#E8DCD7]">•</span>
          <button
            type="button"
            onClick={() => handleOpenLegal('shipping')}
            className="hover:text-[#2C1E1B] transition-colors underline-offset-4 hover:underline"
          >
            Shipping Terms
          </button>
          <span className="text-[#E8DCD7]">•</span>
          <button
            type="button"
            onClick={() => handleOpenLegal('accreditation')}
            className="hover:text-[#2C1E1B] transition-colors underline-offset-4 hover:underline font-medium text-[#2C1E1B]"
          >
            Business Legitimacy & Accreditation
          </button>
          <span className="text-[#E8DCD7]">•</span>
          <button
            type="button"
            onClick={handleOpenCookieSettings}
            className="inline-flex items-center gap-1.5 hover:text-[#2C1E1B] transition-colors underline-offset-4 hover:underline"
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Cookie Preferences</span>
          </button>
        </div>

        {/* Divider line */}
        <div className="w-full border-t border-[#E8DCD7]/40 my-1" />

        {/* Business Registration & Payment Options Disclosure */}
        <div className="text-center space-y-2 max-w-2xl text-[11px] text-[#8C7A76] leading-relaxed">
          <p>
            Aura Women's Clothing operates in full compliance with the Republic of the Philippines Department of Trade and Industry (DTI),
            the Bureau of Internal Revenue (BIR), and the National Privacy Commission (RA 10173 Data Privacy Act).
          </p>
          <p className="text-[10px] text-[#A69B97]">
            Accepted Payment Methods: GCash, Maya, Visa, Mastercard, BPI, UnionBank & Cash on Delivery (COD). All online card transactions are processed through Xendit Philippines (Bangko Sentral ng Pilipinas licensed Payment System Operator).
          </p>
        </div>

        {/* Bottom: Copyright & Attribution */}
        <div className="text-center space-y-1 pt-2">
          <span className="font-editorial text-xs sm:text-sm font-light text-[#705B56] tracking-wider uppercase block">
            © 2026, Aura Women's Clothing. All Rights Reserved.
          </span>
          <span className="text-[9px] font-sans uppercase tracking-[0.15em] text-[#8C7A76] block pt-1.5">
            Powered by WeBuildWeb
          </span>

          {/* Subtly hidden Admin Portal trigger inside copyright or as a tiny dot for the developer */}
          {onNavigateAdmin && (
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="opacity-0 w-2 h-2 mx-auto block cursor-default focus:outline-none"
              aria-label="Admin Trigger"
            />
          )}
        </div>

      </div>
    </footer>
  );
}
