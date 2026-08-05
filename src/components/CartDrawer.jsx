import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Check } from 'lucide-react';

export default function CartDrawer({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem, onClearCart }) {
  if (!isOpen) return null;

  const [promoCode, setPromoCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = discountApplied ? subtotal * 0.1 : 0;
  const shippingThreshold = 300;
  const freeShipping = subtotal >= shippingThreshold || subtotal === 0;
  const shippingCost = freeShipping ? 0 : 25;
  const total = subtotal - discount + shippingCost;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'AURA10' || promoCode.trim() !== '') {
      setDiscountApplied(true);
    }
  };

  const handleCheckout = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      setOrderComplete(true);
      onClearCart();
    }, 1800);
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
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-screen max-w-md bg-[#FAF5F2] shadow-2xl border-l border-[#E8DCD7] flex flex-col justify-between rounded-none"
          >
            
            {/* Header */}
            <div className="p-6 border-b border-[#E8DCD7] bg-[#F3EAE6] flex items-center justify-between rounded-none">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#B86B60]" />
                <h2 className="font-editorial text-2xl text-[#2C1E1B]">Your Shopping Bag</h2>
                <span className="text-xs bg-[#B86B60] text-white px-2.5 py-0.5 rounded-none font-bold shadow-sm">
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-none hover:bg-white text-[#2C1E1B] transition-colors focus:outline-none"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-6 rounded-none">
              
              {orderComplete ? (
                <div className="text-center py-16 px-4 rounded-none">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-none flex items-center justify-center mx-auto mb-4 shadow-lg"
                  >
                    <Check className="w-8 h-8" />
                  </motion.div>
                  <h3 className="font-editorial text-3xl text-[#2C1E1B] mb-2">Order Confirmed!</h3>
                  <p className="text-xs text-[#705B56] mb-6 leading-relaxed">
                    Thank you for shopping with Aura Women's Clothing. Your order #AU-2026-8891 has been received and our atelier is preparing your items.
                  </p>
                  <button
                    onClick={() => {
                      setOrderComplete(false);
                      onClose();
                    }}
                    className="bg-[#2C1E1B] text-white text-xs font-semibold uppercase tracking-[0.2em] px-6 py-3 rounded-none hover:bg-[#B86B60] transition-colors shadow-lg"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="text-center py-20 rounded-none">
                  <ShoppingBag className="w-12 h-12 text-[#A38E88] mx-auto mb-3 stroke-[1]" />
                  <h3 className="font-editorial text-2xl text-[#2C1E1B] mb-2">Your Bag is Empty</h3>
                  <p className="text-xs text-[#705B56] mb-6">
                    Explore our curated collections of Mulberry silk gowns and structured blazers.
                  </p>
                  <button
                    onClick={onClose}
                    className="bg-[#2C1E1B] text-white text-xs font-semibold uppercase tracking-[0.2em] px-6 py-3 rounded-none hover:bg-[#B86B60] transition-colors shadow-lg"
                  >
                    Discover Collections
                  </button>
                </div>
              ) : (
                <>
                  {/* Free Shipping Meter */}
                  <div className="mb-6 p-4 rounded-none bg-[#F3EAE6] border border-[#E8DCD7]">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-[#2C1E1B]">
                        {freeShipping ? '✦ Complimentary Express Delivery Unlocked!' : `Add $${shippingThreshold - subtotal} for Free Delivery`}
                      </span>
                      <span className="text-[#B86B60] font-bold">
                        {Math.min(100, Math.round((subtotal / shippingThreshold) * 100))}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#E8DCD7] rounded-none overflow-hidden">
                      <motion.div 
                        className="h-full bg-[#B86B60] rounded-none"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (subtotal / shippingThreshold) * 100)}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-4 mb-6 rounded-none">
                    {cartItems.map((item, index) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        key={`${item.id}-${index}`}
                        className="flex gap-4 p-3.5 rounded-none bg-white border border-[#E8DCD7] shadow-sm"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-24 object-cover object-center rounded-none bg-[#FAF5F2]"
                        />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between">
                              <h4 className="font-editorial text-base text-[#2C1E1B] leading-tight font-normal">
                                {item.name}
                              </h4>
                              <button
                                onClick={() => onRemoveItem(index)}
                                className="text-[#A38E88] hover:text-[#B86B60] transition-colors p-1 rounded-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-2 text-[11px] text-[#705B56] mt-1">
                              <span>Size: {item.selectedSize || 'M'}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-none inline-block border border-black/10" style={{ backgroundColor: item.selectedColor?.hex || '#D99B91' }} />
                                {item.selectedColor?.name || 'Default'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-[#E8DCD7] rounded-none bg-[#FAF5F2]">
                              <button
                                onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                                className="w-6 h-6 text-xs text-[#2C1E1B] font-bold rounded-none"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-[#2C1E1B]">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                                className="w-6 h-6 text-xs text-[#2C1E1B] font-bold rounded-none"
                              >
                                +
                              </button>
                            </div>

                            <span className="font-hero text-lg font-normal text-[#2C1E1B]">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Promo Code Input */}
                  <form onSubmit={handleApplyPromo} className="flex gap-2 mb-6 rounded-none">
                    <input
                      type="text"
                      placeholder="Promo Code (e.g. AURA10)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-none bg-white border border-[#E8DCD7] text-xs focus:outline-none focus:border-[#2C1E1B]"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#2C1E1B] text-white rounded-none text-xs uppercase tracking-wider font-semibold hover:bg-[#B86B60] transition-colors shadow-md"
                    >
                      Apply
                    </button>
                  </form>
                </>
              )}

            </div>

            {/* Footer Totals */}
            {cartItems.length > 0 && !orderComplete && (
              <div className="p-6 bg-[#F3EAE6] border-t border-[#E8DCD7] rounded-none">
                <div className="space-y-2 text-xs text-[#705B56] mb-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#2C1E1B]">${subtotal.toFixed(2)}</span>
                  </div>
                  {discountApplied && (
                    <div className="flex justify-between text-emerald-700">
                      <span>10% VIP Discount</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{freeShipping ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-base font-hero text-[#2C1E1B] pt-2 border-t border-[#E8DCD7]">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-4 bg-[#2C1E1B] hover:bg-[#B86B60] text-white rounded-none text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-300 shadow-xl flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? (
                    <span>Processing Atelier Order...</span>
                  ) : (
                    <>
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-[#A38E88] mt-3 uppercase tracking-wider rounded-none">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Encrypted 256-Bit SSL Luxury Checkout</span>
                </div>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
