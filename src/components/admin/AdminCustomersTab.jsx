import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  User, 
  Mail, 
  Calendar, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Crown, 
  Sparkles, 
  ShieldCheck, 
  Sliders, 
  Edit3, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  RotateCcw,
  Tag,
  Package
} from 'lucide-react';
import { 
  TIER_KEYS, 
  DEFAULT_TIER_CONFIG, 
  getCustomerTierBenefits, 
  saveCustomerTierBenefits, 
  resetCustomerTierBenefits, 
  calculateCustomerTier 
} from '../../lib/customerRanking';

const AdminCustomersTab = ({ orders = [], onExportCsv }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState('ALL'); // 'ALL' | 'AURA Muse' | 'AURA Icon' | 'AURA Royal'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Tier Benefits Configuration State
  const [tierConfig, setTierConfig] = useState(getCustomerTierBenefits);
  const [isBenefitsModalOpen, setIsBenefitsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState(TIER_KEYS.MUSE);
  const [tempBenefits, setTempBenefits] = useState(tierConfig);
  const [saveFeedback, setSaveFeedback] = useState('');

  // Synchronize tier benefits if updated in another tab
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail) {
        setTierConfig(e.detail);
        setTempBenefits(e.detail);
      }
    };
    window.addEventListener('aura_tier_benefits_updated', handleUpdate);
    return () => window.removeEventListener('aura_tier_benefits_updated', handleUpdate);
  }, []);

  // Aggregate orders by customer email & compute total items ordered + tier
  const customersData = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      // Exclude admin or invalid emails
      if (!o.customer_email) return;
      const email = o.customer_email.toLowerCase().trim();
      if (email.endsWith('@admin.com') || email.endsWith('@superadmin.com') || email.endsWith('@aura.com')) {
        return;
      }
      
      const isPaid = (o.payment_status || '').toUpperCase() === 'PAID' || 
                     (o.status || '').toUpperCase() === 'COMPLETED' || 
                     (o.status || '').toUpperCase() === 'DELIVERED';
      
      const amount = isPaid ? (Number(o.total_amount) || 0) : 0;

      // Count total items ordered
      const itemsCount = Array.isArray(o.items) && o.items.length > 0
        ? o.items.reduce((acc, it) => acc + (Number(it?.quantity) || 1), 0)
        : (Number(o.items_count) || 1);
      
      if (!map.has(email)) {
        map.set(email, {
          email,
          name: o.customer_name || 'Client',
          phone: o.customer_phone || 'N/A',
          totalOrders: 1,
          totalItems: itemsCount,
          totalSpent: amount,
          firstOrderDate: o.created_at,
          lastOrderDate: o.created_at,
        });
      } else {
        const cust = map.get(email);
        cust.totalOrders += 1;
        cust.totalItems += itemsCount;
        cust.totalSpent += amount;
        if (new Date(o.created_at) < new Date(cust.firstOrderDate)) cust.firstOrderDate = o.created_at;
        if (new Date(o.created_at) > new Date(cust.lastOrderDate)) cust.lastOrderDate = o.created_at;
      }
    });

    return Array.from(map.values())
      .map(c => ({
        ...c,
        tier: calculateCustomerTier(c.totalItems),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  // Counts by tier
  const tierCounts = useMemo(() => {
    const counts = {
      [TIER_KEYS.MUSE]: 0,
      [TIER_KEYS.ICON]: 0,
      [TIER_KEYS.ROYAL]: 0,
    };
    customersData.forEach(c => {
      if (counts[c.tier] !== undefined) {
        counts[c.tier] += 1;
      }
    });
    return counts;
  }, [customersData]);

  // Filtered by Search & Tier
  const filteredCustomers = useMemo(() => {
    let result = customersData;

    if (selectedTierFilter !== 'ALL') {
      result = result.filter(c => c.tier === selectedTierFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.email.toLowerCase().includes(q) || 
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.tier.toLowerCase().includes(q)
      );
    }

    return result;
  }, [customersData, selectedTierFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const displayedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = () => {
    if (onExportCsv) {
      onExportCsv('customers', filteredCustomers);
      return;
    }

    // Direct CSV download fallback
    const headers = ['Email', 'Name', 'Phone', 'Ranking Tier', 'Total Items Ordered', 'Total Orders', 'Total Spent (PHP)', 'First Order', 'Last Active'];
    const rows = filteredCustomers.map(c => [
      `"${c.email}"`,
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.tier}"`,
      c.totalItems,
      c.totalOrders,
      c.totalSpent,
      `"${new Date(c.firstOrderDate).toISOString().slice(0, 10)}"`,
      `"${new Date(c.lastOrderDate).toISOString().slice(0, 10)}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aura_customers_rankings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tier Benefits Modal Handlers
  const handleOpenBenefitsModal = () => {
    setTempBenefits(JSON.parse(JSON.stringify(tierConfig)));
    setSaveFeedback('');
    setIsBenefitsModalOpen(true);
  };

  const handleBenefitChange = (tierKey, index, val) => {
    setTempBenefits(prev => {
      const copy = { ...prev };
      const list = [...copy[tierKey].benefits];
      list[index] = val;
      copy[tierKey] = { ...copy[tierKey], benefits: list };
      return copy;
    });
  };

  const handleAddBenefit = (tierKey) => {
    setTempBenefits(prev => {
      const copy = { ...prev };
      copy[tierKey] = {
        ...copy[tierKey],
        benefits: [...copy[tierKey].benefits, 'New VIP Benefit'],
      };
      return copy;
    });
  };

  const handleRemoveBenefit = (tierKey, index) => {
    setTempBenefits(prev => {
      const copy = { ...prev };
      const list = copy[tierKey].benefits.filter((_, i) => i !== index);
      copy[tierKey] = { ...copy[tierKey], benefits: list };
      return copy;
    });
  };

  const handleVoucherFieldChange = (tierKey, field, val) => {
    setTempBenefits(prev => ({
      ...prev,
      [tierKey]: {
        ...prev[tierKey],
        [field]: val,
      },
    }));
  };

  const handleSaveBenefits = () => {
    const success = saveCustomerTierBenefits(tempBenefits);
    if (success) {
      setTierConfig(tempBenefits);
      setSaveFeedback('Tier benefits and vouchers saved successfully!');
      setTimeout(() => {
        setIsBenefitsModalOpen(false);
        setSaveFeedback('');
      }, 1200);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Reset all ranking benefits and vouchers to default factory settings?")) return;
    const defaults = resetCustomerTierBenefits();
    setTierConfig(defaults);
    setTempBenefits(defaults);
    setSaveFeedback('Reset to default tier settings.');
    setTimeout(() => setSaveFeedback(''), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* HEADER & CONTROLS */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-sans text-slate-900 tracking-tight">Customer CRM & VIP Rankings</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full">
                3 Tiers Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Customer ranking hierarchy based on total ordered items (Muse $\le$ 5, Icon 6–15, Royal &gt; 15).
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-60 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <input
                type="text"
                placeholder="Search email, name, tier..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/70 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
              />
            </div>

            <button
              onClick={handleOpenBenefitsModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-full shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              title="Configure Benefits & Vouchers for each Ranking Tier"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <span>Configure Tier Benefits</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* TIER FILTER PILLS */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap mr-1">
            Filter Tier:
          </span>
          <button
            onClick={() => { setSelectedTierFilter('ALL'); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedTierFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Clients ({customersData.length})
          </button>
          <button
            onClick={() => { setSelectedTierFilter(TIER_KEYS.MUSE); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedTierFilter === TIER_KEYS.MUSE
                ? 'bg-[#9E6D5F] text-white shadow-xs'
                : 'bg-[#FDF7F5] text-[#9E6D5F] border border-[#E8DCD7] hover:bg-rose-100/60'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>AURA Muse ({tierCounts[TIER_KEYS.MUSE]})</span>
          </button>
          <button
            onClick={() => { setSelectedTierFilter(TIER_KEYS.ICON); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedTierFilter === TIER_KEYS.ICON
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>AURA Icon ({tierCounts[TIER_KEYS.ICON]})</span>
          </button>
          <button
            onClick={() => { setSelectedTierFilter(TIER_KEYS.ROYAL); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedTierFilter === TIER_KEYS.ROYAL
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
            }`}
          >
            <Crown className="w-3 h-3 text-amber-500" />
            <span>AURA Royal ({tierCounts[TIER_KEYS.ROYAL]})</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Patrons</p>
              <p className="text-2xl font-bold font-sans text-slate-900">{customersData.length}</p>
            </div>
          </div>
        </div>

        {/* Muse Tier Card */}
        <div 
          onClick={() => { setSelectedTierFilter(TIER_KEYS.MUSE); setCurrentPage(1); }}
          className="bg-white border border-rose-100 hover:border-rose-300 p-5 rounded-2xl shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#FDF7F5] text-[#9E6D5F] flex items-center justify-center border border-[#E8DCD7]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#9E6D5F]">AURA Muse</p>
                <p className="text-xl font-bold font-sans text-slate-900">{tierCounts[TIER_KEYS.MUSE]}</p>
              </div>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
              $\le$ 5 items
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">
            Voucher: <span className="font-mono font-bold text-slate-700">{tierConfig[TIER_KEYS.MUSE]?.voucherCode}</span> ({tierConfig[TIER_KEYS.MUSE]?.voucherDiscount})
          </p>
        </div>

        {/* Icon Tier Card */}
        <div 
          onClick={() => { setSelectedTierFilter(TIER_KEYS.ICON); setCurrentPage(1); }}
          className="bg-white border border-purple-100 hover:border-purple-300 p-5 rounded-2xl shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-purple-700">AURA Icon</p>
                <p className="text-xl font-bold font-sans text-slate-900">{tierCounts[TIER_KEYS.ICON]}</p>
              </div>
            </div>
            <span className="text-[9px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
              6–15 items
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">
            Voucher: <span className="font-mono font-bold text-slate-700">{tierConfig[TIER_KEYS.ICON]?.voucherCode}</span> ({tierConfig[TIER_KEYS.ICON]?.voucherDiscount})
          </p>
        </div>

        {/* Royal Tier Card */}
        <div 
          onClick={() => { setSelectedTierFilter(TIER_KEYS.ROYAL); setCurrentPage(1); }}
          className="bg-white border border-amber-200 hover:border-amber-400 p-5 rounded-2xl shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-300">
                <Crown className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-amber-800">AURA Royal</p>
                <p className="text-xl font-bold font-sans text-slate-900">{tierCounts[TIER_KEYS.ROYAL]}</p>
              </div>
            </div>
            <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              &gt; 15 items
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">
            Voucher: <span className="font-mono font-bold text-slate-700">{tierConfig[TIER_KEYS.ROYAL]?.voucherCode}</span> ({tierConfig[TIER_KEYS.ROYAL]?.voucherDiscount})
          </p>
        </div>
      </div>

      {/* CUSTOMERS TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Ranking</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Items Ordered</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Total Orders</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lifetime Value</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500 text-xs">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                displayedCustomers.map((cust, idx) => {
                  const cfg = tierConfig[cust.tier] || DEFAULT_TIER_CONFIG[cust.tier];
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                            cust.tier === TIER_KEYS.ROYAL 
                              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                              : cust.tier === TIER_KEYS.ICON
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {cust.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-900">{cust.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="text-xs text-slate-600 font-mono">{cust.email}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{cust.phone}</div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.pillClass || 'bg-slate-100 text-slate-700'}`}>
                          {cust.tier === TIER_KEYS.ROYAL && <Crown className="w-3 h-3 text-amber-600" />}
                          {cust.tier === TIER_KEYS.ICON && <ShieldCheck className="w-3 h-3 text-purple-600" />}
                          {cust.tier === TIER_KEYS.MUSE && <Sparkles className="w-3 h-3 text-[#9E6D5F]" />}
                          <span>{cust.tier}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold font-mono">
                          <Package className="w-3 h-3 text-slate-500" />
                          <span>{cust.totalItems}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle text-center">
                        <span className="text-xs text-slate-600 font-medium">
                          {cust.totalOrders}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="text-xs font-bold text-emerald-600 font-mono">
                          ₱{cust.totalSpent.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle text-xs text-slate-500 whitespace-nowrap">
                        {new Date(cust.lastOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredCustomers.length)} of {filteredCustomers.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="text-xs font-bold font-sans text-slate-700 px-2">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MANAGE TIER BENEFITS MODAL (Admin Configurable) */}
      {isBenefitsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Configure Customer Ranking & Benefits</h3>
                  <p className="text-[11px] text-slate-400">
                    Customize the perks, vouchers, and discounts granted to each VIP tier.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBenefitsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tier Selector Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto">
              <button
                onClick={() => setEditingTier(TIER_KEYS.MUSE)}
                className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  editingTier === TIER_KEYS.MUSE
                    ? 'border-[#9E6D5F] text-[#9E6D5F]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AURA Muse ($\le$ 5 items)</span>
              </button>

              <button
                onClick={() => setEditingTier(TIER_KEYS.ICON)}
                className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  editingTier === TIER_KEYS.ICON
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AURA Icon (6–15 items)</span>
              </button>

              <button
                onClick={() => setEditingTier(TIER_KEYS.ROYAL)}
                className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  editingTier === TIER_KEYS.ROYAL
                    ? 'border-amber-600 text-amber-800'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>AURA Royal (&gt; 15 items)</span>
              </button>
            </div>

            {/* Modal Content Form */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Voucher Setting */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Tier Exclusive Voucher Code
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Voucher Code
                    </label>
                    <input
                      type="text"
                      value={tempBenefits[editingTier]?.voucherCode || ''}
                      onChange={(e) => handleVoucherFieldChange(editingTier, 'voucherCode', e.target.value.toUpperCase())}
                      placeholder="e.g. MUSE10"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Discount Value / Description
                    </label>
                    <input
                      type="text"
                      value={tempBenefits[editingTier]?.voucherDiscount || ''}
                      onChange={(e) => handleVoucherFieldChange(editingTier, 'voucherDiscount', e.target.value)}
                      placeholder="e.g. 10% OFF"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Benefits List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    VIP Privileges & Perks ({editingTier})
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddBenefit(editingTier)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Benefit</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {(tempBenefits[editingTier]?.benefits || []).map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={b}
                        onChange={(e) => handleBenefitChange(editingTier, idx, e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefit(editingTier, idx)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                        title="Remove Benefit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {saveFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{saveFeedback}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Factory Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBenefitsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBenefits}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Benefits</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomersTab;
