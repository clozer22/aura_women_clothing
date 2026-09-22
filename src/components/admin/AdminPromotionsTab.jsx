import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, Trash2, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { supabaseAdmin as supabase } from '../../lib/supabaseClient';

const AdminPromotionsTab = () => {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [notification, setNotification] = useState(null);

  const [newPromo, setNewPromo] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    usage_limit: '',
    min_order_value: '0',
    expires_at: ''
  });

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        // If table doesn't exist yet, just mock it or handle silently
        if (error.code === '42P01') {
          console.warn("Promotions table does not exist. Please run the SQL setup script.");
          setPromotions([]);
        } else {
          throw error;
        }
      } else {
        setPromotions(data || []);
      }
    } catch (err) {
      console.error("Error fetching promotions:", err);
      showNotification('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    try {
      const code = newPromo.code.toUpperCase().trim();
      if (!code) throw new Error("Code is required");
      
      const payload = {
        code,
        discount_type: newPromo.discount_type,
        discount_value: parseFloat(newPromo.discount_value),
        usage_limit: newPromo.usage_limit ? parseInt(newPromo.usage_limit) : null,
        min_order_value: parseFloat(newPromo.min_order_value) || 0,
        expires_at: newPromo.expires_at ? new Date(newPromo.expires_at).toISOString() : null,
        is_active: true
      };

      const { error } = await supabase.from('promotions').insert([payload]);
      if (error) throw error;

      showNotification('success', `Promo code ${code} created successfully!`);
      setIsAdding(false);
      setNewPromo({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        usage_limit: '',
        min_order_value: '0',
        expires_at: ''
      });
      fetchPromotions();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      fetchPromotions();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this promotion?")) return;
    try {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
      showNotification('success', "Promotion deleted.");
      fetchPromotions();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const filteredPromos = promotions.filter(p => p.code.toLowerCase().includes(searchQuery.toLowerCase()));

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
            <h2 className="text-lg font-bold font-sans text-slate-900 tracking-tight">Promotions & Discounts</h2>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage discount codes for marketing campaigns.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <input
                type="text"
                placeholder="Search promo codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/70 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
              />
            </div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-full transition-colors whitespace-nowrap shadow-sm hover:shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Cancel' : 'New Promo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CREATE FORM */}
      {isAdding && (
        <div className="bg-slate-50 border border-slate-200/80 p-6 rounded-2xl shadow-inner">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Create New Promotion</h3>
          <form onSubmit={handleCreatePromo} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Code</label>
              <input required type="text" value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value})} placeholder="e.g. SUMMER20" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discount Type</label>
              <select value={newPromo.discount_type} onChange={e => setNewPromo({...newPromo, discount_type: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₱)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discount Value</label>
              <input required type="number" min="1" step="any" value={newPromo.discount_value} onChange={e => setNewPromo({...newPromo, discount_value: e.target.value})} placeholder={newPromo.discount_type === 'percentage' ? 'e.g. 15' : 'e.g. 500'} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Usage Limit (Optional)</label>
              <input type="number" min="1" value={newPromo.usage_limit} onChange={e => setNewPromo({...newPromo, usage_limit: e.target.value})} placeholder="e.g. 100" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Min. Order Value (Optional)</label>
              <input type="number" min="0" value={newPromo.min_order_value} onChange={e => setNewPromo({...newPromo, min_order_value: e.target.value})} placeholder="e.g. 1500" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date (Optional)</label>
              <input type="datetime-local" value={newPromo.expires_at} onChange={e => setNewPromo({...newPromo, expires_at: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
            </div>
            <div className="md:col-span-2 lg:col-span-3 pt-2">
              <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                Save Promotion
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
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Promo Code</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Value</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usage</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expires</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-xs text-slate-500">Loading promotions...</td></tr>
              ) : filteredPromos.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-xs text-slate-500">No promotions found.</td></tr>
              ) : (
                filteredPromos.map(promo => {
                  const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
                  const isDepleted = promo.usage_limit && promo.times_used >= promo.usage_limit;
                  const isActive = promo.is_active && !isExpired && !isDepleted;

                  return (
                    <tr key={promo.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-slate-400" />
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {promo.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-emerald-600">
                          {promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `₱${promo.discount_value} OFF`}
                        </div>
                        {promo.min_order_value > 0 && (
                          <div className="text-[10px] text-slate-400">Min spend: ₱{promo.min_order_value}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-slate-700">
                          {promo.times_used} / {promo.usage_limit ? promo.usage_limit : '∞'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button 
                          onClick={() => handleToggleStatus(promo.id, promo.is_active)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-slate-600">
                          {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'Never'}
                        </div>
                        {isExpired && <div className="text-[10px] text-rose-500 font-bold">Expired</div>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => handleDelete(promo.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
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
