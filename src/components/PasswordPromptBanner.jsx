import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PasswordPromptBanner({ onOpenProfile }) {
  const { shouldPromptPassword, dismissPrompt } = useAuth();

  if (!shouldPromptPassword) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-[#2C1E1B] text-white p-4 sm:p-5 border border-white/20 shadow-2xl rounded-none flex items-start gap-3.5"
      >
        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[#D99B91]">
          <KeyRound className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold font-brand tracking-wider uppercase text-[#FAF5F2]">
            Create Your Password
          </p>
          <p className="text-[11px] text-white/80 mt-1 leading-relaxed">
            You signed in with Google. Create your personal password to enable direct email sign-in anytime.
          </p>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => {
                dismissPrompt();
                if (onOpenProfile) onOpenProfile();
              }}
              className="px-3 py-1.5 bg-[#FAF5F2] hover:bg-[#B86B60] text-[#2C1E1B] hover:text-white text-[10px] uppercase font-bold tracking-[0.15em] transition-colors rounded-none flex items-center gap-1.5 cursor-pointer"
            >
              <span>Set Password</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={dismissPrompt}
              className="text-[10px] uppercase tracking-wider text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>

        <button
          onClick={dismissPrompt}
          className="text-white/60 hover:text-white p-1 transition-colors cursor-pointer"
          aria-label="Dismiss prompt"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
