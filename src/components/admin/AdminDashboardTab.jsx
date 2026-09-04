import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, DollarSign, CheckCircle2, Package, Boxes, AlertTriangle, ShieldCheck, Users, Check, ArrowUpRight, Edit, TrendingUp, ShoppingBag, Sliders, User } from 'lucide-react';
import LuxuryButton from '../common/LuxuryButton';
import StatCard from '../common/StatCard';

const AdminDashboardTab = memo(({
  dashboardStats,
  isLoadingStats,
  onRefresh,
  onAddProduct,
  onNavigateTab,
  onEditProduct,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}
    >
      {/* Header / Title Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#E8DCD7]">
        <div>
          <h2 className="text-3xl sm:text-5xl font-editorial font-light text-[#2C1E1B] tracking-tight">Management Hub</h2>
          <p className="text-xs text-[#705B56] mt-1">Live metrics across sales, garment inventory reserves, and verified customer profiles.</p>
        </div>

        <div className="flex items-center gap-3">
          <LuxuryButton
            variant="secondary"
            onClick={onRefresh}
            disabled={isLoadingStats}
            isLoading={isLoadingStats}
            loadingText="Refreshing..."
            icon={RefreshCw}
            title="Refresh Live Metrics"
          >
            Refresh
          </LuxuryButton>

          <LuxuryButton
            variant="primary"
            onClick={onAddProduct}
            icon={Plus}
          >
            Add Product
          </LuxuryButton>
        </div>
      </div>

      {/* 5 KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* CARD 1: SALES REVENUE */}
        <StatCard
          title="Total Sales"
          value={isLoadingStats ? '—' : `₱${(dashboardStats.totalSales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          badgeText={`${dashboardStats.paidOrdersCount || 0} Paid Orders`}
          badgeType="success"
          badgeIcon={CheckCircle2}
          sublabel="Revenue"
          icon={DollarSign}
        />

        {/* CARD 2: NUMBER OF STOCKS */}
        <StatCard
          title="Total Stocks"
          value={isLoadingStats ? '—' : `${(dashboardStats.totalStock || 0).toLocaleString()}`}
          badgeText={`${dashboardStats.totalProducts || 0} Styles`}
          badgeType="default"
          badgeIcon={Boxes}
          sublabel="Inventory"
          icon={Package}
        />

        {/* CARD 3: NUMBER OF LOW STOCKS ITEM */}
        <StatCard
          title="Low Stocks Item"
          value={isLoadingStats ? '—' : `${dashboardStats.lowStockCount || 0}`}
          badgeText={dashboardStats.lowStockCount > 0 ? 'Urgent Restock (<=10)' : 'Stocks Healthy'}
          badgeType={dashboardStats.lowStockCount > 0 ? 'warning' : 'success'}
          badgeIcon={AlertTriangle}
          sublabel="Threshold"
          icon={AlertTriangle}
        />

        {/* CARD 4: NUMBER OF CURRENT ADMIN */}
        <StatCard
          title="Current Admin"
          value={isLoadingStats ? '—' : `${dashboardStats.adminCount || 1}`}
          badgeText="Atelier Staff"
          badgeType="default"
          badgeIcon={ShieldCheck}
          sublabel="Authorized"
          icon={ShieldCheck}
        />

        {/* CARD 5: NUMBER OF CURRENT VERIFIED USER */}
        <StatCard
          title="Verified Users"
          value={isLoadingStats ? '—' : `${dashboardStats.verifiedUserCount || 0}`}
          badgeText="Verified Email Only"
          badgeType="success"
          badgeIcon={Check}
          sublabel="Customers"
          icon={Users}
        />
      </div>

      {/* TWO-COLUMN OPERATIONAL SECTIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* LEFT COLUMN: LOW STOCKS URGENCY LIST (7 Cols) */}
        <div className="xl:col-span-7 bg-white border border-[#E8DCD7] p-6 sm:p-8 rounded-none shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E8DCD7]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 border border-amber-200 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-editorial text-[#2C1E1B] font-medium">Restock Urgency Monitor</h3>
                <p className="text-[11px] text-[#705B56]">Catalog garments with 10 or fewer pieces remaining.</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-semibold text-[#B86B60] hover:text-[#2C1E1B] uppercase tracking-wider flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>View All Products</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-[#2C1E1B]/5 skeleton-shimmer rounded-none" />
              ))}
            </div>
          ) : (dashboardStats.lowStockItems || []).length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-[#E8DCD7] bg-[#FAF0EC]/30">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-editorial text-base text-[#2C1E1B]">All Inventory Levels Healthy</h4>
              <p className="text-xs text-[#705B56] max-w-sm mx-auto">None of your catalog garments currently have stock at or below the 10-unit urgency threshold.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#FAF0EC]">
              {dashboardStats.lowStockItems.slice(0, 6).map((item) => {
                const qty = Number(item.qty) || 0;
                const isOutOfStock = qty === 0;
                const isCritical = qty > 0 && qty <= 5;

                return (
                  <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-[#FAF0EC]/40 px-2 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-14 bg-[#FAF0EC] border border-[#E8DCD7] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Package className="w-4 h-4 text-[#A38E88]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-editorial text-sm text-[#2C1E1B] truncate" title={item.name}>{item.name}</h4>
                        <p className="text-[10px] uppercase tracking-wider text-[#A38E88] truncate">{item.subType || item.category || 'Atelier Garment'}</p>
                        <span className="text-xs font-semibold text-[#705B56] mt-0.5 block">₱{Number(item.price || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-none border ${isOutOfStock
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isCritical
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                          {isOutOfStock ? '0 Left (Out)' : `${qty} left`}
                        </span>
                      </div>

                      <button
                        onClick={() => onEditProduct(item)}
                        className="px-3 py-1.5 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-[10px] font-semibold uppercase tracking-wider rounded-none transition-all flex items-center gap-1 cursor-pointer"
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
                    className="text-xs font-semibold text-[#2C1E1B] hover:text-[#B86B60] transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    + View {dashboardStats.lowStockItems.length - 6} more low stock garments in Products Table →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: RECENT ORDERS & QUICK SHORTCUTS (5 Cols) */}
        <div className="xl:col-span-5 space-y-6">
          {/* RECENT ORDERS FEED */}
          <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 rounded-none shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCD7]">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-[#B86B60]" />
                <h3 className="text-base font-editorial text-[#2C1E1B] font-medium">Recent Transactions</h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#705B56]">Live Stream</span>
            </div>

            {isLoadingStats ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-[#2C1E1B]/5 skeleton-shimmer rounded-none" />
                ))}
              </div>
            ) : (dashboardStats.recentOrders || []).length === 0 ? (
              <div className="py-8 text-center space-y-2 border border-dashed border-[#E8DCD7] bg-[#FAF0EC]/30">
                <Package className="w-6 h-6 text-[#A38E88] mx-auto" />
                <p className="text-xs text-[#705B56]">No customer orders recorded yet.</p>
                <p className="text-[10px] text-[#A38E88]">Customer checkouts via Xendit will stream directly here.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#FAF0EC]">
                {dashboardStats.recentOrders.map((ord) => {
                  const isPaid = (ord.payment_status || '').toUpperCase() === 'PAID' || (ord.status || '').toUpperCase() === 'COMPLETED';
                  return (
                    <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-[#2C1E1B]">{ord.customer_name || 'Anonymous Buyer'}</div>
                        <div className="text-[10px] text-[#A38E88]">{ord.order_reference || `#${ord.id?.slice(0, 8)}`}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-editorial font-medium text-[#2C1E1B]">₱{Number(ord.total_amount || 0).toLocaleString()}</div>
                        <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded-none border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {ord.payment_status || ord.status || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUICK SYSTEM SHORTCUTS */}
          <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 rounded-none shadow-sm space-y-3">
            <h3 className="text-sm font-editorial text-[#2C1E1B] font-medium pb-2 border-b border-[#E8DCD7]">
              Workspace Shortcuts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => onNavigateTab('products')}
                className="p-3 bg-[#FAF0EC] hover:bg-[#E8DCD7]/60 border border-[#E8DCD7] text-left transition-colors rounded-none group cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#B86B60] mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-semibold text-[#2C1E1B]">Catalog</div>
                <div className="text-[10px] text-[#705B56] truncate">Manage garments</div>
              </button>

              <button
                onClick={() => onNavigateTab('customize')}
                className="p-3 bg-[#FAF0EC] hover:bg-[#E8DCD7]/60 border border-[#E8DCD7] text-left transition-colors rounded-none group cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-[#B86B60] mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-semibold text-[#2C1E1B]">Customizer</div>
                <div className="text-[10px] text-[#705B56] truncate">Hero & About Us</div>
              </button>

              <button
                onClick={() => onNavigateTab('profile')}
                className="p-3 bg-[#FAF0EC] hover:bg-[#E8DCD7]/60 border border-[#E8DCD7] text-left transition-colors rounded-none group cursor-pointer"
              >
                <User className="w-4 h-4 text-[#B86B60] mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-semibold text-[#2C1E1B]">Owner Profile</div>
                <div className="text-[10px] text-[#705B56] truncate">Staff details</div>
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
