import React, { useState, useMemo } from 'react';
import { Search, User, Mail, Calendar, TrendingUp, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import LuxuryButton from '../common/LuxuryButton';

const AdminCustomersTab = ({ orders = [], onExportCsv }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Aggregate orders by customer email
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
      
      if (!map.has(email)) {
        map.set(email, {
          email,
          name: o.customer_name || 'Unknown',
          phone: o.customer_phone || 'N/A',
          totalOrders: 1,
          totalSpent: amount,
          firstOrderDate: o.created_at,
          lastOrderDate: o.created_at,
        });
      } else {
        const cust = map.get(email);
        cust.totalOrders += 1;
        cust.totalSpent += amount;
        if (new Date(o.created_at) < new Date(cust.firstOrderDate)) cust.firstOrderDate = o.created_at;
        if (new Date(o.created_at) > new Date(cust.lastOrderDate)) cust.lastOrderDate = o.created_at;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customersData;
    const q = searchQuery.toLowerCase();
    return customersData.filter(c => 
      c.email.toLowerCase().includes(q) || 
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  }, [customersData, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const displayedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = () => {
    if (onExportCsv) {
      onExportCsv('customers', filteredCustomers);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* HEADER & CONTROLS */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold font-sans text-slate-900 tracking-tight">Customer CRM</h2>
            <p className="text-xs text-slate-500 mt-1">
              View and manage registered customers, order history, and lifetime value.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <input
                type="text"
                placeholder="Search email, name or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/70 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Customers</p>
              <p className="text-2xl font-bold font-sans text-slate-900">{customersData.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Avg LTV</p>
              <p className="text-2xl font-bold font-sans text-slate-900">
                ₱{customersData.length ? Math.round(customersData.reduce((acc, c) => acc + c.totalSpent, 0) / customersData.length).toLocaleString() : 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active This Month</p>
              <p className="text-2xl font-bold font-sans text-slate-900">
                {customersData.filter(c => new Date(c.lastOrderDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOMERS TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lifetime Value</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-500 text-xs">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                displayedCustomers.map((cust, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
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
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {cust.totalOrders}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="text-xs font-bold text-emerald-600">
                        ₱{cust.totalSpent.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-xs text-slate-500">
                      {new Date(cust.lastOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))
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
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="text-xs font-bold font-sans text-slate-700 px-2">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomersTab;
