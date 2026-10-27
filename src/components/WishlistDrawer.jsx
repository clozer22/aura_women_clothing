import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ArrowRight, ShoppingBag, AlertCircle } from 'lucide-react';
import {
  getWishlist,
  removeFromWishlist,
  updateWishlistQuantity,
  subscribeWishlist,
} from '../lib/wishlistManager';
import { getCachedProducts } from '../lib/productCache';
import { PRODUCTS } from '../data/products';

export default function WishlistDrawer({ isOpen, onClose, onProceedToCheckout }) {
  const [items, setItems] = useState(getWishlist());
  const [selectedIds, setSelectedIds] = useState([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    setItems(getWishlist());
    const unsubscribe = subscribeWishlist((updated) => {
      setItems(updated);
    });
    return () => unsubscribe();
  }, []);

  // Real-time stock status resolver against live catalog and memory cache
  const getProductStockStatus = (item) => {
    const liveProducts = getCachedProducts();
    const match =
      (Array.isArray(liveProducts) ? liveProducts.find((p) => String(p.id) === String(item.id)) : null) ||
      PRODUCTS.find((p) => String(p.id) === String(item.id)) ||
      item;

    const badge = (match?.statusBadge || item?.statusBadge || '').toUpperCase();
    const qty =
      match?.qty !== undefined && match?.qty !== null
        ? Number(match.qty)
        : item?.qty !== undefined && item?.qty !== null
        ? Number(item.qty)
        : null;

    const isSoldOut = badge === 'SOLD OUT' || badge === 'ARCHIVE' || (qty !== null && qty <= 0);
    return { isSoldOut, remainingStock: qty };
  };

  // Group items into in-stock vs sold-out
  const { inStockItems, soldOutItems } = useMemo(() => {
    const inStock = [];
    const soldOut = [];
    items.forEach((item) => {
      const { isSoldOut } = getProductStockStatus(item);
      if (isSoldOut) {
        soldOut.push(item);
      } else {
        inStock.push(item);
      }
    });
    return { inStockItems: inStock, soldOutItems: soldOut };
  }, [items]);

  // Synchronize selection: automatically select all in-stock items on initial load / new additions,
  // and guarantee sold-out items are NEVER selected.
  useEffect(() => {
    const validInStockIds = inStockItems.map((item) => item.wishlistId);

    if (!hasInitialized && validInStockIds.length > 0) {
      setSelectedIds(validInStockIds);
      setHasInitialized(true);
    } else {
      setSelectedIds((prev) => {
        // Keep only ids that still exist and are in stock
        const filtered = prev.filter((id) => validInStockIds.includes(id));
        // If everything was previously selected, and a new in-stock item was added, include it
        if (prev.length > 0 && validInStockIds.length > prev.length) {
          const newIds = validInStockIds.filter((id) => !prev.includes(id));
          return [...filtered, ...newIds];
        }
        return filtered;
      });
    }
  }, [items, inStockItems, hasInitialized]);

  const toggleSelectItem = (wishlistId) => {
    const item = items.find((it) => it.wishlistId === wishlistId);
    if (!item || getProductStockStatus(item).isSoldOut) return;

    setSelectedIds((prev) =>
      prev.includes(wishlistId)
        ? prev.filter((id) => id !== wishlistId)
        : [...prev, wishlistId]
    );
  };

  const areAllInStockSelected =
    inStockItems.length > 0 &&
    inStockItems.every((item) => selectedIds.includes(item.wishlistId));

  const toggleSelectAll = () => {
    if (inStockItems.length === 0) return;
    if (areAllInStockSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inStockItems.map((it) => it.wishlistId));
    }
  };

  const selectedItems = useMemo(() => {
    return inStockItems.filter((item) => selectedIds.includes(item.wishlistId));
  }, [inStockItems, selectedIds]);

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
    0
  );
  const shippingFee = selectedItems.length > 0 ? 150 : 0;
  const total = subtotal + shippingFee;

  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    onClose();
    if (onProceedToCheckout) {
      onProceedToCheckout(selectedItems);
    }
  };

  const handleRemoveSoldOutItems = () => {
    soldOutItems.forEach((item) => {
      removeFromWishlist(item.wishlistId);
    });
  };

  if (!isOpen) return null;

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

            {/* Select All Bar (when bag has items) */}
            {items.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 bg-[#FAF0EC]/80 border-b border-[#E8DCD7] text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={areAllInStockSelected}
                    disabled={inStockItems.length === 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded-none accent-[#2C1E1B] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  <span className="font-brand uppercase tracking-wider text-[11px] font-bold text-[#2C1E1B]">
                    Select All ({selectedItems.length}/{inStockItems.length})
                  </span>
                </label>

                {soldOutItems.length > 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#B86B60]">
                    {soldOutItems.length} Sold Out (Kept in Bag)
                  </span>
                )}
              </div>
            )}

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
                    className="border border-[#2C1E1B] text-[#2C1E1B] hover:bg-[#2C1E1B] hover:text-white px-6 py-3 text-xs uppercase tracking-[0.2em] font-semibold transition-all rounded-none cursor-pointer"
                  >
                    Explore Shop
                  </button>
                </div>
              ) : (
                items.map((item) => {
                  const { isSoldOut, remainingStock } = getProductStockStatus(item);
                  const isSelected = !isSoldOut && selectedIds.includes(item.wishlistId);

                  return (
                    <motion.div
                      key={item.wishlistId || item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-4 bg-white border flex gap-3.5 items-start relative group transition-colors ${
                        isSoldOut
                          ? 'border-rose-200/80 bg-rose-50/10'
                          : isSelected
                          ? 'border-[#2C1E1B]/40 shadow-xs'
                          : 'border-[#E8DCD7]'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center pt-2 self-start flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isSoldOut}
                          onChange={() => toggleSelectItem(item.wishlistId)}
                          className={`w-4 h-4 rounded-none accent-[#2C1E1B] transition-all ${
                            isSoldOut
                              ? 'cursor-not-allowed opacity-30'
                              : 'cursor-pointer hover:scale-105'
                          }`}
                          aria-label={`Select ${item.name} for checkout`}
                          title={isSoldOut ? 'Sold out — cannot be checked out' : 'Select for checkout'}
                        />
                      </div>

                      {/* Thumbnail with Sold Out Overlay */}
                      <div className="relative w-20 h-24 flex-shrink-0 overflow-hidden bg-[#FAF5F2]">
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className={`w-full h-full object-cover object-center ${
                            isSoldOut ? 'opacity-40 grayscale' : ''
                          }`}
                        />
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
                            <span className="text-[8px] font-black tracking-widest uppercase bg-rose-600 text-white px-1.5 py-0.5 text-center">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-brand text-xs font-semibold text-[#2C1E1B] truncate">
                            {item.name}
                          </h4>
                          {isSoldOut && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2">
                              Sold Out
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] font-brand tracking-wider uppercase text-[#B86B60] mb-1">
                          {typeof item.size === 'object' ? item.size?.name : item.size || 'Standard'}
                          {item.color && (typeof item.color === 'object' ? item.color?.name : item.color) !== 'Standard'
                            ? ` / ${typeof item.color === 'object' ? item.color?.name : item.color}`
                            : ''}
                        </p>

                        {isSoldOut && (
                          <p className="text-[10px] text-rose-700 font-medium tracking-wide mb-2">
                            Saved in bag until restock
                          </p>
                        )}

                        <div className="font-hero text-sm font-bold text-[#2C1E1B] mb-3">
                          ₱{(Number(item.price) || 0).toLocaleString()}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-[#E8DCD7] bg-[#FAF5F2]">
                            <button
                              onClick={() => updateWishlistQuantity(item.wishlistId, -1)}
                              disabled={isSoldOut}
                              className="px-2.5 py-1 text-xs text-[#705B56] hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              title="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-semibold text-[#2C1E1B] min-w-[20px] text-center">
                              {item.quantity || 1}
                            </span>
                            <button
                              onClick={() => updateWishlistQuantity(item.wishlistId, 1)}
                              disabled={isSoldOut || (remainingStock !== null && item.quantity >= remainingStock)}
                              className="px-2.5 py-1 text-xs text-[#705B56] hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Remove Icon */}
                      <button
                        onClick={() => removeFromWishlist(item.wishlistId)}
                        className="absolute top-4 right-4 text-[#A38E88] hover:text-[#B86B60] transition-colors p-1 cursor-pointer"
                        aria-label="Remove item"
                        title="Remove from bag"
                      >
                        <Trash2 className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer Summary & Checkout Button */}
            {items.length > 0 && (
              <div className="p-6 border-t border-[#E8DCD7] bg-[#F3EAE6] space-y-4">
                {/* Sold Out Informational Banner (Non-blocking) */}
                {soldOutItems.length > 0 && (
                  <div className="p-3 bg-[#FAF5F2] border border-[#E8DCD7] text-[#705B56] text-xs flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 text-[#B86B60] shrink-0" />
                      <span className="text-[11px] leading-tight">
                        Sold out items are kept in your bag for restock and excluded from checkout.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveSoldOutItems}
                      className="text-[10px] font-bold uppercase tracking-wider underline text-[#A38E88] hover:text-[#B86B60] shrink-0 cursor-pointer"
                      title="Remove sold out items from bag"
                    >
                      Clear Sold Out
                    </button>
                  </div>
                )}

                <div className="space-y-2 text-xs font-brand">
                  <div className="flex justify-between text-[#705B56]">
                    <span>Subtotal ({selectedItems.length} selected)</span>
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
                  disabled={selectedItems.length === 0}
                  onClick={handleCheckout}
                  className={`w-full py-4 px-6 text-xs uppercase font-bold tracking-[0.2em] shadow-lg transition-all duration-300 flex items-center justify-center gap-2 rounded-none ${
                    selectedItems.length === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-[#2C1E1B] hover:bg-[#B86B60] text-white cursor-pointer'
                  }`}
                >
                  <span>
                    {selectedItems.length === 0
                      ? 'SELECT ITEMS TO CHECKOUT'
                      : `PROCEED TO CHECKOUT (${selectedItems.length})`}
                  </span>
                  {selectedItems.length > 0 && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="text-center">
                  <button
                    onClick={onClose}
                    className="text-[11px] uppercase tracking-wider text-[#705B56] hover:text-[#2C1E1B] underline underline-offset-4 font-medium cursor-pointer"
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
