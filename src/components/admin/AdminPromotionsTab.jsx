import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, Trash2, CheckCircle, XCircle, AlertTriangle, Calendar, Gift, Sparkles, Crown, ShieldCheck } from 'lucide-react';
import { supabaseAdmin as supabase } from '../../lib/supabaseClient';

const DEFAULT_VOUCHER_PRESETS = [
  { code: 'MUSE10', type: 'voucher', discount_type: 'percentage', discount_value: 10, min_order_value: 0, label: 'Muse Tier Voucher (10% OFF)' },
  { code: 'ICON15', type: 'voucher', discount_type: 'percentage', discount_value: 15, min_order_value: 0, label: 'Icon Tier Voucher (15% OFF, No Min. Spend)' },
  { code: 'ROYAL20', type: 'voucher', discount_type: 'percentage', discount_value: 20, min_order_value: 0, label: 'Royal Tier Voucher (20% OFF)' },
  { code: 'AURA100', type: 'voucher', discount_type: 'fixed', discount_value: 100, min_order_value: 800, label: 'Gift Voucher (₱100 OFF, min ₱800)' },
  { code: 'WELCOME50', type: 'voucher', discount_type: 'fixed', discount_value: 50, min_order_value: 500, label: 'Welcome Voucher (₱50 OFF, min ₱500)' },
];

const LOCAL_STORAGE_KEY = 'aura_custom_vouchers';

const AdminPromotionsTab = () => {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'PROMO' | 'VOUCHER'
  const [isAdding, setIsAdding] = useState(false);
  const [notification, setNotification] = useState(null);

  const [newPromo, setNewPromo] = useState({
    code: '',
    promo_type: 'voucher', // 'voucher' | 'promo'
    discount_type: 'percentage',
    discount_value: '',
    usage_limit: '',
    min_order_value: '0',
    expires_at: ''
  });

  const getLocalVouchers = () => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading local vouchers:', e);
    }
    return DEFAULT_VOUCHER_PRESETS.map((p, idx) => ({
      id: `preset-${idx}`,
      code: p.code,
      promo_type: p.type,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      min_order_value: p.min_order_value,
      usage_limit: null,
      times_used: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    }));
  };

  const saveLocalVouchers = (list) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('aura_vouchers_updated', { detail: list }));
    } catch (e) {
      console.warn('Error saving local vouchers:', e);
    }
  };

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const localList = getLocalVouchers();
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && Array.isArray(data)) {
        // Merge Supabase entries with local vouchers
        const codeMap = new Map();
        localList.forEach(v => codeMap.set(v.code.toUpperCase(), v));
        data.forEach(p => codeMap.set(p.code.toUpperCase(), p));
        const merged = Array.from(codeMap.values());
        setPromotions(merged);
        saveLocalVouchers(merged);
      } else {
        setPromotions(localList);
      }
    } catch (err) {
      console.error("Error fetching promotions:", err);
      setPromotions(getLocalVouchers());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleApplyPreset = (preset) => {
    setNewPromo({
      code: preset.code,
      promo_type: preset.type || 'voucher',
      discount_type: preset.discount_type,
      discount_value: preset.discount_value.toString(),
      usage_limit: '',
      min_order_value: (preset.min_order_value || 0).toString(),
      expires_at: ''
    });
    setIsAdding(true);
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    try {
      const code = newPromo.code.toUpperCase().trim();
      if (!code) throw new Error("Code is required");
      
      const payload = {
        id: `voucher-${Date.now()}`,
        code,
        promo_type: newPromo.promo_type,
        discount_type: newPromo.discount_type,
        discount_value: parseFloat(newPromo.discount_value),
        usage_limit: newPromo.usage_limit ? parseInt(newPromo.usage_limit) : null,
        min_order_value: parseFloat(newPromo.min_order_value) || 0,
        expires_at: newPromo.expires_at ? new Date(newPromo.expires_at).toISOString() : null,
        times_used: 0,
        is_active: true,
        created_at: new Date().toISOString()
      };

      // Try inserting into Supabase
      try {
        await supabase.from('promotions').upsert([payload]);
      } catch (err) {
        console.warn('Supabase promotion upsert fallback to local:', err);
      }

      // Always save to local cache for instant availability
      const existing = getLocalVouchers();
      const updated = [payload, ...existing.filter(p => p.code.toUpperCase() !== code)];
      saveLocalVouchers(updated);
      setPromotions(updated);

      showNotification('success', `${newPromo.promo_type === 'voucher' ? 'Voucher' : 'Coupon code'} ${code} created successfully!`);
      setIsAdding(false);
      setNewPromo({
        code: '',
        promo_type: 'voucher',
        discount_type: 'percentage',
        discount_value: '',
        usage_limit: '',
        min_order_value: '0',
        expires_at: ''
      });
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus, code) => {
    try {
      try {
        await supabase
          .from('promotions')
          .update({ is_active: !currentStatus })
          .eq('code', code);
      } catch (e) {}

      const updated = promotions.map(p => 
        (p.id === id || p.code === code) ? { ...p, is_active: !currentStatus } : p
      );
      saveLocalVouchers(updated);
      setPromotions(updated);
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete promo/voucher "${code}"?`)) return;
    try {
      try {
        await supabase.from('promotions').delete().eq('code', code);
      } catch (e) {}

      const updated = promotions.filter(p => p.id !== id && p.code !== code);
      saveLocalVouchers(updated);
      setPromotions(updated);
      showNotification('success', `Promotion ${code} deleted.`);
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const filteredPromos = promotions.filter(p => {
    const matchesSearch = p.code.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'VOUCHER') return matchesSearch && (p.promo_type === 'voucher' || p.code.includes('MUSE') || p.code.includes('ICON') || p.code.includes('ROYAL') || p.code.includes('AURA') || p.code.includes('WELCOME'));
    if (filterType === 'PROMO') return matchesSearch && p.promo_type !== 'voucher';
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* NOTIFICATION */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 ${
          notification.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {notification.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {notification.message}
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-sans text-slate-900 tracking-tight">Vouchers & Promotions</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                Tier Vouchers Supported
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage customer discount vouchers, VIP tier reward codes, and marketing coupons.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <input
                type="text"
                placeholder="Search voucher codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/70 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
              />
            </div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-full transition-colors whitespace-nowrap shadow-sm hover:shadow cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Cancel' : 'New Voucher / Code'}</span>
            </button>
          </div>
        </div>

        {/* QUICK PRESETS */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Gift className="w-3 h-3 text-purple-500" />
            <span>Quick Issue Voucher:</span>
          </span>
          {DEFAULT_VOUCHER_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(preset)}
              className="px-2.5 py-1 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 border border-slate-200/80 rounded-lg text-xs font-mono font-bold text-slate-700 transition-colors cursor-pointer"
              title={preset.label}
            >
              + {preset.code} ({preset.discount_type === 'percentage' ? `${preset.discount_value}%` : `₱${preset.discount_value}`})
            </button>
          ))}
        </div>

        {/* FILTER BUTTONS */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Codes ({promotions.length})
          </button>
          <button
            onClick={() => setFilterType('VOUCHER')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              filterType === 'VOUCHER' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <Gift className="w-3 h-3" />
            <span>Vouchers Only</span>
          </button>
          <button
            onClick={() => setFilterType('PROMO')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              filterType === 'PROMO' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>Coupons Only</span>
          </button>
        </div>
      </div>

      {/* CREATE FORM */}
      {isAdding && (
        <div className="bg-slate-50 border border-slate-200/80 p-6 rounded-2xl shadow-inner">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-600" />
            <span>Create New Voucher / Promo Code</span>
          </h3>
          <form onSubmit={handleCreatePromo} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Code</label>
              <input required type="text" value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})} placeholder="e.g. AURA100 or MUSE10" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase text-slate-900" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Classification</label>
              <select value={newPromo.promo_type} onChange={e => setNewPromo({...newPromo, promo_type: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800">
                <option value="voucher">Voucher / VIP Reward</option>
                <option value="promo">Marketing Coupon Code</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discount Type</label>
              <select value={newPromo.discount_type} onChange={e => setNewPromo({...newPromo, discount_type: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₱)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discount Value</label>
              <input required type="number" min="1" step="any" value={newPromo.discount_value} onChange={e => setNewPromo({...newPromo, discount_value: e.target.value})} placeholder={newPromo.discount_type === 'percentage' ? 'e.g. 15' : 'e.g. 100'} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Min. Order Value (₱)</label>
              <input type="number" min="0" value={newPromo.min_order_value} onChange={e => setNewPromo({...newPromo, min_order_value: e.target.value})} placeholder="e.g. 1500" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date (Optional)</label>
              <input type="datetime-local" value={newPromo.expires_at} onChange={e => setNewPromo({...newPromo, expires_at: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800" />
            </div>
            <div className="md:col-span-2 lg:col-span-3 pt-2 flex items-center gap-2">
              <button type="submit" className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer">
                Save Voucher
              </button>
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type & Code</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discount Value</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Min. Spend</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expires</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-xs text-slate-500">Loading promotions...</td></tr>
              ) : filteredPromos.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-xs text-slate-500">No vouchers or promotions found.</td></tr>
              ) : (
                filteredPromos.map(promo => {
                  const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
                  const isDepleted = promo.usage_limit && promo.times_used >= promo.usage_limit;
                  const isActive = promo.is_active && !isExpired && !isDepleted;
                  const isVoucher = promo.promo_type === 'voucher' || promo.code.includes('MUSE') || promo.code.includes('ICON') || promo.code.includes('ROYAL') || promo.code.includes('AURA') || promo.code.includes('WELCOME');

                  return (
                    <tr key={promo.id || promo.code} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {isVoucher ? (
                            <Gift className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Tag className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {promo.code}
                          </span>
                          {isVoucher && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200/60 rounded">
                              Voucher
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-emerald-600">
                          {promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `₱${promo.discount_value} OFF`}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-slate-700 font-mono">
                          {promo.min_order_value > 0 ? `₱${promo.min_order_value.toLocaleString()}` : 'None'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button 
                          onClick={() => handleToggleStatus(promo.id, promo.is_active, promo.code)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                            isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-slate-600">
                          {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'No expiry'}
                        </div>
                        {isExpired && <div className="text-[10px] text-rose-500 font-bold">Expired</div>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => handleDelete(promo.id, promo.code)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPromotionsTab;
