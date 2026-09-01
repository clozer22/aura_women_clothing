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
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function OrderHistory({ onBackToShop }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load orders strictly for the authenticated user and clean up legacy storage
  useEffect(() => {
    try {
      localStorage.removeItem('aura_guest_orders');
    } catch (e) {}

    async function loadOrders() {
      // If user is not yet logged in or session is loading, do not query all orders
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

  const tabs = [
    { id: 'ALL', label: 'All Orders' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'PROCESSING', label: 'Processing' },
    { id: 'SHIPPED', label: 'Shipped' },
    { id: 'DELIVERED', label: 'Delivered' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'ALL') return true;
    return (o.status || 'PENDING').toUpperCase() === activeTab;
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
    const s = status.toUpperCase();
    switch (s) {
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SHIPPED':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'PROCESSING':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'PENDING':
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
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
              Purchase History
            </span>
            <h1 className="font-brand text-3xl sm:text-4xl font-bold tracking-wide text-[#2C1E1B] mt-1 mb-2">
              ORDER HISTORY
            </h1>
            <p className="text-xs sm:text-sm text-[#705B56]">
              Track current shipments and view previous receipts.
            </p>
          </div>
        </div>

        {/* Status Filter Tabs (Matching Image 5) */}
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
            filteredOrders.map((order) => (
              <motion.div
                key={order.order_reference}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#E8DCD7] p-6 shadow-sm hover:border-[#B86B60] transition-all space-y-4 rounded-none"
              >
                {/* Top Row: Reference, Badge, Date/Payment, Amount, View Details */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8DCD7]">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-brand text-base sm:text-lg font-bold tracking-wider text-[#2C1E1B]">
                        {order.order_reference}
                      </span>
                      <span
                        className={`text-[10px] font-brand uppercase tracking-wider font-bold px-2.5 py-0.5 border ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status || 'PENDING'}
                      </span>
                    </div>

                    <p className="text-xs text-[#705B56]">
                      Placed on {formatDate(order.created_at)} • Payment via{' '}
                      <span className="font-semibold text-[#2C1E1B]">
                        {order.payment_method || 'GCASH'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
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
                      <span>View Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Items Pills and Count */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-2">
                    {order.items?.map((item, idx) => (
                      <span
                        key={idx}
                        className="bg-[#FAF5F2] border border-[#E8DCD7] px-3 py-1.5 text-xs text-[#2C1E1B] font-medium"
                      >
                        {item.name}{' '}
                        <span className="text-[#B86B60] font-semibold">
                          ×{item.quantity || 1}
                        </span>
                      </span>
                    ))}
                  </div>

                  <span className="text-xs uppercase font-brand tracking-wider font-bold text-[#705B56]">
                    {order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 1}{' '}
                    {order.items?.length === 1 ? 'ITEM' : 'ITEMS'}
                  </span>
                </div>
              </motion.div>
            ))
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
                    Order Details
                  </span>
                  <h2 className="font-brand text-2xl font-bold text-[#2C1E1B]">
                    {selectedOrder.order_reference}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-[#705B56] hover:text-[#2C1E1B] border border-[#E8DCD7]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-4 bg-[#FAF5F2] border border-[#E8DCD7] flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-[#2C1E1B] uppercase tracking-wider text-[11px]">
                    Status: {selectedOrder.status || 'PENDING'}
                  </p>
                  <p className="text-[11px] text-[#705B56]">
                    Ordered on {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-brand uppercase tracking-wider font-bold px-3 py-1 border ${getStatusBadge(
                    selectedOrder.status
                  )}`}
                >
                  {selectedOrder.status || 'PENDING'}
                </span>
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

              {/* Items Table */}
              <div className="space-y-3">
                <h4 className="font-brand uppercase tracking-wider font-bold text-[#705B56] text-xs">
                  Purchased Items
                </h4>
                <div className="divide-y divide-[#E8DCD7]">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-14 object-cover bg-[#FAF5F2]"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-[#2C1E1B]">{item.name}</p>
                          <p className="text-[11px] text-[#B86B60]">
                            Size: {typeof item.size === 'object' ? item.size?.name : (item.size || 'Standard')}
                            {item.color && (typeof item.color === 'object' ? item.color?.name : item.color) !== 'Standard'
                              ? ` / ${typeof item.color === 'object' ? item.color?.name : item.color}`
                              : ''}{' '}
                            • Qty: {item.quantity || 1}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-[#2C1E1B]">
                        ₱{((Number(item.price) || 0) * (item.quantity || 1)).toLocaleString()}
                      </span>
                    </div>
                  ))}
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
    </div>
  );
}
