import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Sparkles, Check, Heart, ArrowRight, ShoppingBag } from 'lucide-react';
import sizeChartImg from '../images/size_chart.png';
import { addToWishlist, isInWishlist } from '../lib/wishlistManager';

const isVideoUrl = (url) => url && (url.startsWith('data:video/') || url.match(/\.(mp4|mov|webm)($|\?)/i));

export default function QuickViewModal({ product, onClose, onBuyNow, onOpenWishlist }) {
  if (!product) return null;

  const [showSizeChart, setShowSizeChart] = useState(false);

  const rawSizes = typeof product.sizes === 'string'
    ? product.sizes.split(',').map((s) => s.trim()).filter(Boolean)
    : Array.isArray(product.sizes)
    ? product.sizes
    : ['Standard'];

  const [selectedSize, setSelectedSize] = useState(rawSizes[0] || 'Standard');
  const [isWishlisted, setIsWishlisted] = useState(isInWishlist(product.id));

  // Interactive sizes
  const renderSizes = () => {
    if (!product.sizes) {
      return <span className="text-xs text-[#705B56]">Free Size</span>;
    }

    let sizeItems = [];
    if (typeof product.sizes === 'string') {
      sizeItems = product.sizes.split(',');
    } else if (Array.isArray(product.sizes)) {
      sizeItems = product.sizes;
    }

    if (sizeItems.length === 0) {
      return <span className="text-xs text-[#705B56]">Free Size</span>;
    }

    return sizeItems.map((s, idx) => {
      const cleanSize = String(s).trim();
      const isSelected = selectedSize === cleanSize;
      return (
        <button
          key={idx}
          type="button"
          onClick={() => setSelectedSize(cleanSize)}
          className={`px-4 py-2 border text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            isSelected
              ? 'bg-[#2C1E1B] text-white border-[#2C1E1B]'
              : 'bg-white text-[#705B56] border-[#E8DCD7] hover:border-[#B86B60]'
          }`}
        >
          {cleanSize}
        </button>
      );
    });
  };

  // Safeguard array transformations for details
  const renderDetails = () => {
    const detailsArray = Array.isArray(product.details) ? product.details : [];
    if (detailsArray.length > 0) {
      return detailsArray.map((d, idx) => (
        <li key={idx} className="flex items-center gap-1.5">
          <span className="text-[#B86B60]">✦</span> {d}
        </li>
      ));
    }
    return (
      <>
        <li className="flex items-center gap-1.5"><span className="text-[#B86B60]">✦</span> Premium Tailoring</li>
        <li className="flex items-center gap-1.5"><span className="text-[#B86B60]">✦</span> Dry clean only</li>
      </>
    );
  };
  const handleToggleWishlist = () => {
    addToWishlist(product, selectedSize, 'Standard');
    setIsWishlisted(true);
    if (onOpenWishlist) {
      onOpenWishlist();
    }
  };

  const handleBuyNow = () => {
    if (onBuyNow) {
      onBuyNow({
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price || 0,
        size: selectedSize,
        color: 'Standard',
        quantity: 1,
      });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#2C1E1B]/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 bg-[#FAF5F2] max-w-4xl w-full h-[92vh] sm:h-[88vh] md:h-[82vh] max-h-[850px] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-[#E8DCD7] rounded-none"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-[#FAF5F2] hover:bg-white text-[#2C1E1B] transition-colors rounded-none border border-[#E8DCD7]"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Left Column: Visual Media Display */}
          <div className="w-full md:w-1/2 h-64 sm:h-80 md:h-full bg-[#FAF5F2] relative overflow-hidden flex-shrink-0">
            {isVideoUrl(product.image) ? (
              <video
                src={product.image}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
            )}
          </div>

          {/* Right Column: Details & Actions */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between md:overflow-hidden md:h-full flex-grow">

            {/* Scrollable details wrapper */}
            <div className="overflow-y-auto flex-grow md:pr-4 md:mb-4 scrollbar-thin">
              {/* Title */}
              <h2 className="font-brand text-3xl text-[#2C1E1B] mb-2 font-normal pr-12">
                {product.name}
              </h2>

              {/* Metadata Row: Rating & Solds */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#705B56] mb-4">
                <div className="flex items-center gap-1 text-[#D4AF37]">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="font-bold text-[#2C1E1B]">{product.rating || '4.9'}</span>
                </div>
                <span className="text-[#E8DCD7]">|</span>
                <span className="text-[#705B56] font-medium">{product.solds || '120'} Sold</span>
              </div>

              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-hero text-3xl text-[#2C1E1B]">
                  ₱{Number(product.price)?.toLocaleString()}
                </span>
                <span className="text-[10px] font-brand uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-none font-semibold">
                  In Stock
                </span>
              </div>

              {/* Dynamic Description Label & Paragraph */}
              <div className="mb-6">
                <h4 className="text-[0.9rem] tracking-[0.50em] font-black font-brand text-[#2C1E1B] text-justify mb-2">
                  {product.descriptionLabel || 'Description'}
                </h4>
                <div
                  className="text-xs sm:text-sm text-[#705B56] font-brand font-normal leading-relaxed whitespace-pre-wrap product-description-html"
                  dangerouslySetInnerHTML={{ __html: product.description || '' }}
                />
              </div>

              {/* Size Selector */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2C1E1B]">Select Size:</span>
                  <button
                    onClick={() => setShowSizeChart(true)}
                    className="text-[11px] text-[#B86B60] hover:underline uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    View Size Chart
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {renderSizes()}
                </div>
              </div>

            </div>

            {/* Action Buttons: Buy Now on top, Add to Wishlist below */}
            <div className="pt-4 border-t border-[#E8DCD7] flex-shrink-0 space-y-2.5">
              {/* Buy Now Button (Top) */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={handleBuyNow}
                className="w-full py-4 px-6 font-brand rounded-none text-xs font-bold uppercase tracking-[0.2em] bg-[#2C1E1B] hover:bg-[#B86B60] text-white transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Buy Now</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              {/* Add to Wishlist Button (Below Buy Now) */}
              <button
                type="button"
                onClick={handleToggleWishlist}
                className={`w-full py-3.5 px-6 rounded-none text-xs font-semibold uppercase tracking-[0.18em] transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                  isWishlisted
                    ? 'bg-[#FAF0EC] border-[#B86B60] text-[#B86B60]'
                    : 'bg-white border-[#2C1E1B] text-[#2C1E1B] hover:border-[#B86B60] hover:text-[#B86B60]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#B86B60] text-[#B86B60]' : ''}`} />
                <span>{isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}</span>
              </button>
            </div>

          </div>

        </motion.div>
      </div>

      {/* Size Chart Image Modal */}
      <AnimatePresence>
        {showSizeChart && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#2C1E1B]/80 backdrop-blur-sm"
              onClick={() => setShowSizeChart(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-white p-3 sm:p-5 max-w-md w-full max-h-[85vh] overflow-y-auto flex flex-col items-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowSizeChart(false)}
                className="absolute top-3 right-3 p-1.5 rounded-none bg-[#FAF0EC] hover:bg-[#FAF0EC]/80 text-[#2C1E1B] transition-all cursor-pointer"
                aria-label="Close size chart"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={product.sizeChart || sizeChartImg}
                alt={`${product.name} Size Chart`}
                className="w-full h-auto object-contain max-h-[70vh] mt-6"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
