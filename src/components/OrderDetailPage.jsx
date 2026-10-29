import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Truck,
  ExternalLink,
  Package,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  ChevronRight,
  AlertCircle,
  ThumbsUp,
  Tag,
  XCircle,
  X,
  Ban,
  RotateCcw,
  Camera,
  ZoomIn
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import TrackingModal from './TrackingModal';
import { uploadReviewImages, MAX_REVIEW_IMAGES } from '../lib/reviewImageService';

const FIT_OPTIONS = [
  { id: 'Runs Small', label: 'Runs Small' },
  { id: 'True to Size', label: 'True to Size' },
  { id: 'Runs Large', label: 'Runs Large' },
];

const RATING_LABELS = {
  1: 'Poor / Disappointing',
  2: 'Fair / Needs Improvement',
  3: 'Good / Met Expectations',
  4: 'Very Good / Loved It',
  5: 'Exceptional Atelier Quality',
};

export default function OrderDetailPage({
  orderRef,
  order: initialOrder = null,
  onBack,
  onOpenTracking,
}) {
  const { user } = useAuth();
  const [order, setOrder] = useState(initialOrder);
  const [isLoadingOrder, setIsLoadingOrder] = useState(!initialOrder);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);

  // Reviews state per product: { [productId]: reviewObject }
  const [productReviews, setProductReviews] = useState({});
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Review draft state: { [productId]: { rating, comment, fit, images, hoverRating, isSubmitting, isEditing, error, success } }
  const [reviewForms, setReviewForms] = useState({});

  // Customer Cancellation Modal states
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [cancelNotes, setCancelNotes] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const isCancellable = ['PENDING', 'TO_SHIP', 'PROCESSING', 'UNPAID', 'AWAITING_SHIPMENT'].includes((order?.status || '').toUpperCase());

  const handleCustomerCancelOrder = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      const fullReason = cancelNotes.trim() ? `${cancelReason} (${cancelNotes.trim()})` : cancelReason;
      const res = await fetch('/api/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderReference: order.order_reference,
          reason: fullReason,
          customerEmail: user?.email || order.customer_email,
          userId: user?.id || order.user_id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      setCancelSuccess(true);
      setOrder((prev) => ({
        ...prev,
        status: 'CANCELLED',
        cancellation_reason: fullReason,
        cancelled_by: 'CUSTOMER',
        payment_status: data.paymentStatus || (prev.payment_status === 'PAID' ? 'REFUND_PENDING' : 'CANCELLED'),
      }));

      setTimeout(() => {
        setCancelModalOpen(false);
        setCancelSuccess(false);
      }, 2000);
    } catch (err) {
      setCancelError(err.message || 'Unable to cancel order. Please contact support.');
    } finally {
      setIsCancelling(false);
    }
  };

  // 1. Fetch Order by Reference if not preloaded
  useEffect(() => {
    let isMounted = true;
    async function fetchOrderData() {
      const activeRef = orderRef || initialOrder?.order_reference;
      if (!activeRef) {
        setIsLoadingOrder(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('order_reference', activeRef)
          .maybeSingle();

        if (!error && data && isMounted) {
          setOrder(data);
        } else if (!data) {
          // Fallback to localStorage
          try {
            const savedLast = JSON.parse(localStorage.getItem('aura_last_order') || 'null');
            if (savedLast && savedLast.order_reference === activeRef && isMounted) {
              setOrder(savedLast);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Error fetching order details:', err.message);
      } finally {
        if (isMounted) setIsLoadingOrder(false);
      }
    }

    if (!order || order.order_reference !== orderRef) {
      fetchOrderData();
    } else {
      setIsLoadingOrder(false);
    }

    return () => {
      isMounted = false;
    };
  }, [orderRef]);

  // 2. Fetch existing reviews for this order
  useEffect(() => {
    let isMounted = true;
    async function fetchExistingReviews() {
      if (!order?.order_reference) return;

      try {
        setIsLoadingReviews(true);
        const { data, error } = await supabase
          .from('product_reviews')
          .select('*')
          .eq('order_reference', order.order_reference);

        if (!error && data && isMounted) {
          const revMap = {};
          data.forEach((rev) => {
            revMap[rev.product_id] = rev;
          });
          setProductReviews(revMap);
        }
      } catch (err) {
        console.warn('Error fetching order reviews:', err.message);
      } finally {
        if (isMounted) setIsLoadingReviews(false);
      }
    }

    if (order?.order_reference) {
      fetchExistingReviews();
    }
  }, [order?.order_reference]);

  // 3. Realtime subscription for order status updates
  useEffect(() => {
    if (!order?.order_reference) return;

    const channel = supabase
      .channel(`order_detail_${order.order_reference}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_reference=eq.${order.order_reference}`,
        },
        (payload) => {
          if (payload.new) {
            setOrder((prev) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.order_reference]);

  // Copy tracking number helper
  const handleCopyTracking = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // Handle Form changes for specific product review
  const handleFormChange = (productId, field, value) => {
    setReviewForms((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { rating: 5, comment: '', fit: 'True to Size' }),
        [field]: value,
      },
    }));
  };

  // Start editing existing review
  const startEditReview = (productId, existingReview) => {
    setReviewForms((prev) => ({
      ...prev,
      [productId]: {
        rating: existingReview.rating || 5,
        comment: existingReview.comment || '',
        fit: existingReview.fit_feedback || 'True to Size',
        images: Array.isArray(existingReview.images) ? [...existingReview.images] : [],
        isEditing: true,
      },
    }));
  };

  // Submit Review to Supabase
  const handleSubmitReview = async (item) => {
    const isOrderDelivered = ['DELIVERED', 'COMPLETED', 'SUCCESS'].includes(
      (order?.status || '').toUpperCase()
    );
    if (!isOrderDelivered) {
      handleFormChange(
        item.id,
        'error',
        'Garment reviews can only be submitted once your order has been delivered or successfully completed.'
      );
      return;
    }

    const pId = item.id;
    const form = reviewForms[pId] || { rating: 5, comment: '', fit: 'True to Size' };
    const ratingVal = Math.min(5, Math.max(1, parseInt(form.rating, 10) || 5));
    const commentVal = (form.comment || '').trim();

    if (!commentVal) {
      handleFormChange(pId, 'error', 'Please share your thoughts or feedback about this garment.');
      return;
    }

    handleFormChange(pId, 'isSubmitting', true);
    handleFormChange(pId, 'error', null);

    let finalImages = [];
    try {
      if (Array.isArray(form.images) && form.images.length > 0) {
        finalImages = await uploadReviewImages(form.images);
      }
    } catch (uploadErr) {
      console.warn('Image upload error:', uploadErr);
    }

    const reviewerName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      order.customer_name ||
      'Verified Client';

    const payload = {
      order_id: order.id ? String(order.id) : null,
      order_reference: order.order_reference,
      product_id: String(item.id),
      product_name: item.name || 'Aura Garment',
      user_id: user?.id || order.user_id || null,
      user_name: reviewerName,
      user_email: user?.email || order.customer_email || null,
      rating: ratingVal,
      comment: commentVal.slice(0, 1000),
      fit_feedback: form.fit || 'True to Size',
      images: finalImages,
      is_verified_purchase: true,
      updated_at: new Date().toISOString(),
    };

    const existingReview = productReviews[pId];

    try {
      if (existingReview?.id) {
        const { data, error } = await supabase
          .from('product_reviews')
          .update(payload)
          .eq('id', existingReview.id)
          .select()
          .single();

        if (error) throw error;
        setProductReviews((prev) => ({ ...prev, [pId]: data || { ...existingReview, ...payload } }));
      } else {
        const { data, error } = await supabase
          .from('product_reviews')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        setProductReviews((prev) => ({ ...prev, [pId]: data || payload }));
      }

      handleFormChange(pId, 'success', 'Review published successfully! Thank you for your feedback.');
      handleFormChange(pId, 'isEditing', false);
      handleFormChange(pId, 'isSubmitting', false);

      setTimeout(() => {
        handleFormChange(pId, 'success', null);
      }, 4000);
    } catch (err) {
      console.error('Error submitting review:', err);
      handleFormChange(pId, 'error', err.message || 'Failed to submit review. Please try again.');
      handleFormChange(pId, 'isSubmitting', false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'DELIVERED' || s === 'COMPLETED') {
      return {
        label: 'Delivered',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    }
    if (s === 'TO_DELIVER' || s === 'OUT_FOR_DELIVERY') {
      return {
        label: 'Out for Delivery',
        bg: 'bg-blue-50 text-blue-800 border-blue-200',
        dot: 'bg-blue-500',
      };
    }
    if (s === 'SHIPPED' || s === 'IN_TRANSIT') {
      return {
        label: 'In Transit',
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        dot: 'bg-indigo-500',
      };
    }
    if (s === 'AWAITING_COLLECTION') {
      return {
        label: 'Awaiting Courier Pickup',
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        dot: 'bg-indigo-500',
      };
    }
    if (s === 'AWAITING_SHIPMENT' || s === 'TO_SHIP' || s === 'PROCESSING') {
      return {
        label: 'To Ship / Processing',
        bg: 'bg-purple-50 text-purple-800 border-purple-200',
        dot: 'bg-purple-500',
      };
    }
    if (s === 'CANCELLED') {
      return {
        label: 'Cancelled',
        bg: 'bg-neutral-100 text-neutral-600 border-neutral-300',
        dot: 'bg-neutral-400',
      };
    }
    return {
      label: 'Preparing to Ship',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
    };
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  if (isLoadingOrder) {
    return (
      <div className="min-h-screen bg-[#FAF5F2] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-transparent border-[#B86B60] rounded-full animate-spin mx-auto mb-3" />
          <p className="font-brand text-xs uppercase tracking-widest text-[#705B56]">
            Retrieving Order Ledger...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FAF5F2] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#E8DCD7] p-8 text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-[#B86B60] mx-auto mb-3" />
          <h2 className="font-brand text-xl font-bold text-[#2C1E1B] mb-2">Order Not Found</h2>
          <p className="text-xs text-[#705B56] leading-relaxed mb-6 font-sans">
            We couldn't locate an order matching reference{' '}
            <span className="font-mono font-bold text-[#2C1E1B]">{orderRef}</span>.
          </p>
          <button
            onClick={onBack}
            className="w-full py-3 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
          >
            Return to Orders
          </button>
        </div>
      </div>
    );
  }

  const badge = getStatusBadge(order.status);
  const items = Array.isArray(order.items) ? order.items : [];
  const trackingNumber = order.tracking_number;
  const isDelivered = ['DELIVERED', 'COMPLETED', 'SUCCESS'].includes((order?.status || '').toUpperCase());

  return (
    <div className="min-h-screen bg-[#FAF5F2] text-[#2C1E1B] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#705B56] hover:text-[#B86B60] transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>
          <span className="text-[11px] font-mono text-[#705B56]">
            Placed: {formatDate(order.created_at)}
          </span>
        </div>

        {/* Hero Order Overview Card */}
        <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8DCD7]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B86B60] block mb-1">
                Order Ledger Details
              </span>
              <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight text-[#2C1E1B]">
                {order.order_reference}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-bold uppercase tracking-wider ${badge.bg}`}>
                <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>

              <span className={`inline-flex items-center gap-1 px-3 py-1.5 border text-xs font-semibold uppercase tracking-wider ${
                order.payment_status === 'PAID'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : order.payment_status === 'REFUND_PENDING'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                  : order.payment_status === 'REFUNDED'
                  ? 'bg-orange-50 text-orange-900 border-orange-300 font-bold'
                  : order.payment_status === 'CANCELLED'
                  ? 'bg-neutral-100 text-neutral-600 border-neutral-300'
                  : order.payment_method === 'COD'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {order.payment_status === 'PAID'
                  ? 'Paid'
                  : order.payment_status === 'REFUND_PENDING'
                  ? 'Refund Pending'
                  : order.payment_status === 'REFUNDED'
                  ? 'Refunded'
                  : order.payment_status === 'CANCELLED'
                  ? 'Voided'
                  : order.payment_method === 'COD'
                  ? 'COD • Unpaid'
                  : 'Payment Pending'}
              </span>
            </div>
          </div>

          {/* Cancellation Notice Banner (If Cancelled) */}
          {(order.status || '').toUpperCase() === 'CANCELLED' && (
            <div className="mt-6 p-4 sm:p-5 bg-rose-50/70 border border-rose-200 text-rose-950 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Order Cancelled {order.cancelled_by === 'CUSTOMER' ? '(Requested by Client)' : ''}
                  </span>
                </div>
                {order.cancelled_at && (
                  <span className="text-[11px] font-mono text-rose-700">
                    {formatDate(order.cancelled_at)}
                  </span>
                )}
              </div>
              {order.cancellation_reason && (
                <p className="text-xs text-rose-800">
                  Reason: <span className="font-semibold">{order.cancellation_reason}</span>
                </p>
              )}
              {order.payment_status === 'REFUND_PENDING' ? (
                <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Refund Processing Notice</span>
                  </div>
                  <p className="leading-relaxed">
                    Your online payment of <strong>₱{(Number(order.total_amount) || 0).toLocaleString()}</strong> is being refunded to your original payment method via Xendit / GCash. Please allow 1–3 business days for e-wallets or 5–10 banking days for credit cards.
                  </p>
                </div>
              ) : (String(order.payment_method || '').toUpperCase() === 'COD') ? (
                <p className="text-xs text-rose-700">
                  Payment Method: <strong>Cash on Delivery (COD)</strong> — No payment was charged.
                </p>
              ) : null}
            </div>
          )}

          {/* Fulfillment & Courier Card */}
          <div className="mt-6 p-4 sm:p-5 bg-[#FAF5F2] border border-[#E8DCD7] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-none bg-white border border-[#E8DCD7] flex items-center justify-center text-[#B86B60] flex-shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#2C1E1B]">
                  {order.courier_name || 'J&T Express'} Courier Dispatch
                </p>
                {trackingNumber ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-semibold text-[#705B56] bg-white px-2 py-0.5 border border-[#E8DCD7]">
                      {trackingNumber}
                    </span>
                    <button
                      onClick={() => handleCopyTracking(trackingNumber)}
                      className="p-1 hover:text-[#B86B60] transition-colors text-[#705B56] cursor-pointer"
                      title="Copy Tracking Number"
                    >
                      {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#705B56] mt-0.5">
                    {(order.status || '').toUpperCase() === 'CANCELLED'
                      ? 'Shipment cancelled'
                      : 'Awaiting dispatch pickup at the Aura Atelier'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {trackingNumber && (order.status || '').toUpperCase() !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={() => setTrackingModalOpen(true)}
                  className="px-4 py-2.5 bg-[#DA291C] hover:bg-[#b01e14] text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Live J&T Tracking</span>
                </button>
              )}

              {order.waybill_url && (order.status || '').toUpperCase() !== 'CANCELLED' && (
                <a
                  href={order.waybill_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#2C1E1B] border border-[#E8DCD7] text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Official Waybill</span>
                </a>
              )}

              {/* Cancel Order Action (Available while awaiting shipment) */}
              {isCancellable && (order.status || '').toUpperCase() !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cancel Order</span>
                </button>
              )}
            </div>
          </div>

          {/* Stepper Delivery Visualization (Only if not cancelled) */}
          {(order.status || '').toUpperCase() !== 'CANCELLED' && (
            <div className="mt-8 pt-6 border-t border-[#E8DCD7]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#705B56] mb-4">
                Fulfillment Journey
              </p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mb-1.5 shadow-xs">
                  ✓
                </div>
                <span className="font-bold text-[#2C1E1B] text-[11px]">Placed</span>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 shadow-xs ${
                  ['SHIPPED', 'TO_DELIVER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes((order.status || '').toUpperCase())
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#FAF0EC] border border-[#B86B60] text-[#B86B60]'
                }`}>
                  {['SHIPPED', 'TO_DELIVER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes((order.status || '').toUpperCase()) ? '✓' : '2'}
                </div>
                <span className="font-bold text-[#2C1E1B] text-[11px]">Packed</span>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 shadow-xs ${
                  ['TO_DELIVER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes((order.status || '').toUpperCase())
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  {['TO_DELIVER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes((order.status || '').toUpperCase()) ? '✓' : '3'}
                </div>
                <span className="font-bold text-[#2C1E1B] text-[11px]">In Transit</span>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 shadow-xs ${
                  isDelivered
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  {isDelivered ? '✓' : '4'}
                </div>
                <span className="font-bold text-[#2C1E1B] text-[11px]">Delivered</span>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* 2-Column: Recipient Details & Financial Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shipping Address */}
          <div className="bg-white border border-[#E8DCD7] p-6 shadow-xs space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B86B60] block">
              Recipient & Shipping Destination
            </span>
            <p className="font-brand font-bold text-base text-[#2C1E1B] leading-tight">
              {order.customer_name}
            </p>
            <p className="text-xs text-[#705B56]">{order.customer_phone}</p>
            {order.customer_email && (
              <p className="text-xs text-[#705B56]">{order.customer_email}</p>
            )}
            {order.shipping_address && (
              <div className="pt-2 border-t border-[#E8DCD7] text-xs text-[#705B56] leading-relaxed">
                <p>{order.shipping_address.street}</p>
                <p>
                  {order.shipping_address.barangay ? `${order.shipping_address.barangay}, ` : ''}
                  {order.shipping_address.city}
                </p>
                <p>
                  {order.shipping_address.province || order.shipping_address.region}{' '}
                  {order.shipping_address.zipCode}
                </p>
                <p className="font-medium text-[#2C1E1B]">Philippines</p>
              </div>
            )}
          </div>

          {/* Payment & Receipt Summary */}
          <div className="bg-white border border-[#E8DCD7] p-6 shadow-xs space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B86B60] block">
              Payment & Cost Breakdown
            </span>
            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between text-[#705B56]">
                <span>Payment Method</span>
                <span className="font-bold text-[#2C1E1B] uppercase tracking-wider">
                  {order.payment_method || 'COD'}
                </span>
              </div>
              <div className="flex justify-between text-[#705B56]">
                <span>Items Subtotal</span>
                <span className="font-mono">₱{(Number(order.subtotal) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#705B56]">
                <span>Logistics Shipping Fee</span>
                <span className="font-mono">₱{(Number(order.shipping_fee) || 0).toLocaleString()}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Promotional Discount</span>
                  <span className="font-mono">-₱{Number(order.discount_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#2C1E1B] pt-3 border-t border-[#E8DCD7]">
                <span>Total Amount</span>
                <span className="font-mono text-lg text-[#B86B60]">
                  ₱{(Number(order.total_amount) || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Garment Items & Rating Feedback Section */}
        <div className="bg-white border border-[#E8DCD7] shadow-xs">
          <div className="p-6 border-b border-[#E8DCD7] bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B86B60]" />
              <h2 className="font-brand text-lg font-bold text-[#2C1E1B]">
                Purchased Garments {isDelivered ? '& Client Feedback' : ''}
              </h2>
            </div>
            <p className="text-xs text-[#705B56] mt-1">
              {isDelivered
                ? 'Your order has arrived! Rate your atelier pieces and share fit, tailoring, and fabric reviews below.'
                : 'Itemized garment list for this order. Reviews will unlock once your package has been delivered.'}
            </p>
          </div>

          <div className="divide-y divide-[#E8DCD7]">
            {items.map((item, idx) => {
              const pId = String(item.id);
              const existingReview = productReviews[pId];
              const form = reviewForms[pId] || {
                rating: existingReview?.rating || 5,
                comment: existingReview?.comment || '',
                fit: existingReview?.fit_feedback || 'True to Size',
                images: Array.isArray(existingReview?.images) ? existingReview.images : [],
                isEditing: false,
              };
              const isFormEditing = form.isEditing || !existingReview;

              return (
                <div key={idx} className="p-6 sm:p-8 space-y-6">
                  {/* Item Header Row */}
                  <div className="flex items-start gap-4">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=300'}
                      alt={item.name}
                      className="w-20 h-24 sm:w-24 sm:h-28 object-cover border border-[#E8DCD7] flex-shrink-0 bg-[#FAF5F2]"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-brand text-base sm:text-lg font-bold text-[#2C1E1B] leading-tight">
                        {item.name}
                      </h3>
                      <p className="text-xs text-[#705B56] mt-1">
                        Size: <span className="font-semibold text-[#2C1E1B]">{item.size || 'Standard'}</span> • Color: <span className="font-semibold text-[#2C1E1B]">{item.color || 'Standard'}</span>
                      </p>
                      <p className="text-xs font-mono font-bold text-[#2C1E1B] mt-2">
                        ₱{Number(item.price).toLocaleString()} × {item.quantity || 1}
                      </p>
                    </div>
                  </div>

                  {/* Review / Feedback Section for this Item */}
                  <div className="bg-[#FAF5F2]/80 border border-[#E8DCD7] p-5 sm:p-6 space-y-4">
                    {/* If review already submitted and not currently editing */}
                    {!isFormEditing && existingReview ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1">
                              {'★'.repeat(existingReview.rating)}
                              <span className="ml-1 text-[11px] font-sans text-slate-600">
                                ({existingReview.rating} / 5)
                              </span>
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1">
                              ✓ Verified Purchase
                            </span>
                            {existingReview.fit_feedback && (
                              <span className="text-[11px] text-[#705B56] bg-white border border-[#E8DCD7] px-2.5 py-1 hidden sm:inline-block">
                                Fit: {existingReview.fit_feedback}
                              </span>
                            )}
                          </div>

                          {isDelivered && (
                            <button
                              type="button"
                              onClick={() => startEditReview(pId, existingReview)}
                              className="text-xs font-bold text-[#B86B60] hover:underline uppercase tracking-wider cursor-pointer"
                            >
                              Edit Review
                            </button>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-[#2C1E1B] leading-relaxed whitespace-pre-wrap bg-white p-3.5 border border-[#E8DCD7]">
                          "{existingReview.comment}"
                        </p>

                        {/* Customer Photo Proofs Display */}
                        {Array.isArray(existingReview.images) && existingReview.images.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[10px] font-brand uppercase tracking-wider text-[#705B56] block mb-1.5 font-bold">
                              Photo Proof ({existingReview.images.length}):
                            </span>
                            <div className="flex flex-wrap gap-2.5">
                              {existingReview.images.map((imgUrl, imgIdx) => (
                                <button
                                  key={imgIdx}
                                  type="button"
                                  onClick={() => setLightboxImg(imgUrl)}
                                  className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white border border-[#E8DCD7] hover:border-[#2C1E1B] transition-all cursor-pointer group shadow-2xs overflow-hidden"
                                  title="View photo proof"
                                >
                                  <img
                                    src={imgUrl}
                                    alt="Review Proof"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <ZoomIn className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-[#705B56] pt-1">
                          <span>Reviewed by {existingReview.user_name || 'Client'}</span>
                          <span>{formatDate(existingReview.updated_at || existingReview.created_at)}</span>
                        </div>
                      </div>
                    ) : isDelivered ? (
                      /* Interactive Review Form (Only accessible once DELIVERED / COMPLETED / SUCCESS) */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E8DCD7] pb-3">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#2C1E1B] flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-[#B86B60]" />
                              {existingReview ? 'Update Your Garment Feedback' : 'Leave a Feedback & Rating'}
                            </span>
                            <p className="text-[11px] text-[#705B56] mt-0.5">
                              How was the tailoring, fabric quality, and fit of this piece?
                            </p>
                          </div>

                          {existingReview && (
                            <button
                              type="button"
                              onClick={() => handleFormChange(pId, 'isEditing', false)}
                              className="text-xs text-[#705B56] hover:text-[#2C1E1B] underline cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>

                        {/* Interactive Star Rating (1-5) */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] uppercase tracking-wider font-bold text-[#705B56] block">
                            Rating:
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const currentRating = form.hoverRating || form.rating || 5;
                                const isFilled = star <= currentRating;
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onMouseEnter={() => handleFormChange(pId, 'hoverRating', star)}
                                    onMouseLeave={() => handleFormChange(pId, 'hoverRating', null)}
                                    onClick={() => handleFormChange(pId, 'rating', star)}
                                    className="p-1 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                                    aria-label={`Rate ${star} star`}
                                  >
                                    <Star
                                      className={`w-6 h-6 transition-colors ${
                                        isFilled
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-slate-300 hover:text-amber-200'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-xs font-bold text-[#B86B60] tracking-wide ml-2">
                              {RATING_LABELS[form.hoverRating || form.rating || 5]}
                            </span>
                          </div>
                        </div>

                        {/* Fit Feedback Selector */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] uppercase tracking-wider font-bold text-[#705B56] block">
                            Fit Experience:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {FIT_OPTIONS.map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleFormChange(pId, 'fit', opt.id)}
                                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all border cursor-pointer ${
                                  form.fit === opt.id
                                    ? 'bg-[#2C1E1B] text-white border-[#2C1E1B]'
                                    : 'bg-white text-[#705B56] border-[#E8DCD7] hover:border-[#B86B60]'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Comment Input */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] uppercase tracking-wider font-bold text-[#705B56] block">
                            Comment & Experience:
                          </label>
                          <textarea
                            rows={3}
                            value={form.comment}
                            onChange={(e) => handleFormChange(pId, 'comment', e.target.value)}
                            placeholder="Write your feedback regarding the silhouette, material softness, stitch finish, and styling notes..."
                            className="w-full p-3 bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] placeholder:text-slate-400 focus:outline-none focus:border-[#2C1E1B] rounded-none resize-none leading-relaxed"
                          />
                        </div>

                        {/* Customer Photo Proof Upload */}
                        <div className="space-y-2 pt-1 border-t border-[#E8DCD7]/60">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] uppercase tracking-wider font-bold text-[#705B56] flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-[#B86B60]" />
                              <span>Photo Proof (Optional):</span>
                            </label>
                            <span className="text-[10px] text-[#A38E88]">
                              {(form.images || []).length} / {MAX_REVIEW_IMAGES} photos
                            </span>
                          </div>

                          {/* Previews Grid */}
                          {(form.images || []).length > 0 && (
                            <div className="flex flex-wrap gap-2.5">
                              {form.images.map((imgItem, idx) => {
                                const previewSrc = typeof imgItem === 'string' ? imgItem : imgItem?.previewUrl || imgItem?.url;
                                return (
                                  <div key={idx} className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white border border-[#E8DCD7] shadow-2xs group">
                                    <img
                                      src={previewSrc}
                                      alt="Photo Proof Preview"
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = form.images.filter((_, i) => i !== idx);
                                        handleFormChange(pId, 'images', updated);
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

                          {/* File Input Trigger */}
                          {(form.images || []).length < MAX_REVIEW_IMAGES && (
                            <div>
                              <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-dashed border-[#B86B60] hover:border-[#2C1E1B] text-[#705B56] hover:text-[#2C1E1B] text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer">
                                <Camera className="w-4 h-4 text-[#B86B60]" />
                                <span>Upload Garment Photo</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/heic"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length === 0) return;
                                    const currentImages = form.images || [];
                                    const slotsLeft = MAX_REVIEW_IMAGES - currentImages.length;
                                    const added = files.slice(0, slotsLeft).map((file) => ({
                                      file,
                                      previewUrl: URL.createObjectURL(file),
                                      name: file.name,
                                    }));
                                    handleFormChange(pId, 'images', [...currentImages, ...added]);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Error message */}
                        {form.error && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                            {form.error}
                          </div>
                        )}

                        {/* Success message */}
                        {form.success && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-600" />
                            {form.success}
                          </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            disabled={form.isSubmitting}
                            onClick={() => handleSubmitReview(item)}
                            className="px-6 py-2.5 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs font-bold uppercase tracking-[0.18em] transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {form.isSubmitting ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Publishing...</span>
                              </>
                            ) : (
                              <>
                                <span>{existingReview ? 'Update Review' : 'Submit Verified Review'}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Locked Notice while order is processing, awaiting shipment, in transit, or cancelled */
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#E8DCD7] text-xs">
                        <div className="flex items-center gap-2.5 text-[#705B56]">
                          <Truck className="w-4 h-4 text-[#B86B60] flex-shrink-0" />
                          <span>
                            Garment reviews & ratings will unlock once your package has been <strong>delivered</strong>.
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 bg-[#FAF5F2] border border-[#E8DCD7] text-[#705B56] self-start sm:self-auto">
                          Status: {order.status?.replace(/_/g, ' ') || 'PROCESSING'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* J&T Live Tracking Stepper Modal */}
      {trackingModalOpen && (
        <TrackingModal
          order={order}
          onClose={() => setTrackingModalOpen(false)}
        />
      )}

      {/* Customer Cancel Order Confirmation Modal */}
      <AnimatePresence>
        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isCancelling && setCancelModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 bg-white max-w-md w-full border border-[#E8DCD7] shadow-2xl p-6 sm:p-7 space-y-5 rounded-none"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-[#E8DCD7]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600 block">
                    Order Cancellation
                  </span>
                  <h3 className="font-brand text-xl font-bold text-[#2C1E1B]">
                    Cancel This Order?
                  </h3>
                  <p className="text-xs text-[#705B56] mt-0.5">
                    Order Ref: <span className="font-mono font-semibold text-[#2C1E1B]">{order.order_reference}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setCancelModalOpen(false)}
                  className="p-1.5 text-[#705B56] hover:text-[#2C1E1B] border border-[#E8DCD7] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {cancelSuccess ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-brand font-bold text-sm text-emerald-900">Order Successfully Cancelled</p>
                  <p className="text-xs text-emerald-700">Your order status has been updated.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Payment / Refund Explanation Box */}
                  <div className="p-3.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-[#B86B60]" />
                      <span>
                        {order.payment_status === 'PAID'
                          ? 'Online Payment Refund Notice'
                          : 'Cash on Delivery Notice'}
                      </span>
                    </div>
                    {order.payment_status === 'PAID' ? (
                      <p className="text-xs text-[#705B56] leading-relaxed">
                        Since this order was paid online ({order.payment_method || 'Online'}), our team will initiate a refund of <strong className="text-[#2C1E1B]">₱{(Number(order.total_amount) || 0).toLocaleString()}</strong> back to your original payment method via Xendit / GCash.
                      </p>
                    ) : (
                      <p className="text-xs text-[#705B56] leading-relaxed">
                        Since this is a Cash on Delivery order, no payment was collected and your balance remains <strong>₱0</strong>.
                      </p>
                    )}
                  </div>

                  {/* Reason Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-[#705B56] block">
                      Reason for cancellation *
                    </label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none cursor-pointer"
                    >
                      <option value="Changed my mind">Changed my mind</option>
                      <option value="Need to change size or color">Need to change size or color</option>
                      <option value="Need to modify shipping address">Need to modify shipping address</option>
                      <option value="Ordered by mistake">Ordered by mistake</option>
                      <option value="Delivery time is too long">Delivery time is too long</option>
                      <option value="Found alternative product">Found alternative product</option>
                      <option value="Other reason">Other reason</option>
                    </select>
                  </div>

                  {/* Additional notes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-[#705B56] block">
                      Additional notes (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={cancelNotes}
                      onChange={(e) => setCancelNotes(e.target.value)}
                      placeholder="Briefly tell us why you are cancelling..."
                      className="w-full p-2.5 bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none resize-none placeholder:text-slate-400"
                    />
                  </div>

                  {/* Error feedback */}
                  {cancelError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {cancelError}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E8DCD7]">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => setCancelModalOpen(false)}
                      className="px-4 py-2.5 border border-[#E8DCD7] hover:bg-[#FAF5F2] text-[#705B56] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Keep Order
                    </button>
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleCustomerCancelOrder}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isCancelling ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          <span>Confirm Cancellation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
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
