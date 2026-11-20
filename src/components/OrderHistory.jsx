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
  AlertCircle,
  Camera,
  ZoomIn,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import TrackingModal from './TrackingModal';
import { uploadReviewImages, MAX_REVIEW_IMAGES, maskReviewerName } from '../lib/reviewImageService';

export default function OrderHistory({ onBackToShop, onSelectOrder }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [trackingModalOrder, setTrackingModalOrder] = useState(null);

  // Direct Order Cancellation modal states
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [cancelNotes, setCancelNotes] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const handleConfirmCancelOrder = async () => {
    if (!cancellingOrder) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const fullReason = cancelNotes.trim() ? `${cancelReason} (${cancelNotes.trim()})` : cancelReason;
      let authToken = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) authToken = session.access_token;
      } catch (_) {}

      const res = await fetch('/api/cancel-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          orderReference: cancellingOrder.order_reference,
          reason: fullReason,
          customerEmail: user?.email || cancellingOrder.customer_email,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const wasPaid = (cancellingOrder.payment_status || '').toUpperCase() === 'PAID';
      const fallbackPayStatus = wasPaid ? 'REFUND_PENDING' : 'CANCELLED';

      if (!res.ok || !data.success) {
        const auditEntry = {
          name: cancellingOrder.customer_name || 'Customer',
          email: user?.email || cancellingOrder.customer_email || '',
          role: 'Customer',
          action: `Order cancelled by customer. Reason: ${fullReason}`,
          timestamp: new Date().toISOString(),
        };
        const updatedAudit = [auditEntry, ...(Array.isArray(cancellingOrder.audit_trail) ? cancellingOrder.audit_trail : [])].slice(0, 50);

        const { error: directErr } = await supabase
          .from('orders')
          .update({
            status: 'CANCELLED',
            payment_status: fallbackPayStatus,
            cancellation_reason: fullReason,
            cancelled_by: 'CUSTOMER',
            cancelled_at: new Date().toISOString(),
            audit_trail: updatedAudit,
            last_touched_by: auditEntry,
            updated_at: new Date().toISOString(),
          })
          .eq('order_reference', cancellingOrder.order_reference);

        if (directErr) {
          throw new Error(data.error || directErr.message || 'Failed to cancel order');
        }
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.order_reference === cancellingOrder.order_reference
            ? {
                ...o,
                status: 'CANCELLED',
                payment_status: data.paymentStatus || fallbackPayStatus,
                cancellation_reason: fullReason,
                cancelled_by: 'CUSTOMER',
              }
            : o
        )
      );

      try {
        const savedLast = JSON.parse(localStorage.getItem('aura_last_order') || 'null');
        if (savedLast && savedLast.order_reference === cancellingOrder.order_reference) {
          savedLast.status = 'CANCELLED';
          savedLast.payment_status = data.paymentStatus || fallbackPayStatus;
          localStorage.setItem('aura_last_order', JSON.stringify(savedLast));
        }
      } catch (_) {}

      setCancellingOrder(null);
      setCancelNotes('');
    } catch (err) {
      setCancelError(err.message || 'Unable to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOrderSelect = (order) => {
    if (onSelectOrder) {
      onSelectOrder(order);
    } else {
      window.location.href = `/order-details?ref=${order.order_reference}`;
    }
  };

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
  const [reviewImages, setReviewImages] = useState([]);
  const [isReviewAnonymous, setIsReviewAnonymous] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
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
      .filter((o) => ['DELIVERED', 'COMPLETED', 'SUCCESS'].includes((o.status || '').toUpperCase()))
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
        // Recover and sync any recently placed order in localStorage (`aura_last_order`) that hasn't synced yet
        try {
          const rawLast = localStorage.getItem('aura_last_order');
          const lastOrd = rawLast ? JSON.parse(rawLast) : null;
          if (
            lastOrd &&
            lastOrd.order_reference &&
            (lastOrd.user_id === user.id ||
              (lastOrd.customer_email &&
                user.email &&
                lastOrd.customer_email.toLowerCase() === user.email.toLowerCase()))
          ) {
            const { data: existingRow } = await supabase
              .from('orders')
              .select('id')
              .eq('order_reference', lastOrd.order_reference)
              .maybeSingle();

            if (!existingRow && Array.isArray(lastOrd.items)) {
              await supabase.from('orders').insert([
                {
                  ...lastOrd,
                  user_id: user.id,
                },
              ]);
            }
          }
        } catch (syncErr) {}

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        const authHeader = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

        let query = supabase.from('orders').select('*');
        if (user.email) {
          query = query.or(`user_id.eq.${user.id},customer_email.ilike.${user.email}`);
        } else {
          query = query.eq('user_id', user.id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (!error && data) {
          setOrders(data);
          loadUserReviews(data);

          // Auto-reconcile any pending orders directly with payment gateway
          data.forEach(async (ord) => {
            if (ord.order_reference && ord.payment_status !== 'PAID' && ord.payment_method !== 'COD') {
              try {
                const res = await fetch(
                  `/api/verify-payment?ref=${encodeURIComponent(ord.order_reference)}`,
                  { headers: authHeader }
                );
                if (res.ok) {
                  const check = await res.json();
                  if (check.paymentStatus === 'PAID') {
                    setOrders((prev) =>
                      prev.map((item) =>
                        item.order_reference === ord.order_reference
                          ? {
                              ...item,
                              payment_status: 'PAID',
                              status: check.fulfillmentStatus || item.status || 'TO_SHIP',
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

  // Real-time Supabase Subscription for Customer Orders (Status changes, tracking updates)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`order_history_realtime_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Open review modal for a specific delivered item
  const openReviewModal = (order, item) => {
    const isOrderDelivered = ['DELIVERED', 'COMPLETED', 'SUCCESS'].includes(
      (order?.status || '').toUpperCase()
    );
    if (!isOrderDelivered) return;

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
      setReviewImages(Array.isArray(existing.images) ? [...existing.images] : []);
      setIsReviewAnonymous(existing.is_anonymous ?? false);
    } else {
      setReviewRating(5);
      setReviewComment('');
      setReviewFit('True to size');
      setReviewTags(['True to size', 'Luxurious fabric']);
      setReviewImages([]);
      setIsReviewAnonymous(false);
    }
  };

  const closeReviewModal = () => {
    setReviewModal({
      isOpen: false,
      order: null,
      item: null,
      existingReview: null
    });
    setReviewImages([]);
  };

  const toggleTag = (tag) => {
    setReviewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewModal.order || !reviewModal.item) return;

    const isOrderDelivered = ['DELIVERED', 'COMPLETED', 'SUCCESS'].includes(
      (reviewModal.order?.status || '').toUpperCase()
    );
    if (!isOrderDelivered) {
      setReviewSuccessMessage('Reviews can only be added for delivered orders.');
      return;
    }

    setIsSubmittingReview(true);
    const { order, item, existingReview } = reviewModal;
    const prodId = String(item.id || item.productId || item.name);
    const key = getItemReviewKey(order.order_reference, item);

    let finalImages = [];
    try {
      if (Array.isArray(reviewImages) && reviewImages.length > 0) {
        finalImages = await uploadReviewImages(reviewImages);
      }
    } catch (uploadErr) {
      console.warn('Image upload error:', uploadErr);
    }

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
      rating: Math.min(5, Math.max(1, parseInt(reviewRating, 10) || 5)),
      comment: (reviewComment || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 1000),
      fit_feedback: (reviewFit || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 50),
      tags: Array.isArray(reviewTags) ? reviewTags.map((t) => String(t).replace(/<[^>]*>?/gm, '').trim().slice(0, 30)) : [],
      images: finalImages,
      is_anonymous: isReviewAnonymous,
      is_verified_purchase: true,
      updated_at: new Date().toISOString()
    };

    if (reviewModal.existingReview) {
      setIsSubmittingReview(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      setUserReviewsMap((prev) => ({ ...prev, [key]: data || payload }));

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
    if (activeTab === 'TO_SHIP') {
      return (
        s === 'PENDING' ||
        s === 'PROCESSING' ||
        s === 'TO_SHIP' ||
        s === 'AWAITING_COLLECTION' ||
        s === 'AWAITING_SHIPMENT'
      );
    }
    if (activeTab === 'SHIPPED') {
      return s === 'SHIPPED' || s === 'IN_TRANSIT';
    }
    if (activeTab === 'TO_DELIVER') return s === 'TO_DELIVER' || s === 'OUT_FOR_DELIVERY';
    if (activeTab === 'DELIVERED') return s === 'DELIVERED' || s === 'COMPLETED';
    if (activeTab === 'CANCELLED') return s === 'CANCELLED';
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
      case 'IN_TRANSIT':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'AWAITING_COLLECTION':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'AWAITING_SHIPMENT':
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
      case 'IN_TRANSIT':
        return 'In Transit';
      case 'AWAITING_COLLECTION':
        return 'Awaiting Courier Pickup';
      case 'AWAITING_SHIPMENT':
        return 'Awaiting Shipment';
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
        return 'Preparing Order';
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
              Customer Account
            </span>
            <h1 className="font-brand text-3xl sm:text-4xl font-bold tracking-wide text-[#2C1E1B] mt-1 mb-2">
              MY ORDERS & REVIEWS
            </h1>
            <p className="text-xs sm:text-sm text-[#705B56]">
              Track your shipments in real-time, view receipts, and share reviews on delivered items.
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
              const isDelivered = ['DELIVERED', 'COMPLETED', 'SUCCESS'].includes((order?.status || '').toUpperCase());
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

                        {order.payment_status === 'REFUND_PENDING' ? (
                          <span className="text-[10px] font-brand uppercase tracking-wider font-bold px-2.5 py-0.5 border bg-amber-50 text-amber-900 border-amber-300">
                            REFUND PENDING
                          </span>
                        ) : order.payment_status === 'REFUNDED' ? (
                          <span className="text-[10px] font-brand uppercase tracking-wider font-bold px-2.5 py-0.5 border bg-orange-50 text-orange-900 border-orange-300">
                            REFUNDED
                          </span>
                        ) : order.payment_status === 'CANCELLED' ? (
                          <span className="text-[10px] font-brand uppercase tracking-wider font-bold px-2.5 py-0.5 border bg-neutral-100 text-neutral-600 border-neutral-300">
                            VOIDED
                          </span>
                        ) : (order.payment_method || '').toUpperCase() === 'COD' ? (
                          isDelivered ? (
                            <span className="text-[10px] font-brand uppercase tracking-wider font-bold px-2.5 py-0.5 border bg-emerald-50 text-emerald-800 border-emerald-200">
                              COD • PAID
                            </span>
                          ) : (
                            <span className="text-[10px] font-brand uppercase tracking-wider font-bold px-2.5 py-0.5 border bg-amber-50 text-amber-800 border-amber-200">
                              COD • UNPAID
                            </span>
                          )
                        ) : order.payment_status === 'PAID' ? (
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

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-3 sm:gap-4">
                      <div className="flex items-center justify-between sm:block sm:text-right">
                        <span className="block text-[10px] font-brand uppercase tracking-wider text-[#705B56]">
                          Total Amount
                        </span>
                        <span className="font-hero text-lg sm:text-xl font-bold text-[#2C1E1B]">
                          ₱{(Number(order.total_amount) || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {['PENDING', 'TO_SHIP', 'PROCESSING', 'UNPAID', 'AWAITING_SHIPMENT'].includes(
                          (order?.status || '').toUpperCase()
                        ) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelError(null);
                              setCancellingOrder(order);
                            }}
                            className="border border-rose-300 bg-rose-50/70 hover:bg-rose-600 text-rose-700 hover:text-white px-3.5 py-2.5 sm:py-3 text-[11px] uppercase tracking-wider font-bold transition-colors flex items-center gap-1.5 rounded-none cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel Order</span>
                          </button>
                        )}
                        {order.tracking_number && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTrackingModalOrder(order);
                            }}
                            className="bg-[#DA291C] hover:bg-[#b01e14] text-white px-3.5 py-2.5 sm:py-3 text-xs uppercase tracking-wider font-bold transition-colors flex items-center gap-1.5 rounded-none cursor-pointer shadow-sm"
                            title="Track J&T Package"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Track J&T</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOrderSelect(order)}
                          className="flex-1 sm:flex-initial justify-center bg-[#2C1E1B] hover:bg-[#B86B60] text-white px-4 sm:px-5 py-2.5 sm:py-3 text-xs uppercase tracking-[0.18em] font-bold transition-colors flex items-center gap-2 rounded-none cursor-pointer"
                        >
                          <span>{isDelivered ? 'View & Review' : 'View Details'}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
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
                                onClick={() => handleOrderSelect(order)}
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
                    {reviewModal.existingReview ? 'Edit Your Review' : 'Rate Your Delivered Item'}
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
                    loading="lazy"
                    decoding="async"
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
                      Product Highlights (Click to add)
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

                  {/* Customer Photo Proof Upload */}
                  <div className="space-y-2 pt-1 border-t border-[#E8DCD7]/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#B86B60]" />
                        <span>Photo Proof (Optional):</span>
                      </label>
                      <span className="text-[10px] text-[#A38E88]">
                        {reviewImages.length} / {MAX_REVIEW_IMAGES} photos
                      </span>
                    </div>

                    {/* Previews */}
                    {reviewImages.length > 0 && (
                      <div className="flex flex-wrap gap-2.5">
                        {reviewImages.map((imgItem, idx) => {
                          const previewSrc = typeof imgItem === 'string' ? imgItem : imgItem?.previewUrl || imgItem?.url;
                          return (
                            <div key={idx} className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white border border-[#E8DCD7] shadow-2xs group">
                              <img
                                src={previewSrc}
                                alt="Review Proof Preview"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewImages((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-[#2C1E1B] hover:bg-rose-600 text-white w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                                title="Remove photo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* File picker button */}
                    {reviewImages.length < MAX_REVIEW_IMAGES && (
                      <div>
                        <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-dashed border-[#B86B60] hover:border-[#2C1E1B] text-[#705B56] hover:text-[#2C1E1B] text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer">
                          <Camera className="w-3.5 h-3.5 text-[#B86B60]" />
                          <span>Attach Photo Proof</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length === 0) return;
                              const slotsLeft = MAX_REVIEW_IMAGES - reviewImages.length;
                              const added = files.slice(0, slotsLeft).map((file) => ({
                                file,
                                previewUrl: URL.createObjectURL(file),
                                name: file.name,
                              }));
                              setReviewImages((prev) => [...prev, ...added]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Anonymity / Mask Name Switch */}
                  <div className="flex items-center justify-between p-3.5 bg-[#FAF5F2] border border-[#E8DCD7]">
                    <div className="flex items-center gap-2.5">
                      <EyeOff className="w-4 h-4 text-[#705B56]" />
                      <div>
                        <span className="text-xs font-brand font-bold uppercase tracking-wider text-[#2C1E1B] block">
                          Post as Anonymous
                        </span>
                        <span className="text-[11px] text-[#705B56]">
                          {isReviewAnonymous
                            ? `Name masked with asterisks: ${maskReviewerName(
                                user?.user_metadata?.full_name ||
                                  user?.user_metadata?.name ||
                                  user?.email?.split('@')[0] ||
                                  reviewModal.order?.customer_name ||
                                  'Verified Buyer'
                              )}`
                            : `Name displayed publicly as: ${
                                user?.user_metadata?.full_name ||
                                  user?.user_metadata?.name ||
                                  user?.email?.split('@')[0] ||
                                  reviewModal.order?.customer_name ||
                                  'Verified Buyer'
                              }`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReviewAnonymous(!isReviewAnonymous)}
                      role="switch"
                      aria-checked={isReviewAnonymous}
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer shrink-0 ${
                        isReviewAnonymous ? 'bg-[#2C1E1B] justify-end' : 'bg-[#D1C2BD] justify-start'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
                    </button>
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

      {/* J&T Express Live Tracking Modal */}
      <TrackingModal
        isOpen={Boolean(trackingModalOrder)}
        onClose={() => setTrackingModalOrder(null)}
        trackingNumber={trackingModalOrder?.tracking_number}
        orderReference={trackingModalOrder?.order_reference}
        initialOrder={trackingModalOrder}
      />

      {/* Direct Customer Order Cancellation Modal */}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white border border-[#E8DCD7] max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 rounded-none"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DCD7]">
                <div>
                  <span className="text-[10px] font-brand uppercase tracking-[0.2em] text-rose-700 font-bold">
                    Cancel Order Request
                  </span>
                  <h3 className="font-brand text-xl font-bold text-[#2C1E1B] mt-0.5">
                    Cancel {cancellingOrder.order_reference}?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="text-[#705B56] hover:text-[#2C1E1B] p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#705B56] mb-1.5">
                    Reason for Cancellation
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                  >
                    <option value="Changed my mind">Changed my mind</option>
                    <option value="Need to change size / item">Need to change size / item</option>
                    <option value="Need to update delivery address">Need to update delivery address</option>
                    <option value="Ordered by mistake / duplicate order">Ordered by mistake / duplicate order</option>
                    <option value="Found a different payment option">Found a different payment option</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#705B56] mb-1.5">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={cancelNotes}
                    onChange={(e) => setCancelNotes(e.target.value)}
                    placeholder="Optional details..."
                    className="w-full px-3 py-2 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                  />
                </div>

                {cancelError && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5">
                    {cancelError}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-[#E8DCD7]">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setCancellingOrder(null)}
                  className="w-full sm:w-auto px-5 py-2.5 border border-[#E8DCD7] text-xs font-bold uppercase tracking-wider text-[#705B56] hover:bg-[#FAF5F2] cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancelOrder}
                  className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Proof Lightbox Modal */}
      <AnimatePresence>
        {lightboxImg && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
            onClick={() => setLightboxImg(null)}
          >
            <div
              className="relative max-w-2xl max-h-[90vh] bg-white p-2 border border-[#E8DCD7] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#2C1E1B] text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={lightboxImg}
                alt="Proof Fullscreen"
                className="max-w-full max-h-[80vh] object-contain block mx-auto"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

