import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  CreditCard,
  Truck,
  TrendingUp,
  Download,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ShoppingBag,
  FileText
} from 'lucide-react';

export default function AdminFinanceTab({ orders = [], isLoading = false, onRefresh }) {
  // Helper to get local date string YYYY-MM-DD
  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateStr(), []);

  // Filter States
  const [datePreset, setDatePreset] = useState('today'); // 'today' | 'yesterday' | '7days' | 'month' | 'all' | 'custom'
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all'); // 'all' | 'xendit' | 'cod'

  // Apply quick presets
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'today') {
      const t = getLocalDateStr(now);
      setStartDate(t);
      setEndDate(t);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = getLocalDateStr(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      setStartDate(getLocalDateStr(past7));
      setEndDate(getLocalDateStr(now));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(getLocalDateStr(firstDay));
      setEndDate(getLocalDateStr(now));
    } else if (preset === '30days') {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 29);
      setStartDate(getLocalDateStr(past30));
      setEndDate(getLocalDateStr(now));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Helper to compute net merchandise sales (excluding shipping fee since shipping is not profit)
  const getOrderNetSales = (order) => {
    const total = Number(order.total_amount) || 0;
    const shipping = Number(order.shipping_fee) || 0;
    if (shipping > 0) {
      return Math.max(0, total - shipping);
    }
    if (order.subtotal !== undefined && order.subtotal !== null) {
      const sub = Number(order.subtotal) || 0;
      const disc = Number(order.discount_amount) || 0;
      return Math.max(0, sub - disc);
    }
    return total;
  };

  // Determine if an order is COD or Xendit/Online
  const isCodOrder = (order) => {
    const method = (order.payment_method || '').toUpperCase().trim();
    // Exclude online e-wallets and gateways that contain "CASH" (such as GCASH)
    if (
      method.includes('GCASH') ||
      method.includes('MAYA') ||
      method.includes('CARD') ||
      method.includes('ONLINE') ||
      method.includes('XENDIT')
    ) {
      return false;
    }
    return method === 'COD' || method === 'CASH ON DELIVERY' || method === 'CASH_ON_DELIVERY';
  };

  // Helper to format channel badge with clear branding (Xendit GCash / Maya / Card vs COD)
  const getPaymentChannelBadge = (order) => {
    const isCod = isCodOrder(order);
    const rawMethod = (order.payment_method || '').toUpperCase().trim();

    if (isCod) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <Truck className="w-3 h-3 text-amber-600" />
          <span>COD • Cash on Delivery</span>
        </span>
      );
    }

    if (rawMethod === 'GCASH' || rawMethod.includes('GCASH')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <CreditCard className="w-3 h-3 text-blue-600" />
          <span>Xendit • GCash</span>
        </span>
      );
    }

    if (rawMethod === 'MAYA' || rawMethod.includes('MAYA')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CreditCard className="w-3 h-3 text-emerald-600" />
          <span>Xendit • Maya</span>
        </span>
      );
    }

    if (rawMethod === 'CARD' || rawMethod.includes('CARD')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <CreditCard className="w-3 h-3 text-indigo-600" />
          <span>Xendit • Card</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <CreditCard className="w-3 h-3 text-blue-600" />
        <span>Xendit • {order.payment_method || 'Online'}</span>
      </span>
    );
  };

  // Filter orders by date range, channel, and search query
  const { filteredOrders, activeDateLabel } = useMemo(() => {
    let list = Array.isArray(orders) ? orders : [];

    // Filter out cancelled orders from sales tracking
    list = list.filter((o) => (o.status || '').toUpperCase() !== 'CANCELLED');

    // Date range filter
    if (startDate || endDate) {
      list = list.filter((o) => {
        if (!o.created_at) return false;
        const orderDateStr = getLocalDateStr(new Date(o.created_at));
        if (startDate && orderDateStr < startDate) return false;
        if (endDate && orderDateStr > endDate) return false;
        return true;
      });
    }

    // Payment channel filter
    if (channelFilter === 'xendit') {
      list = list.filter((o) => !isCodOrder(o));
    } else if (channelFilter === 'cod') {
      list = list.filter((o) => isCodOrder(o));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          (o.order_reference || '').toLowerCase().includes(q) ||
          (o.customer_name || '').toLowerCase().includes(q) ||
          (o.customer_email || '').toLowerCase().includes(q) ||
          (o.customer_phone || '').includes(q)
      );
    }

    let label = 'All Recorded Sales';
    if (datePreset === 'today') {
      label = `Sales for Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    } else if (datePreset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      label = `Sales for Yesterday (${y.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    } else if (datePreset === '7days') {
      label = 'Sales for the Last 7 Days';
    } else if (datePreset === '30days') {
      label = 'Sales for the Last 30 Days';
    } else if (datePreset === 'month') {
      label = `Sales for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } else if (startDate && endDate) {
      label = `Sales from ${startDate} to ${endDate}`;
    }

    return { filteredOrders: list, activeDateLabel: label };
  }, [orders, startDate, endDate, channelFilter, searchQuery, datePreset]);

  // Aggregate Financial Metrics (Excluding shipping fee from profit/sales)
  const metrics = useMemo(() => {
    let totalSales = 0; // Net Merchandise Sales (Profit / Item sales)
    let totalShippingFee = 0;
    let totalGrossCollected = 0;
    let xenditSales = 0;
    let codSales = 0;

    let totalOrdersCount = filteredOrders.length;
    let xenditCount = 0;
    let codCount = 0;

    let xenditPaidSales = 0;
    let codCollectedSales = 0;

    filteredOrders.forEach((o) => {
      const netAmount = getOrderNetSales(o);
      const shipping = Number(o.shipping_fee) || 0;
      const gross = Number(o.total_amount) || 0;

      totalSales += netAmount;
      totalShippingFee += shipping;
      totalGrossCollected += gross;

      const isCod = isCodOrder(o);
      const isPaid = (o.payment_status || '').toUpperCase() === 'PAID';
      const isDelivered = (o.status || '').toUpperCase() === 'DELIVERED';

      if (isCod) {
        codSales += netAmount;
        codCount += 1;
        if (isPaid || isDelivered) codCollectedSales += netAmount;
      } else {
        xenditSales += netAmount;
        xenditCount += 1;
        if (isPaid) xenditPaidSales += netAmount;
      }
    });

    const xenditPct = totalSales > 0 ? Math.round((xenditSales / totalSales) * 100) : 0;
    const codPct = totalSales > 0 ? Math.round((codSales / totalSales) * 100) : 0;
    const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;

    return {
      totalSales,
      totalShippingFee,
      totalGrossCollected,
      xenditSales,
      codSales,
      totalOrdersCount,
      xenditCount,
      codCount,
      xenditPct,
      codPct,
      avgOrderValue,
      xenditPaidSales,
      codCollectedSales,
    };
  }, [filteredOrders]);

  // Export Sales Report CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert('No sales transactions found for this date range.');
      return;
    }

    const headers = [
      'Order Reference',
      'Date & Time',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Payment Channel',
      'Payment Method',
      'Payment Status',
      'Fulfillment Status',
      'Net Sales Amount (Excl. Shipping PHP)',
      'Courier Shipping Fee (PHP)',
      'Total Paid by Customer (PHP)',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.order_reference || ''}"`,
      `"${o.created_at ? new Date(o.created_at).toLocaleString() : ''}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${o.customer_email || ''}"`,
      `"${o.customer_phone || ''}"`,
      `"${isCodOrder(o) ? 'COD' : 'Xendit'}"`,
      `"${o.payment_method || 'Online'}"`,
      `"${o.payment_status || 'PENDING'}"`,
      `"${o.status || 'PENDING'}"`,
      getOrderNetSales(o),
      Number(o.shipping_fee) || 0,
      Number(o.total_amount) || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Aura_Sales_Report_${startDate || 'all'}_to_${endDate || 'today'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header & Date Range Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-600" />
                <span>Finance & Sales Ledger</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">Reconciliation & Revenue Tracking</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
              Finance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track real-time sales revenue, Xendit online settlements, and COD collections.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 shadow-xs transition-all cursor-pointer"
              title="Export filtered sales to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Sales CSV</span>
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                title="Refresh latest orders"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Range Presets & Inputs Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Range:</span>
            </span>

            {[
              { id: 'today', label: 'Today (Default)' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => {
              const active = datePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Date Range Pickers (active for custom or adjusting) */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
              />
            </div>
            <span className="text-slate-400 font-bold">—</span>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Current Active Filter Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-900">{activeDateLabel}</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {metrics.totalOrdersCount} order{metrics.totalOrdersCount === 1 ? '' : 's'} recorded
          </span>
        </div>
      </div>

      {/* 3 Core Finance KPI Cards: Total Sales, Xendit Payment, COD Payment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: TOTAL SALES */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 w-20 h-20 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 border border-white/10">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Net Product Sales</span>
                <h3 className="text-sm font-bold text-white">Total Sales (Profit)</h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              {metrics.totalOrdersCount} Orders
            </span>
          </div>

          <div className="mt-2">
            <div className="text-3xl font-bold font-sans text-white tracking-tight">
              ₱{metrics.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="space-y-1.5 mt-2 pt-2 border-t border-white/10 text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Average Order Value:</span>
                <strong className="text-slate-200">₱{metrics.avgOrderValue.toLocaleString()}</strong>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Courier shipping excluded:</span>
                <span className="font-mono text-slate-300">−₱{metrics.totalShippingFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: XENDIT PAYMENT */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Online Gateway (Net)</span>
                <h3 className="text-sm font-bold text-slate-900">Xendit Payment</h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
              {metrics.xenditPct}% Share
            </span>
          </div>

          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
              ₱{metrics.xenditSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>{metrics.xenditCount} online transactions:</span>
              <span className="font-semibold text-blue-700">GCash • Maya • Cards</span>
            </div>
          </div>
        </div>

        {/* Card 3: COD PAYMENT */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Courier Cash (Net)</span>
                <h3 className="text-sm font-bold text-slate-900">COD Payment</h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
              {metrics.codPct}% Share
            </span>
          </div>

          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
              ₱{metrics.codSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>{metrics.codCount} cash shipments:</span>
              <span className="font-semibold text-amber-800">₱{metrics.codCollectedSales.toLocaleString()} Collected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Channel Revenue Ratio Bar */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-slate-600" />
            <span>Channel Payment Distribution</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Xendit ({metrics.xenditPct}%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>COD ({metrics.codPct}%)</span>
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${metrics.xenditPct}%` }}
            className="bg-blue-600 h-full transition-all duration-500"
            title={`Xendit Online: ₱${metrics.xenditSales.toLocaleString()} (${metrics.xenditPct}%)`}
          />
          <div
            style={{ width: `${metrics.codPct}%` }}
            className="bg-amber-500 h-full transition-all duration-500"
            title={`Cash on Delivery: ₱${metrics.codSales.toLocaleString()} (${metrics.codPct}%)`}
          />
        </div>
      </div>

      {/* Sales Transactions Ledger */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Sales Ledger ({filteredOrders.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Channel filter tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setChannelFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  channelFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Channels
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('xendit')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  channelFilter === 'xendit' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Xendit Only
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('cod')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  channelFilter === 'cod' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                COD Only
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reference or customer..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-48 sm:w-60 focus:outline-none focus:border-slate-800 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Order Reference</th>
                <th className="px-5 py-3.5">Date & Time</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Payment Channel</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Net Sales (Excl. Shipping)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">No Sales Recorded for This Date Range</p>
                      <p className="text-[11px] text-slate-400">
                        {datePreset === 'today'
                          ? 'No orders have been recorded today yet. Select "Last 7 Days" or "This Month" above to review previous sales.'
                          : 'Try picking a different date range or clearing your search filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isCod = isCodOrder(order);
                  const netAmount = getOrderNetSales(order);
                  const shippingFee = Number(order.shipping_fee) || 0;
                  const dateStr = order.created_at
                    ? new Date(order.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Reference */}
                      <td className="px-5 py-3.5 align-middle">
                        <span className="font-mono font-bold text-slate-900">
                          {order.order_reference}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="px-5 py-3.5 align-middle text-slate-600 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="font-semibold text-slate-900">{order.customer_name || 'Walk-in / Guest'}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                          {order.customer_email || order.customer_phone || ''}
                        </div>
                      </td>

                      {/* Payment Channel */}
                      <td className="px-5 py-3.5 align-middle">
                        {getPaymentChannelBadge(order)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 align-middle">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            order.payment_status === 'PAID' || order.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {order.payment_status === 'PAID' ? 'PAID' : (order.status || 'PENDING')}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5 align-middle text-right">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          ₱{netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {shippingFee > 0 ? (
                            <span>+ ₱{shippingFee.toLocaleString()} shipping</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">Free shipping</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
