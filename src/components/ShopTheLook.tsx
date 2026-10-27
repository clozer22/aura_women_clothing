import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X, Plus } from 'lucide-react';

export interface CatalogProduct {
  id: string;
  name?: string;
  title?: string;
  price: number | string;
  image: string;
  sizes?: string[] | string;
  slug?: string;
  subtitle?: string;
  category?: string;
  shopeeLink?: string;
}

export interface LookbookHotspot {
  id: string;
  /** Horizontal position from left (0 to 100%) */
  x: number;
  /** Vertical position from top (0 to 100%) */
  y: number;
  /** ID matching the item from your /full-catalog data */
  productId: string;
  /** Optional fallback label */
  label?: string;
}

export interface ShopTheLookProps {
  /** Banner or lookbook image URL (e.g. your ABOUT AURA image) */
  bannerImage: string;
  /** Optional section heading */
  heading?: string;
  /** Array of hotspot coordinates linked to productIds */
  hotspots?: LookbookHotspot[];
  /** Pass the products array you already fetch in /full-catalog */
  catalogProducts?: CatalogProduct[];
  /** Optional "Shop All" link at bottom right */
  shopAllUrl?: string;
  /** Callback triggered when user clicks a product in the popover */
  onSelectProduct?: (product: CatalogProduct) => void;
  /** Callback triggered when user clicks "SHOP ALL" button */
  onNavigateFullCatalog?: () => void;
  /** Turn on to click anywhere on the image and get exact { x, y } % coordinates! */
  devMode?: boolean;
}

/**
 * Default Curated Hotspots locked onto the 4 AURA Atelier Models
 * from the official ABOUT AURA banner image (1920x1080)
 */
export const DEFAULT_ABOUT_AURA_HOTSPOTS: LookbookHotspot[] = [
  // Model 1 (Far Left) - Pastel Pink Bell Sleeve Top & Tiered Cream Skirt
  {
    id: 'spot-m1-top',
    x: 13.8,
    y: 39.5,
    productId: 'aura-custom-1788969600915', // AURA Camilla Top in Pastel Pink
    label: 'Model 1 Top',
  },
  {
    id: 'spot-m1-skirt',
    x: 13.5,
    y: 50.5,
    productId: 'aura-custom-1788973116919', // AURA Petal Skirt in Cream White
    label: 'Model 1 Skirt',
  },

  // Model 2 (Center-Left) - Teal Green Draped Top & Dark Gray Skirt
  {
    id: 'spot-m2-top',
    x: 37.0,
    y: 36.5,
    productId: 'aura-custom-1787407522452', // AURA Olivia Top in Teal Green
    label: 'Model 2 Top',
  },
  {
    id: 'spot-m2-skirt',
    x: 37.0,
    y: 51.0,
    productId: 'aura-custom-1788973753112', // AURA Petal Skirt in Dark Gray
    label: 'Model 2 Skirt',
  },

  // Model 3 (Center-Right with Sunglasses) - Ruched Pastel Pink Set
  {
    id: 'spot-m3-top',
    x: 61.5,
    y: 39.0,
    productId: 'aura-custom-1788971174359', // AURA Amelia Top in Pastel Pink
    label: 'Model 3 Top',
  },
  {
    id: 'spot-m3-skirt',
    x: 61.5,
    y: 50.5,
    productId: 'aura-custom-1788973016670', // AURA Petal Skirt in Pastel Pink
    label: 'Model 3 Skirt',
  },

  // Model 4 (Far Right) - Black Bell Sleeve Top
  {
    id: 'spot-m4-top',
    x: 86.5,
    y: 36.0,
    productId: 'aura-custom-1787405963084', // AURA Amelia Top in Black
    label: 'Model 4 Top',
  },
];

export const ShopTheLook: React.FC<ShopTheLookProps> = ({
  bannerImage,
  heading,
  hotspots = DEFAULT_ABOUT_AURA_HOTSPOTS,
  catalogProducts = [],
  shopAllUrl = '/full-catalog',
  onSelectProduct,
  onNavigateFullCatalog,
  devMode = false,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<string | null>(null);
  const [isDevActive, setIsDevActive] = useState<boolean>(devMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Allow URL parameter ?devHotspots=true or ?dev=true to easily toggle devMode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('devHotspots') === 'true' || params.get('dev') === 'true') {
        setIsDevActive(true);
      } else {
        setIsDevActive(devMode);
      }
    }
  }, [devMode]);

  // Center scroll position on mobile view on initial load (matching original AboutSection behavior)
  useEffect(() => {
    const centerScroll = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollRange = container.scrollWidth - container.clientWidth;
        if (scrollRange > 0) {
          container.scrollLeft = scrollRange / 2;
        }
      }
    };

    centerScroll();
    const t1 = setTimeout(centerScroll, 80);
    const t2 = setTimeout(centerScroll, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Developer helper: Click anywhere on the image to get exact X% and Y% coordinates
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDevActive) {
      setActiveId(null);
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const y = Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
    const snippet = `{ id: 'pin-${Date.now().toString().slice(-4)}', x: ${x}, y: ${y}, productId: 'YOUR_PRODUCT_ID' },`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(snippet);
    }
    setCopiedCoords(`x: ${x}%, y: ${y}% (Copied to Clipboard!)`);
    console.log('📍 [Aura Hotspot Coordinate]:', snippet);
    setTimeout(() => setCopiedCoords(null), 3500);
  };

  /**
   * Smart resolver to match a hotspot to a live catalog product
   */
  const findProduct = (productId: string): CatalogProduct | null => {
    if (!catalogProducts || catalogProducts.length === 0) return null;

    // 1. Exact ID match
    let found = catalogProducts.find((p) => String(p.id) === String(productId));
    if (found) return found;

    // 2. Slug or sku match
    found = catalogProducts.find((p) => p.slug === productId || (p as any).sku === productId);
    if (found) return found;

    // 3. Fuzzy name fallback based on curated IDs
    const idStr = String(productId);
    if (idStr.includes('1787407522452')) {
      return catalogProducts.find((p) => (p.name || p.title || '').toLowerCase().includes('teal')) || null;
    }
    if (idStr.includes('1788973753112')) {
      return catalogProducts.find((p) => {
        const n = (p.name || p.title || '').toLowerCase();
        return n.includes('petal') && (n.includes('gray') || n.includes('grey') || n.includes('dark'));
      }) || null;
    }
    if (idStr.includes('1788973116919')) {
      return catalogProducts.find((p) => {
        const n = (p.name || p.title || '').toLowerCase();
        return n.includes('petal') && (n.includes('cream') || n.includes('white'));
      }) || null;
    }
    if (idStr.includes('1788973016670')) {
      return catalogProducts.find((p) => {
        const n = (p.name || p.title || '').toLowerCase();
        return n.includes('petal') && n.includes('pink');
      }) || null;
    }
    if (idStr.includes('1787405963084')) {
      return catalogProducts.find((p) => {
        const n = (p.name || p.title || '').toLowerCase();
        return n.includes('amelia') && n.includes('black');
      }) || null;
    }
    if (idStr.includes('1788971174359') || idStr.includes('1788969600915')) {
      return catalogProducts.find((p) => {
        const n = (p.name || p.title || '').toLowerCase();
        return (n.includes('amelia') || n.includes('camilla') || n.includes('aurora')) && n.includes('pink');
      }) || null;
    }

    return null;
  };

  /**
   * Price formatter
   */
  const formatPrice = (priceVal: number | string | undefined): string => {
    if (typeof priceVal === 'number' && !isNaN(priceVal)) {
      return `₱${priceVal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (!priceVal) return '₱0.00';
    const cleaned = String(priceVal).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num)
      ? String(priceVal)
      : `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Sizes resolver
   */
  const resolveSizes = (sizesVal: string[] | string | undefined): string[] => {
    if (!sizesVal) return [];
    if (Array.isArray(sizesVal)) return sizesVal.map((s) => String(s).trim());
    if (typeof sizesVal === 'string') {
      return sizesVal
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const handleProductCardClick = (e: React.MouseEvent, product: CatalogProduct) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelectProduct) {
      onSelectProduct(product);
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', product.slug ? `/product/${product.slug}` : `/full-catalog?item=${product.id}`);
      if (onNavigateFullCatalog) onNavigateFullCatalog();
    }
  };

  const handleShopAllClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigateFullCatalog) {
      onNavigateFullCatalog();
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', shopAllUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-0 sm:px-4 py-4 sm:py-8 select-none">
      {/* Optional Editorial Heading */}
      {heading && (
        <div className="w-full flex items-center justify-center mb-6 sm:mb-8 px-4">
          <h2 className="font-brand font-light text-[2.2rem] sm:text-[4rem] tracking-[0.25em] leading-none text-[#705B56] block uppercase text-center select-none">
            {heading}
          </h2>
        </div>
      )}

      {/* Dev Mode Banner */}
      {isDevActive && (
        <div className="mx-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#FAF5F2] border border-[#E8DCD7] text-[#705B56] px-4 py-2.5 rounded-none text-xs font-mono shadow-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-[#B86B60]" />
            DEV MODE ACTIVE: Click anywhere on the models to copy exact {`{ x, y }`} % coordinates!
          </span>
          {copiedCoords && (
            <span className="font-semibold text-[#B86B60] bg-white px-2 py-0.5 border border-[#E8DCD7]">
              {copiedCoords}
            </span>
          )}
        </div>
      )}

      {/* Outer Horizontal Scroll Container for Mobile / Tablet */}
      <div className="relative w-full">
        {/* Subtle Horizontal Swipe Indicator on Mobile */}
        <div className="lg:hidden flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-brand tracking-[0.2em] uppercase text-[#705B56]/75 mb-3 px-4">
          <span>✦ Scroll horizontally to explore models ✦</span>
        </div>

        {/* Scrollable Viewport Wrapper: horizontally scrollable on mobile with momentum physics */}
        <div
          ref={scrollContainerRef}
          className="w-full overflow-x-auto overflow-y-hidden scrollbar-none touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Main Lookbook Canvas: Keeps full scale (h-[580px] - h-[800px]), aspect-[1920/1080], so the image & models never shrink on mobile */}
          <div
            ref={containerRef}
            onClick={handleImageClick}
            className={`relative h-[580px] sm:h-[680px] md:h-[750px] lg:h-auto lg:w-full aspect-[1920/1080] shrink-0 mx-auto bg-white shadow-xl border border-[#E8DCD7]/60 ${
              isDevActive ? 'cursor-crosshair' : ''
            }`}
          >
            {/* Lookbook / Models Image */}
            <img
              src={bannerImage}
              alt={heading || 'AURA Atelier Lookbook'}
              className="w-full h-full object-cover block pointer-events-none select-none"
              loading="eager"
              draggable={false}
            />

            {/* Render Hotspot Pins inside the exact canvas */}
            {hotspots.map((spot) => {
              const isOpen = activeId === spot.id;
              const product = findProduct(spot.productId);

              // If no matching product exists in the catalog, skip rendering this pin
              if (!product) return null;

              const title = product.title || product.name || 'Aura Garment';
              const sizesList = resolveSizes(product.sizes);
              const priceText = formatPrice(product.price);

              // Smart Edge & Viewport Positioning
              // If pin is on the right half (>55%), open card to the left so it never overflows off-screen
              const openLeft = spot.x > 55;
              // If pin is near the bottom (>70%), open card upward
              const openUp = spot.y > 70;

              return (
                <div
                  key={spot.id}
                  style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 ${isOpen ? 'z-40' : 'z-20'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Subtle Pulse Halo (when closed) */}
                  {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-white/70 animate-ping pointer-events-none" />
                  )}

                  {/* Circular + / × Hotspot Button */}
                  <button
                    type="button"
                    aria-label={`View ${title}`}
                    onClick={() => setActiveId(isOpen ? null : spot.id)}
                    className={`relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 text-[#2C1E1B] shadow-[0_4px_20px_rgba(0,0,0,0.22)] border border-[#E8DCD7] transition-all duration-300 hover:scale-110 focus:outline-none cursor-pointer ${
                      isOpen ? 'ring-2 ring-[#B86B60]/50 scale-105' : ''
                    }`}
                  >
                    <div
                      className={`transition-transform duration-300 ease-out ${
                        isOpen ? 'rotate-45' : 'rotate-0'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                    </div>
                  </button>

                  {/* Floating Product Popover Card: Always stays locked right beside the pin/model on both mobile & desktop */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className={`absolute z-40 w-[260px] sm:w-[290px] bg-[#FAF9F6] p-2.5 sm:p-3 shadow-[0_16px_40px_rgba(44,30,27,0.25)] border border-[#E8DCD7] rounded-xl transition-all duration-200 ${
                          openLeft ? 'right-11 sm:right-12' : 'left-11 sm:left-12'
                        } ${openUp ? 'bottom-0' : 'top-0'}`}
                      >
                        <div
                          onClick={(e) => handleProductCardClick(e, product)}
                          className="flex items-center gap-3 group cursor-pointer"
                        >
                          {/* Left Product Thumbnail */}
                          <div className="w-[68px] h-[86px] sm:w-[74px] sm:h-[92px] shrink-0 overflow-hidden rounded-lg bg-white border border-[#E8DCD7]/60">
                            <img
                              src={product.image}
                              alt={title}
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>

                          {/* Right Product Details */}
                          <div className="flex flex-col justify-center min-w-0 pr-1 flex-1">
                            {product.category && (
                              <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-[#B86B60] mb-0.5 block truncate">
                                {product.category}
                              </span>
                            )}

                            <h4 className="text-xs sm:text-[13px] font-brand font-medium uppercase tracking-wider text-[#2C1E1B] leading-snug line-clamp-2 group-hover:text-[#B86B60] transition-colors">
                              {title}
                            </h4>

                            <p className="text-xs sm:text-[13px] font-semibold text-[#705B56] mt-1">
                              {priceText}
                            </p>

                            {/* Available Sizes Pills */}
                            {sizesList.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                {sizesList.slice(0, 4).map((size, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] sm:text-[10px] font-medium text-[#705B56] uppercase tracking-wider bg-white border border-[#E8DCD7] px-1.5 py-0.5 rounded-none"
                                  >
                                    {size}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Quick View Prompt */}
                            <div className="flex items-center gap-1 mt-2 text-[10px] font-medium text-[#B86B60] group-hover:translate-x-0.5 transition-transform">
                              <span>Quick View</span>
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Bottom-Right "SHOP ALL" Pill (Mili Style) */}
            {shopAllUrl && (
              <button
                type="button"
                onClick={handleShopAllClick}
                className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-20 bg-[#2C1E1B]/90 hover:bg-[#2C1E1B] text-white text-[10px] sm:text-[11px] font-brand tracking-[0.2em] uppercase px-4 py-2 sm:px-5 sm:py-2.5 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-sm border border-white/20 flex items-center gap-1.5"
              >
                <span>SHOP ALL</span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShopTheLook;