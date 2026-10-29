import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Sparkles,
  Check,
  Heart,
  ArrowRight,
  ShoppingBag,
  Truck,
  ShieldCheck,
  RotateCcw,
  Clock,
  Share2,
  Package,
  X,
  MessageSquare,
  ThumbsUp,
  Tag,
  ChevronRight,
  Maximize2,
  Camera,
  ZoomIn,
  ChevronDown
} from 'lucide-react';
import sizeChartImg from '../images/size_chart.webp';
import {
  addToWishlist,
  isInWishlist,
  removeFromWishlist,
  getWishlist,
  subscribeWishlist
} from '../lib/wishlistManager';
import { trackViewContent } from '../lib/metaPixel';
import { supabase } from '../lib/supabaseClient';

const isVideoUrl = (url) => url && (url.startsWith('data:video/') || url.match(/\.(mp4|mov|webm)($|\?)/i));

export default function ProductDetailPage({
  product: initialProduct = null,
  productId = null,
  allProducts = [],
  onBack,
  onBuyNow,
  onOpenWishlist,
  onSelectProduct,
  onNavigateOrders,
}) {
  const [product, setProduct] = useState(initialProduct);
  const [isLoadingProduct, setIsLoadingProduct] = useState(!initialProduct && !!productId);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [selectedSize, setSelectedSize] = useState('Standard');
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [mediaZoomOpen, setMediaZoomOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(() => getWishlist().length);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [activeStarFilter, setActiveStarFilter] = useState('ALL');
  const [reviewLightboxImg, setReviewLightboxImg] = useState(null); // 'ALL' | 5 | 4 | 3 | 2 | 1

  // 1. Resolve product by ID if not provided as object
  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      const targetId = productId || initialProduct?.id;
      if (!targetId) {
        setIsLoadingProduct(false);
        return;
      }

      // Check if product is already in allProducts list
      const matched = allProducts.find((p) => String(p.id) === String(targetId));
      if (matched) {
        if (isMounted) {
          setProduct(matched);
          setIsLoadingProduct(false);
        }
        return;
      }

      // If not in cache/memory, fetch from Supabase
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();

        if (!error && data && isMounted) {
          setProduct(data);
        }
      } catch (e) {
        console.warn('Error loading product details:', e.message);
      } finally {
        if (isMounted) setIsLoadingProduct(false);
      }
    }

    if (!initialProduct || (productId && initialProduct.id !== productId)) {
      loadProduct();
    } else {
      setProduct(initialProduct);
      setIsLoadingProduct(false);
    }

    return () => {
      isMounted = false;
    };
  }, [productId, initialProduct, allProducts]);

  // Set default size once product is ready
  useEffect(() => {
    if (product) {
      trackViewContent(product);
      setIsWishlisted(isInWishlist(product.id));

      const rawSizes = typeof product.sizes === 'string'
        ? product.sizes.split(',').map((s) => s.trim()).filter(Boolean)
        : Array.isArray(product.sizes)
        ? product.sizes
        : ['Standard'];
      setSelectedSize(rawSizes[0] || 'Standard');
    }
  }, [product?.id]);

  // Sync wishlist reactive count and status
  useEffect(() => {
    const unsub = subscribeWishlist((items) => {
      setWishlistCount(items.length);
      if (product?.id) {
        setIsWishlisted(isInWishlist(product.id));
      }
    });
    return () => unsub();
  }, [product?.id]);

  // 2. Fetch Customer Reviews for this specific product
  useEffect(() => {
    let isMounted = true;
    const currentProdId = product?.id || productId;
    if (!currentProdId) return;

    async function fetchReviews() {
      setIsLoadingReviews(true);
      try {
        // Query by product_id or product_name
        const { data, error } = await supabase
          .from('product_reviews')
          .select('*')
          .or(`product_id.eq.${currentProdId},product_name.eq.${product?.name || ''}`)
          .order('created_at', { ascending: false });

        if (!error && data && isMounted) {
          setReviews(data);
        }
      } catch (err) {
        console.debug('Product reviews fetch note:', err.message);
      } finally {
        if (isMounted) setIsLoadingReviews(false);
      }
    }

    fetchReviews();

    // Realtime subscription for instant new reviews
    const channel = supabase
      .channel(`prod_reviews_${currentProdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_reviews',
          filter: `product_id=eq.${currentProdId}`,
        },
        () => {
          fetchReviews();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [product?.id, product?.name, productId]);

  // Sizing list
  const sizesList = useMemo(() => {
    if (!product?.sizes) return ['Standard'];
    if (Array.isArray(product.sizes)) return product.sizes;
    if (typeof product.sizes === 'string') {
      return product.sizes.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return ['Standard'];
  }, [product?.sizes]);

  // Review statistics calculation
  const reviewStats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        avgRating: Number(product?.rating) || 5.0,
        totalReviews: product?.reviewsCount || 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        fitSummary: 'True to Size',
      };
    }

    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (sum / total).toFixed(1);

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const fits = {};

    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      counts[star] = (counts[star] || 0) + 1;

      if (r.fit_feedback) {
        fits[r.fit_feedback] = (fits[r.fit_feedback] || 0) + 1;
      }
    });

    let topFit = 'True to Size';
    let topFitCount = 0;
    Object.entries(fits).forEach(([k, v]) => {
      if (v > topFitCount) {
        topFitCount = v;
        topFit = k;
      }
    });

    return {
      avgRating: avg,
      totalReviews: total,
      distribution: counts,
      fitSummary: topFit,
    };
  }, [reviews, product?.rating, product?.reviewsCount]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    if (activeStarFilter === 'ALL') return reviews;
    return reviews.filter((r) => Number(r.rating) === Number(activeStarFilter));
  }, [reviews, activeStarFilter]);

  // Stock calculations
  const isSoldOut =
    (product?.statusBadge || '').toUpperCase() === 'SOLD OUT' ||
    (product?.qty !== undefined && product?.qty !== null && Number(product?.qty) <= 0);
  const remainingStock =
    product?.qty !== undefined && product?.qty !== null ? Number(product.qty) : null;

  // Description length calculation for "Read more.." toggle
  const strippedDesc = useMemo(() => {
    return (product?.description || '').replace(/<[^>]*>/g, '').trim();
  }, [product?.description]);
  const isLongDescription = strippedDesc.length > 150;

  // Actions
  const handleToggleWishlist = () => {
    if (!product) return;
    addToWishlist(product, selectedSize, 'Standard');
    setIsWishlisted(true);
    if (onOpenWishlist) {
      onOpenWishlist();
    }
  };

  const handleQuickHeartToggle = async () => {
    if (!product) return;
    if (isWishlisted) {
      const currentList = getWishlist();
      const itemToRemove = currentList.find(
        (item) => String(item.id) === String(product.id)
      );
      if (itemToRemove) {
        await removeFromWishlist(itemToRemove.wishlistId || itemToRemove.id);
      }
      setIsWishlisted(false);
    } else {
      await addToWishlist(product, selectedSize, 'Standard');
      setIsWishlisted(true);
    }
  };

  const handleBuyNow = () => {
    if (isSoldOut || !product) return;
    if (onBuyNow) {
      onBuyNow({
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price || 0,
        size: selectedSize,
        color: 'Standard',
        quantity: quantity,
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: product?.name || 'Aura Women Clothing',
          text: `Check out the ${product?.name} at Aura Official Atelier`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const scrollToReviews = () => {
    const el = document.getElementById('customer-reviews');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Related products (exclude current)
  const relatedProducts = useMemo(() => {
    if (!allProducts || allProducts.length === 0 || !product) return [];
    return allProducts
      .filter((p) => p.id !== product.id)
      .slice(0, 4);
  }, [allProducts, product?.id]);

  if (isLoadingProduct) {
    return (
      <div className="min-h-screen bg-[#FAF5F2] flex flex-col items-center justify-center p-6 text-[#2C1E1B]">
        <div className="w-10 h-10 border-2 border-[#2C1E1B] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-brand text-xs uppercase tracking-[0.25em] font-semibold text-[#705B56]">
          Loading Atelier Garment...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF5F2] flex flex-col items-center justify-center p-6 text-[#2C1E1B]">
        <Package className="w-12 h-12 text-[#A38E88] stroke-[1.2] mb-3" />
        <h2 className="font-brand text-xl font-bold uppercase tracking-wider mb-2">
          Garment Not Found
        </h2>
        <p className="text-xs text-[#705B56] max-w-sm text-center mb-6">
          The requested piece may have been retired from our current atelier collection.
        </p>
        <button
          onClick={onBack}
          className="bg-[#2C1E1B] hover:bg-[#B86B60] text-white px-8 py-3.5 text-xs uppercase tracking-[0.2em] font-bold rounded-none shadow-sm transition-all cursor-pointer"
        >
          Return to Collection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF5F2] text-[#2C1E1B] pt-24 sm:pt-28 pb-36 sm:pb-28 md:pb-20 selection:bg-[#D99B91] selection:text-white">

      {/* Share Toast Notification */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-[#2C1E1B] text-white px-5 py-3 rounded-none text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/20"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Garment link copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Breadcrumb & Back Navigation Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E8DCD7] text-xs">
          <div className="flex items-center gap-2 text-[#705B56]">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#2C1E1B] hover:text-[#B86B60] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Collection</span>
            </button>
            <span className="text-[#D1C2BD]">/</span>
            <span className="hidden sm:inline uppercase tracking-wider text-[#705B56]">
              {product.category || 'Atelier'}
            </span>
            <span className="hidden sm:inline text-[#D1C2BD]">/</span>
            <span className="font-semibold text-[#2C1E1B] truncate max-w-xs sm:max-w-md">
              {product.name}
            </span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8DCD7] hover:border-[#B86B60] text-[#705B56] hover:text-[#2C1E1B] transition-colors rounded-none cursor-pointer"
            title="Share this garment"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider text-[11px] font-bold">Share</span>
          </button>
        </div>

        {/* Garment Hero: 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 py-8 lg:py-12">

          {/* Left Column: Visual Media Display */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative bg-white border border-[#E8DCD7] overflow-hidden shadow-sm group">
              {isVideoUrl(product.image) ? (
                <video
                  src={product.image}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto max-h-[650px] object-cover object-center mx-auto"
                />
              ) : (
                <img
                  src={product.image}
                  alt={product.name}
                  loading="eager"
                  decoding="async"
                  className="w-full h-auto max-h-[650px] object-cover object-center mx-auto transition-transform duration-700 group-hover:scale-105"
                />
              )}

              {/* Watermark / Brand Stamp */}
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <span className="text-[10px] uppercase font-brand tracking-[0.25em] font-bold bg-white/90 text-[#2C1E1B] px-2.5 py-1 border border-[#E8DCD7] backdrop-blur-sm shadow-sm">
                  Aura Official Atelier
                </span>
              </div>

              {/* Expand View Icon */}
              <button
                onClick={() => setMediaZoomOpen(true)}
                className="absolute bottom-4 right-4 z-10 p-2.5 bg-white/90 hover:bg-white text-[#2C1E1B] border border-[#E8DCD7] transition-all shadow-sm rounded-none cursor-pointer opacity-90 hover:opacity-100"
                title="View full resolution"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Atelier Confidence Badges */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-[#705B56] pt-2">
              <div className="p-3 bg-white border border-[#E8DCD7] space-y-1">
                <Truck className="w-4 h-4 text-[#B86B60] mx-auto stroke-[1.5]" />
                <p className="font-bold uppercase tracking-wider text-[10px] text-[#2C1E1B]">J&T Express</p>
                <p className="text-[10px] text-[#705B56]">2–4 Days Nationwide</p>
              </div>
              <div className="p-3 bg-white border border-[#E8DCD7] space-y-1">
                <ShieldCheck className="w-4 h-4 text-[#B86B60] mx-auto stroke-[1.5]" />
                <p className="font-bold uppercase tracking-wider text-[10px] text-[#2C1E1B]">Guaranteed</p>
                <p className="text-[10px] text-[#705B56]">100% Authentic Tailoring</p>
              </div>
              <div className="p-3 bg-white border border-[#E8DCD7] space-y-1">
                <Package className="w-4 h-4 text-[#B86B60] mx-auto stroke-[1.5]" />
                <p className="font-bold uppercase tracking-wider text-[10px] text-[#2C1E1B]">Secure Packaging</p>
                <p className="text-[10px] text-[#705B56]">Protective Atelier Box</p>
              </div>
            </div>
          </div>

          {/* Right Column: Garment Information, Sizing & Actions */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">

            <div className="space-y-4">
              {/* Category / Subtype */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-brand uppercase tracking-[0.22em] text-[#B86B60] font-bold">
                  {product.category || 'Atelier Collection'}
                </span>
                {product.isBestSeller && (
                  <span className="text-[10px] font-brand uppercase tracking-wider font-bold bg-[#FAF0EC] text-[#B86B60] border border-[#E8DCD7] px-2 py-0.5">
                    Best Seller
                  </span>
                )}
              </div>

              {/* Product Title */}
              <h1 className="font-brand text-3xl sm:text-4xl text-[#2C1E1B] font-normal leading-tight">
                {product.name}
              </h1>

              {/* Dynamic Rating, Reviews Anchor, and Solds Count */}
              <div className="flex flex-wrap items-center gap-3 text-xs pb-1 border-b border-[#E8DCD7]">
                <button
                  type="button"
                  onClick={scrollToReviews}
                  className="flex items-center gap-1.5 text-amber-500 hover:text-amber-600 transition-colors cursor-pointer group"
                  title="Jump to verified customer reviews"
                >
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(Number(reviewStats.avgRating))
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-[#2C1E1B] text-xs">
                    {reviewStats.avgRating}
                  </span>
                  <span className="text-[#B86B60] underline group-hover:text-[#2C1E1B] transition-colors text-[11px]">
                    ({reviewStats.totalReviews} {reviewStats.totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </button>

                <span className="text-[#D1C2BD]">|</span>

                <span className="text-[#705B56] font-medium text-xs">
                  <strong className="text-[#2C1E1B] font-bold">{product.solds || 0}</strong> Sold
                </span>

                <span className="text-[#D1C2BD]">|</span>

                <span className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Verified Atelier Item
                </span>
              </div>

              {/* Price Row */}
              <div className="flex items-baseline gap-3 pt-1">
                <span className="font-hero text-3xl sm:text-4xl text-[#2C1E1B] font-bold">
                  ₱{Number(product.price)?.toLocaleString()}
                </span>
                {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                  <span className="font-hero text-lg text-[#A38E88] line-through">
                    ₱{Number(product.originalPrice)?.toLocaleString()}
                  </span>
                )}
                {product.discountBadge && (
                  <span className="text-[10px] font-brand uppercase tracking-wider font-bold bg-[#B86B60] text-white px-2.5 py-0.5">
                    {product.discountBadge}
                  </span>
                )}
              </div>

              {/* Description Section with Desktop/Responsive Read More */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase font-brand tracking-[0.25em] font-bold text-[#2C1E1B]">
                    {product.descriptionLabel || 'Garment Silhouette & Notes'}
                  </h4>
                </div>

                <div className="relative">
                  <div
                    className={`text-xs sm:text-sm text-[#705B56] leading-relaxed whitespace-pre-wrap product-description-html transition-all duration-300 ${
                      !isDescriptionExpanded && isLongDescription
                        ? 'max-h-20 overflow-hidden'
                        : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: product.description || '' }}
                  />

                  {/* Gradient fade overlay when collapsed */}
                  {!isDescriptionExpanded && isLongDescription && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#FAF5F2] via-[#FAF5F2]/80 to-transparent pointer-events-none" />
                  )}
                </div>

                {isLongDescription && (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-brand uppercase tracking-wider font-bold text-[#B86B60] hover:text-[#2C1E1B] transition-colors cursor-pointer pt-0.5"
                  >
                    <span>{isDescriptionExpanded ? 'Read less' : 'Read more..'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isDescriptionExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Atelier Details / Feature Highlights */}
              <div className="p-4 bg-white border border-[#E8DCD7] space-y-2 text-xs">
                <span className="text-[10px] uppercase font-brand tracking-wider font-bold text-[#705B56] block">
                  Tailoring Specifications
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#705B56]">
                  {Array.isArray(product.details) && product.details.length > 0 ? (
                    product.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="text-[#B86B60]">✦</span>
                        <span>{detail}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[#B86B60]">✦</span>
                        <span>Handcrafted Filipino Atelier cut</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[#B86B60]">✦</span>
                        <span>Delicate cold hand wash or dry clean</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Size Selector */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2C1E1B]">
                    Select Size: <strong className="text-[#B86B60]">{selectedSize}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSizeChart(true)}
                    className="text-[11px] text-[#B86B60] hover:underline uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    View Size Chart
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sizesList.map((sz, idx) => {
                    const isSelected = selectedSize === sz;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`px-4 py-2.5 border text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-[#2C1E1B] text-white border-[#2C1E1B] shadow-sm'
                            : 'bg-white text-[#705B56] border-[#E8DCD7] hover:border-[#B86B60] hover:text-[#2C1E1B]'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Selector & Live Stock Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2C1E1B]">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-[#E8DCD7] bg-white">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 text-sm text-[#705B56] hover:text-[#2C1E1B] disabled:opacity-30 cursor-pointer"
                    >
                      −
                    </button>
                    <span className="px-4 py-1.5 text-xs font-bold font-mono text-[#2C1E1B]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={remainingStock !== null && quantity >= remainingStock}
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-3 py-1.5 text-sm text-[#705B56] hover:text-[#2C1E1B] disabled:opacity-30 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Stock Level Indicator */}
                <div>
                  {isSoldOut ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Sold Out
                    </div>
                  ) : remainingStock !== null && remainingStock <= 10 ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF0EC] border border-[#B86B60]/40 text-[#B86B60] text-[11px] font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-[#B86B60] animate-pulse" />
                      Only {remainingStock} left in stock
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-[#705B56] text-[11px] tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      In Stock {remainingStock !== null ? `(${remainingStock} units)` : ''}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Action Buttons: Buy Now & Add to Wishlist */}
            <div className="pt-6 border-t border-[#E8DCD7] space-y-3">
              <motion.button
                whileHover={!isSoldOut ? { scale: 1.01 } : {}}
                whileTap={!isSoldOut ? { scale: 0.99 } : {}}
                type="button"
                disabled={isSoldOut}
                onClick={handleBuyNow}
                className={`w-full py-4 px-6 font-brand rounded-none text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
                  isSoldOut
                    ? 'bg-[#E8DCD7] text-[#9E8E89] cursor-not-allowed shadow-none'
                    : 'bg-[#2C1E1B] hover:bg-[#B86B60] text-white cursor-pointer'
                }`}
              >
                <span>{isSoldOut ? 'Sold Out' : 'Buy Now'}</span>
                {!isSoldOut && <ArrowRight className="w-4 h-4" />}
              </motion.button>

              <button
                type="button"
                onClick={handleToggleWishlist}
                className={`w-full py-3.5 px-6 rounded-none text-xs font-semibold uppercase tracking-[0.18em] transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                  isWishlisted
                    ? 'bg-[#FAF0EC] border-[#B86B60] text-[#B86B60]'
                    : isSoldOut
                    ? 'bg-[#FAF5F2] border-[#E8DCD7] text-[#705B56] hover:border-[#2C1E1B] hover:text-[#2C1E1B]'
                    : 'bg-white border-[#2C1E1B] text-[#2C1E1B] hover:border-[#B86B60] hover:text-[#B86B60]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#B86B60] text-[#B86B60]' : ''}`} />
                <span>
                  {isWishlisted
                    ? 'In Your Bag'
                    : isSoldOut
                    ? 'Save to Bag (Sold Out)'
                    : 'Add to Bag'}
                </span>
              </button>
            </div>

          </div>

        </div>

        {/* Dedicated Customer Reviews & Ratings Section */}
        <div id="customer-reviews" className="mt-16 pt-12 border-t border-[#E8DCD7] space-y-8 scroll-mt-28">

          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E8DCD7]">
            <div>
              <span className="text-[11px] font-brand uppercase tracking-[0.22em] text-[#B86B60] font-bold block mb-1">
                Verified Customer Feedback
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl text-[#2C1E1B]">
                Customer Reviews & Ratings
              </h2>
            </div>

            {/* Prompt for customers who placed orders */}
            {onNavigateOrders && (
              <button
                onClick={onNavigateOrders}
                className="text-xs uppercase font-brand font-bold tracking-wider text-[#B86B60] hover:text-[#2C1E1B] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Rate your purchased order in Order History</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Rating Summary Card & Distribution Overview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm">

            {/* Score Column */}
            <div className="md:col-span-4 flex flex-col justify-center items-center md:items-start text-center md:text-left md:border-r md:border-[#E8DCD7] md:pr-8 space-y-2">
              <span className="text-[11px] font-brand uppercase tracking-wider text-[#705B56] font-bold">
                Overall Garment Rating
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-hero text-5xl font-bold text-[#2C1E1B]">
                  {reviewStats.avgRating}
                </span>
                <span className="text-[#A38E88] text-sm">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(Number(reviewStats.avgRating))
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#705B56] pt-1">
                Based on <strong className="text-[#2C1E1B] font-semibold">{reviewStats.totalReviews}</strong> verified customer reviews
              </p>
              <div className="pt-2">
                <span className="inline-block text-[11px] font-brand uppercase tracking-wider font-semibold px-2.5 py-1 bg-[#FAF5F2] border border-[#E8DCD7] text-[#705B56]">
                  Fit Profile: <strong className="text-[#B86B60]">{reviewStats.fitSummary}</strong>
                </span>
              </div>
            </div>

            {/* Star Distribution Column */}
            <div className="md:col-span-8 flex flex-col justify-center space-y-2.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviewStats.distribution[star] || 0;
                const percentage =
                  reviewStats.totalReviews > 0
                    ? Math.round((count / reviewStats.totalReviews) * 100)
                    : 0;

                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-semibold text-[#2C1E1B] flex items-center gap-1">
                      {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-grow h-2.5 bg-[#FAF5F2] border border-[#E8DCD7] overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-[#705B56] text-[11px] font-mono">
                      {count} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Filter Pills Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-brand uppercase tracking-wider font-bold text-[#705B56] mr-2">
              Filter:
            </span>
            {[
              { id: 'ALL', label: `All Reviews (${reviews.length})` },
              { id: 5, label: `5 Stars (${reviewStats.distribution[5] || 0})` },
              { id: 4, label: `4 Stars (${reviewStats.distribution[4] || 0})` },
              { id: 3, label: `3 Stars (${reviewStats.distribution[3] || 0})` },
              { id: 2, label: `2 Stars (${reviewStats.distribution[2] || 0})` },
              { id: 1, label: `1 Star (${reviewStats.distribution[1] || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStarFilter(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-brand uppercase tracking-wider font-semibold border transition-all cursor-pointer ${
                  activeStarFilter === tab.id
                    ? 'bg-[#2C1E1B] text-white border-[#2C1E1B] shadow-sm'
                    : 'bg-white text-[#705B56] border-[#E8DCD7] hover:border-[#B86B60] hover:text-[#2C1E1B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {isLoadingReviews ? (
              <div className="bg-white border border-[#E8DCD7] p-12 text-center text-xs text-[#705B56]">
                <div className="w-6 h-6 border-2 border-[#2C1E1B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading verified customer reviews...
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="bg-white border border-[#E8DCD7] p-12 text-center shadow-sm space-y-3">
                <MessageSquare className="w-10 h-10 text-[#A38E88] stroke-[1.2] mx-auto" />
                <h3 className="font-brand text-sm uppercase tracking-wider font-bold text-[#2C1E1B]">
                  {reviews.length === 0 ? 'No Reviews Yet' : 'No Reviews Matching Selected Filter'}
                </h3>
                <p className="text-xs text-[#705B56] max-w-md mx-auto">
                  {reviews.length === 0
                    ? 'Be the first verified customer to rate this atelier garment! Place an order and submit your review directly from your Order History after delivery.'
                    : 'Try selecting "All Reviews" to view other customer feedback.'}
                </p>
                {reviews.length === 0 && onNavigateOrders && (
                  <button
                    onClick={onNavigateOrders}
                    className="inline-block bg-[#2C1E1B] hover:bg-[#B86B60] text-white px-6 py-2.5 text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer mt-2"
                  >
                    View My Orders
                  </button>
                )}
              </div>
            ) : (
              filteredReviews.map((rev) => {
                const dateStr = rev.created_at
                  ? new Date(rev.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent Review';

                return (
                  <motion.div
                    key={rev.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#E8DCD7] p-6 shadow-sm space-y-3"
                  >
                    {/* Header Row: User Name, Verified Buyer Badge, Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#FAF5F2]">
                      <div className="flex items-center gap-2.5">
                        <span className="font-brand font-bold text-sm text-[#2C1E1B]">
                          {rev.user_name || 'Verified Buyer'}
                        </span>

                        {rev.is_verified_purchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-brand uppercase tracking-wider font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            Verified Purchase
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-[#705B56]">{dateStr}</span>
                    </div>

                    {/* Star Rating and Fit Pill */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= (rev.rating || 5)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>

                      {rev.fit_feedback && (
                        <span className="text-[11px] font-brand uppercase tracking-wider font-semibold text-[#705B56] bg-[#FAF5F2] border border-[#E8DCD7] px-2 py-0.5">
                          Fit: {rev.fit_feedback}
                        </span>
                      )}
                    </div>

                    {/* Review Title if present */}
                    {rev.title && (
                      <h4 className="font-semibold text-sm text-[#2C1E1B]">
                        {rev.title}
                      </h4>
                    )}

                    {/* Comment Content */}
                    <p className="text-xs sm:text-sm text-[#705B56] leading-relaxed">
                      {rev.comment}
                    </p>

                    {/* Quality Tags */}
                    {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {rev.tags.map((t, tidx) => (
                          <span
                            key={tidx}
                            className="inline-flex items-center gap-1 text-[10px] font-brand uppercase tracking-wider text-[#B86B60] bg-[#FAF0EC] border border-[#E8DCD7] px-2 py-0.5"
                          >
                            <Tag className="w-2.5 h-2.5 text-[#B86B60]" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Customer Photo Proofs */}
                    {Array.isArray(rev.images) && rev.images.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-brand uppercase tracking-wider text-[#705B56] block mb-1.5 font-bold">
                          Customer Photos ({rev.images.length}):
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {rev.images.map((imgUrl, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => setReviewLightboxImg(imgUrl)}
                              className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white border border-[#E8DCD7] hover:border-[#2C1E1B] transition-all cursor-pointer group shadow-2xs overflow-hidden"
                              title="View photo proof"
                            >
                              <img
                                src={imgUrl}
                                alt="Customer Proof"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

        </div>

        {/* Complete the Atelier Look / Related Garments */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 pt-12 border-t border-[#E8DCD7] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-brand uppercase tracking-[0.22em] text-[#B86B60] font-bold block mb-1">
                  Atelier Curation
                </span>
                <h3 className="font-editorial text-2xl sm:text-3xl text-[#2C1E1B]">
                  Complete The Atelier Look
                </h3>
              </div>
              <button
                onClick={onBack}
                className="text-xs uppercase font-brand font-bold tracking-wider text-[#B86B60] hover:text-[#2C1E1B] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Collection</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onSelectProduct) {
                      onSelectProduct(item);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="bg-white border border-[#E8DCD7] p-3 shadow-sm hover:border-[#B86B60] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="w-full aspect-[3/4] bg-[#FAF5F2] overflow-hidden mb-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="font-brand font-semibold text-xs text-[#2C1E1B] line-clamp-1 group-hover:text-[#B86B60] transition-colors">
                      {item.name}
                    </p>
                    <p className="font-hero text-xs font-bold text-[#2C1E1B]">
                      ₱{Number(item.price)?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              className="relative z-10 bg-white p-4 sm:p-6 max-w-md w-full max-h-[85vh] overflow-y-auto flex flex-col items-center shadow-2xl border border-[#E8DCD7]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-[#E8DCD7]">
                <span className="text-[11px] font-brand uppercase tracking-wider font-bold text-[#B86B60]">
                  Atelier Sizing Guide
                </span>
                <button
                  onClick={() => setShowSizeChart(false)}
                  className="p-1 text-[#705B56] hover:text-[#2C1E1B] cursor-pointer"
                  aria-label="Close size chart"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={product.sizeChart || sizeChartImg}
                alt={`${product.name} Size Chart`}
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-contain max-h-[70vh]"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* High-Resolution Media Zoom Modal */}
      <AnimatePresence>
        {mediaZoomOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setMediaZoomOpen(false)}
            />
            <div className="relative z-10 max-w-4xl w-full max-h-[92vh] flex items-center justify-center">
              <button
                onClick={() => setMediaZoomOpen(false)}
                className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              {isVideoUrl(product.image) ? (
                <video
                  src={product.image}
                  autoPlay
                  loop
                  muted
                  controls
                  playsInline
                  className="max-h-[85vh] max-w-full object-contain"
                />
              ) : (
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-h-[85vh] max-w-full object-contain"
                />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Customer Photo Proof Lightbox Modal */}
      <AnimatePresence>
        {reviewLightboxImg && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
            onClick={() => setReviewLightboxImg(null)}
          >
            <div
              className="relative max-w-2xl max-h-[90vh] bg-white p-2 border border-[#E8DCD7] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setReviewLightboxImg(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#2C1E1B] text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={reviewLightboxImg}
                alt="Customer Garment Proof"
                className="max-w-full max-h-[80vh] object-contain block mx-auto"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Fixed Bottom Action Bar for Mobile View (SHEIN style) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-[#E8DCD7] shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-3.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto space-y-2">
          {/* Quick Size Selection Strip (if garment has multiple sizes) */}
          {sizesList && sizesList.length > 1 && (
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DCD7]/70">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                <span className="text-[10px] uppercase font-brand font-bold tracking-wider text-[#705B56] mr-1 flex-shrink-0">
                  Size:
                </span>
                {sizesList.map((sz, idx) => {
                  const isSelected = selectedSize === sz;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-all cursor-pointer flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#2C1E1B] text-white border-[#2C1E1B] shadow-sm'
                          : 'bg-white text-[#705B56] border-[#E8DCD7] active:border-[#2C1E1B]'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowSizeChart(true)}
                className="text-[10px] text-[#B86B60] hover:underline uppercase tracking-wider font-semibold flex-shrink-0 ml-2 cursor-pointer"
              >
                Size Guide
              </button>
            </div>
          )}

          {/* Action Row: Shopping Bag, Wishlist Heart, Add to Bag, Buy Now */}
          <div className="flex items-center gap-2">
            {/* Bag Icon Button with Counter Badge */}
            <button
              type="button"
              onClick={onOpenWishlist}
              className="relative p-2.5 border border-[#E8DCD7] bg-[#FAF7F4] text-[#2C1E1B] hover:border-[#2C1E1B] transition-colors flex-shrink-0 cursor-pointer"
              aria-label="View Shopping Bag"
              title="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[#B86B60] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </button>

            {/* Wishlist Heart Button */}
            <button
              type="button"
              onClick={handleQuickHeartToggle}
              className={`p-2.5 border transition-colors flex-shrink-0 cursor-pointer ${
                isWishlisted
                  ? 'border-[#B86B60] bg-[#FAF0EC] text-[#B86B60]'
                  : 'border-[#E8DCD7] bg-[#FAF7F4] text-[#705B56] hover:text-[#2C1E1B]'
              }`}
              aria-label={isWishlisted ? 'Remove from Bag' : 'Save to Bag'}
              title={isWishlisted ? 'In Your Bag' : 'Save to Bag'}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-[#B86B60] text-[#B86B60]' : ''}`} />
            </button>

            {/* Add to Bag Button */}
            <button
              type="button"
              disabled={isSoldOut}
              onClick={handleToggleWishlist}
              className={`flex-1 py-3 px-2 border text-[11px] font-brand font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center cursor-pointer ${
                isSoldOut
                  ? 'bg-[#E8DCD7] border-[#E8DCD7] text-[#9E8E89] cursor-not-allowed'
                  : isWishlisted
                  ? 'bg-[#FAF0EC] border-[#B86B60] text-[#B86B60]'
                  : 'bg-white border-[#2C1E1B] text-[#2C1E1B] hover:bg-[#FAF7F4] active:scale-[0.98]'
              }`}
            >
              {isSoldOut ? 'Sold Out' : isWishlisted ? 'In Bag' : 'Add to Bag'}
            </button>

            {/* Buy Now Button */}
            <button
              type="button"
              disabled={isSoldOut}
              onClick={handleBuyNow}
              className={`flex-1 py-3 px-2 text-[11px] font-brand font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center shadow-sm cursor-pointer ${
                isSoldOut
                  ? 'bg-[#E8DCD7] text-[#9E8E89] cursor-not-allowed shadow-none'
                  : 'bg-[#2C1E1B] hover:bg-[#B86B60] text-white active:scale-[0.98]'
              }`}
            >
              {isSoldOut ? 'Sold Out' : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
