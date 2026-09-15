import React, { memo } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Plus,
  DollarSign,
  CheckCircle2,
  Package,
  Boxes,
  AlertTriangle,
  Users,
  Check,
  ArrowUpRight,
  Edit,
  TrendingUp,
  ShoppingBag,
  Sliders,
  Clock,
  Truck,
  RotateCcw,
  XCircle,
  Star,
  Eye,
  ArrowRight
} from 'lucide-react';
import LuxuryButton from '../common/LuxuryButton';
import StatCard from '../common/StatCard';

const AdminDashboardTab = memo(({
  dashboardStats,
  orderCounts = {},
  visitorStats = { totalVisits: 0, todayVisits: 0 },
  averageReviewRating = '5.0',
  totalReviewsCount = 0,
  isLoadingStats,
  onRefresh,
  onAddProduct,
  onNavigateTab,
  onEditProduct,
}) => {
  // TikTok Shop Fulfillment Pipeline Items
  const fulfillmentPipeline = [
    {
      id: 'TO_SHIP',
      label: 'To Ship',
      count: orderCounts.toShip || 0,
      sublabel: 'Awaiting packaging',
      icon: Clock,
      color: 'bg-purple-50/60 text-purple-900 border-purple-200/80 hover:bg-purple-50',
      badgeColor: 'bg-purple-600 text-white',
    },
    {
      id: 'SHIPPED',
      label: 'Shipped',
      count: orderCounts.shipped || 0,
      sublabel: 'In transit',
      icon: Truck,
      color: 'bg-blue-50/60 text-blue-900 border-blue-200/80 hover:bg-blue-50',
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'TO_DELIVER',
      label: 'To Deliver',
      count: orderCounts.toDeliver || 0,
      sublabel: 'With rider',
      icon: Package,
      color: 'bg-teal-50/60 text-teal-900 border-teal-200/80 hover:bg-teal-50',
      badgeColor: 'bg-teal-600 text-white',
    },
    {
      id: 'DELIVERED',
      label: 'Delivered',
      count: orderCounts.delivered || 0,
      sublabel: 'Received by customer',
      icon: CheckCircle2,
      color: 'bg-emerald-50/60 text-emerald-900 border-emerald-200/80 hover:bg-emerald-50',
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'CANCELLED',
      label: 'Cancelled',
      count: orderCounts.cancelled || 0,
      sublabel: 'Cancelled orders',
      icon: XCircle,
      color: 'bg-rose-50/60 text-rose-900 border-rose-200/80 hover:bg-rose-50',
      badgeColor: 'bg-rose-600 text-white',
    },
    {
      id: 'RETURNED',
      label: 'Returned',
      count: orderCounts.returned || 0,
      sublabel: 'Refunds / returns',
      icon: RotateCcw,
      color: 'bg-orange-50/60 text-orange-900 border-orange-200/80 hover:bg-orange-50',
      badgeColor: 'bg-orange-600 text-white',
    },
    {
      id: 'FAILED_TO_DELIVER',
      label: 'Failed Delivery',
      count: orderCounts.failedToDeliver || 0,
      sublabel: 'Delivery issues',
      icon: AlertTriangle,
      color: 'bg-red-50/60 text-red-900 border-red-200/80 hover:bg-red-50',
      badgeColor: 'bg-red-600 text-white',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}
    >
      {/* Header / Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              Overview
            </span>
            <span className="text-xs text-slate-400 font-medium">Real-Time Store Operations</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
            Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor sales revenue, visitor traffic, garment inventory, and order dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={isLoadingStats}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-xs transition-all disabled:opacity-50"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isLoadingStats ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={onAddProduct}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 5 KEY METRIC CARDS (Sales, Orders, Visitors, Registered Users, Inventory) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* CARD 1: SALES REVENUE */}
        <StatCard
          title="Total Sales"
          value={isLoadingStats ? '—' : `₱${(dashboardStats.totalSales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          badgeText={`${dashboardStats.paidOrdersCount || 0} Paid`}
          badgeType="success"
          badgeIcon={CheckCircle2}
          sublabel="Gross Sales"
          icon={DollarSign}
          iconBgColor="bg-amber-100 text-amber-700"
        />

        {/* CARD 2: TOTAL ORDERS */}
        <StatCard
          title="Total Orders"
          value={isLoadingStats ? '—' : `${orderCounts.total || (dashboardStats.recentOrders || []).length}`}
          badgeText={`${orderCounts.toShip || 0} To Ship`}
          badgeType={orderCounts.toShip > 0 ? 'warning' : 'default'}
          badgeIcon={Package}
          sublabel="Transactions"
          icon={Package}
          iconBgColor="bg-rose-100 text-rose-600"
        />

        {/* CARD 3: WEBSITE VISITORS COUNT */}
        <StatCard
          title="Total Views"
          value={isLoadingStats ? '—' : `${(visitorStats.totalVisits || 0).toLocaleString()}`}
          badgeText={`+${visitorStats.todayVisits || 0} Today`}
          badgeType="info"
          badgeIcon={Eye}
          sublabel="Site Traffic"
          icon={Eye}
          iconBgColor="bg-cyan-100 text-cyan-600"
        />

        {/* CARD 4: REGISTERED CUSTOMERS */}
        <StatCard
          title="Total Customers"
          value={isLoadingStats ? '—' : `${dashboardStats.verifiedUserCount || 0}`}
          badgeText="Verified Accounts"
          badgeType="success"
          badgeIcon={Check}
          sublabel="Registered Users"
          icon={Users}
          iconBgColor="bg-blue-100 text-blue-600"
        />

        {/* CARD 5: TOTAL STOCKS & LOW STOCK WARNING */}
        <StatCard
          title="Garment Stock"
          value={isLoadingStats ? '—' : `${(dashboardStats.totalStock || 0).toLocaleString()}`}
          badgeText={dashboardStats.lowStockCount > 0 ? `${dashboardStats.lowStockCount} Low` : 'Stock Healthy'}
          badgeType={dashboardStats.lowStockCount > 0 ? 'warning' : 'success'}
          badgeIcon={AlertTriangle}
          sublabel={`${dashboardStats.totalProducts || 0} Styles`}
          icon={Boxes}
          iconBgColor="bg-purple-100 text-purple-600"
        />
      </div>

      {/* TIKTOK SHOP PENDING TASKS & FULFILLMENT PIPELINE */}
      <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <h3 className="font-sans font-bold text-sm text-slate-900 uppercase tracking-wider">
                Order Fulfillment Pipeline
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Current courier stages across all customer orders. Click any status to inspect.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('orders', 'ALL')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Manage All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pipeline Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {fulfillmentPipeline.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigateTab('orders', item.id)}
                className={`p-3.5 border text-left transition-all hover:shadow-sm hover:-translate-y-0.5 cursor-pointer rounded-xl group flex flex-col justify-between ${item.color}`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <Icon className="w-4 h-4 opacity-80" />
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs ${item.badgeColor}`}>
                    {item.count}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs font-sans text-slate-900 group-hover:text-blue-600 transition-colors">
                    {item.label}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight truncate">{item.sublabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TWO-COLUMN OPERATIONAL SECTIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: LOW STOCKS URGENCY LIST (7 Cols) */}
        <div className="xl:col-span-7 bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-sans text-slate-900">Restock Urgency Monitor</h3>
                <p className="text-[11px] text-slate-500">Catalog garments with 10 or fewer pieces remaining.</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>View Inventory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingStats ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (dashboardStats.lowStockItems || []).length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
              <h4 className="font-sans font-semibold text-sm text-slate-800">All Inventory Levels Healthy</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                None of your catalog garments currently have stock at or below the 10-unit urgency threshold.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dashboardStats.lowStockItems.slice(0, 6).map((item) => {
                const qty = Number(item.qty) || 0;
                const isOutOfStock = qty === 0;
                const isCritical = qty > 0 && qty <= 5;

                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-13 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Package className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-sans font-medium text-xs text-slate-900 truncate" title={item.name}>
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                          {item.subType || item.category || 'Garment'}
                        </p>
                        <span className="text-xs font-semibold text-slate-700 mt-0.5 block">
                          ₱{Number(item.price || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        isOutOfStock
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isCritical
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isOutOfStock ? '0 Left (Out)' : `${qty} left`}
                      </span>

                      <button
                        onClick={() => onEditProduct(item)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        title="Restock or Edit this garment"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Restock</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {dashboardStats.lowStockItems.length > 6 && (
                <div className="pt-3 text-center">
                  <button
                    onClick={() => onNavigateTab('products')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    + View {dashboardStats.lowStockItems.length - 6} more low stock garments in Products Table →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: RECENT TRANSACTIONS & CUSTOMER REVIEWS (5 Cols) */}
        <div className="xl:col-span-5 space-y-6">
          {/* CUSTOMER REVIEWS SUMMARY CARD */}
          <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="text-sm font-bold font-sans text-slate-900">Customer Ratings</h3>
              </div>
              <button
                onClick={() => onNavigateTab('reviews')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Overall Score
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-sans text-2xl font-bold text-slate-900">{averageReviewRating}</span>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(Number(averageReviewRating))
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Reviews</span>
                <span className="font-bold text-sm text-slate-800">{totalReviewsCount} Verified</span>
              </div>
            </div>
          </div>

          {/* RECENT ORDERS FEED */}
          <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold font-sans text-slate-900">Recent Orders</h3>
              </div>
              <button
                onClick={() => onNavigateTab('orders', 'ALL')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                View All →
              </button>
            </div>

            {isLoadingStats ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (dashboardStats.recentOrders || []).length === 0 ? (
              <div className="py-6 text-center space-y-1.5 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl">
                <Package className="w-5 h-5 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600">No customer orders recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {dashboardStats.recentOrders.slice(0, 5).map((ord) => {
                  const isPaid =
                    (ord.payment_status || '').toUpperCase() === 'PAID' ||
                    (ord.status || '').toUpperCase() === 'COMPLETED' ||
                    (ord.status || '').toUpperCase() === 'DELIVERED';
                  return (
                    <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {ord.customer_name || 'Customer'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {ord.order_reference || `#${ord.id?.slice(0, 8)}`}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-slate-900">
                          ₱{Number(ord.total_amount || 0).toLocaleString()}
                        </div>
                        <span
                          className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {ord.status || ord.payment_status || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUICK SYSTEM SHORTCUTS */}
          <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-xs space-y-3">
            <h3 className="text-xs font-bold font-sans text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
              Operations Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => onNavigateTab('orders', 'TO_SHIP')}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 text-left transition-all rounded-xl group cursor-pointer"
              >
                <Clock className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-semibold text-slate-800">Ship Parcels</div>
                <div className="text-[10px] text-slate-400">{orderCounts.toShip || 0} to dispatch</div>
              </button>

              <button
                onClick={() => onNavigateTab('products')}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 text-left transition-all rounded-xl group cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-semibold text-slate-800">Manage Catalog</div>
                <div className="text-[10px] text-slate-400">{dashboardStats.totalProducts || 0} styles</div>
              </button>

              <button
                onClick={() => onNavigateTab('reviews')}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 text-left transition-all rounded-xl group cursor-pointer"
              >
                <Star className="w-4 h-4 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-semibold text-slate-800">Reviews Hub</div>
                <div className="text-[10px] text-slate-400">{totalReviewsCount} reviews</div>
              </button>

              <button
                onClick={() => onNavigateTab('customize')}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 text-left transition-all rounded-xl group cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-slate-600 mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-semibold text-slate-800">Store Design</div>
                <div className="text-[10px] text-slate-400">Customizer</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

AdminDashboardTab.displayName = 'AdminDashboardTab';

export default AdminDashboardTab;
