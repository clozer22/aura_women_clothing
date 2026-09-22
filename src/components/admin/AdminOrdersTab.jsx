import React, { useState, useMemo } from 'react';
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
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [activeTab, setActiveTab] = useState(initialFilterTab || 'ALL');
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

  // TikTok Shop style pipeline filter categories
  const tabs = [
    { id: 'ALL', label: 'All', count: orders.length },
    { id: 'TO_SHIP', label: 'To Ship', count: orderCounts.toShip || 0 },
    { id: 'SHIPPED', label: 'Shipped', count: orderCounts.shipped || 0 },
    { id: 'TO_DELIVER', label: 'To Deliver', count: orderCounts.toDeliver || 0 },
    { id: 'DELIVERED', label: 'Delivered', count: orderCounts.delivered || 0 },
    { id: 'CANCELLED', label: 'Cancelled', count: orderCounts.cancelled || 0 },
    { id: 'RETURNED', label: 'Returned', count: orderCounts.returned || 0 },
    { id: 'FAILED_TO_DELIVER', label: 'Failed Delivery', count: orderCounts.failedToDeliver || 0 },
  ];

  const statusOptions = [
    { value: 'PENDING', label: 'Pending Payment' },
    { value: 'TO_SHIP', label: 'To Ship (Ready for Dispatch)' },
    { value: 'SHIPPED', label: 'Shipped (In Transit)' },
    { value: 'TO_DELIVER', label: 'To Deliver (With Courier)' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'RETURNED', label: 'Returned / Refunded' },
    { value: 'FAILED_TO_DELIVER', label: 'Delivery Failed' },
  ];

  // Filter orders by active pipeline tab and search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Tab filtering
      if (activeTab !== 'ALL') {
        const orderStatus = (order.status || 'PENDING').toUpperCase();
        const paymentStatus = (order.payment_status || 'PENDING').toUpperCase();

        if (activeTab === 'TO_SHIP') {
          const isToShip =
            (orderStatus === 'TO_SHIP' || orderStatus === 'PROCESSING' || orderStatus === 'PENDING') &&
            paymentStatus === 'PAID';
          if (!isToShip) return false;
        } else if (activeTab === 'SHIPPED') {
          if (orderStatus !== 'SHIPPED') return false;
        } else if (activeTab === 'TO_DELIVER') {
          if (orderStatus !== 'TO_DELIVER') return false;
        } else if (activeTab === 'DELIVERED') {
          if (orderStatus !== 'DELIVERED' && orderStatus !== 'COMPLETED') return false;
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
  }, [orders, activeTab, searchQuery]);

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
      const res = await fetch('/api/shipmates-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    for (const order of ordersToBook) {
      try {
        const res = await fetch('/api/shipmates-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      {selectedOrderIds.length > 0 && (
        <div className="bg-blue-50/70 p-3 border border-blue-200 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-xs">
              {selectedOrderIds.length}
            </div>
            <span className="text-sm font-semibold text-blue-900">Orders Selected</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkBookShipmates}
              disabled={isBulkBooking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isBulkBooking ? 'animate-spin' : ''}`} />
              <span>{isBulkBooking ? 'Processing...' : 'Bulk Book Rider'}</span>
            </button>
          </div>
        </div>
      )}

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

                      {isCod ? (
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

                      <span
                        className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {order.status || 'PENDING'}
                      </span>

                      {/* Shipmates Dispatch Status Tag */}
                      {hasTracking ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{order.courier_name || 'Shipmates'}: {order.tracking_number}</span>
                        </span>
                      ) : (isPaid || isCod) ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Ready for Shipmates</span>
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-slate-500">
                      Placed on {formatDate(order.created_at)} • Customer:{' '}
                      <strong className="text-slate-800">{order.customer_name}</strong>
                      {order.customer_phone ? ` (${order.customer_phone})` : ''}
                      {order.customer_email ? ` • ${order.customer_email}` : ''}
                    </p>

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

                  <div className="flex items-center justify-between lg:justify-end gap-5">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Total Amount</span>
                      <span className="font-sans text-base font-bold text-slate-900">
                        ₱{(Number(order.total_amount) || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Shipmates 1-Click Action for Paid or COD Orders */}
                    {(isPaid || isCod) && (
                      <button
                        onClick={() => handleBookShipmates(order)}
                        disabled={isBookingThis}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                          hasTracking
                            ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                        }`}
                        title={hasTracking ? 'Re-sync Shipmates booking' : 'Dispatch courier request to Shipmates'}
                      >
                        <Send className={`w-3 h-3 ${isBookingThis ? 'animate-spin' : ''}`} />
                        <span>{isBookingThis ? 'Booking...' : hasTracking ? 'Re-test Shipmates' : 'Book with Shipmates'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Details</span>
                    </button>
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
                  <button
                    onClick={() => handleBookShipmates(selectedOrder)}
                    disabled={bookingShipmateId === selectedOrder.id}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${bookingShipmateId === selectedOrder.id ? 'animate-spin' : ''}`} />
                    <span>
                      {bookingShipmateId === selectedOrder.id
                        ? 'Requesting Shipmates...'
                        : selectedOrder.tracking_number
                        ? 'Re-test Shipmates Dispatch'
                        : 'Dispatch to Shipmates Now'}
                    </span>
                  </button>

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

      {/* Air Waybill (AWB) Printable Thermal Modal */}
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
                    <p className="text-[10px] text-slate-300">Shipmates Logistics Partner • Standard Express</p>
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
              <div className="p-6 overflow-y-auto bg-slate-100 flex-grow">
                <div className="bg-white border-2 border-slate-900 p-5 rounded-none shadow-sm space-y-4 font-mono text-slate-900 print:border-none print:p-0">
                  {/* Carrier & Sort Code */}
                  <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-black tracking-tight block">J&T EXPRESS</span>
                      <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-slate-500">
                        Shipmates Courier Network
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black tracking-wider block bg-slate-900 text-white px-2 py-0.5">
                        MNL-01
                      </span>
                      <span className="text-[9px] font-bold block pt-0.5">STANDARD AIR</span>
                    </div>
                  </div>

                  {/* Barcode & Tracking Code */}
                  <div className="py-2 text-center border-b-2 border-slate-900 space-y-1">
                    {/* Simulated SVG Barcode */}
                    <div className="flex items-center justify-center gap-0.5 h-12 py-1">
                      {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2, 4, 2, 1, 3, 2, 1, 4, 1, 3, 2, 4, 1, 2, 3].map((w, i) => (
                        <div key={i} className="bg-slate-900 h-full" style={{ width: `${w}px` }} />
                      ))}
                    </div>
                    <div className="font-bold text-sm tracking-widest">
                      {selectedWaybillOrder.tracking_number || 'SM-TEST-000000'}
                    </div>
                  </div>

                  {/* Shipper & Consignee Grid */}
                  <div className="grid grid-cols-2 border-b-2 border-slate-900 text-[10px] divide-x-2 divide-slate-900">
                    <div className="p-2 space-y-1">
                      <span className="font-bold uppercase tracking-wider block text-[9px] text-slate-500">
                        FROM (SHIPPER):
                      </span>
                      <p className="font-bold text-xs">Aura Atelier Dispatch</p>
                      <p>09171234567</p>
                      <p className="text-slate-700 leading-tight">
                        108 Atelier Blvd, Salcedo Village, Bel-Air, Makati City, Metro Manila
                      </p>
                    </div>

                    <div className="p-2 space-y-1 bg-amber-50/40">
                      <span className="font-bold uppercase tracking-wider block text-[9px] text-slate-500">
                        TO (CONSIGNEE):
                      </span>
                      <p className="font-bold text-xs">{selectedWaybillOrder.customer_name}</p>
                      <p>{selectedWaybillOrder.customer_phone}</p>
                      <p className="text-slate-800 leading-tight">
                        {selectedWaybillOrder.shipping_address
                          ? `${selectedWaybillOrder.shipping_address.street}, ${selectedWaybillOrder.shipping_address.barangay || ''} ${selectedWaybillOrder.shipping_address.city}, ${selectedWaybillOrder.shipping_address.province || ''}`
                          : 'Standard Delivery Address'}
                      </p>
                    </div>
                  </div>

                  {/* Parcel Details & Payment Terms */}
                  <div className="text-[10px] space-y-2 pt-1 border-b-2 border-slate-900 pb-3">
                    <div className="flex justify-between font-bold">
                      <span>Order Ref: {selectedWaybillOrder.order_reference}</span>
                      {selectedWaybillOrder.payment_method === 'COD' ? (
                        <span className="bg-amber-600 text-white px-2 py-0.5 text-[9px] font-sans font-black">
                          CASH ON DELIVERY (₱{(Number(selectedWaybillOrder.total_amount) || 0).toLocaleString()})
                        </span>
                      ) : (
                        <span className="bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-sans">
                          PREPAID (NON-COD)
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-2 border border-slate-300">
                      <span className="block font-bold text-[9px] text-slate-500 mb-0.5">CONTENT SPECIFICATION:</span>
                      <p className="truncate">
                        {selectedWaybillOrder.items?.map(it => `${it.name} (${it.quantity || 1}x)`).join(', ') || 'Apparel / Garments'}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1 font-bold">
                      <div className="border border-slate-300 p-1">
                        <span className="block text-[8px] text-slate-500 font-sans">WEIGHT</span>
                        <span>0.35 KG</span>
                      </div>
                      <div className="border border-slate-300 p-1">
                        <span className="block text-[8px] text-slate-500 font-sans">PAYMENT</span>
                        <span>XENDIT ONLINE</span>
                      </div>
                      <div className="border border-slate-300 p-1 bg-slate-900 text-white">
                        <span className="block text-[8px] text-slate-300 font-sans">COLLECT COD</span>
                        <span>₱0.00</span>
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
    </div>
  );
};

AdminOrdersTab.displayName = 'AdminOrdersTab';

export default AdminOrdersTab;
