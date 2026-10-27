import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, Bookmark, Check, AlertCircle } from 'lucide-react';

/**
 * Flag color options matching TikTok Seller Center Manage Orders specification:
 * - No flag
 * - Red (Most frequently used: item moved to Awaiting Collection, but NOT yet packed)
 * - Blue
 * - Green
 * - Yellow
 */
export const FLAG_OPTIONS = [
  {
    id: 'none',
    label: 'No flag',
    color: '#94A3B8',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    iconColor: 'text-slate-400',
    description: 'Default, standard processing',
  },
  {
    id: 'red',
    label: 'Red',
    color: '#EF4444',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    iconColor: 'text-red-500 fill-red-500',
    badgeText: 'Moved to Awaiting Collection, not packed yet',
  },
  {
    id: 'blue',
    label: 'Blue',
    color: '#3B82F6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    iconColor: 'text-blue-500 fill-blue-500',
    badgeText: 'Priority / VIP Customer',
  },
  {
    id: 'green',
    label: 'Green',
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    iconColor: 'text-emerald-500 fill-emerald-500',
    badgeText: 'Verified & Inspected',
  },
  {
    id: 'yellow',
    label: 'Yellow',
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    iconColor: 'text-amber-500 fill-amber-500',
    badgeText: 'Special packing instruction',
  },
];

export default function AddNoteModal({
  isOpen,
  onClose,
  order,
  onSaveAndArrange,
  isSubmitting = false,
}) {
  const [selectedFlag, setSelectedFlag] = useState('red'); // Default to red as per owner preference
  const [noteText, setNoteText] = useState('');

  // Extract initial flag and note from order admin_notes
  useEffect(() => {
    if (order) {
      const raw = order.admin_notes;
      if (raw) {
        if (typeof raw === 'object') {
          setSelectedFlag(raw.flag || 'red');
          setNoteText(raw.note || '');
        } else {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              setSelectedFlag(parsed.flag || 'red');
              setNoteText(parsed.note || '');
              return;
            }
          } catch (e) {}
          setNoteText(String(raw));
          setSelectedFlag('red');
        }
      } else {
        setSelectedFlag('red');
        setNoteText('');
      }
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSaveAndArrange) {
      onSaveAndArrange({
        flag: selectedFlag,
        note: noteText.trim().slice(0, 100),
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 font-sans">Add note</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Order <strong className="text-slate-800 font-semibold">{order.order_reference}</strong> • {order.customer_name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Flag Selector */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Flag
              </label>

              <div className="flex flex-wrap items-center gap-4">
                {FLAG_OPTIONS.map((opt) => {
                  const isChecked = selectedFlag === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className="inline-flex items-center gap-2 cursor-pointer select-none group"
                    >
                      <input
                        type="radio"
                        name="flagColor"
                        value={opt.id}
                        checked={isChecked}
                        onChange={() => setSelectedFlag(opt.id)}
                        className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-800 group-hover:text-slate-950">
                        {opt.id !== 'none' && (
                          <Bookmark
                            className={`w-4 h-4 ${opt.iconColor}`}
                          />
                        )}
                        <span>{opt.label}</span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Informational tip for Red Flag */}
              {selectedFlag === 'red' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-2.5 bg-red-50/80 border border-red-200/80 rounded-xl flex items-start gap-2 text-[11px] text-red-800"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Red Flag rule:</strong> Item will be moved from <em>Awaiting shipment</em> to <em>Awaiting collection</em>, but signals that it has <strong>not yet been packed</strong> in warehouse.
                  </span>
                </motion.div>
              )}
            </div>

            {/* Note Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Note
              </label>
              <div className="relative">
                <textarea
                  rows={4}
                  maxLength={100}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter your note here"
                  className="w-full p-3 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all resize-none placeholder:text-slate-400"
                />
                <div className="text-right text-[11px] text-slate-400 mt-1">
                  <span>{noteText.length}/100</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-xs shadow-teal-600/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>OK</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
