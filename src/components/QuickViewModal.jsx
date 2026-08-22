import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Sparkles, Check } from 'lucide-react';
import sizeChartImg from '../images/size_chart.png';

const isVideoUrl = (url) => url && (url.startsWith('data:video/') || url.match(/\.(mp4|mov|webm)($|\?)/i));

export default function QuickViewModal({ product, onClose }) {
  if (!product) return null;

  // Safeguard array transformations for colors
  const colorsArray = Array.isArray(product.colors) ? product.colors : [];
  const [selectedColor, setSelectedColor] = useState(colorsArray[0]);
  const [showSizeChart, setShowSizeChart] = useState(false);

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
          className="relative z-10 w-full max-w-4xl bg-[#fff3f7] rounded-none shadow-2xl border border-white/80 flex flex-col md:flex-row md:h-[650px] md:max-h-[85vh] overflow-y-auto md:overflow-hidden my-auto"
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

              {/* Metadata Row: Category, Rating & Solds */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#705B56] mb-4">
                {/* <span className="uppercase tracking-[0.2em] font-semibold text-[#B86B60]">
                  {product.category}
                </span> */}
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

              {/* Size Selector - Clickable View Sizes button */}
              <div className="mb-6">
                <div>
                  <button
                    onClick={() => setShowSizeChart(true)}
                    className="px-6 py-2.5 bg-white text-[#705B56] hover:bg-[#FAF5F2] border border-[#E8DCD7] text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                  >
                    View Sizes
                  </button>
                </div>
              </div>

            </div>

            {/* Direct Shopee Checkout Redirect */}
            <div className="pt-4 border-t border-[#E8DCD7] flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.open(product.shopeeLink || 'https://shopee.ph', '_blank', 'noopener,noreferrer')}
                className="w-full py-4 px-6 font-brand  rounded-none text-xs font-semibold uppercase tracking-[0.2em] bg-[#ccc2c3] text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Buy Here</span>
              </motion.button>
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
