import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRODUCTS, CATEGORIES } from '../data/products';
import { Search, SlidersHorizontal, ArrowRight, Sparkles } from 'lucide-react';
import ShimmerImage from './ShimmerImage';

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

export default function ProductCatalog({ products, isLoading, onSelectProduct, onViewFullCatalog }) {
  const [selectedCategory, setSelectedCategory] = useState('All Collections');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  // Use featured items if selected by the admin, otherwise fall back to all products
  const activeList = useMemo(() => {
    const list = products || [];
    const featured = list.filter(p => p.isFeatured);
    return featured.length > 0 ? featured : list;
  }, [products]);

  // Limit to first 6 items on home page catalog preview
  const filteredProducts = useMemo(() => {
    let result = activeList;

    if (selectedCategory !== 'All Collections') {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p => p.name.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-low') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result = [...result].sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [selectedCategory, searchQuery, sortBy, activeList]);

  return (
    <section id="catalog" className="py-20 sm:py-28 bg-[#fff3f7] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="font-brand text-[2.2rem] sm:text-[3.5rem] tracking-[0.25em] text-[#2C1E1B] block uppercase font-normal mb-3">
            Curated Wardrobe
          </span>
          <h2 className="text-3xl sm:text-5xl font-editorial font-light text-[#2C1E1B] tracking-tight mb-4">
            The Aura Collection
          </h2>
          <p className="text-xs sm:text-sm text-[#705B56] font-sans leading-relaxed">
            Hand-cut Mulberry silk, Italian virgin wool tailoring, and Grade-A cashmere essentials crafted for enduring style.
          </p>
        </motion.div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#705B56] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search garments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-none bg-white/90 border border-[#E8DCD7] text-xs text-[#2C1E1B] placeholder-[#A38E88] focus:outline-none focus:border-[#2C1E1B] transition-all shadow-sm"
            />
          </div>

          {/* Category Pills Navigation */}
          <div className="flex items-center justify-center gap-2 flex-wrap max-w-full">
            {CATEGORIES.map((cat) => (
              <motion.button
                whileTap={{ scale: 0.95 }}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-none text-[11px] uppercase tracking-[0.15em] font-medium transition-all duration-300 ${selectedCategory === cat
                  ? 'bg-[#ccc2c3] text-white shadow-lg scale-105'
                  : 'bg-white/80 hover:bg-white text-[#705B56] border border-[#E8DCD7]'
                  }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative w-full md:w-auto flex items-center justify-end gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#705B56]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/90 border border-[#E8DCD7] text-xs text-[#705B56] font-medium rounded-none px-4 py-2.5 focus:outline-none focus:border-[#2C1E1B] cursor-pointer shadow-sm"
            >
              <option value="featured">Sort by Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Product Grid - Unified with the Full Catalog Page Layout (Thin border grid separator, empty slots render white) */}
        {filteredProducts.length === 0 && !isLoading ? (
          <div className="py-24 text-center bg-white border border-[#E8DCD7] rounded-none px-6 py-16 flex flex-col items-center justify-center shadow-sm max-w-2xl mx-auto">
            <Sparkles className="w-8 h-8 text-[#B86B60] mb-4 animate-pulse" />
            <h3 className="font-editorial text-2xl text-[#2C1E1B] mb-2 font-normal">Collection Under Refinement</h3>
            <p className="text-xs text-[#705B56] max-w-md leading-relaxed">
              Our atelier is currently orchestrating new seasonal garments. Please visit the admin portal to publish catalog listings, or connect with our designers to be notified upon launch.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 bg-white border-l border-t border-[#E8DCD7] rounded-none overflow-hidden shadow-sm">
            {isLoading ? (
              Array(6).fill(0).map((_, idx) => <SkeletonCard key={idx} />)
            ) : (
              <>
                <AnimatePresence>
                  {filteredProducts.slice(0, 6).map((product) => {
                    const isSoldOut = product.statusBadge === 'SOLD OUT';
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
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

                      {/* Studio Model Full Body Image */}
                      <div className="relative flex-1 flex items-center justify-center my-2 overflow-hidden rounded-none">
                        <ShimmerImage
                          src={product.image}
                          alt={product.name}
                          className={`w-full h-[260px] sm:h-[340px] rounded-none ${isSoldOut ? 'opacity-65' : ''}`}
                          imgClassName={`w-full h-full object-cover object-top transition-transform duration-700 ${isSoldOut ? '' : 'group-hover:scale-105'}`}
                        />

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

                      {/* Bottom Product Info Bar (Exact layout from catalog page) */}
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
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              SOLD OUT
                            </span>
                          ) : (
                            <div className="flex items-baseline gap-1.5 justify-end">
                              <span className="font-bold text-[#2C1E1B]">
                                ₱{Number(product.price)?.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {6 - filteredProducts.slice(0, 6).length > 0 &&
                Array(6 - filteredProducts.slice(0, 6).length)
                  .fill(0)
                  .map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="bg-white min-h-[380px] sm:min-h-[460px] rounded-none border-r border-b border-[#E8DCD7]"
                    />
                  ))
              }
              </>
            )}
          </div>
        )}

        {/* "VIEW MORE" BUTTON (Rectangular, rounded-none) */}
        <div className="mt-16 text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onViewFullCatalog}
            className="inline-flex items-center gap-3 bg-[#ccc2c3] hover:bg-[#ccc2c3] text-white px-9 py-4 rounded-none text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-300 shadow-xl hover:shadow-2xl"
          >
            <span>View More Products</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

      </div>
    </section>
  );
}
