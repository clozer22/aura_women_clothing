import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Heart, ArrowRight, ShoppingBag } from 'lucide-react';
import {
  getWishlist,
  removeFromWishlist,
  updateWishlistQuantity,
  subscribeWishlist,
} from '../lib/wishlistManager';

export default function WishlistDrawer({ isOpen, onClose, onProceedToCheckout, onAddToCart }) {
  const [items, setItems] = useState(getWishlist());

  useEffect(() => {
    setItems(getWishlist());
    const unsubscribe = subscribeWishlist((updated) => {
      setItems(updated);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0);
  const shippingFee = items.length > 0 ? 150 : 0;
  const total = subtotal + shippingFee;

  const handleCheckout = () => {
    if (items.length === 0) return;
    onClose();
    if (onProceedToCheckout) {
      onProceedToCheckout(items);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-[#2C1E1B]/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-screen max-w-md bg-[#FAF5F2] shadow-2xl border-l border-[#E8DCD7] flex flex-col justify-between rounded-none"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#E8DCD7] bg-[#F3EAE6] flex items-center justify-between rounded-none">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#B86B60]" />
                <h2 className="font-brand text-xs uppercase tracking-[0.25em] font-bold text-[#2C1E1B]">
                  SHOPPING BAG ({items.length})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-none hover:bg-white/80 text-[#2C1E1B] transition-colors focus:outline-none cursor-pointer"
                aria-label="Close bag"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items List Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <div className="w-14 h-14 bg-[#f4e2e6] text-[#B86B60] flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
                  </div>
                  <h3 className="font-brand text-sm uppercase tracking-[0.2em] font-semibold text-[#2C1E1B] mb-2">
                    Your Bag is Empty
                  </h3>
                  <p className="text-xs text-[#705B56] mb-6 max-w-xs mx-auto leading-relaxed">
                    Explore our modern collection and add your favorite pieces to order anytime.
                  </p>
                  <button
                    onClick={onClose}
                    className="border border-[#2C1E1B] text-[#2C1E1B] hover:bg-[#2C1E1B] hover:text-white px-6 py-3 text-xs uppercase tracking-[0.2em] font-semibold transition-all rounded-none"
                  >
                    Explore Shop
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.wishlistId || item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-white border border-[#E8DCD7] flex gap-4 items-start relative group"
                  >
                    {/* Thumbnail */}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-24 object-cover object-center flex-shrink-0 bg-[#FAF5F2]"
                    />

                    {/* Details */}
                    <div className="flex-1 min-w-0 pr-6">
                      <h4 className="font-brand text-xs font-semibold text-[#2C1E1B] truncate mb-1">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-brand tracking-wider uppercase text-[#B86B60] mb-2">
                        {typeof item.size === 'object' ? item.size?.name : (item.size || 'Standard')}
                        {item.color && (typeof item.color === 'object' ? item.color?.name : item.color) !== 'Standard'
                          ? ` / ${typeof item.color === 'object' ? item.color?.name : item.color}`
                          : ''}
                      </p>

                      <div className="font-hero text-sm font-bold text-[#2C1E1B] mb-3">
                        ₱{(Number(item.price) || 0).toLocaleString()}
                      </div>

                      {/* Quantity & Actions */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-[#E8DCD7] bg-[#FAF5F2]">
                          <button
                            onClick={() => updateWishlistQuantity(item.wishlistId, -1)}
                            className="px-2.5 py-1 text-xs text-[#705B56] hover:text-black transition-colors"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-semibold text-[#2C1E1B] min-w-[20px] text-center">
                            {item.quantity || 1}
                          </span>
                          <button
                            onClick={() => updateWishlistQuantity(item.wishlistId, 1)}
                            className="px-2.5 py-1 text-xs text-[#705B56] hover:text-black transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {onAddToCart && (
                          <button
                            onClick={() => {
                              onAddToCart(item);
                              removeFromWishlist(item.wishlistId);
                            }}
                            className="text-[10px] uppercase font-bold tracking-wider text-[#705B56] hover:text-[#B86B60] transition-colors flex items-center gap-1"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>Move to Bag</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Remove Icon */}
                    <button
                      onClick={() => removeFromWishlist(item.wishlistId)}
                      className="absolute top-4 right-4 text-[#A38E88] hover:text-[#B86B60] transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4 stroke-[1.5]" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer Summary & Checkout Button */}
            {items.length > 0 && (
              <div className="p-6 border-t border-[#E8DCD7] bg-[#F3EAE6] space-y-4">
                <div className="space-y-2 text-xs font-brand">
                  <div className="flex justify-between text-[#705B56]">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#2C1E1B]">₱{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#705B56]">
                    <span>Nationwide Shipping</span>
                    <span className="font-semibold text-[#2C1E1B]">₱{shippingFee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-[#E8DCD7] pt-2 flex justify-between text-sm font-bold text-[#2C1E1B]">
                    <span className="uppercase tracking-wider">Total</span>
                    <span>₱{total.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#2C1E1B] hover:bg-[#B86B60] text-white py-4 px-6 text-xs uppercase font-bold tracking-[0.2em] shadow-lg transition-all duration-300 flex items-center justify-center gap-2 rounded-none"
                >
                  <span>PROCEED TO CHECKOUT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <button
                    onClick={onClose}
                    className="text-[11px] uppercase tracking-wider text-[#705B56] hover:text-[#2C1E1B] underline underline-offset-4 font-medium"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
