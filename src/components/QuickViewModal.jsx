import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Sparkles, Check } from 'lucide-react';

const isVideoUrl = (url) => url && (url.startsWith('data:video/') || url.match(/\.(mp4|mov|webm)($|\?)/i));

export default function QuickViewModal({ product, onClose, mediaTheme = 'light' }) {
  if (!product) return null;

  // Safeguard array transformations for colors
  const colorsArray = Array.isArray(product.colors) ? product.colors : [];
  const [selectedColor, setSelectedColor] = useState(colorsArray[0]);

  // Safeguard array transformations for sizes
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

    return sizeItems.map((s, idx) => (
      <span
        key={idx}
        className="px-4 py-2 bg-white text-[#705B56] border border-[#E8DCD7] text-xs font-semibold uppercase tracking-wider"
      >
        {String(s).trim()}
      </span>
    ));
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">

        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-[#2C1E1B]/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-4xl bg-[#f3d5e7] rounded-none shadow-2xl border border-white/80 flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] overflow-y-auto md:overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="fixed md:absolute top-6 right-6 md:top-4 md:right-4 z-30 p-2.5 rounded-none bg-white/80 hover:bg-white text-[#2C1E1B] shadow-lg border border-white transition-all focus:outline-none flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Column: Product Image/Video Gallery */}
          <div className="w-full md:w-1/2 relative bg-[#F3EAE6] h-[280px] sm:h-[350px] md:h-full flex-shrink-0 overflow-hidden">
            {mediaTheme === 'dark' ? (
              isVideoUrl(product.hoverImage || product.image) ? (
                <video
                  src={product.hoverImage || product.image}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <img
                  src={product.hoverImage || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover object-center"
                />
              )
            ) : (
              isVideoUrl(product.image) ? (
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
              )
            )}
          </div>

          {/* Right Column: Details & Actions */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-visible md:overflow-y-auto flex-grow">

            <div>
              {/* Title */}
              <h2 className="font-editorial text-3xl text-[#2C1E1B] mb-2 font-normal pr-12">
                {product.name}
              </h2>

              {/* Metadata Row: Category, Rating & Solds */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#705B56] mb-4">
                <span className="uppercase tracking-[0.2em] font-semibold text-[#B86B60]">
                  {product.category}
                </span>
                <span className="text-[#E8DCD7]">|</span>
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
                <span className="text-[10px] uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-none font-semibold">
                  In Stock
                </span>
              </div>

              {/* Dynamic Description Label & Paragraph */}
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-[0.18em] font-bold text-[#2C1E1B] mb-2">
                  {product.descriptionLabel || 'Description'}
                </h4>
                <p className="text-xs sm:text-sm text-[#705B56] font-sans font-normal leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Color Swatches */}
              {/* {colorsArray.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs uppercase tracking-[0.18em] font-semibold text-[#2C1E1B] mb-2.5">
                    Color: <span className="text-[#B86B60] font-normal">
                      {selectedColor && typeof selectedColor === 'object' ? selectedColor.name : (selectedColor || '')}
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    {colorsArray.map((c, idx) => {
                      const colorName = c && typeof c === 'object' ? c.name : String(c);
                      const colorHex = c && typeof c === 'object' ? c.hex : '#E6D7CD';
                      const isSelected = selectedColor && typeof selectedColor === 'object'
                        ? selectedColor.name === colorName
                        : selectedColor === c;

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedColor(c)}
                          className={`w-8 h-8 rounded-none border-2 transition-all flex items-center justify-center ${isSelected ? 'border-[#2C1E1B] scale-110 shadow-md' : 'border-transparent opacity-80'
                            }`}
                          style={{ backgroundColor: colorHex }}
                          title={colorName}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )} */}

              {/* Size Selector - Purely informational range badges */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-[0.18em] font-semibold text-[#2C1E1B]">
                    Available Sizes
                  </label>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {renderSizes()}
                </div>
              </div>

            </div>

            {/* Direct Shopee Checkout Redirect */}
            <div className="pt-4 border-t border-[#E8DCD7]">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.open(product.shopeeLink || 'https://shopee.ph', '_blank', 'noopener,noreferrer')}
                className="w-full py-4 px-6 rounded-none text-xs font-semibold uppercase tracking-[0.2em] bg-[#ccc2c3] text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-2"
              >
                <span>Buy Here</span>
              </motion.button>
            </div>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
