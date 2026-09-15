import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  Calendar,
  CreditCard,
  ChevronRight,
  X,
  ExternalLink,
  Truck,
  CheckCircle2,
  Clock,
  Star,
  Sparkles,
  ThumbsUp,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function OrderHistory({ onBackToShop }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Review states
  const [userReviewsMap, setUserReviewsMap] = useState({}); // key: `${orderRef}_${productId}`
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    order: null,
    item: null,
    existingReview: null
  });
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewFit, setReviewFit] = useState('True to size');
  const [reviewTags, setReviewTags] = useState([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState(null);

  const availableTags = [
    'True to size',
    'Luxurious fabric',
    'Comfortable fit',
    'Fast delivery',
    'Flattering cut',
    'Matches photo exactly',
    'Elegant tailoring'
  ];

  // Helper to generate unique key for item in order
  const getItemReviewKey = (orderRef, item) => {
    const prodId = item?.id || item?.productId || item?.name || 'unknown';
    return `${orderRef}_${prodId}`;
  };

  // Load reviews for delivered orders
  const loadUserReviews = async (orderList) => {
    const deliveredRefs = orderList
      .filter((o) => (o.status || '').toUpperCase() === 'DELIVERED')
      .map((o) => o.order_reference)
      .filter(Boolean);

    if (deliveredRefs.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .in('order_reference', deliveredRefs);

      if (!error && data) {
        const map = {};
        data.forEach((rev) => {
          const key = `${rev.order_reference}_${rev.product_id}`;
          map[key] = rev;
        });
        setUserReviewsMap(map);
      }
    } catch (e) {
      console.debug('Reviews load note:', e?.message);
    }
  };

  // Load orders strictly for the authenticated user and clean up legacy storage
  useEffect(() => {
    try {
      localStorage.removeItem('aura_guest_orders');
    } catch (e) {}

    async function loadOrders() {
      if (!user) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setOrders(data);
          loadUserReviews(data);

          // Auto-reconcile any pending orders directly with Xendit
          data.forEach(async (ord) => {
            if (ord.order_reference && ord.payment_status !== 'PAID') {
              try {
                const res = await fetch(`/api/verify-payment?ref=${encodeURIComponent(ord.order_reference)}`);
                if (res.ok) {
                  const check = await res.json();
                  if (check.paymentStatus === 'PAID') {
                    setOrders((prev) =>
                      prev.map((item) =>
                        item.order_reference === ord.order_reference
                          ? {
                              ...item,
                              payment_status: 'PAID',
                              status: check.fulfillmentStatus || item.status || 'PROCESSING',
                            }
                          : item
                      )
                    );
                  }
                }
              } catch (e) {}
            }
          });
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error('Failed to fetch user orders:', err);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, [user]);

  // Open review modal for a specific delivered item
  const openReviewModal = (order, item) => {
    const key = getItemReviewKey(order.order_reference, item);
    const existing = userReviewsMap[key] || null;

    setReviewModal({
      isOpen: true,
      order,
      item,
      existingReview: existing
    });

    if (existing) {
      setReviewRating(existing.rating || 5);
      setReviewComment(existing.comment || '');
      setReviewFit(existing.fit_feedback || 'True to size');
      setReviewTags(existing.tags || []);
    } else {
      setReviewRating(5);
      setReviewComment('');
      setReviewFit('True to size');
      setReviewTags(['True to size', 'Luxurious fabric']);
    }
  };

  const closeReviewModal = () => {
    setReviewModal({
      isOpen: false,
      order: null,
      item: null,
      existingReview: null
    });
  };

  const toggleTag = (tag) => {
    setReviewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewModal.order || !reviewModal.item) return;

    setIsSubmittingReview(true);
    const { order, item, existingReview } = reviewModal;
    const prodId = String(item.id || item.productId || item.name);
    const key = getItemReviewKey(order.order_reference, item);

    const payload = {
      order_id: order.id,
      order_reference: order.order_reference,
      product_id: prodId,
      product_name: item.name,
      user_id: user?.id || null,
      user_name:
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        order.customer_name ||
        'Verified Buyer',
      user_email: user?.email || order.customer_email || null,
      rating: Number(reviewRating) || 5,
      comment: reviewComment.trim(),
      fit_feedback: reviewFit,
      tags: reviewTags,
      is_verified_purchase: true,
      updated_at: new Date().toISOString()
    };

    try {
      if (existingReview?.id) {
        const { data, error } = await supabase
          .from('product_reviews')
          .update(payload)
          .eq('id', existingReview.id)
          .select()
          .single();
        if (error) throw error;
        setUserReviewsMap((prev) => ({ ...prev, [key]: data || { ...existingReview, ...payload } }));
      } else {
        const { data, error } = await supabase
          .from('product_reviews')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        setUserReviewsMap((prev) => ({ ...prev, [key]: data || payload }));
      }

      setReviewSuccessMessage('Thank you! Your product review has been submitted.');
      setTimeout(() => {
        setReviewSuccessMessage(null);
        closeReviewModal();
      }, 1500);
    } catch (err) {
      console.error('Review submit error:', err);
      // Fallback local update so user is not blocked even if Supabase table is waiting for migration
      setUserReviewsMap((prev) => ({ ...prev, [key]: payload }));
      setReviewSuccessMessage('Review saved locally. Thank you for your feedback!');
      setTimeout(() => {
        setReviewSuccessMessage(null);
        closeReviewModal();
      }, 1500);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const tabs = [
    { id: 'ALL', label: 'All Orders' },
    { id: 'TO_SHIP', label: 'To Ship / Processing' },
    { id: 'SHIPPED', label: 'Shipped' },
    { id: 'TO_DELIVER', label: 'Out for Delivery' },
    { id: 'DELIVERED', label: 'Delivered' },
    { id: 'CANCELLED', label: 'Cancelled' },
    { id: 'RETURNED', label: 'Returned' },
  ];

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'ALL') return true;
    const s = (o.status || 'PENDING').toUpperCase();
    if (activeTab === 'TO_SHIP') return s === 'PENDING' || s === 'PROCESSING' || s === 'TO_SHIP';
    if (activeTab === 'TO_DELIVER') return s === 'TO_DELIVER' || s === 'OUT_FOR_DELIVERY';
    if (activeTab === 'RETURNED') return s === 'RETURNED' || s === 'REFUNDED';
    return s === activeTab;
  });

  const formatDate = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return isoString;
    }
  };

  const getStatusBadge = (status = 'PENDING') => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'TO_DELIVER':
      case 'OUT_FOR_DELIVERY':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'SHIPPED':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'TO_SHIP':
      case 'PROCESSING':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'RETURNED':
      case 'REFUNDED':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'FAILED_TO_DELIVER':
      case 'DELIVERY_FAILED':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'PENDING':
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  const formatStatusLabel = (status = 'PENDING') => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'Delivered';
      case 'TO_DELIVER':
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'SHIPPED':
        return 'Shipped';
      case 'TO_SHIP':
      case 'PROCESSING':
        return 'To Ship / Processing';
      case 'CANCELLED':
        return 'Cancelled';
      case 'RETURNED':
      case 'REFUNDED':
        return 'Returned / Refunded';
      case 'FAILED_TO_DELIVER':
      case 'DELIVERY_FAILED':
        return 'Failed to Deliver';
      case 'PENDING':
      default:
        return 'Payment Pending';
    }
  };

  const getRatingDescriptor = (stars) => {
    switch (stars) {
      case 1:
        return '1 Star - Disappointing';
      case 2:
        return '2 Stars - Fair';
      case 3:
        return '3 Stars - Good';
      case 4:
        return '4 Stars - Very Good';
      case 5:
      default:
        return '5 Stars - Exceptional Elegance & Quality';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF5F2] text-[#2C1E1B] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header Card */}
        <div>
          <button
            onClick={onBackToShop}
            className="text-xs uppercase font-brand font-semibold tracking-[0.2em] text-[#705B56] hover:text-[#2C1E1B] flex items-center gap-2 transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Shop</span>
          </button>

          <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm">
            <span className="text-[11px] font-brand uppercase tracking-[0.25em] font-bold text-[#B86B60]">
              Customer Atelier Account
            </span>
            <h1 className="font-brand text-3xl sm:text-4xl font-bold tracking-wide text-[#2C1E1B] mt-1 mb-2">
              MY ORDERS & REVIEWS
            </h1>
            <p className="text-xs sm:text-sm text-[#705B56]">
              Track your shipments in real-time, view receipts, and share reviews on delivered garments.
            </p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-xs font-brand uppercase tracking-[0.18em] font-bold whitespace-nowrap transition-all rounded-none cursor-pointer border ${
                activeTab === tab.id
                  ? 'bg-[#2C1E1B] text-white border-[#2C1E1B] shadow-sm'
                  : 'bg-white text-[#705B56] border-[#E8DCD7] hover:border-[#B86B60] hover:text-[#2C1E1B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-[#E8DCD7] p-12 text-center shadow-sm">
              <Package className="w-12 h-12 text-[#A38E88] mx-auto mb-4 stroke-[1.5]" />
              <h3 className="font-brand text-sm uppercase tracking-[0.2em] font-bold text-[#2C1E1B] mb-2">
                No Orders Found
              </h3>
              <p className="text-xs text-[#705B56] mb-6 max-w-sm mx-auto">
                You do not have any orders matching "{activeTab}". Start shopping our curated pieces.
              </p>
              <button
                onClick={onBackToShop}
                className="bg-[#2C1E1B] hover:bg-[#B86B60] text-white px-8 py-3.5 text-xs uppercase tracking-[0.2em] font-bold rounded-none shadow-sm transition-all cursor-pointer"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isDelivered = (order.status || '').toUpperCase() === 'DELIVERED';
              const itemsCount = order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 1;

              return (
                <motion.div
                  key={order.order_reference}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#E8DCD7] p-6 shadow-sm hover:border-[#B86B60] transition-all space-y-4 rounded-none"
                >
                  {/* Top Row: Reference, Badges, Amount, Actions */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8DCD7]">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="font-brand text-base sm:text-lg font-bold tracking-wider text-[#2C1E1B]">
                          {order.order_reference}
                        </span>

                        {order.payment_status === 'PAID' ? (
                          <span className="text-[10px] font-brand uppercase tracking-wider font-bold px-2.5 py-0.5 border bg-emerald-50 text-emerald-800 border-emerald-200">
                            PAID
                          </span>
                        ) : (
                          <span className="text-[10px] font-brand uppercase tracking-wider font-bold px-2.5 py-0.5 border bg-amber-50 text-amber-800 border-amber-200">
                            PAYMENT PENDING
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-brand uppercase tracking-wider font-bold px-2.5 py-0.5 border ${getStatusBadge(
                            order.status
                          )}`}
                          title="Fulfillment & Courier Status"
                        >
                          {formatStatusLabel(order.status)}
                        </span>

                        {isDelivered && (
                          <span className="text-[10px] font-brand uppercase tracking-wider font-bold px-2 py-0.5 bg-[#FAF0EC] text-[#B86B60] border border-[#E8DCD7] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#B86B60]" />
                            Eligible for Review
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#705B56]">
                        Placed on {formatDate(order.created_at)} • Payment via{' '}
                        <span className="font-semibold text-[#2C1E1B]">
                          {order.payment_method || 'GCASH'}
                        </span>
                        {order.tracking_number && (
                          <span className="text-[#2C1E1B] font-semibold ml-2">
                            • Tracking: {order.tracking_number}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className="text-right">
                        <span className="block text-[10px] font-brand uppercase tracking-wider text-[#705B56]">
                          Total Amount
                        </span>
                        <span className="font-hero text-lg sm:text-xl font-bold text-[#2C1E1B]">
                          ₱{(Number(order.total_amount) || 0).toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-[#2C1E1B] hover:bg-[#B86B60] text-white px-5 py-3 text-xs uppercase tracking-[0.18em] font-bold transition-colors flex items-center gap-2 rounded-none cursor-pointer"
                      >
                        <span>{isDelivered ? 'View & Review' : 'View Details'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Items Pills, Review Prompts & Count */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {order.items?.map((item, idx) => {
                        const key = getItemReviewKey(order.order_reference, item);
                        const hasReview = !!userReviewsMap[key];

                        return (
                          <div
                            key={idx}
                            className="bg-[#FAF5F2] border border-[#E8DCD7] px-3 py-1.5 text-xs text-[#2C1E1B] font-medium flex items-center gap-2"
                          >
                            <span>
                              {item.name}{' '}
                              <span className="text-[#B86B60] font-semibold">
                                ×{item.quantity || 1}
                              </span>
                            </span>

                            {isDelivered && (
                              <button
                                onClick={() => openReviewModal(order, item)}
                                className={`text-[10px] uppercase font-brand font-bold tracking-wider px-2 py-0.5 transition-all cursor-pointer flex items-center gap-1 ${
                                  hasReview
                                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                    : 'bg-[#2C1E1B] text-white hover:bg-[#B86B60]'
                                }`}
                              >
                                <Star
                                  className={`w-3 h-3 ${
                                    hasReview ? 'fill-amber-500 text-amber-500' : 'fill-amber-400 text-amber-400'
                                  }`}
                                />
                                <span>{hasReview ? 'Reviewed' : 'Review'}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <span className="text-xs uppercase font-brand tracking-wider font-bold text-[#705B56]">
                      {itemsCount} {itemsCount === 1 ? 'ITEM' : 'ITEMS'}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#2C1E1B]/70 backdrop-blur-sm"
              onClick={() => setSelectedOrder(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E8DCD7] shadow-2xl p-6 sm:p-8 space-y-6 rounded-none"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E8DCD7]">
                <div>
                  <span className="text-[10px] font-brand uppercase tracking-wider text-[#B86B60] font-bold">
                    Order Details & Tracking
                  </span>
                  <h2 className="font-brand text-2xl font-bold text-[#2C1E1B]">
                    {selectedOrder.order_reference}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-[#705B56] hover:text-[#2C1E1B] border border-[#E8DCD7] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-4 bg-[#FAF5F2] border border-[#E8DCD7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2C1E1B] uppercase tracking-wider text-[11px]">
                      Courier Delivery:
                    </span>
                    <span
                      className={`text-[10px] font-brand uppercase tracking-wider font-bold px-2 py-0.5 border ${getStatusBadge(
                        selectedOrder.status
                      )}`}
                    >
                      {formatStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2C1E1B] uppercase tracking-wider text-[11px]">
                      Payment:
                    </span>
                    <span
                      className={`text-[10px] font-brand uppercase tracking-wider font-bold px-2 py-0.5 border ${
                        selectedOrder.payment_status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {selectedOrder.payment_status === 'PAID' ? 'PAID (VERIFIED)' : 'PENDING'}
                    </span>
                  </div>
                  {selectedOrder.tracking_number && (
                    <div className="text-[11px] text-[#2C1E1B] pt-0.5">
                      <strong>Tracking Number:</strong> {selectedOrder.tracking_number} (
                      {selectedOrder.courier_name || 'J&T Express'})
                    </div>
                  )}
                </div>
                <div className="sm:text-right text-[11px] text-[#705B56]">
                  <p>Ordered on {formatDate(selectedOrder.created_at)}</p>
                  <p className="font-medium text-[#2C1E1B]">Method: {selectedOrder.payment_method || 'GCASH'}</p>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-2 text-xs">
                <h4 className="font-brand uppercase tracking-wider font-bold text-[#705B56]">
                  Shipping Destination
                </h4>
                <div className="bg-[#FAF5F2] p-4 border border-[#E8DCD7] space-y-1">
                  <p className="font-bold text-[#2C1E1B]">{selectedOrder.customer_name}</p>
                  <p className="text-[#705B56]">{selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_email && (
                    <p className="text-[#705B56]">{selectedOrder.customer_email}</p>
                  )}
                  {selectedOrder.shipping_address && (
                    <p className="text-[#2C1E1B] pt-1">
                      {selectedOrder.shipping_address.street},{' '}
                      {selectedOrder.shipping_address.barangay},{' '}
                      {selectedOrder.shipping_address.city},{' '}
                      {selectedOrder.shipping_address.province || selectedOrder.shipping_address.region}{' '}
                      {selectedOrder.shipping_address.zipCode}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table with Direct Review Action */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-brand uppercase tracking-wider font-bold text-[#705B56] text-xs">
                    Purchased Garments
                  </h4>
                  {(selectedOrder.status || '').toUpperCase() === 'DELIVERED' && (
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                      Delivered • Rate your items below
                    </span>
                  )}
                </div>

                <div className="divide-y divide-[#E8DCD7]">
                  {selectedOrder.items?.map((item, idx) => {
                    const isDelivered = (selectedOrder.status || '').toUpperCase() === 'DELIVERED';
                    const key = getItemReviewKey(selectedOrder.order_reference, item);
                    const existing = userReviewsMap[key];

                    return (
                      <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-14 h-16 object-cover bg-[#FAF5F2] border border-[#E8DCD7]"
                            />
                          )}
                          <div className="space-y-0.5">
                            <p className="font-semibold text-[#2C1E1B] text-sm">{item.name}</p>
                            <p className="text-[11px] text-[#B86B60]">
                              Size: {typeof item.size === 'object' ? item.size?.name : (item.size || 'Standard')}
                              {item.color && (typeof item.color === 'object' ? item.color?.name : item.color) !== 'Standard'
                                ? ` / ${typeof item.color === 'object' ? item.color?.name : item.color}`
                                : ''}{' '}
                              • Qty: {item.quantity || 1}
                            </p>
                            <p className="font-bold text-[#2C1E1B]">
                              ₱{((Number(item.price) || 0) * (item.quantity || 1)).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Review Button for Delivered Garments */}
                        {isDelivered && (
                          <div className="sm:text-right flex-shrink-0">
                            {existing ? (
                              <button
                                onClick={() => openReviewModal(selectedOrder, item)}
                                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-brand uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 rounded-none cursor-pointer"
                              >
                                <div className="flex items-center">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-3 h-3 ${
                                        s <= (existing.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="ml-1">Edit Review</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => openReviewModal(selectedOrder, item)}
                                className="px-4 py-2 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs font-brand uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 rounded-none shadow-sm cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>Write Review</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Breakdown */}
              <div className="border-t border-[#E8DCD7] pt-4 space-y-1.5 text-xs font-brand">
                <div className="flex justify-between text-[#705B56]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#2C1E1B]">
                    ₱{(Number(selectedOrder.subtotal) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[#705B56]">
                  <span>Nationwide Shipping</span>
                  <span className="font-semibold text-[#2C1E1B]">
                    ₱{(Number(selectedOrder.shipping_fee) || 150).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-[#E8DCD7] pt-2 flex justify-between text-sm font-bold text-[#2C1E1B]">
                  <span className="uppercase tracking-wider">Total</span>
                  <span>₱{(Number(selectedOrder.total_amount) || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-[#2C1E1B] hover:bg-[#B86B60] text-white py-3.5 text-xs uppercase font-bold tracking-[0.2em] transition-colors rounded-none cursor-pointer"
              >
                Close Details
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Write Product Review Modal */}
      <AnimatePresence>
        {reviewModal.isOpen && reviewModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeReviewModal}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#E8DCD7] shadow-2xl p-6 sm:p-8 space-y-6 rounded-none"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DCD7]">
                <div>
                  <span className="text-[10px] font-brand uppercase tracking-[0.2em] text-[#B86B60] font-bold">
                    Verified Buyer Rating
                  </span>
                  <h3 className="font-editorial text-2xl text-[#2C1E1B]">
                    {reviewModal.existingReview ? 'Edit Your Review' : 'Rate Your Delivered Garment'}
                  </h3>
                </div>
                <button
                  onClick={closeReviewModal}
                  className="p-1.5 text-[#705B56] hover:text-[#2C1E1B] border border-[#E8DCD7] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Item Info Card */}
              <div className="flex items-center gap-3 p-3 bg-[#FAF5F2] border border-[#E8DCD7]">
                {reviewModal.item.image && (
                  <img
                    src={reviewModal.item.image}
                    alt={reviewModal.item.name}
                    className="w-14 h-16 object-cover border border-[#E8DCD7] bg-white flex-shrink-0"
                  />
                )}
                <div>
                  <h4 className="font-brand font-bold text-sm text-[#2C1E1B]">
                    {reviewModal.item.name}
                  </h4>
                  <p className="text-[11px] text-[#705B56]">
                    Order: <span className="font-semibold text-[#2C1E1B]">{reviewModal.order?.order_reference}</span>
                  </p>
                  <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Delivered & Verified
                  </p>
                </div>
              </div>

              {reviewSuccessMessage ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-brand font-bold text-sm text-emerald-900">{reviewSuccessMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleSaveReview} className="space-y-5 text-xs font-brand">
                  {/* Star Rating Picker (1-5) */}
                  <div className="space-y-2 text-center py-2 bg-[#FAF5F2]/50 border border-[#E8DCD7]/60">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-[#705B56] block">
                      Overall Rating (1 to 5 Stars) *
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                          aria-label={`Rate ${star} star`}
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              star <= (hoverRating || reviewRating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-[#B86B60] tracking-wide">
                      {getRatingDescriptor(hoverRating || reviewRating)}
                    </p>
                  </div>

                  {/* Fit Feedback */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">
                      How was the sizing / fit?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Runs small', 'True to size', 'Runs large'].map((fit) => (
                        <button
                          key={fit}
                          type="button"
                          onClick={() => setReviewFit(fit)}
                          className={`py-2 px-3 text-center border text-[11px] font-semibold tracking-wider transition-all cursor-pointer ${
                            reviewFit === fit
                              ? 'bg-[#2C1E1B] text-white border-[#2C1E1B]'
                              : 'bg-white text-[#705B56] border-[#E8DCD7] hover:border-[#B86B60]'
                          }`}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Highlight Tags */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">
                      Garment Highlights (Click to add)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-2.5 py-1 text-[10px] border tracking-wider transition-all cursor-pointer ${
                            reviewTags.includes(tag)
                              ? 'bg-[#B86B60] text-white border-[#B86B60] font-bold'
                              : 'bg-white text-[#705B56] border-[#E8DCD7] hover:border-[#B86B60]'
                          }`}
                        >
                          {reviewTags.includes(tag) ? `✓ ${tag}` : `+ ${tag}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">
                      Your Thoughts on Fabric, Craftsmanship & Styling *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Tell other clients about the drape, fabric feel, tailoring details, and how you styled it..."
                      className="w-full p-3 bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] placeholder-[#A8928B]/60 rounded-none leading-relaxed"
                    />
                  </div>

                  {/* Submit & Cancel Buttons */}
                  <div className="pt-3 border-t border-[#E8DCD7] flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeReviewModal}
                      className="py-3 px-5 border border-[#E8DCD7] hover:bg-[#FAF0EC] text-[#705B56] text-xs font-semibold uppercase tracking-wider rounded-none cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="py-3 px-6 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs font-semibold uppercase tracking-[0.18em] rounded-none shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmittingReview ? (
                        <span>Publishing...</span>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{reviewModal.existingReview ? 'Update Review' : 'Publish Review'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
