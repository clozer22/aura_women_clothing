import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronsUpDown, ArrowLeft, Eye, RotateCcw, Filter, Search, X, ShoppingBag, Sparkles } from 'lucide-react';
import ShimmerImage from './ShimmerImage';

const isVideoUrl = (url) => url && (url.startsWith('data:video/') || url.match(/\.(mp4|mov|webm)($|\?)/i));

function SkeletonCard() {
  return (
    <div className="bg-white p-3 sm:p-4 flex flex-col justify-between cursor-default min-h-[380px] sm:min-h-[460px] rounded-none animate-pulse border-r border-b border-[#E8DCD7]">
      {/* Top Badges Header Placeholder */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-3.5 w-16 bg-[#E8DCD7]/60" />
        <div className="h-3.5 w-12 bg-[#E8DCD7]/60" />
      </div>

      {/* Studio Model Image Placeholder */}
      <div className="relative flex-1 bg-[#FAF0EC] my-2 rounded-none min-h-[260px] sm:h-[340px] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-t-transparent border-[#E8DCD7] rounded-full animate-spin opacity-40" />
      </div>

      {/* Bottom Product Info Bar Placeholder */}
      <div className="pt-4 border-t border-[#E8DCD7]/40 flex items-center justify-between gap-4 mt-2">
        <div className="h-4 w-28 bg-[#E8DCD7]/60" />
        <div className="h-4 w-12 bg-[#E8DCD7]/60" />
      </div>
    </div>
  );
}

export default function FullCatalogView({ products, isLoading, onBackToHome, onSelectProduct, initialSearchQuery = '' }) {
  const activeList = products || [];
  const [selectedTops, setSelectedTops] = useState([]);
  const [selectedBottoms, setSelectedBottoms] = useState([]);
  const [mainCategoryFilter, setMainCategoryFilter] = useState('all'); // 'all' | 'top' | 'bottom'
  const [sortBy, setSortBy] = useState('featured');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  // Sync with prop changes (e.g. searching from navbar)
  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  // Dropdown open states
  const [isTopsOpen, setIsTopsOpen] = useState(false);
  const [isBottomsOpen, setIsBottomsOpen] = useState(false);

  const topsDropdownRef = useRef(null);
  const bottomsDropdownRef = useRef(null);

  // Dynamic subtypes collected from active products list (case-insensitive deduplication)
  const topsSubtypes = useMemo(() => {
    const uniqueMap = new Map();
    activeList
      .filter(p => p.mainCategory === 'top' && p.subType)
      .forEach(p => {
        const trimmed = p.subType.trim();
        const key = trimmed.toLowerCase();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, trimmed);
        }
      });
    return Array.from(uniqueMap.values()).sort();
  }, [activeList]);

  const bottomsSubtypes = useMemo(() => {
    const uniqueMap = new Map();
    activeList
      .filter(p => p.mainCategory === 'bottom' && p.subType)
      .forEach(p => {
        const trimmed = p.subType.trim();
        const key = trimmed.toLowerCase();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, trimmed);
        }
      });
    return Array.from(uniqueMap.values()).sort();
  }, [activeList]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (topsDropdownRef.current && !topsDropdownRef.current.contains(e.target)) {
        setIsTopsOpen(false);
      }
      if (bottomsDropdownRef.current && !bottomsDropdownRef.current.contains(e.target)) {
        setIsBottomsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleTopSubtype = (subType) => {
    setSelectedBottoms([]); // Clear bottoms
    setMainCategoryFilter('all'); // Clear main category filter, let subtype take over
    setSelectedTops(prev =>
      prev.includes(subType) ? prev.filter(item => item !== subType) : [...prev, subType]
    );
  };

  const handleToggleBottomSubtype = (subType) => {
    setSelectedTops([]); // Clear tops
    setMainCategoryFilter('all'); // Clear main category filter, let subtype take over
    setSelectedBottoms(prev =>
      prev.includes(subType) ? prev.filter(item => item !== subType) : [...prev, subType]
    );
  };

  const handleClearFilters = () => {
    setSelectedTops([]);
    setSelectedBottoms([]);
    setMainCategoryFilter('all');
    setSearchQuery('');
  };

  // Filtered Products Logic
  const filteredProducts = useMemo(() => {
    let list = activeList;

    // Filter by search query
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.subType.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    // Filter by main Category if selected
    if (mainCategoryFilter === 'top') {
      list = list.filter(p => p.mainCategory === 'top');
    } else if (mainCategoryFilter === 'bottom') {
      list = list.filter(p => p.mainCategory === 'bottom');
    }

    // Filter by Tops Subtypes if any checked (case-insensitive)
    if (selectedTops.length > 0) {
      const selectedTopsLower = selectedTops.map(s => s.toLowerCase());
      list = list.filter(p => p.mainCategory === 'top' && p.subType && selectedTopsLower.includes(p.subType.trim().toLowerCase()));
    }

    // Filter by Bottoms Subtypes if any checked (case-insensitive)
    if (selectedBottoms.length > 0) {
      const selectedBottomsLower = selectedBottoms.map(s => s.toLowerCase());
      list = list.filter(p => p.mainCategory === 'bottom' && p.subType && selectedBottomsLower.includes(p.subType.trim().toLowerCase()));
    }

    // Sorting
    if (sortBy === 'price-low') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'discount') {
      list = [...list].sort((a, b) => (b.originalPrice ? 1 : -1));
    }

    return list;
  }, [mainCategoryFilter, selectedTops, selectedBottoms, sortBy, searchQuery, activeList]);

  const totalActiveFilters = selectedTops.length + selectedBottoms.length + (mainCategoryFilter !== 'all' ? 1 : 0) + (searchQuery !== '' ? 1 : 0);

  return (
    <div className="min-h-screen bg-white text-[#2C1E1B] pt-24 pb-20 rounded-none">

      {/* Top Header & Breadcrumb */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 mb-8 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <motion.button
            whileHover={{ x: -4 }}
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#705B56] hover:text-[#2C1E1B] transition-colors rounded-none"
          >
            <ArrowLeft className="w-4 h-4 text-[#B86B60]" />
            <span>Back</span>
          </motion.button>
        </div>
      </div>

      {/* Categories & Checkbox Dropdowns Filtering Bar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 mb-10 rounded-none">
        <div className="py-4 sm:py-5 px-0 rounded-none bg-transparent flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          {/* Left: Category Dropdowns (Tops & Bottoms) */}
          <div className="flex items-center gap-3 flex-wrap">

            {/* ALL Pill */}
            <button
              onClick={handleClearFilters}
              className={`px-4 py-2 rounded-none text-[10px] font-semibold uppercase tracking-widest transition-all border ${
                selectedTops.length === 0 && selectedBottoms.length === 0 && mainCategoryFilter === 'all'
                  ? 'bg-[#ccc2c3] text-white border-[#ccc2c3] shadow-xs'
                  : 'bg-white text-[#2C1E1B] border-[#E8DCD7] hover:border-[#2C1E1B]'
              }`}
            >
              ALL
            </button>

            {/* 1. TOPS DROPDOWN WITH CHECKBOXES */}
            <div className="relative" ref={topsDropdownRef}>
              <button
                onClick={() => {
                  setIsTopsOpen(!isTopsOpen);
                  setIsBottomsOpen(false);
                }}
                className={`px-3.5 py-2 rounded-none text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5 border transition-all ${
                  selectedTops.length > 0 || mainCategoryFilter === 'top'
                    ? 'bg-white text-[#2C1E1B] border-[#2C1E1B] shadow-xs font-bold'
                    : 'bg-white text-[#2C1E1B] border-[#E8DCD7] hover:border-[#2C1E1B]'
                }`}
              >
                <span>TOPS</span>
                {(selectedTops.length > 0 || (mainCategoryFilter === 'top' && selectedTops.length === 0)) && (
                  <span className="bg-[#B86B60] text-white text-[9px] w-4 h-4 rounded-none flex items-center justify-center font-bold">
                    {selectedTops.length > 0 ? selectedTops.length : 'All'}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 text-[#705B56] transition-transform duration-300 ${isTopsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Tops Checkbox Dropdown Box */}
              <AnimatePresence>
                {isTopsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-52 bg-white rounded-none p-3 shadow-2xl border border-[#E8DCD7] z-40"
                  >
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#E8DCD7] rounded-none">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#2C1E1B]">Top Categories</span>
                      {(selectedTops.length > 0 || mainCategoryFilter === 'top') && (
                        <button
                          onClick={() => {
                            setSelectedTops([]);
                            if (mainCategoryFilter === 'top') {
                              setMainCategoryFilter('all');
                            }
                          }}
                          className="text-[9px] text-[#B86B60] hover:underline uppercase font-medium rounded-none"
                        >
                          Reset Tops
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {/* All Tops Checkbox */}
                      <label className="flex items-center gap-2 p-1 rounded-none hover:bg-[#FAF5F2] cursor-pointer text-[11px] text-[#2C1E1B] transition-colors select-none border-b border-[#E8DCD7]/40 pb-1.5 mb-1">
                        <input
                          type="checkbox"
                          checked={mainCategoryFilter === 'top' && selectedTops.length === 0}
                          onChange={() => {
                            if (mainCategoryFilter === 'top' && selectedTops.length === 0) {
                              setMainCategoryFilter('all');
                            } else {
                              setMainCategoryFilter('top');
                              setSelectedTops([]);
                              setSelectedBottoms([]);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded-none accent-[#2C1E1B] cursor-pointer"
                        />
                        <span className="font-bold">All Tops</span>
                      </label>

                      {topsSubtypes.map((sub) => (
                        <label
                          key={sub}
                          className="flex items-center gap-2 p-1 rounded-none hover:bg-[#FAF5F2] cursor-pointer text-[11px] text-[#2C1E1B] transition-colors select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTops.includes(sub)}
                            onChange={() => handleToggleTopSubtype(sub)}
                            className="w-3.5 h-3.5 rounded-none accent-[#2C1E1B] cursor-pointer"
                          />
                          <span className="font-medium">{sub}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. BOTTOMS DROPDOWN WITH CHECKBOXES */}
            <div className="relative" ref={bottomsDropdownRef}>
              <button
                onClick={() => {
                  setIsBottomsOpen(!isBottomsOpen);
                  setIsTopsOpen(false);
                }}
                className={`px-3.5 py-2 rounded-none text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5 border transition-all ${
                  selectedBottoms.length > 0 || mainCategoryFilter === 'bottom'
                    ? 'bg-white text-[#2C1E1B] border-[#2C1E1B] shadow-xs font-bold'
                    : 'bg-white text-[#2C1E1B] border-[#E8DCD7] hover:border-[#2C1E1B]'
                }`}
              >
                <span>BOTTOMS</span>
                {(selectedBottoms.length > 0 || (mainCategoryFilter === 'bottom' && selectedBottoms.length === 0)) && (
                  <span className="bg-[#B86B60] text-white text-[9px] w-4 h-4 rounded-none flex items-center justify-center font-bold">
                    {selectedBottoms.length > 0 ? selectedBottoms.length : 'All'}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 text-[#705B56] transition-transform duration-300 ${isBottomsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Bottoms Checkbox Dropdown Box */}
              <AnimatePresence>
                {isBottomsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-52 bg-white rounded-none p-3 shadow-2xl border border-[#E8DCD7] z-40"
                  >
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#E8DCD7] rounded-none">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#2C1E1B]">Bottom Categories</span>
                      {(selectedBottoms.length > 0 || mainCategoryFilter === 'bottom') && (
                        <button
                          onClick={() => {
                            setSelectedBottoms([]);
                            if (mainCategoryFilter === 'bottom') {
                              setMainCategoryFilter('all');
                            }
                          }}
                          className="text-[9px] text-[#B86B60] hover:underline uppercase font-medium rounded-none"
                        >
                          Reset Bottoms
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {/* All Bottoms Checkbox */}
                      <label className="flex items-center gap-2 p-1 rounded-none hover:bg-[#FAF5F2] cursor-pointer text-[11px] text-[#2C1E1B] transition-colors select-none border-b border-[#E8DCD7]/40 pb-1.5 mb-1">
                        <input
                          type="checkbox"
                          checked={mainCategoryFilter === 'bottom' && selectedBottoms.length === 0}
                          onChange={() => {
                            if (mainCategoryFilter === 'bottom' && selectedBottoms.length === 0) {
                              setMainCategoryFilter('all');
                            } else {
                              setMainCategoryFilter('bottom');
                              setSelectedBottoms([]);
                              setSelectedTops([]);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded-none accent-[#2C1E1B] cursor-pointer"
                        />
                        <span className="font-bold">All Bottoms</span>
                      </label>

                      {bottomsSubtypes.map((sub) => (
                        <label
                          key={sub}
                          className="flex items-center gap-2 p-1 rounded-none hover:bg-[#FAF5F2] cursor-pointer text-[11px] text-[#2C1E1B] transition-colors select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBottoms.includes(sub)}
                            onChange={() => handleToggleBottomSubtype(sub)}
                            className="w-3.5 h-3.5 rounded-none accent-[#2C1E1B] cursor-pointer"
                          />
                          <span className="font-medium">{sub}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-[#E8DCD7] hover:border-[#2C1E1B] text-[10px] text-[#2C1E1B] font-semibold rounded-none pl-3 pr-8 py-2 focus:outline-none focus:border-[#2C1E1B] cursor-pointer shadow-xs appearance-none tracking-wider uppercase"
              >
                <option value="featured">Featured Order</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="discount">Highest Discount</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronsUpDown className="w-3 h-3 text-[#705B56]" />
              </div>
            </div>

            {/* Clear All Filters Button */}
            {totalActiveFilters > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-[#2C1E1B] flex items-center gap-1 font-semibold uppercase tracking-wider px-3 py-2 rounded-none hover:bg-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Display (Exact layout from attached reference screenshot) */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 rounded-none">

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 bg-white border-l border-t border-[#E8DCD7] rounded-none overflow-hidden shadow-sm">
          {isLoading ? (
            Array(10).fill(0).map((_, idx) => <SkeletonCard key={idx} />)
          ) : (
            filteredProducts.map((product) => {
              const isSoldOut = product.statusBadge === 'SOLD OUT';

              return (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="group bg-white p-3 sm:p-4 flex flex-col justify-between cursor-pointer hover:bg-[#FAF5F2]/40 transition-colors relative min-h-[380px] sm:min-h-[460px] rounded-none border-r border-b border-[#E8DCD7]"
                >
                  {/* Top Badges Header */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#2C1E1B] uppercase tracking-wider mb-2 z-10">
                    <span />
                    <span>
                      {product.statusBadge && (
                        <span className={`text-[10px] tracking-widest font-bold ${product.statusBadge === 'SOLD OUT' ? 'text-gray-400' : 'text-[#2C1E1B]'
                          }`}>
                          {product.statusBadge}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Studio Model Full Body Image or Video */}
                  <div className="relative flex-1 flex items-center justify-center my-2 overflow-hidden rounded-none w-full h-[260px] sm:h-[340px]">
                    {isVideoUrl(product.image) ? (
                      <video
                        src={product.image}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className={`w-full h-full object-cover object-top rounded-none ${isSoldOut ? 'opacity-65' : ''}`}
                      />
                    ) : (
                      <ShimmerImage
                        src={product.image}
                        alt={product.name}
                        className={`w-full h-[260px] sm:h-[340px] rounded-none ${isSoldOut ? 'opacity-65' : ''}`}
                        imgClassName={`w-full h-full object-cover object-top transition-transform duration-700 ${isSoldOut ? '' : 'group-hover:scale-105'}`}
                      />
                    )}

                    {/* Quick View Button on Hover */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 rounded-none">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(product);
                        }}
                        className="px-4 py-2 bg-white text-[#2C1E1B] rounded-none text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-[#ccc2c3] hover:text-white transition-colors"
                      >
                        Quick View
                      </button>
                    </div>
                  </div>

                  {/* Bottom Product Info Bar (Exact layout from reference image) */}
                  <div className="pt-3 border-t border-[#E8DCD7]/40 flex items-end justify-between gap-2 text-[11px] rounded-none">

                    {/* Left: Product Name */}
                    <div className="flex-1">
                      <h3 className="font-bold text-[#2C1E1B] uppercase tracking-wider text-[11px] sm:text-xs leading-tight line-clamp-1 group-hover:text-[#B86B60] transition-colors rounded-none">
                        {product.name}
                      </h3>
                    </div>

                    {/* Right: Price & Status */}
                    <div className="text-right whitespace-nowrap">
                      {isSoldOut ? (
                        <span className="font-bold text-gray-400">SOLD OUT</span>
                      ) : product.originalPrice ? (
                        <div className="flex flex-col items-end">
                          <span className="line-through text-gray-400 text-[10px]">
                            ₱{Number(product.originalPrice)?.toLocaleString()}
                          </span>
                          <span className="font-bold text-[#B86B60]">
                            ₱{Number(product.price)?.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5 justify-end">
                          <span className="font-bold text-[#2C1E1B]">
                            ₱{Number(product.price)?.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              );
            })
          )}
        </div>

        {activeList.length === 0 && !isLoading ? (
          <div className="py-24 text-center bg-white rounded-none border border-[#E8DCD7] max-w-2xl mx-auto shadow-sm p-8 flex flex-col items-center justify-center mt-6">
            <ShoppingBag className="w-10 h-10 text-[#B86B60] mx-auto mb-4 opacity-80 animate-bounce" />
            <h3 className="font-editorial text-2xl text-[#2C1E1B] mb-2 font-normal">Atelier Catalog Empty</h3>
            <p className="text-xs text-[#705B56] leading-relaxed max-w-md">
              We are currently curating and preparing our seasonal collections. Please check back soon, or visit the Admin Portal to populate listings in our database.
            </p>
          </div>
        ) : (
          filteredProducts.length === 0 && (
            <div className="text-center py-24 bg-[#FAF5F2] rounded-none border border-[#E8DCD7] mt-6">
              <Filter className="w-10 h-10 text-[#A38E88] mx-auto mb-3" />
              <h3 className="font-editorial text-3xl text-[#2C1E1B] mb-2">No Matching Garments Found</h3>
              <p className="text-xs text-[#705B56] mb-6">
                Try adjusting your Tops or Bottoms category filters to explore more items.
              </p>
              <button
                onClick={handleClearFilters}
                className="bg-[#2C1E1B] text-white text-xs font-semibold uppercase tracking-[0.2em] px-6 py-3 rounded-none hover:bg-[#B86B60] transition-colors shadow-lg"
              >
                Reset All Filters
              </button>
            </div>
          )
        )}

      </div>

    </div>
  );
}
