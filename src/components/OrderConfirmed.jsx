import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Copy,
  CheckCheck,
  Truck,
  HelpCircle,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';

export default function OrderConfirmed({ order, onContinueShopping, onViewOrders }) {
  const [copied, setCopied] = useState(false);

  // Fallback to most recent order if order prop is not yet in state
  const activeOrder = order || (() => {
    try {
      const orders = JSON.parse(localStorage.getItem('aura_guest_orders') || '[]');
      return orders[0] || null;
    } catch (e) {
      return null;
    }
  })();

  if (!activeOrder) {
    return (
      <div className="min-h-screen bg-[#FAF5F2] py-20 px-4 flex items-center justify-center">
        <div className="bg-white border border-[#E8DCD7] p-8 text-center max-w-md rounded-none shadow-sm">
          <h2 className="font-brand text-xl font-bold text-[#2C1E1B] mb-2">No Order Found</h2>
          <p className="text-xs text-[#705B56] mb-6">Explore our curated collection to place an order.</p>
          <button
            onClick={onContinueShopping}
            className="bg-[#2C1E1B] hover:bg-[#B86B60] text-white px-6 py-3 text-xs uppercase tracking-[0.2em] font-bold rounded-none transition-colors cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    if (activeOrder.order_reference) {
      navigator.clipboard.writeText(activeOrder.order_reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF5F2] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl w-full bg-white border border-[#E8DCD7] p-8 sm:p-10 shadow-lg text-center rounded-none space-y-6"
      >
        {/* Verified Circular Icon */}
        <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-500/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <Check className="w-8 h-8 stroke-[2.5]" />
        </div>

        {/* Header Text */}
        <div>
          <span className="text-[11px] font-brand uppercase tracking-[0.25em] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 border border-emerald-200">
            Payment & Order Verified
          </span>
          <h1 className="font-brand text-3xl sm:text-4xl text-[#2C1E1B] font-bold tracking-wide mt-3 mb-2">
            ORDER CONFIRMED!
          </h1>
          <p className="text-xs sm:text-sm text-[#705B56] leading-relaxed max-w-md mx-auto">
            Thank you for choosing <span className="font-bold text-[#2C1E1B]">Aura Studio</span>. Your order has been placed and is currently being prepared at our Manila Studio.
          </p>
        </div>

        {/* Order Reference Box (Matching Image 4) */}
        <div className="bg-[#FAF5F2] border border-[#E8DCD7] p-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-brand uppercase tracking-[0.2em] font-bold text-[#705B56]">
            <span>ORDER REFERENCE</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="font-brand text-2xl sm:text-3xl font-bold tracking-wider text-[#2C1E1B]">
              {activeOrder.order_reference}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 text-[#705B56] hover:text-[#2C1E1B] transition-colors rounded-none"
              title="Copy Reference"
            >
              {copied ? (
                <CheckCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <Copy className="w-5 h-5 stroke-[1.8]" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-[#A38E88]">
            ✉ Confirmation sent to {activeOrder.customer_phone || activeOrder.customer_email || 'your phone & email'}
          </p>
        </div>

        {/* Items Ordered List */}
        <div className="text-left pt-2">
          <h3 className="font-brand text-xs uppercase tracking-[0.2em] font-bold text-[#705B56] mb-3 pb-2 border-b border-[#E8DCD7]">
            Items Ordered ({activeOrder.items?.length || 0})
          </h3>
          <div className="space-y-3">
            {activeOrder.items?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-14 object-cover bg-[#FAF5F2]"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-[#2C1E1B]">{item.name}</p>
                    <p className="text-[11px] text-[#B86B60]">
                      {typeof item.size === 'object' ? item.size?.name : (item.size || 'Standard')}
                      {item.color && (typeof item.color === 'object' ? item.color?.name : item.color) !== 'Standard'
                        ? ` / ${typeof item.color === 'object' ? item.color?.name : item.color}`
                        : ''}{' '}
                      × {item.quantity || 1}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-[#2C1E1B]">
                  ₱{((Number(item.price) || 0) * (item.quantity || 1)).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Estimated Delivery & Need Assistance Banner (Dark Card in Image 4) */}
        <div className="bg-[#2C1E1B] text-white p-4 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <Truck className="w-5 h-5 text-[#B86B60] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] text-[#E8DCD7]">
                Estimated Delivery
              </p>
              <p className="text-[11px] text-white/90 font-medium">
                2 – 4 Business Days (Door-to-door tracking)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 sm:border-l sm:border-white/10 sm:pl-4">
            <HelpCircle className="w-5 h-5 text-[#B86B60] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] text-[#E8DCD7]">
                Need Assistance?
              </p>
              <p className="text-[11px] text-white/90 font-medium">
                Contact concierge@auraclothing.ph
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onContinueShopping}
            className="flex-1 bg-[#2C1E1B] hover:bg-[#B86B60] text-white py-4 px-6 text-xs uppercase font-bold tracking-[0.2em] shadow-md transition-all rounded-none flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onViewOrders}
            className="flex-1 bg-white border border-[#2C1E1B] text-[#2C1E1B] hover:bg-[#FAF5F2] py-4 px-6 text-xs uppercase font-bold tracking-[0.2em] transition-colors rounded-none cursor-pointer"
          >
            View My Orders
          </button>
        </div>
      </motion.div>
    </div>
  );
}
