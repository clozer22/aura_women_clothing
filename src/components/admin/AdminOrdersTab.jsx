import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Eye,
  Edit2,
  RefreshCw,
  ExternalLink,
  MapPin,
  Calendar,
  X,
  Check,
  Tag,
  DollarSign,
  Send,
  FileText,
  Printer,
  UserCheck,
  History,
  Box,
  Layers,
  ShieldCheck,
  ArrowRight,
  Ban,
  AlertCircle,
  Bookmark,
  MoreVertical,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import TrackingModal from '../TrackingModal';
import AddNoteModal, { FLAG_OPTIONS } from './AddNoteModal';
import A6ThermalPrintModal from './A6ThermalPrintModal';
import BarcodeSvg from '../common/BarcodeSvg';

const AdminOrdersTab = ({
  orders = [],
  orderCounts = {},
  isLoading = false,
  onRefresh,
  onUpdateOrderStatus,
  onUpdateOrderTracking,
  initialFilterTab = 'ALL',
  currentAdmin = null,
}) => {
  const getInitialActiveOrderTab = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('orderTab');
      if (urlTab) return urlTab;
      const savedTab = sessionStorage.getItem('aura_admin_order_tab');
      if (savedTab) return savedTab;
    } catch {}
    return initialFilterTab || 'ALL';
  };

  const getInitialToShipSubTab = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlSub = params.get('pipelineStage');
      if (urlSub === 'AWAITING_SHIPMENT' || urlSub === 'AWAITING_COLLECTION') return urlSub;
      const savedSub = sessionStorage.getItem('aura_admin_toship_subtab');
      if (savedSub === 'AWAITING_SHIPMENT' || savedSub === 'AWAITING_COLLECTION') return savedSub;
    } catch {}
    return 'AWAITING_SHIPMENT';
  };

  const [activeTab, setActiveTab] = useState(getInitialActiveOrderTab);
  const [toShipSubTab, setToShipSubTab] = useState(getInitialToShipSubTab);

  // Sync orderTab and pipelineStage with URL query parameters and sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('aura_admin_order_tab', activeTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get('orderTab') !== activeTab) {
        url.searchParams.set('orderTab', activeTab);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {}
  }, [activeTab]);

  useEffect(() => {
    try {
      sessionStorage.setItem('aura_admin_toship_subtab', toShipSubTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get('pipelineStage') !== toShipSubTab) {
        url.searchParams.set('pipelineStage', toShipSubTab);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {}
  }, [toShipSubTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isBulkBooking, setIsBulkBooking] = useState(false);
  const [editingTrackingId, setEditingTrackingId] = useState(null);
  const [trackingForm, setTrackingForm] = useState({ courierName: 'J&T Express', trackingNumber: '' });
  const [bookingShipmateId, setBookingShipmateId] = useState(null);
  const [shipmentFeedback, setShipmentFeedback] = useState(null);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [selectedWaybillOrder, setSelectedWaybillOrder] = useState(null);
  const [adminTrackingOrder, setAdminTrackingOrder] = useState(null);

  // TikTok Seller Center Fulfillment: Action Dropdown, Note & Flag Modal, 2-Page A6 Print Modal
  const [activeDropdownOrderId, setActiveDropdownOrderId] = useState(null);
  const [isArrangingShipmentId, setIsArrangingShipmentId] = useState(null);
  const [noteModalOrder, setNoteModalOrder] = useState(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [a6PrintOrder, setA6PrintOrder] = useState(null);

  // J&T Express Custom Dispatch Setup Modal state
  const [dispatchModalOrder, setDispatchModalOrder] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({
    weightKg: '0.35',
    pouchSize: 'small',
    preferredCourier: 'J&T Express',
    notes: 'Handle with care - apparel. Call before delivery.',
  });
  const [isDispatchingJnt, setIsDispatchingJnt] = useState(false);

  // Bulk Thermal Waybill Printing Modal state
  const [bulkWaybillOrders, setBulkWaybillOrders] = useState(null);

  // Order Cancellation Modal state
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('Customer requested cancellation');
  const [cancelNotes, setCancelNotes] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [isRefundingOrderId, setIsRefundingOrderId] = useState(null);

  // Single Order Accepting state
  const [isAcceptingOrderId, setIsAcceptingOrderId] = useState(null);

  // Mark an online paid cancelled order as Refunded (after refunding on Xendit)
  const handleMarkAsRefunded = async (order) => {
    if (!order || !onUpdateOrderStatus) return;
    setIsRefundingOrderId(order.id);
    const modifierInfo = {
      name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
      email: currentAdmin?.email || '',
      role: currentAdmin?.role || 'Admin',
      action: 'Tagged as Refunded (Xendit refund / payout verified)',
      timestamp: new Date().toISOString(),
    };
    try {
      await onUpdateOrderStatus(order.id, 'CANCELLED', modifierInfo, {
        payment_status: 'REFUNDED',
        refunded_at: new Date().toISOString(),
      });
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) => ({
          ...prev,
          payment_status: 'REFUNDED',
          refunded_at: new Date().toISOString(),
          last_touched_by: modifierInfo,
          audit_trail: [modifierInfo, ...(Array.isArray(prev.audit_trail) ? prev.audit_trail : [])],
        }));
      }
      setShipmentFeedback({
        type: 'success',
        orderRef: order.order_reference,
        message: `Order ${order.order_reference} tagged as Refunded.`,
      });
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Failed to mark as refunded:', err);
      setShipmentFeedback({
        type: 'error',
        orderRef: order.order_reference,
        message: err.message || 'Failed to update refund status',
      });
    } finally {
      setIsRefundingOrderId(null);
    }
  };

  // Parse order note and color flag (supports JSON format and plain text fallback)
  const parseOrderNote = (adminNotes) => {
    if (!adminNotes) return { flag: 'none', note: '' };
    if (typeof adminNotes === 'object') {
      return { flag: adminNotes.flag || 'none', note: adminNotes.note || '' };
    }
    try {
      const parsed = JSON.parse(adminNotes);
      if (parsed && typeof parsed === 'object') {
        return { flag: parsed.flag || 'none', note: parsed.note || '' };
      }
    } catch (e) {}
    return { flag: 'none', note: String(adminNotes) };
  };

  // Determine TikTok Seller Center fulfillment stage
  const getFulfillmentStage = (order) => {
    const s = (order.status || 'PENDING').toUpperCase();
    if (s === 'AWAITING_COLLECTION') return 'AWAITING_COLLECTION';
    if (s === 'SHIPPED') return 'SHIPPED';
    if (s === 'TO_DELIVER') return 'TO_DELIVER';
    if (s === 'DELIVERED' || s === 'COMPLETED') return 'DELIVERED';
    if (s === 'CANCELLED') return 'CANCELLED';
    if (s === 'RETURNED' || s === 'REFUNDED') return 'RETURNED';
    if (s === 'FAILED_TO_DELIVER') return 'FAILED_TO_DELIVER';

    // In To Ship pipeline: if already arranged for collection
    if (order.shipment_status === 'COLLECTION_ARRANGED' || order.arranged_for_collection === true) {
      return 'AWAITING_COLLECTION';
    }
    return 'AWAITING_SHIPMENT';
  };

  // Helper to check if an order belongs in To Ship pipeline
  const isToShipOrder = (order) => {
    const orderStatus = (order.status || 'PENDING').toUpperCase();
    const paymentStatus = (order.payment_status || 'PENDING').toUpperCase();
    const isPaid = paymentStatus === 'PAID' || orderStatus === 'COMPLETED';
    const isCod = (order.payment_method || '').toUpperCase() === 'COD';

    return (
      orderStatus === 'TO_SHIP' ||
      orderStatus === 'PROCESSING' ||
      orderStatus === 'AWAITING_SHIPMENT' ||
      orderStatus === 'AWAITING_COLLECTION' ||
      (orderStatus === 'PENDING' && (isPaid || isCod))
    );
  };

  // Dynamic counts for Awaiting Shipment & Awaiting Collection
  const { awaitingShipmentCount, awaitingCollectionCount, toShipTotalCount } = useMemo(() => {
    let awaitingShipment = 0;
    let awaitingCollection = 0;

    orders.forEach((o) => {
      if (isToShipOrder(o)) {
        const stage = getFulfillmentStage(o);
        if (stage === 'AWAITING_COLLECTION') {
          awaitingCollection += 1;
        } else {
          awaitingShipment += 1;
        }
      }
    });

    return {
      awaitingShipmentCount: awaitingShipment,
      awaitingCollectionCount: awaitingCollection,
      toShipTotalCount: awaitingShipment + awaitingCollection,
    };
  }, [orders]);

  // TikTok Shop style pipeline filter categories matching user specification:
  // All | To ship | Shipped | Completed | Pending | Canceled | Failed delivery
  const tabs = [
    { id: 'ALL', label: 'All', count: orders.length },
    { id: 'TO_SHIP', label: 'To ship', count: toShipTotalCount },
    { id: 'SHIPPED', label: 'Shipped', count: orderCounts.shipped || 0 },
    { id: 'COMPLETED', label: 'Completed', count: orderCounts.delivered || 0 },
    {
      id: 'PENDING',
      label: 'Pending',
      count: orders.filter((o) => {
        const s = (o.status || '').toUpperCase();
        const p = (o.payment_status || '').toUpperCase();
        const isCod = (o.payment_method || '').toUpperCase() === 'COD';
        return s === 'PENDING' && p !== 'PAID' && !isCod;
      }).length,
    },
    { id: 'CANCELLED', label: 'Canceled', count: orderCounts.cancelled || 0 },
    { id: 'FAILED_TO_DELIVER', label: 'Failed delivery', count: orderCounts.failedToDeliver || 0 },
  ];

  const statusOptions = [
    { value: 'PENDING', label: 'Pending Payment / Acceptance' },
    { value: 'TO_SHIP', label: 'To Ship (Ready for Dispatch)' },
    { value: 'AWAITING_COLLECTION', label: 'Awaiting Collection (Packed)' },
    { value: 'SHIPPED', label: 'Shipped (In Transit)' },
    { value: 'TO_DELIVER', label: 'To Deliver (With Courier)' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'RETURNED', label: 'Returned / Refunded' },
    { value: 'FAILED_TO_DELIVER', label: 'Delivery Failed' },
  ];

  // Filter orders by active pipeline tab, sub-tab, and search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Tab filtering
      if (activeTab !== 'ALL') {
        const orderStatus = (order.status || 'PENDING').toUpperCase();

        if (activeTab === 'TO_SHIP') {
          if (!isToShipOrder(order)) return false;

          const stage = getFulfillmentStage(order);
          if (toShipSubTab === 'AWAITING_SHIPMENT') {
            if (stage !== 'AWAITING_SHIPMENT') return false;
          } else if (toShipSubTab === 'AWAITING_COLLECTION') {
            if (stage !== 'AWAITING_COLLECTION') return false;
          }
        } else if (activeTab === 'SHIPPED') {
          if (orderStatus !== 'SHIPPED') return false;
        } else if (activeTab === 'TO_DELIVER') {
          if (orderStatus !== 'TO_DELIVER') return false;
        } else if (activeTab === 'COMPLETED') {
          if (orderStatus !== 'DELIVERED' && orderStatus !== 'COMPLETED') return false;
        } else if (activeTab === 'PENDING') {
          const paymentStatus = (order.payment_status || 'PENDING').toUpperCase();
          const isPaid = paymentStatus === 'PAID';
          const isCod = (order.payment_method || '').toUpperCase() === 'COD';
          if (orderStatus !== 'PENDING' || isPaid || isCod) return false;
        } else if (activeTab === 'CANCELLED') {
          if (orderStatus !== 'CANCELLED') return false;
        } else if (activeTab === 'RETURNED') {
          if (orderStatus !== 'RETURNED' && orderStatus !== 'REFUNDED') return false;
        } else if (activeTab === 'FAILED_TO_DELIVER') {
          if (orderStatus !== 'FAILED_TO_DELIVER' && orderStatus !== 'DELIVERY_FAILED') return false;
        }
      }

      // 2. Search query filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const refMatch = (order.order_reference || '').toLowerCase().includes(q);
        const nameMatch = (order.customer_name || '').toLowerCase().includes(q);
        const emailMatch = (order.customer_email || '').toLowerCase().includes(q);
        const phoneMatch = (order.customer_phone || '').toLowerCase().includes(q);
        const trackingMatch = (order.tracking_number || '').toLowerCase().includes(q);
        return refMatch || nameMatch || emailMatch || phoneMatch || trackingMatch;
      }

      return true;
    });
  }, [orders, activeTab, toShipSubTab, searchQuery]);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDays = Math.floor(diffHour / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // TikTok Seller Center "Arrange Shipment" flow:
  // - Moves status to AWAITING_COLLECTION
  // - Generates J&T Express tracking number if unassigned
  // - Opens A6 2-page print modal
  const handleArrangeShipment = async (order, options = { printAfter: true }) => {
    setIsArrangingShipmentId(order.id);
    setActiveDropdownOrderId(null);
    try {
      let finalOrder = { ...order };

      // 1. If tracking number not yet assigned, call J&T Express dispatch API
      if (!order.tracking_number) {
        try {
          const res = await fetch(`/api/jt-dispatch?ref=${order.order_reference}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderReference: order.order_reference,
              status: 'AWAITING_COLLECTION',
            }),
          });
          const data = await res.json();
          if (data && data.trackingNumber) {
            finalOrder = {
              ...finalOrder,
              tracking_number: data.trackingNumber,
              courier_name: data.courierName || 'J&T Express',
              waybill_url: data.waybillUrl,
              shipment_status: 'BOOKED',
            };
          }
        } catch (dispatchErr) {
          console.warn('[Arrange Shipment] J&T Dispatch API note:', dispatchErr.message);
        }
      }

      // 2. Transition status to AWAITING_COLLECTION
      const modifierInfo = {
        name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
        email: currentAdmin?.email || '',
        role: currentAdmin?.role || 'Admin',
        action: `Arranged shipment (Moved to Awaiting Collection)`,
        timestamp: new Date().toISOString(),
      };

      if (onUpdateOrderStatus) {
        await onUpdateOrderStatus(order.id, 'AWAITING_COLLECTION', modifierInfo, {
          shipment_status: 'BOOKED',
          tracking_number: finalOrder.tracking_number,
          courier_name: finalOrder.courier_name || 'J&T Express',
          waybill_url: finalOrder.waybill_url,
        });
      }

      const readyOrder = {
        ...finalOrder,
        status: 'AWAITING_COLLECTION',
        shipment_status: 'BOOKED',
      };

      setShipmentFeedback({
        type: 'success',
        orderRef: order.order_reference,
        message: `Shipment arranged! Order moved to Awaiting Collection.`,
        orderObj: readyOrder,
      });

      // 3. Automatically open 2-page A6 print modal
      if (options.printAfter) {
        setA6PrintOrder(readyOrder);
      }

      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Arrange shipment error:', err);
      alert(`Could not arrange shipment: ${err.message}`);
    } finally {
      setIsArrangingShipmentId(null);
    }
  };

  // TikTok Seller Center "Add Note" flow:
  // - Saves flag (Red = moved to collection but not packed yet, etc.) and note text
  // - Triggers Arrange Shipment (transitions status to AWAITING_COLLECTION)
  // - Opens A6 2-page print modal with Waybill and Order List
  const handleSaveNoteAndArrange = async ({ flag, note }) => {
    if (!noteModalOrder) return;
    setIsSavingNote(true);
    try {
      const notePayload = JSON.stringify({
        flag,
        note: note.trim(),
        updatedAt: new Date().toISOString(),
      });

      let finalOrder = {
        ...noteModalOrder,
        admin_notes: notePayload,
      };

      // Ensure J&T tracking number is present
      if (!finalOrder.tracking_number) {
        try {
          const res = await fetch(`/api/jt-dispatch?ref=${noteModalOrder.order_reference}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderReference: noteModalOrder.order_reference,
              status: 'AWAITING_COLLECTION',
            }),
          });
          const data = await res.json();
          if (data && data.trackingNumber) {
            finalOrder.tracking_number = data.trackingNumber;
            finalOrder.courier_name = data.courierName || 'J&T Express';
            finalOrder.waybill_url = data.waybillUrl;
            finalOrder.shipment_status = 'BOOKED';
          }
        } catch (e) {
          console.warn('[Add Note] Dispatch note:', e.message);
        }
      }

      const flagLabel = flag !== 'none' ? `${flag.toUpperCase()} flag` : 'No flag';
      const modifierInfo = {
        name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
        email: currentAdmin?.email || '',
        role: currentAdmin?.role || 'Admin',
        action: `Added note (${flagLabel}): "${note.trim()}" & arranged shipment`,
        timestamp: new Date().toISOString(),
      };

      // Update in Supabase: status to AWAITING_COLLECTION, note, and tracking
      if (onUpdateOrderStatus) {
        await onUpdateOrderStatus(noteModalOrder.id, 'AWAITING_COLLECTION', modifierInfo, {
          admin_notes: notePayload,
          shipment_status: 'BOOKED',
          tracking_number: finalOrder.tracking_number,
          courier_name: finalOrder.courier_name || 'J&T Express',
          waybill_url: finalOrder.waybill_url,
        });
      }

      const readyOrder = {
        ...finalOrder,
        status: 'AWAITING_COLLECTION',
        admin_notes: notePayload,
      };

      setShipmentFeedback({
        type: 'success',
        orderRef: noteModalOrder.order_reference,
        message: `Note saved with ${flagLabel}! Moved to Awaiting Collection.`,
        orderObj: readyOrder,
      });

      setNoteModalOrder(null);
      // Automatically open 2-page A6 print modal
      setA6PrintOrder(readyOrder);

      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Save note error:', err);
      alert(`Failed to save note: ${err.message}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleStatusChange = async (order, newStatus) => {
    if (!onUpdateOrderStatus) return;
    setIsUpdatingStatus(order.id);
    const modifierInfo = {
      name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
      email: currentAdmin?.email || '',
      role: currentAdmin?.role || 'Admin',
      action: `Status changed to ${newStatus}`,
      timestamp: new Date().toISOString(),
    };
    try {
      await onUpdateOrderStatus(order.id, newStatus, modifierInfo);
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) => ({
          ...prev,
          status: newStatus,
          last_touched_by: modifierInfo,
          audit_trail: [modifierInfo, ...(Array.isArray(prev.audit_trail) ? prev.audit_trail : [])]
        }));
      }
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const startEditTracking = (order) => {
    setEditingTrackingId(order.id);
    setTrackingForm({
      courierName: order.courier_name || 'J&T Express',
      trackingNumber: order.tracking_number || '',
    });
  };

  const handleSaveTracking = async (orderId) => {
    if (!onUpdateOrderTracking) return;
    const modifierInfo = {
      name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
      email: currentAdmin?.email || '',
      role: currentAdmin?.role || 'Admin',
      action: `Tracking updated (${trackingForm.courierName} #${trackingForm.trackingNumber})`,
      timestamp: new Date().toISOString(),
    };
    try {
      await onUpdateOrderTracking(orderId, trackingForm.trackingNumber, trackingForm.courierName, modifierInfo);
      setEditingTrackingId(null);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({
          ...prev,
          courier_name: trackingForm.courierName,
          tracking_number: trackingForm.trackingNumber,
          last_touched_by: modifierInfo,
          audit_trail: [modifierInfo, ...(Array.isArray(prev.audit_trail) ? prev.audit_trail : [])]
        }));
      }
    } catch (err) {
      console.error('Failed to update tracking:', err);
    }
  };

  // 1-Click Shipmates Test Booking Dispatcher
  const handleBookShipmates = async (order) => {
    setBookingShipmateId(order.id);
    setShipmentFeedback(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/shipmates-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderReference: order.order_reference }),
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(`Endpoint returned non-JSON (${res.status}): ${text.slice(0, 100) || 'Empty response'}`);
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch booking to Shipmates');
      }

      const modifierInfo = {
        name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
        email: currentAdmin?.email || '',
        role: currentAdmin?.role || 'Admin',
        action: `Booked with ${data.courierName} (Waybill #${data.trackingNumber})`,
        timestamp: new Date().toISOString(),
      };

      if (onUpdateOrderTracking) {
        await onUpdateOrderTracking(order.id, data.trackingNumber, data.courierName, modifierInfo);
      }

      const updatedOrderObj = {
        ...order,
        tracking_number: data.trackingNumber,
        courier_name: data.courierName,
        waybill_url: data.waybillUrl,
        shipment_status: 'BOOKED',
        status: 'TO_SHIP',
        last_touched_by: modifierInfo,
      };

      setShipmentFeedback({
        type: 'success',
        orderRef: order.order_reference,
        message: `Booked with ${data.courierName}! Tracking: ${data.trackingNumber}`,
        waybillUrl: data.waybillUrl,
        orderObj: updatedOrderObj,
      });

      if (onRefresh) {
        await onRefresh();
      }

      // If viewing in modal, update selectedOrder
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) => ({
          ...prev,
          tracking_number: data.trackingNumber,
          courier_name: data.courierName,
          waybill_url: data.waybillUrl,
          shipment_status: 'BOOKED',
          status: 'TO_SHIP',
          last_touched_by: modifierInfo,
          audit_trail: [modifierInfo, ...(Array.isArray(prev.audit_trail) ? prev.audit_trail : [])],
        }));
      }
    } catch (err) {
      console.error('Shipmates booking error:', err);
      setShipmentFeedback({
        type: 'error',
        orderRef: order.order_reference,
        message: err.message || 'Failed to connect to Shipmates API',
      });
    } finally {
      setBookingShipmateId(null);
    }
  };

  const handleBulkBookShipmates = async () => {
    setIsBulkBooking(true);
    setShipmentFeedback(null);
    const ordersToBook = filteredOrders.filter(o => selectedOrderIds.includes(o.id));
    let successCount = 0;
    let failCount = 0;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    for (const order of ordersToBook) {
      try {
        const res = await fetch('/api/shipmates-book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ orderReference: order.order_reference }),
        });
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch(e) {}
        
        if (res.ok && data.success) {
          const modifierInfo = {
            name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
            email: currentAdmin?.email || '',
            role: currentAdmin?.role || 'Admin',
            action: `Bulk Booked with ${data.courierName} (#${data.trackingNumber})`,
            timestamp: new Date().toISOString(),
          };
          if (onUpdateOrderTracking) {
            await onUpdateOrderTracking(order.id, data.trackingNumber, data.courierName, modifierInfo);
          }
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setShipmentFeedback({
      type: successCount > 0 ? 'success' : 'error',
      orderRef: 'BULK',
      message: `Bulk Booking Complete: ${successCount} successful, ${failCount} failed.`,
    });

    if (onRefresh) await onRefresh();
    setIsBulkBooking(false);
    setSelectedOrderIds([]);
  };

  // 1-Click Accept Order (moves PENDING to TO_SHIP)
  const handleAcceptOrder = async (order) => {
    if (!onUpdateOrderStatus) return;
    setIsAcceptingOrderId(order.id);
    const modifierInfo = {
      name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
      email: currentAdmin?.email || '',
      role: currentAdmin?.role || 'Admin',
      action: 'Order accepted for fulfillment (Moved to To Ship)',
      timestamp: new Date().toISOString(),
    };
    try {
      await onUpdateOrderStatus(order.id, 'TO_SHIP', modifierInfo);
      setShipmentFeedback({
        type: 'success',
        orderRef: order.order_reference,
        message: `Order accepted! Status transitioned to TO_SHIP. Ready for parcel packing & J&T dispatch.`,
      });
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) => ({
          ...prev,
          status: 'TO_SHIP',
          last_touched_by: modifierInfo,
          audit_trail: [modifierInfo, ...(Array.isArray(prev.audit_trail) ? prev.audit_trail : [])],
        }));
      }
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Accept order failed:', err);
      setShipmentFeedback({
        type: 'error',
        orderRef: order.order_reference,
        message: err.message || 'Failed to accept order',
      });
    } finally {
      setIsAcceptingOrderId(null);
    }
  };

  // Bulk Accept Orders
  const handleBulkAcceptOrders = async () => {
    const pendingOrders = filteredOrders.filter(
      (o) => selectedOrderIds.includes(o.id) && (o.status || '').toUpperCase() === 'PENDING'
    );
    if (pendingOrders.length === 0) return;

    let count = 0;
    for (const ord of pendingOrders) {
      const modifierInfo = {
        name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
        email: currentAdmin?.email || '',
        role: currentAdmin?.role || 'Admin',
        action: 'Bulk accepted order for fulfillment',
        timestamp: new Date().toISOString(),
      };
      try {
        await onUpdateOrderStatus(ord.id, 'TO_SHIP', modifierInfo);
        count++;
      } catch (e) {
        console.warn('Bulk accept error:', e);
      }
    }

    setShipmentFeedback({
      type: 'success',
      orderRef: 'BULK ACCEPT',
      message: `Accepted ${count} orders for shipping.`,
    });
    setSelectedOrderIds([]);
    if (onRefresh) await onRefresh();
  };

  // Open Dispatch Modal
  const openDispatchModal = (order) => {
    const totalQty = order.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1;
    const estimatedWeight = Math.max(0.35, Math.round(totalQty * 0.35 * 100) / 100).toFixed(2);
    const suggestedPouch = totalQty > 4 ? 'large' : totalQty > 2 ? 'medium' : 'small';

    setDispatchForm({
      weightKg: String(estimatedWeight),
      pouchSize: suggestedPouch,
      preferredCourier: order.courier_name || 'J&T Express',
      notes: 'Handle with care - apparel. Call before delivery.',
    });
    setDispatchModalOrder(order);
  };

  // Confirm and Execute J&T Dispatch
  const handleConfirmJntDispatch = async () => {
    if (!dispatchModalOrder) return;
    setIsDispatchingJnt(true);
    setShipmentFeedback(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      // Direct J&T Express Open API Booking
      let res = await fetch('/api/jt-dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderReference: dispatchModalOrder.order_reference,
          weightKg: parseFloat(dispatchForm.weightKg) || 0.5,
          notes: dispatchForm.notes,
          status: 'AWAITING_COLLECTION',
        }),
      });

      // Fallback to Shipmates if direct J&T fails
      if (!res.ok) {
        res = await fetch('/api/shipmates-book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            orderReference: dispatchModalOrder.order_reference,
            preferredCourier: dispatchForm.preferredCourier,
            weightKg: parseFloat(dispatchForm.weightKg) || 0.5,
            pouchSize: dispatchForm.pouchSize,
            notes: dispatchForm.notes,
            forceRebook: true,
          }),
        });
      }

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(`Endpoint returned non-JSON (${res.status}): ${text.slice(0, 100) || 'Empty'}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch shipment to J&T Express');
      }

      const modifierInfo = {
        name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
        email: currentAdmin?.email || '',
        role: currentAdmin?.role || 'Admin',
        action: `Dispatched to ${data.courierName} (AWB #${data.trackingNumber}, ${dispatchForm.pouchSize.toUpperCase()} Pouch, ${dispatchForm.weightKg}kg)`,
        timestamp: new Date().toISOString(),
      };

      if (onUpdateOrderTracking) {
        await onUpdateOrderTracking(dispatchModalOrder.id, data.trackingNumber, data.courierName, modifierInfo);
      }
      if (onUpdateOrderStatus) {
        await onUpdateOrderStatus(dispatchModalOrder.id, 'AWAITING_COLLECTION', modifierInfo, {
          tracking_number: data.trackingNumber,
          courier_name: data.courierName,
          waybill_url: data.waybillUrl,
          shipment_status: 'BOOKED',
        });
      }

      const updatedOrderObj = {
        ...dispatchModalOrder,
        tracking_number: data.trackingNumber,
        courier_name: data.courierName,
        waybill_url: data.waybillUrl,
        shipment_status: 'BOOKED',
        status: 'AWAITING_COLLECTION',
        last_touched_by: modifierInfo,
      };

      setShipmentFeedback({
        type: 'success',
        orderRef: dispatchModalOrder.order_reference,
        message: `Successfully booked with ${data.courierName}! Tracking Number: ${data.trackingNumber}`,
        waybillUrl: data.waybillUrl,
        orderObj: updatedOrderObj,
      });

      if (selectedOrder && selectedOrder.id === dispatchModalOrder.id) {
        setSelectedOrder(updatedOrderObj);
      }

      const targetOrderForWaybill = updatedOrderObj;
      setDispatchModalOrder(null);
      // Automatically open the thermal waybill for instant printing
      setSelectedWaybillOrder(targetOrderForWaybill);

      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('J&T Dispatch Error:', err);
      setShipmentFeedback({
        type: 'error',
        orderRef: dispatchModalOrder.order_reference,
        message: err.message || 'Courier dispatch failed',
      });
    } finally {
      setIsDispatchingJnt(false);
    }
  };

  // Open Bulk Thermal Waybill Modal
  const handleBulkPrintWaybills = () => {
    const ordersWithTracking = filteredOrders.filter(
      (o) => selectedOrderIds.includes(o.id) && Boolean(o.tracking_number)
    );
    if (ordersWithTracking.length === 0) {
      alert('None of the selected orders have tracking numbers assigned yet. Please dispatch to J&T first.');
      return;
    }
    setBulkWaybillOrders(ordersWithTracking);
  };

  // Confirm Order Cancellation
  const handleConfirmCancelOrder = async () => {
    if (!cancellingOrder || !onUpdateOrderStatus) return;
    setIsSubmittingCancel(true);
    const reasonText = cancelNotes.trim() ? `${cancelReason} (${cancelNotes.trim()})` : cancelReason;
    const modifierInfo = {
      name: currentAdmin?.name || currentAdmin?.email?.split('@')[0] || 'Administrator',
      email: currentAdmin?.email || '',
      role: currentAdmin?.role || 'Admin',
      action: `Order cancelled: ${reasonText}`,
      timestamp: new Date().toISOString(),
    };
    const isPaid = (cancellingOrder.payment_status || '').toUpperCase() === 'PAID';
    const isCod = (cancellingOrder.payment_method || '').toUpperCase() === 'COD';
    const newPaymentStatus = isPaid ? 'REFUND_PENDING' : (isCod ? 'CANCELLED' : cancellingOrder.payment_status);

    try {
      await onUpdateOrderStatus(cancellingOrder.id, 'CANCELLED', modifierInfo, {
        payment_status: newPaymentStatus,
        cancellation_reason: reasonText,
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'ADMIN',
      });
      setShipmentFeedback({
        type: 'success',
        orderRef: cancellingOrder.order_reference,
        message: `Order cancelled (${reasonText}). Inventory returned to shelf.${isPaid ? ' Refund required via Xendit.' : ''}`,
      });
      if (selectedOrder && selectedOrder.id === cancellingOrder.id) {
        setSelectedOrder((prev) => ({
          ...prev,
          status: 'CANCELLED',
          payment_status: newPaymentStatus,
          cancellation_reason: reasonText,
          cancelled_by: 'ADMIN',
          cancelled_at: new Date().toISOString(),
          last_touched_by: modifierInfo,
          audit_trail: [modifierInfo, ...(Array.isArray(prev.audit_trail) ? prev.audit_trail : [])],
        }));
      }
      setCancellingOrder(null);
      setCancelNotes('');
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Cancel order error:', err);
      setShipmentFeedback({
        type: 'error',
        orderRef: cancellingOrder.order_reference,
        message: err.message || 'Failed to cancel order',
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SHIPPED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'AWAITING_COLLECTION':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'AWAITING_SHIPMENT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'TO_DELIVER':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'TO_SHIP':
      case 'PROCESSING':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RETURNED':
      case 'REFUNDED':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'FAILED_TO_DELIVER':
      case 'DELIVERY_FAILED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };
  const handleExportCSV = () => {
    if (!orders || orders.length === 0) return;

    // Define CSV headers
    const headers = [
      'Order ID',
      'Order Reference',
      'Date Created',
      'Customer Name',
      'Email',
      'Phone',
      'Address',
      'Barangay',
      'City',
      'Province',
      'Zip',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Subtotal',
      'Shipping Fee',
      'Discount',
      'Total Amount',
      'Courier Name',
      'Tracking Number'
    ];

    // Escape CSV values
    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvRows = [headers.join(',')];

    orders.forEach(order => {
      const row = [
        order.id,
        order.order_reference,
        formatDate(order.created_at),
        order.customer_name,
        order.customer_email,
        order.customer_phone,
        order.customer_address,
        order.customer_barangay,
        order.customer_city,
        order.customer_province,
        order.customer_zip,
        order.payment_method,
        order.payment_status,
        order.status,
        order.subtotal,
        order.shipping_fee,
        order.discount_amount,
        order.total_amount,
        order.courier_name,
        order.tracking_number
      ].map(escapeCSV);

      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              Orders & Shipping
            </span>
            <span className="text-xs text-slate-400 font-medium">Logistics & Shipmates Test Dispatch</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
            Manage Orders
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track fulfillment pipeline stages, Shipmates courier booking, and waybill printing.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isLoading ? 'Syncing...' : 'Sync Orders'}</span>
          </button>
        </div>
      </div>

      {/* Shipment Feedback Banner */}
      {shipmentFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            shipmentFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {shipmentFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <div>
              <strong className="font-semibold">[{shipmentFeedback.orderRef}]</strong> {shipmentFeedback.message}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const targetOrder =
                  shipmentFeedback.orderObj ||
                  orders.find((o) => o.order_reference === shipmentFeedback.orderRef);
                if (targetOrder) setSelectedWaybillOrder(targetOrder);
              }}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Open Printable Thermal Air Waybill"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Waybill (AWB)</span>
            </button>
            <button
              onClick={() => setShipmentFeedback(null)}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Order Status Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all rounded-xl cursor-pointer flex items-center gap-2 border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-600/20'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TikTok Seller Center Fulfillment Pipeline Sub-Tabs (Shown when 'TO_SHIP' is active) */}
      {activeTab === 'TO_SHIP' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Pipeline Stage:</span>
            </div>

            <button
              type="button"
              onClick={() => setToShipSubTab('AWAITING_SHIPMENT')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 border ${
                toShipSubTab === 'AWAITING_SHIPMENT'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs shadow-teal-600/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Awaiting shipment</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  toShipSubTab === 'AWAITING_SHIPMENT' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {awaitingShipmentCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setToShipSubTab('AWAITING_COLLECTION')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 border ${
                toShipSubTab === 'AWAITING_COLLECTION'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs shadow-teal-600/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Awaiting collection</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  toShipSubTab === 'AWAITING_COLLECTION' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {awaitingCollectionCount}
              </span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-xl text-[11px] font-medium">
              <Truck className="w-3 h-3 text-red-600" />
              <span>Courier: <strong>J&T Express</strong></span>
            </div>
          </div>

          <div className="text-[11px] font-medium text-slate-500">
            {toShipSubTab === 'AWAITING_SHIPMENT'
              ? 'Orders awaiting packing & arrangement'
              : 'Orders packed & ready for courier collection'}
          </div>
        </div>
      )}

      {/* Search & Counter Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order ref, customer name, tracking #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white rounded-xl placeholder:text-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong className="text-slate-900">{filteredOrders.length}</strong> of <strong className="text-slate-900">{orders.length}</strong> total orders
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedOrderIds.length > 0 && (() => {
        const pendingSelected = filteredOrders.filter(
          (o) => selectedOrderIds.includes(o.id) && (o.status || '').toUpperCase() === 'PENDING'
        );
        const trackingSelected = filteredOrders.filter(
          (o) => selectedOrderIds.includes(o.id) && Boolean(o.tracking_number)
        );

        return (
          <div className="bg-blue-50/80 p-3 sm:p-4 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-xs">
                {selectedOrderIds.length}
              </div>
              <div>
                <span className="text-sm font-bold text-blue-950 block">Orders Selected</span>
                <span className="text-[11px] text-blue-700">
                  {pendingSelected.length} pending acceptance • {trackingSelected.length} with tracking
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedOrderIds([])}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200/80 rounded-xl cursor-pointer transition-colors"
              >
                Clear
              </button>

              {pendingSelected.length > 0 && (
                <button
                  onClick={handleBulkAcceptOrders}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Move all selected pending orders to To Ship"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept ({pendingSelected.length})</span>
                </button>
              )}

              {trackingSelected.length > 0 && (
                <button
                  onClick={handleBulkPrintWaybills}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Print official thermal waybills for all selected dispatched orders"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print ({trackingSelected.length}) Waybills</span>
                </button>
              )}

              <button
                onClick={handleBulkBookShipmates}
                disabled={isBulkBooking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${isBulkBooking ? 'animate-spin' : ''}`} />
                <span>{isBulkBooking ? 'Processing...' : 'Bulk Book Riders'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Select All Row */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
          <input
            type="checkbox"
            checked={selectedOrderIds.length === filteredOrders.length}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-500">Select All Displayed</span>
        </div>
      )}

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-2 shadow-xs">
          <Package className="w-10 h-10 text-slate-400 mx-auto stroke-[1.5]" />
          <h3 className="font-sans font-bold text-sm text-slate-800">No Orders Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            There are currently no customer transactions under "{tabs.find((t) => t.id === activeTab)?.label}".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPaid =
              (order.payment_status || '').toUpperCase() === 'PAID' ||
              (order.status || '').toUpperCase() === 'COMPLETED';
            const isCod = (order.payment_method || '').toUpperCase() === 'COD';
            const itemsCount = order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 1;
            const isEditingThisTracking = editingTrackingId === order.id;
            const isBookingThis = bookingShipmateId === order.id;
            const hasTracking = Boolean(order.tracking_number);
            const parsedNote = parseOrderNote(order.admin_notes);
            const fulfillmentStage = getFulfillmentStage(order);
            const isInToShip = isToShipOrder(order);

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200/80 hover:border-blue-400/80 transition-all p-5 shadow-xs space-y-4 rounded-2xl"
              >
                {/* Header Row: Ref, Date, Customer, Payment Badge, Amount */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div className="flex items-start lg:items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => toggleSelectOrder(order.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-1 lg:mt-0"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      <span className="font-sans font-bold text-sm text-slate-900">
                        {order.order_reference}
                      </span>

                      {/* Flag Indicator Badge if set */}
                      {parsedNote.flag !== 'none' && (() => {
                        const flagMeta = FLAG_OPTIONS.find((f) => f.id === parsedNote.flag);
                        return (
                          <button
                            type="button"
                            onClick={() => setNoteModalOrder(order)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold cursor-pointer transition-all ${
                              flagMeta?.bgColor || 'bg-slate-100'
                            } ${flagMeta?.borderColor || 'border-slate-300'} text-slate-800 hover:shadow-xs`}
                            title={parsedNote.note ? `Note: "${parsedNote.note}" (Click to edit)` : 'Click to edit note'}
                          >
                            <Bookmark className={`w-3 h-3 ${flagMeta?.iconColor || 'text-slate-500'}`} />
                            <span>{flagMeta?.label || 'Flag'}</span>
                            {parsedNote.note && (
                              <span className="font-normal truncate max-w-[140px] text-slate-600">
                                "{parsedNote.note}"
                              </span>
                            )}
                          </button>
                        );
                      })()}

                      {/* Fulfillment Stage / Status Badge */}
                      {isInToShip ? (
                        <span
                          className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                            fulfillmentStage === 'AWAITING_COLLECTION'
                              ? 'bg-teal-50 text-teal-800 border-teal-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {fulfillmentStage === 'AWAITING_COLLECTION' ? 'Awaiting collection' : 'Awaiting shipment'}
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                            order.status
                          )}`}
                        >
                          {order.status || 'PENDING'}
                        </span>
                      )}

                      {/* Customer Cancelled Tag */}
                      {(order.status || '').toUpperCase() === 'CANCELLED' && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full flex items-center gap-1">
                          <User className="w-3 h-3 text-rose-600" />
                          <span>{order.cancelled_by === 'CUSTOMER' || (order.admin_notes || '').includes('[Customer Cancelled]') ? 'Cancelled by Client' : 'Cancelled by Staff'}</span>
                        </span>
                      )}

                      {/* Payment Status Tag */}
                      {order.payment_status === 'REFUND_PENDING' ? (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-amber-500 text-white rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>REFUND REQUIRED</span>
                        </span>
                      ) : order.payment_status === 'REFUNDED' ? (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>REFUNDED</span>
                        </span>
                      ) : order.payment_status === 'CANCELLED' ? (
                        <span className="text-[10px] uppercase font-medium px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-300 rounded-full">
                          VOIDED
                        </span>
                      ) : isCod ? (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-full">
                          COD (₱{(Number(order.total_amount) || 0).toLocaleString()})
                        </span>
                      ) : isPaid ? (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                          PAID
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                          PENDING PAYMENT
                        </span>
                      )}

                      {/* Courier Dispatch Status Tag */}
                      {hasTracking ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1">
                          <Truck className="w-3 h-3 text-blue-600" />
                          <span>{order.courier_name || 'J&T Express'}: {order.tracking_number}</span>
                        </span>
                      ) : (isPaid || isCod) ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-purple-600" />
                          <span>Ready for J&T Dispatch</span>
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-slate-500">
                      Placed on {formatDate(order.created_at)} • Customer:{' '}
                      <strong className="text-slate-800">{order.customer_name}</strong>
                      {order.customer_phone ? ` (${order.customer_phone})` : ''}
                      {order.customer_email ? ` • ${order.customer_email}` : ''}
                    </p>

                    {/* Cancellation Reason Callout if Cancelled */}
                    {(order.status || '').toUpperCase() === 'CANCELLED' && (order.cancellation_reason || (order.admin_notes || '').includes('[Customer Cancelled]')) && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-800 bg-rose-50 border border-rose-200/90 rounded-lg px-2.5 py-1">
                        <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>
                          <strong>Cancellation Reason:</strong>{' '}
                          {order.cancellation_reason || 'Client requested cancellation while awaiting shipment.'}
                        </span>
                      </div>
                    )}

                    {/* Last touched by indicator */}
                    {order.last_touched_by && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          <UserCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span>Last touched by: <strong className="text-slate-900 font-semibold">{order.last_touched_by.name || order.last_touched_by.email}</strong> ({order.last_touched_by.role || 'Staff'})</span>
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{formatTimeAgo(order.last_touched_by.timestamp) || formatDate(order.last_touched_by.timestamp)}</span>
                        {order.last_touched_by.action && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 italic">"{order.last_touched_by.action}"</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 sm:gap-4">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Total Amount</span>
                      <span className="font-sans text-base font-bold text-slate-900">
                        ₱{(Number(order.total_amount) || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* TikTok Seller Center Arrange Shipment / Print Documents Button */}
                    {isInToShip ? (
                      <div className="relative inline-flex items-center">
                        {fulfillmentStage === 'AWAITING_SHIPMENT' ? (
                          <div className="inline-flex rounded-xl shadow-xs overflow-visible">
                            <button
                              onClick={() => handleArrangeShipment(order, { printAfter: true })}
                              disabled={isArrangingShipmentId === order.id}
                              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs rounded-l-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              title="Arrange shipment and open 2-page A6 waybill & order list"
                            >
                              {isArrangingShipmentId === order.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Package className="w-3.5 h-3.5" />
                              )}
                              <span>{isArrangingShipmentId === order.id ? 'Arranging...' : 'Arrange shipment'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownOrderId((prev) => (prev === order.id ? null : order.id));
                              }}
                              className="px-2 py-1.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-r-xl border-l border-teal-500 transition-all cursor-pointer flex items-center justify-center"
                              title="More options"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdownOrderId === order.id ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex rounded-xl shadow-xs overflow-visible">
                            <button
                              onClick={() => setA6PrintOrder(order)}
                              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs rounded-l-xl transition-all cursor-pointer flex items-center gap-1.5"
                              title="Print 2-page A6 official waybill and packing list"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print documents</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownOrderId((prev) => (prev === order.id ? null : order.id));
                              }}
                              className="px-2 py-1.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-r-xl border-l border-teal-500 transition-all cursor-pointer flex items-center justify-center"
                              title="More options"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdownOrderId === order.id ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        )}

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {activeDropdownOrderId === order.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs font-medium text-slate-700 divide-y divide-slate-100"
                            >
                              {fulfillmentStage === 'AWAITING_SHIPMENT' && (
                                <div className="py-1">
                                  <button
                                    onClick={() => handleArrangeShipment(order, { printAfter: true })}
                                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-teal-700 font-semibold cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Arrange shipment + print</span>
                                  </button>
                                  <button
                                    onClick={() => handleArrangeShipment(order, { printAfter: false })}
                                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Package className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Arrange shipment only</span>
                                  </button>
                                </div>
                              )}

                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setActiveDropdownOrderId(null);
                                    setA6PrintOrder(order);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Print documents (A6)</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveDropdownOrderId(null);
                                    setNoteModalOrder(order);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                                  <span>{parsedNote.flag !== 'none' || parsedNote.note ? 'Edit note & flag' : 'Add note'}</span>
                                </button>
                              </div>

                              <div className="py-1">
                                {order.customer_phone && (
                                  <a
                                    href={`tel:${order.customer_phone}`}
                                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer block text-slate-700"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Contact customer</span>
                                  </a>
                                )}

                                {(order.status || '').toUpperCase() !== 'CANCELLED' && (
                                  <button
                                    onClick={() => {
                                      setActiveDropdownOrderId(null);
                                      setCancellingOrder(order);
                                    }}
                                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Cancel order</span>
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      /* Actions for Shipped, Delivered, etc. */
                      hasTracking && (
                        <button
                          onClick={() => setA6PrintOrder(order)}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Print 2-page A6 Waybill & Packing List"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print AWB</span>
                        </button>
                      )
                    )}

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Details</span>
                    </button>

                    {/* Cancel Order Action */}
                    {!isInToShip && (order.status || '').toUpperCase() !== 'CANCELLED' && (order.status || '').toUpperCase() !== 'DELIVERED' && (
                      <button
                        onClick={() => setCancellingOrder(order)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Cancel this order"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Middle Row: Purchased Garments Thumbnails & Shipping Info */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs items-center">
                  {/* Garment Items (7 cols) */}
                  <div className="md:col-span-7 flex flex-wrap items-center gap-2.5">
                    {order.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 p-1.5 bg-slate-50 border border-slate-200/80 rounded-xl"
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="w-10 h-12 object-cover bg-white border border-slate-200 rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="max-w-[160px]">
                          <p className="font-semibold text-slate-800 truncate text-xs" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Qty: {item.quantity || 1} • {typeof item.size === 'object' ? item.size?.name : (item.size || 'Std')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                      {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Address Summary (5 cols) */}
                  <div className="md:col-span-5 bg-slate-50 p-3 border border-slate-200/70 rounded-xl text-[11px]">
                    <div className="font-semibold text-slate-800 flex items-center gap-1 mb-0.5">
                      <Truck className="w-3 h-3 text-blue-600" />
                      <span>Shipping Address:</span>
                    </div>
                    {order.shipping_address ? (
                      <p className="text-slate-600 truncate" title={`${order.shipping_address.street}, ${order.shipping_address.city}`}>
                        {order.shipping_address.street}, {order.shipping_address.barangay}, {order.shipping_address.city},{' '}
                        {order.shipping_address.province || order.shipping_address.region}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">No address provided</p>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Quick Status Updater & Tracking Number Management */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/60 p-3 rounded-xl">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[11px] text-slate-600">
                      Status:
                    </span>
                    <select
                      value={(order.status || 'PENDING').toUpperCase()}
                      disabled={isUpdatingStatus === order.id}
                      onChange={(e) => handleStatusChange(order, e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-xs font-semibold text-slate-800 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {isUpdatingStatus === order.id && (
                      <span className="text-[10px] text-blue-600 font-semibold animate-pulse">Updating...</span>
                    )}
                  </div>

                  {/* Tracking Number Input / Link */}
                  <div className="flex items-center gap-3">
                    {isEditingThisTracking ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Tracking # (e.g. JT12345)"
                          value={trackingForm.trackingNumber}
                          onChange={(e) => setTrackingForm({ ...trackingForm, trackingNumber: e.target.value })}
                          className="px-2.5 py-1 text-xs bg-white border border-slate-200 text-slate-800 w-36 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleSaveTracking(order.id)}
                          className="p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg cursor-pointer transition-colors"
                          title="Save Tracking"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingTrackingId(null)}
                          className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 rounded-lg cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">
                          Tracking:{' '}
                          <strong className="text-slate-800">
                            {order.tracking_number || 'Unassigned'}
                          </strong>
                        </span>
                        <button
                          onClick={() => startEditTracking(order)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{order.tracking_number ? 'Edit' : 'Assign'}</span>
                        </button>

                        {order.tracking_number && (
                          <button
                            type="button"
                            onClick={() => setSelectedWaybillOrder(order)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 border-l border-slate-200 pl-2 ml-1 cursor-pointer"
                            title="View & Print Air Waybill (AWB)"
                          >
                            <FileText className="w-3 h-3 text-blue-500" />
                            <span>Waybill</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Refund Required Alert Strip on Order Card */}
                {order.payment_status === 'REFUND_PENDING' && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 text-amber-950 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                      <span>
                        Action Required: Refund <strong>₱{(Number(order.total_amount) || 0).toLocaleString()}</strong> to customer ({order.payment_method || 'Online'} via Xendit / GCash)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href="https://dashboard.xendit.co/invoices"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                      >
                        <span>Xendit Dashboard</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleMarkAsRefunded(order)}
                        disabled={isRefundingOrderId === order.id}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>{isRefundingOrderId === order.id ? 'Saving...' : 'Mark as Refunded'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View Full Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setSelectedOrder(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 rounded-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">
                    Order Manifest
                  </span>
                  <h2 className="font-sans text-xl font-bold text-slate-900">
                    {selectedOrder.order_reference}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Action */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Status:</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                        selectedOrder.status
                      )}`}
                    >
                      {selectedOrder.status || 'PENDING'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Payment:</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        selectedOrder.payment_status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : selectedOrder.payment_status === 'REFUND_PENDING'
                          ? 'bg-amber-500 text-white border-amber-600 font-extrabold animate-pulse'
                          : selectedOrder.payment_status === 'REFUNDED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {selectedOrder.payment_status || 'PENDING'}
                    </span>
                  </div>
                </div>
                <div className="sm:text-right text-[11px] text-slate-500">
                  <p>Ordered: {formatDate(selectedOrder.created_at)}</p>
                  <p className="font-semibold text-slate-800">Method: {selectedOrder.payment_method || 'GCASH'}</p>
                </div>
              </div>

              {/* Dedicated Cancellation Summary Banner in Modal */}
              {(selectedOrder.status || '').toUpperCase() === 'CANCELLED' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-rose-600" />
                      <span className="font-bold text-rose-950 uppercase tracking-wide">
                        Order Cancelled {selectedOrder.cancelled_by === 'CUSTOMER' ? 'by Customer' : 'by Admin'}
                      </span>
                    </div>
                    {selectedOrder.cancelled_at && (
                      <span className="text-[11px] text-rose-600">
                        {formatDate(selectedOrder.cancelled_at)}
                      </span>
                    )}
                  </div>
                  {selectedOrder.cancellation_reason && (
                    <p className="text-rose-800">
                      <strong>Reason:</strong> {selectedOrder.cancellation_reason}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-rose-700">
                    <span className="px-2 py-0.5 bg-white rounded border border-rose-200">
                      ✓ Reserved stock released to inventory
                    </span>
                    {selectedOrder.courier_cancelled && (
                      <span className="px-2 py-0.5 bg-white rounded border border-rose-200">
                        ✓ J&T Express pickup booking voided
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Required: Payment Refund Banner in Modal */}
              {(selectedOrder.payment_status === 'REFUND_PENDING' || (selectedOrder.payment_status === 'PAID' && (selectedOrder.status || '').toUpperCase() === 'CANCELLED')) && (
                <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
                      <div>
                        <h4 className="font-bold text-amber-950 text-sm">Action Required: Customer Payment Refund</h4>
                        <p className="text-amber-800 text-[11px]">The customer cancelled this order while awaiting shipment. The collected amount must be returned to the buyer.</p>
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-amber-950 bg-amber-200 px-2.5 py-1 rounded-lg">
                      ₱{(Number(selectedOrder.total_amount) || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white/90 p-3 rounded-lg border border-amber-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Payment Method</span>
                      <strong className="text-slate-900">{selectedOrder.payment_method || 'Online (Xendit)'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Customer Phone / GCash</span>
                      <strong className="text-slate-900">{selectedOrder.customer_phone || 'None provided'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Invoice / Reference</span>
                      <strong className="text-slate-900 truncate block" title={selectedOrder.xendit_invoice_id || selectedOrder.payment_id || selectedOrder.order_reference}>
                        {selectedOrder.xendit_invoice_id || selectedOrder.payment_id || selectedOrder.order_reference}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <a
                      href="https://dashboard.xendit.co/invoices"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>Open Xendit Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleMarkAsRefunded(selectedOrder)}
                      disabled={isRefundingOrderId === selectedOrder.id}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isRefundingOrderId === selectedOrder.id ? 'Updating Aura...' : 'Mark as Refunded in Aura'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Shipmates Logistics & Dispatch Panel */}
              <div className="p-4 bg-blue-50/50 border border-blue-200/60 rounded-xl text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-900">Shipmates Logistics Dispatch</span>
                  </div>
                  {selectedOrder.tracking_number ? (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                      Booked
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                      Unbooked
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px]">Courier</span>
                    <strong className="text-slate-800">{selectedOrder.courier_name || 'J&T Express'}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px]">Tracking Number</span>
                    <strong className="text-slate-800 truncate block">
                      {selectedOrder.tracking_number || 'Not Dispatched'}
                    </strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Air Waybill</span>
                      {selectedOrder.tracking_number ? (
                        <button
                          type="button"
                          onClick={() => setSelectedWaybillOrder(selectedOrder)}
                          className="text-blue-600 font-bold underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Print Waybill (AWB)</span>
                          <Printer className="w-3 h-3 text-blue-600" />
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Not available</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dispatch Trigger in Modal */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Accept Order if PENDING */}
                    {(selectedOrder.status || '').toUpperCase() === 'PENDING' && (
                      <button
                        onClick={() => handleAcceptOrder(selectedOrder)}
                        disabled={isAcceptingOrderId === selectedOrder.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isAcceptingOrderId === selectedOrder.id ? 'animate-spin' : ''}`} />
                        <span>Accept Order</span>
                      </button>
                    )}

                    <button
                      onClick={() => openDispatchModal(selectedOrder)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{selectedOrder.tracking_number ? 'Re-configure J&T Dispatch' : 'Dispatch J&T Express'}</span>
                    </button>

                    {selectedOrder.tracking_number && (
                      <button
                        type="button"
                        onClick={() => setSelectedWaybillOrder(selectedOrder)}
                        className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Waybill (AWB)</span>
                      </button>
                    )}

                    {selectedOrder.tracking_number && (
                      <button
                        type="button"
                        onClick={() => setAdminTrackingOrder(selectedOrder)}
                        className="px-3 py-1.5 bg-[#DA291C] hover:bg-[#b01e14] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Live J&T Express Checkpoint Trajectory"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track J&T Package</span>
                      </button>
                    )}

                    {(selectedOrder.status || '').toUpperCase() !== 'CANCELLED' && (selectedOrder.status || '').toUpperCase() !== 'DELIVERED' && (
                      <button
                        type="button"
                        onClick={() => setCancellingOrder(selectedOrder)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel Order</span>
                      </button>
                    )}
                  </div>

                  {selectedOrder.shipment_payload && (
                    <button
                      onClick={() => setShowRawPayload(!showRawPayload)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      {showRawPayload ? 'Hide API Payload' : 'Inspect Shipmates JSON Payload'}
                    </button>
                  )}
                </div>

                {showRawPayload && selectedOrder.shipment_payload && (
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[10px] overflow-x-auto max-h-48 scrollbar-thin">
                    {JSON.stringify(selectedOrder.shipment_payload, null, 2)}
                  </pre>
                )}

                {/* Interactive Delivery Progression Simulator */}
                <div className="pt-2 border-t border-blue-200/60">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block mb-1.5">
                    Advance Courier Delivery Stage (Click to Simulate / Update):
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleStatusChange(selectedOrder, 'SHIPPED');
                        setSelectedOrder((prev) => ({ ...prev, status: 'SHIPPED' }));
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedOrder.status === 'SHIPPED'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Truck className="w-3 h-3" />
                      <span>1. In Transit</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await handleStatusChange(selectedOrder, 'TO_DELIVER');
                        setSelectedOrder((prev) => ({ ...prev, status: 'TO_DELIVER' }));
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedOrder.status === 'TO_DELIVER'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>2. Out for Delivery</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await handleStatusChange(selectedOrder, 'DELIVERED');
                        setSelectedOrder((prev) => ({ ...prev, status: 'DELIVERED' }));
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedOrder.status === 'DELIVERED'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>3. Delivered</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await handleStatusChange(selectedOrder, 'TO_SHIP');
                        setSelectedOrder((prev) => ({ ...prev, status: 'TO_SHIP' }));
                      }}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        selectedOrder.status === 'TO_SHIP'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                      title="Reset to To Ship"
                    >
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer and Shipping Details */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-700">
                  Customer & Shipping Address
                </h4>
                <div className="bg-slate-50 p-4 border border-slate-200/80 rounded-xl space-y-1">
                  <p className="font-bold text-slate-900 text-sm">{selectedOrder.customer_name}</p>
                  <p className="text-slate-600">Phone: {selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_email && (
                    <p className="text-slate-600">Email: {selectedOrder.customer_email}</p>
                  )}
                  {selectedOrder.shipping_address && (
                    <p className="text-slate-800 pt-1">
                      {selectedOrder.shipping_address.street}, {selectedOrder.shipping_address.barangay},{' '}
                      {selectedOrder.shipping_address.city},{' '}
                      {selectedOrder.shipping_address.province || selectedOrder.shipping_address.region}{' '}
                      {selectedOrder.shipping_address.zipCode}
                    </p>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-slate-700">
                  Order Items
                </h4>
                <div className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-14 object-cover bg-slate-100 border border-slate-200 rounded-lg"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Size: {typeof item.size === 'object' ? item.size?.name : (item.size || 'Standard')}
                            {item.color && (typeof item.color === 'object' ? item.color?.name : item.color) !== 'Standard'
                              ? ` / ${typeof item.color === 'object' ? item.color?.name : item.color}`
                              : ''}{' '}
                            • Qty: {item.quantity || 1}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">
                        ₱{((Number(item.price) || 0) * (item.quantity || 1)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    ₱{(Number(selectedOrder.subtotal) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Courier Delivery Fee</span>
                  <span className="font-semibold text-slate-800">
                    ₱{(Number(selectedOrder.shipping_fee) || 150).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-bold text-slate-900">
                  <span>Total</span>
                  <span>₱{(Number(selectedOrder.total_amount) || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Audit Trail & Modifier History Section */}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <History className="w-4 h-4 text-indigo-600" />
                    <span>Audit Trail & Modifier History</span>
                  </div>
                  {selectedOrder.last_touched_by && (
                    <span className="text-[10px] text-slate-500">
                      Last edited by <strong className="text-slate-800">{selectedOrder.last_touched_by.name || selectedOrder.last_touched_by.email}</strong> ({formatTimeAgo(selectedOrder.last_touched_by.timestamp) || 'recently'})
                    </span>
                  )}
                </div>

                {Array.isArray(selectedOrder.audit_trail) && selectedOrder.audit_trail.length > 0 ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 divide-y divide-slate-200/60 max-h-48 overflow-y-auto space-y-2">
                    {selectedOrder.audit_trail.map((entry, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-[11px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-900 font-semibold">{entry.name || entry.email || 'Admin'}</strong>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                              {entry.role || 'Staff'}
                            </span>
                          </div>
                          <p className="text-slate-600">{entry.action || 'Updated order details'}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center text-[11px] text-slate-400">
                    No manual modifications recorded yet.
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Close Receipt
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 1: J&T EXPRESS DISPATCH SETUP & POUCH CUSTOMIZER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {dispatchModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-red-600 via-red-700 to-rose-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-200">
                        J&T Express Courier Dispatch
                      </span>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
                        {dispatchModalOrder.order_reference}
                      </span>
                    </div>
                    <h3 className="font-sans font-bold text-base text-white">
                      Configure Parcel & Packaging
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setDispatchModalOrder(null)}
                  className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
                {/* Recipient & Destination Preview */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-600" />
                      <span>Delivery Consignee:</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {dispatchModalOrder.customer_phone || 'No Phone'}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {dispatchModalOrder.customer_name}
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {dispatchModalOrder.shipping_address
                      ? `${dispatchModalOrder.shipping_address.street}, ${dispatchModalOrder.shipping_address.barangay || ''} ${dispatchModalOrder.shipping_address.city}, ${dispatchModalOrder.shipping_address.province || ''} ${dispatchModalOrder.shipping_address.postal_code || dispatchModalOrder.shipping_address.zip || ''}`
                      : 'Standard Shipping Address on File'}
                  </p>
                </div>

                {/* Packaging & Weight Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pouch / Packaging Selector */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-red-600" />
                      <span>J&T Pouch / Box Size:</span>
                    </label>
                    <select
                      value={dispatchForm.pouchSize}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, pouchSize: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-red-500"
                    >
                      <option value="small">Small Pouch (Up to 1.0 kg - 17x30 cm)</option>
                      <option value="medium">Medium Pouch (Up to 3.0 kg - 24x38 cm)</option>
                      <option value="large">Large Pouch (Up to 5.0 kg - 30x45 cm)</option>
                      <option value="box">Carton Box (Up to 10.0 kg - Bulk/Haul)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Standard Aura garment order fits in Small or Medium pouch.
                    </p>
                  </div>

                  {/* Parcel Weight Input */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-red-600" />
                      <span>Estimated Parcel Weight (KG):</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="20"
                        value={dispatchForm.weightKg}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, weightKg: e.target.value })}
                        className="w-full p-2.5 pr-10 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                        placeholder="0.35"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        KG
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Auto-calculated from {dispatchModalOrder.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1} items.
                    </p>
                  </div>
                </div>

                {/* Courier Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-red-600" />
                    <span>Courier Service Partner:</span>
                  </label>
                  <select
                    value={dispatchForm.preferredCourier}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, preferredCourier: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-red-500"
                  >
                    <option value="J&T Express">J&T Express Philippines (Standard Door-to-Door)</option>
                    <option value="J&T Cargo">J&T Express Cargo (Heavyweight / Bulk shipments)</option>
                    <option value="Standard Express">Shipmates Standard Express Partner</option>
                  </select>
                </div>

                {/* Cash on Delivery (COD) Collection Notice */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    dispatchModalOrder.payment_method === 'COD'
                      ? 'bg-amber-50/70 border-amber-300 text-amber-900'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>
                        {dispatchModalOrder.payment_method === 'COD'
                          ? 'COD Collection Required'
                          : 'Prepaid Shipment (Xendit)'}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-85">
                      {dispatchModalOrder.payment_method === 'COD'
                        ? 'J&T courier rider will collect cash from the customer upon delivery.'
                        : 'Customer already paid online via Xendit (GCash/Card). Collect ₱0.00 from recipient.'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold opacity-75 block">COD Amount</span>
                    <span className="text-base font-black font-mono">
                      ₱{dispatchModalOrder.payment_method === 'COD'
                        ? (Number(dispatchModalOrder.total_amount) || 0).toLocaleString()
                        : '0.00'}
                    </span>
                  </div>
                </div>

                {/* Delivery Notes / Special Instructions */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">
                    Rider Remarks & Delivery Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={dispatchForm.notes}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500 resize-none"
                    placeholder="e.g. Call recipient upon arrival, leave with receptionist if unavailable..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDispatchModalOrder(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmJntDispatch}
                  disabled={isDispatchingJnt}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isDispatchingJnt ? 'animate-spin' : ''}`} />
                  <span>{isDispatchingJnt ? 'Booking with J&T...' : 'Confirm & Generate J&T Waybill'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: BULK THERMAL WAYBILL BATCH PRINTING */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {bulkWaybillOrders && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
            >
              {/* Header Bar */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Printer className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-sm">
                      Batch Thermal Waybills ({bulkWaybillOrders.length} Parcels)
                    </h3>
                    <p className="text-[10px] text-slate-300">
                      Standard 100mm x 150mm (A6) • J&T Express Roll Printer Format
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print All ({bulkWaybillOrders.length}) Labels</span>
                  </button>
                  <button
                    onClick={() => setBulkWaybillOrders(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Multi-label Printable Thermal Container */}
              <div className="p-6 overflow-y-auto bg-slate-100 flex-grow space-y-6 printable-thermal-sheet">
                {bulkWaybillOrders.map((ord, idx) => {
                  const isCod = (ord.payment_method || '').toUpperCase() === 'COD';
                  const city = ord.shipping_address?.city || 'Metro Manila';
                  const sortCode = city.toLowerCase().includes('makati') ? 'MNL-MAK-01'
                    : city.toLowerCase().includes('quezon') ? 'MNL-QC-02'
                    : city.toLowerCase().includes('cebu') ? 'CEB-HUB-01'
                    : city.toLowerCase().includes('davao') ? 'DVO-HUB-01'
                    : 'MNL-HUB-01';

                  return (
                    <div
                      key={ord.id || idx}
                      className="printable-thermal-label bg-white border-2 border-slate-900 p-5 rounded-none shadow-sm space-y-4 font-mono text-slate-900 print:border-none print:p-0 print:mb-0"
                      style={{ pageBreakAfter: 'always' }}
                    >
                      {/* Carrier & Sort Code */}
                      <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-red-600 text-white font-black text-xl px-2.5 py-0.5 tracking-tighter">
                            J&T
                          </div>
                          <div>
                            <span className="text-xl font-black tracking-tight block">EXPRESS</span>
                            <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-slate-500">
                              Official Air Waybill (AWB)
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black tracking-wider block bg-slate-900 text-white px-2 py-0.5">
                            {sortCode}
                          </span>
                          <span className="text-[9px] font-bold block pt-0.5">STANDARD AIR</span>
                        </div>
                      </div>

                      {/* Barcode & Tracking Code */}
                      <div className="py-2 text-center border-b-2 border-slate-900 space-y-1">
                        <div className="flex items-center justify-center min-h-[46px] py-1">
                          <BarcodeSvg
                            value={ord.tracking_number || 'JT-UNASSIGNED'}
                            format="CODE128"
                            width={1.8}
                            height={44}
                            className="mx-auto"
                          />
                        </div>
                        <div className="font-bold text-sm tracking-widest uppercase">
                          {ord.tracking_number || 'JT-UNASSIGNED'}
                        </div>
                      </div>

                      {/* Shipper & Consignee Grid */}
                      <div className="grid grid-cols-2 border-b-2 border-slate-900 text-[10px] divide-x-2 divide-slate-900">
                        <div className="p-2 space-y-1">
                          <span className="font-bold uppercase tracking-wider block text-[9px] text-slate-500">
                            FROM (SHIPPER):
                          </span>
                          <p className="font-bold text-xs">Aura Atelier Dispatch Hub</p>
                          <p>09171234567</p>
                          <p className="text-slate-700 leading-tight">
                            108 Atelier Blvd, Salcedo Village, Bel-Air, Makati City, Metro Manila 1209
                          </p>
                        </div>

                        <div className="p-2 space-y-1 bg-amber-50/40">
                          <span className="font-bold uppercase tracking-wider block text-[9px] text-slate-500">
                            TO (CONSIGNEE):
                          </span>
                          <p className="font-bold text-xs">{ord.customer_name}</p>
                          <p className="font-bold">{ord.customer_phone}</p>
                          <p className="text-slate-800 leading-tight">
                            {ord.shipping_address
                              ? `${ord.shipping_address.street}, ${ord.shipping_address.barangay || ''} ${ord.shipping_address.city}, ${ord.shipping_address.province || ''} ${ord.shipping_address.postal_code || ord.shipping_address.zip || ''}`
                              : 'Standard Delivery Address'}
                          </p>
                        </div>
                      </div>

                      {/* Parcel Details & Payment Terms */}
                      <div className="text-[10px] space-y-2 pt-1 border-b-2 border-slate-900 pb-3">
                        <div className="flex justify-between font-bold">
                          <span>Order Ref: {ord.order_reference}</span>
                          {isCod ? (
                            <span className="bg-red-600 text-white px-2 py-0.5 text-[9px] font-sans font-black">
                              COLLECT COD (₱{(Number(ord.total_amount) || 0).toLocaleString()})
                            </span>
                          ) : (
                            <span className="bg-emerald-700 text-white px-2 py-0.5 text-[9px] font-sans font-bold">
                              PREPAID (NON-COD)
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-50 p-2 border border-slate-300">
                          <span className="block font-bold text-[9px] text-slate-500 mb-0.5">CONTENT SPECIFICATION:</span>
                          <p className="truncate">
                            {ord.items?.map(it => `${it.name} (${it.quantity || 1}x)`).join(', ') || 'Garments / Apparel'}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-1 font-bold">
                          <div className="border border-slate-300 p-1">
                            <span className="block text-[8px] text-slate-500 font-sans">WEIGHT</span>
                            <span>0.35 KG</span>
                          </div>
                          <div className="border border-slate-300 p-1">
                            <span className="block text-[8px] text-slate-500 font-sans">COURIER</span>
                            <span>J&T EXPRESS</span>
                          </div>
                          <div className={`border p-1 ${isCod ? 'bg-red-600 text-white border-red-600' : 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                            <span className={`block text-[8px] font-sans ${isCod ? 'text-white' : 'text-slate-500'}`}>COLLECT COD</span>
                            <span>₱{isCod ? (Number(ord.total_amount) || 0).toLocaleString() : '0.00'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Signature Notice */}
                      <div className="pt-1 flex items-center justify-between text-[9px] text-slate-500">
                        <span>Date: {new Date(ord.created_at || Date.now()).toLocaleDateString()}</span>
                        <span>Recipient Signature: __________________</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: ORDER CANCELLATION WITH REASON */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-100 text-xs"
            >
              <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Ban className="w-5 h-5 text-white" />
                  <div>
                    <h3 className="font-bold text-sm">Cancel Customer Order</h3>
                    <p className="text-[11px] text-rose-100 font-mono">{cancellingOrder.order_reference}</p>
                  </div>
                </div>
                <button
                  onClick={() => setCancellingOrder(null)}
                  className="p-1 text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Customer:</span>
                    <span>{cancellingOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Order Amount:</span>
                    <span className="font-bold text-slate-900">₱{(Number(cancellingOrder.total_amount) || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">Select Cancellation Reason:</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Customer requested cancellation">Customer requested cancellation</option>
                    <option value="Item out of stock / defect identified">Item out of stock / defect identified</option>
                    <option value="Suspected fraudulent order">Suspected fraudulent order</option>
                    <option value="Invalid or unreachable delivery address">Invalid or unreachable delivery address</option>
                    <option value="Customer unresponsive to verification call">Customer unresponsive to verification call</option>
                    <option value="Duplicate order submitted">Duplicate order submitted</option>
                    <option value="Other administrative reason">Other administrative reason</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">Additional Notes (Optional):</label>
                  <input
                    type="text"
                    value={cancelNotes}
                    onChange={(e) => setCancelNotes(e.target.value)}
                    placeholder="e.g. Buyer contacted atelier phone line"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-900 text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    Cancelling this order will release reserved stock back into inventory and update the fulfillment pipeline to CANCELLED. This change is permanently logged in the audit trail.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelOrder}
                  disabled={isSubmittingCancel}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Ban className={`w-3.5 h-3.5 ${isSubmittingCancel ? 'animate-spin' : ''}`} />
                  <span>{isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 4: SINGLE AIR WAYBILL (AWB) PRINTABLE THERMAL MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedWaybillOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header Bar */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-sm">Official Air Waybill (AWB)</h3>
                    <p className="text-[10px] text-slate-300">J&T Express Philippines • Standard Door-to-Door</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Label</span>
                  </button>
                  <button
                    onClick={() => setSelectedWaybillOrder(null)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Physical Thermal Label (4x6 / A6 Style) */}
              <div className="p-6 overflow-y-auto bg-slate-100 flex-grow printable-thermal-sheet">
                <div className="printable-thermal-label bg-white border-2 border-slate-900 p-5 rounded-none shadow-sm space-y-4 font-mono text-slate-900 print:border-none print:p-0">
                  {/* Carrier & Sort Code */}
                  <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-red-600 text-white font-black text-xl px-2.5 py-0.5 tracking-tighter">
                        J&T
                      </div>
                      <div>
                        <span className="text-xl font-black tracking-tight block">EXPRESS</span>
                        <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-slate-500">
                          Official Air Waybill (AWB)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black tracking-wider block bg-slate-900 text-white px-2 py-0.5">
                        {(() => {
                          const city = selectedWaybillOrder.shipping_address?.city || '';
                          if (city.toLowerCase().includes('makati')) return 'MNL-MAK-01';
                          if (city.toLowerCase().includes('quezon')) return 'MNL-QC-02';
                          if (city.toLowerCase().includes('cebu')) return 'CEB-HUB-01';
                          if (city.toLowerCase().includes('davao')) return 'DVO-HUB-01';
                          return 'MNL-HUB-01';
                        })()}
                      </span>
                      <span className="text-[9px] font-bold block pt-0.5">STANDARD AIR</span>
                    </div>
                  </div>

                  {/* Barcode & Tracking Code */}
                  <div className="py-2 text-center border-b-2 border-slate-900 space-y-1">
                    <div className="flex items-center justify-center min-h-[46px] py-1">
                      <BarcodeSvg
                        value={selectedWaybillOrder.tracking_number || 'JT-UNASSIGNED'}
                        format="CODE128"
                        width={1.8}
                        height={44}
                        className="mx-auto"
                      />
                    </div>
                    <div className="font-bold text-sm tracking-widest uppercase">
                      {selectedWaybillOrder.tracking_number || 'JT-UNASSIGNED'}
                    </div>
                  </div>

                  {/* Shipper & Consignee Grid */}
                  <div className="grid grid-cols-2 border-b-2 border-slate-900 text-[10px] divide-x-2 divide-slate-900">
                    <div className="p-2 space-y-1">
                      <span className="font-bold uppercase tracking-wider block text-[9px] text-slate-500">
                        FROM (SHIPPER):
                      </span>
                      <p className="font-bold text-xs">Aura Atelier Dispatch Hub</p>
                      <p>09171234567</p>
                      <p className="text-slate-700 leading-tight">
                        108 Atelier Blvd, Salcedo Village, Bel-Air, Makati City, Metro Manila 1209
                      </p>
                    </div>

                    <div className="p-2 space-y-1 bg-amber-50/40">
                      <span className="font-bold uppercase tracking-wider block text-[9px] text-slate-500">
                        TO (CONSIGNEE):
                      </span>
                      <p className="font-bold text-xs">{selectedWaybillOrder.customer_name}</p>
                      <p className="font-bold">{selectedWaybillOrder.customer_phone}</p>
                      <p className="text-slate-800 leading-tight">
                        {selectedWaybillOrder.shipping_address
                          ? `${selectedWaybillOrder.shipping_address.street}, ${selectedWaybillOrder.shipping_address.barangay || ''} ${selectedWaybillOrder.shipping_address.city}, ${selectedWaybillOrder.shipping_address.province || ''} ${selectedWaybillOrder.shipping_address.postal_code || selectedWaybillOrder.shipping_address.zip || ''}`
                          : 'Standard Delivery Address'}
                      </p>
                    </div>
                  </div>

                  {/* Parcel Details & Payment Terms */}
                  <div className="text-[10px] space-y-2 pt-1 border-b-2 border-slate-900 pb-3">
                    <div className="flex justify-between font-bold">
                      <span>Order Ref: {selectedWaybillOrder.order_reference}</span>
                      {selectedWaybillOrder.payment_method === 'COD' ? (
                        <span className="bg-red-600 text-white px-2 py-0.5 text-[9px] font-sans font-black">
                          COLLECT COD (₱{(Number(selectedWaybillOrder.total_amount) || 0).toLocaleString()})
                        </span>
                      ) : (
                        <span className="bg-emerald-700 text-white px-2 py-0.5 text-[9px] font-sans font-bold">
                          PREPAID (NON-COD)
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-2 border border-slate-300">
                      <span className="block font-bold text-[9px] text-slate-500 mb-0.5">CONTENT SPECIFICATION:</span>
                      <p className="truncate">
                        {selectedWaybillOrder.items?.map(it => `${it.name} (${it.quantity || 1}x, ${typeof it.size === 'object' ? it.size?.name : (it.size || 'Std')})`).join(', ') || 'Garments / Apparel'}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1 font-bold">
                      <div className="border border-slate-300 p-1">
                        <span className="block text-[8px] text-slate-500 font-sans">WEIGHT</span>
                        <span>0.35 KG</span>
                      </div>
                      <div className="border border-slate-300 p-1">
                        <span className="block text-[8px] text-slate-500 font-sans">COURIER</span>
                        <span>J&T EXPRESS</span>
                      </div>
                      <div className={`border p-1 ${selectedWaybillOrder.payment_method === 'COD' ? 'bg-red-600 text-white border-red-600' : 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                        <span className={`block text-[8px] font-sans ${selectedWaybillOrder.payment_method === 'COD' ? 'text-white' : 'text-slate-500'}`}>COLLECT COD</span>
                        <span>₱{selectedWaybillOrder.payment_method === 'COD' ? (Number(selectedWaybillOrder.total_amount) || 0).toLocaleString() : '0.00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signature Notice */}
                  <div className="pt-1 flex items-center justify-between text-[9px] text-slate-500">
                    <span>Date: {new Date(selectedWaybillOrder.created_at || Date.now()).toLocaleDateString()}</span>
                    <span>Recipient Signature: __________________</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TikTok Seller Center Add Note & Color Flags Modal */}
      <AddNoteModal
        isOpen={Boolean(noteModalOrder)}
        onClose={() => setNoteModalOrder(null)}
        order={noteModalOrder}
        onSaveAndArrange={handleSaveNoteAndArrange}
        isSubmitting={isSavingNote}
      />

      {/* TikTok Seller Center 2-Page A6 Thermal Waybill & Packing List Modal */}
      <A6ThermalPrintModal
        isOpen={Boolean(a6PrintOrder)}
        onClose={() => setA6PrintOrder(null)}
        order={a6PrintOrder}
      />

      {/* J&T Express Live Tracking Modal for Admin */}
      <TrackingModal
        isOpen={Boolean(adminTrackingOrder)}
        onClose={() => setAdminTrackingOrder(null)}
        trackingNumber={adminTrackingOrder?.tracking_number}
        orderReference={adminTrackingOrder?.order_reference}
        initialOrder={adminTrackingOrder}
      />
    </div>
  );
};

AdminOrdersTab.displayName = 'AdminOrdersTab';

export default AdminOrdersTab;
