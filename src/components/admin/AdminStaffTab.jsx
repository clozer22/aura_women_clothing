import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Shield,
  UserPlus,
  Users,
  Search,
  Check,
  X,
  Edit2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Sliders,
  Package,
  ShoppingBag,
  Star,
  LayoutDashboard,
  CheckCircle2,
  RefreshCw,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ALL_AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard Overview', desc: 'KPI metrics, revenue stats, visitor trends', icon: LayoutDashboard },
  { id: 'products', label: 'Manage Products', desc: 'Product inventory, pricing, sizing, stock levels', icon: ShoppingBag },
  { id: 'orders', label: 'Manage Orders', desc: 'Order fulfillment, courier dispatch, tracking', icon: Package },
  { id: 'reviews', label: 'Customer Reviews', desc: 'Customer ratings, moderation, feedback', icon: Star },
  { id: 'customize', label: 'Store Customizer', desc: 'Visual theme, hero banners, site branding', icon: Sliders },
  { id: 'profile', label: 'Owner Profile', desc: 'Atelier profile info and bio settings', icon: User },
];

export default function AdminStaffTab({
  currentAdminEmail = '',
  currentAdminRole = 'Super Admin',
  onNotification = () => {},
}) {
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditPermsModalOpen, setIsEditPermsModalOpen] = useState(false);
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState(null);
  
  // Add Staff Form state
  const [newStaffEmailPrefix, setNewStaffEmailPrefix] = useState('');
  const [newStaffDomain, setNewStaffDomain] = useState('@admin.com'); // '@admin.com' | '@superadmin.com'
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRoleTitle, setNewStaffRoleTitle] = useState('Order & Fulfillment Lead');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newStaffRole, setNewStaffRole] = useState('Admin');
  const [newStaffPermissions, setNewStaffPermissions] = useState(['dashboard', 'orders']);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  
  // Edit Permissions state
  const [editingPermissions, setEditingPermissions] = useState([]);
  const [isUpdatingPerms, setIsUpdatingPerms] = useState(false);

  // Fetch Staff List from API
  const fetchStaffList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin-manage-staff?action=list');
      const data = await res.json();
      if (data && Array.isArray(data.staff)) {
        setStaffList(data.staff);
      } else {
        setStaffList([]);
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
      onNotification('error', 'Fetch Failed', 'Could not load staff registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  // Filter staff by search query
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.role_title && s.role_title.toLowerCase().includes(q)) ||
        (s.role && s.role.toLowerCase().includes(q))
    );
  }, [staffList, searchQuery]);

  // Handle Domain Change to automatically suggest appropriate role
  const handleDomainChange = (domain) => {
    setNewStaffDomain(domain);
    if (domain === '@superadmin.com') {
      setNewStaffRole('Super Admin');
      setNewStaffPermissions(ALL_AVAILABLE_PAGES.map((p) => p.id));
    } else {
      setNewStaffRole('Admin');
    }
  };

  // Toggle permission checkbox in Add Form
  const toggleAddPermission = (pageId) => {
    setNewStaffPermissions((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId]
    );
  };

  // Toggle permission checkbox in Edit Form
  const toggleEditPermission = (pageId) => {
    setEditingPermissions((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId]
    );
  };

  // Submit New Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    const cleanPrefix = newStaffEmailPrefix.trim().toLowerCase().replace(/@.*/, '');
    if (!cleanPrefix) {
      onNotification('warning', 'Invalid Email', 'Please provide a username for the staff email.');
      return;
    }
    const fullEmail = `${cleanPrefix}${newStaffDomain}`;
    if (!newStaffPassword || newStaffPassword.length < 6) {
      onNotification('warning', 'Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setIsSubmittingNew(true);
    try {
      const res = await fetch('/api/admin-manage-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          email: fullEmail,
          password: newStaffPassword,
          name: newStaffName.trim() || cleanPrefix,
          role: newStaffRole,
          role_title: newStaffRoleTitle.trim() || 'Staff Specialist',
          permissions: newStaffRole === 'Super Admin' ? ALL_AVAILABLE_PAGES.map(p => p.id) : newStaffPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create staff member.');
      }

      onNotification('success', 'Staff Provisioned', `Account created for ${fullEmail}!`);
      setIsAddModalOpen(false);
      // Reset form
      setNewStaffEmailPrefix('');
      setNewStaffName('');
      setNewStaffPassword('');
      setNewStaffPermissions(['dashboard', 'orders']);
      await fetchStaffList();
    } catch (err) {
      onNotification('error', 'Provisioning Failed', err.message);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Open Edit Permissions Modal
  const handleOpenEditPermissions = (staff) => {
    setSelectedStaffForEdit(staff);
    const existingPerms = Array.isArray(staff.permissions)
      ? staff.permissions
      : ALL_AVAILABLE_PAGES.map((p) => p.id);
    setEditingPermissions(existingPerms);
    setIsEditPermsModalOpen(true);
  };

  // Save Updated Permissions
  const handleSavePermissions = async () => {
    if (!selectedStaffForEdit) return;
    setIsUpdatingPerms(true);
    try {
      const res = await fetch('/api/admin-manage-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-permissions',
          staffId: selectedStaffForEdit.id,
          permissions: editingPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update permissions');
      }

      onNotification('success', 'Permissions Updated', `Access rights saved for ${selectedStaffForEdit.name || selectedStaffForEdit.email}`);
      setIsEditPermsModalOpen(false);
      await fetchStaffList();
    } catch (err) {
      onNotification('error', 'Update Failed', err.message);
    } finally {
      setIsUpdatingPerms(false);
    }
  };

  // Toggle Staff Active/Suspended status
  const handleToggleStatus = async (staff) => {
    const newStatus = !staff.is_active;
    try {
      const res = await fetch('/api/admin-manage-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-status',
          staffId: staff.id,
          isActive: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update status');
      }
      onNotification(
        'success',
        newStatus ? 'Account Activated' : 'Account Suspended',
        `${staff.email} is now ${newStatus ? 'active' : 'suspended'}.`
      );
      await fetchStaffList();
    } catch (err) {
      onNotification('error', 'Status Change Failed', err.message);
    }
  };

  // Quick stats
  const totalStaff = staffList.length;
  const activeAdmins = staffList.filter((s) => s.is_active !== false).length;
  const superAdminsCount = staffList.filter((s) => s.role === 'Super Admin' || (s.email && s.email.includes('@superadmin.com'))).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Superadmin Control Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif tracking-tight">Staff & Role Governance</h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-xl leading-relaxed">
              Create privileged staff accounts with official <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">@admin.com</code> and <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">@superadmin.com</code> handles. Configure granular page-level permissions to ensure staff only access authorized views.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchStaffList}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 text-xs flex items-center gap-2"
              title="Refresh staff registry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold text-xs tracking-wide shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Staff</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Registered</p>
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-xl font-bold font-sans text-white">{totalStaff}</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Staff</p>
            <div className="flex items-center gap-2 mt-1">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xl font-bold font-sans text-emerald-300">{activeAdmins}</span>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Super Administrators</p>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-xl font-bold font-sans text-purple-300">{superAdminsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white rounded-xl placeholder:text-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong className="text-slate-900">{filteredStaff.length}</strong> staff accounts
        </div>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-white border border-slate-200 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-serif text-lg text-slate-800">No Staff Accounts Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery ? 'No staff match your search query.' : 'Click "Add New Staff" to provision the first admin member.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((staff) => {
            const isSuper = staff.role === 'Super Admin' || (staff.email && staff.email.endsWith('@superadmin.com'));
            const isMe = staff.email && staff.email.toLowerCase() === currentAdminEmail.toLowerCase();
            const permissionsList = Array.isArray(staff.permissions) ? staff.permissions : ALL_AVAILABLE_PAGES.map(p => p.id);

            return (
              <div
                key={staff.id || staff.email}
                className={`bg-white border rounded-3xl p-5 shadow-xs transition-all flex flex-col justify-between relative overflow-hidden ${
                  isSuper ? 'border-purple-200/80 hover:border-purple-400' : 'border-slate-200/80 hover:border-indigo-400'
                }`}
              >
                {/* Top Role Badge */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs ${
                        isSuper
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-purple-500/20'
                          : 'bg-gradient-to-tr from-indigo-500 to-blue-500 text-white shadow-indigo-500/20'
                      }`}
                    >
                      {staff.avatar_url ? (
                        <img src={staff.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        (staff.name || staff.email || 'A').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-sans font-bold text-sm text-slate-900 truncate max-w-[150px]">
                          {staff.name || 'Staff Member'}
                        </h3>
                        {isMe && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-600 rounded-md border border-blue-200">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[170px]">{staff.email}</p>
                    </div>
                  </div>

                  {/* Status Tag */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      staff.is_active !== false
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {staff.is_active !== false ? 'Active' : 'Suspended'}
                  </span>
                </div>

                {/* Role Description */}
                <div className="py-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">System Role:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-lg text-[11px] flex items-center gap-1 ${
                        isSuper
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {isSuper ? 'Super Admin' : 'Staff Admin'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Job Title:</span>
                    <span className="text-slate-700 font-medium truncate max-w-[180px]">
                      {staff.role_title || (isSuper ? 'Store Governor' : 'Fulfillment Specialist')}
                    </span>
                  </div>

                  {/* Allowed Pages Chips */}
                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                      Permitted Pages ({isSuper ? 'All' : permissionsList.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {isSuper ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-md">
                          Full Access to All Tabs & Staff Management
                        </span>
                      ) : (
                        ALL_AVAILABLE_PAGES.map((page) => {
                          const isAllowed = permissionsList.includes(page.id);
                          if (!isAllowed) return null;
                          return (
                            <span
                              key={page.id}
                              className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80 flex items-center gap-1"
                            >
                              <page.icon className="w-2.5 h-2.5 text-indigo-500" />
                              {page.label}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenEditPermissions(staff)}
                    disabled={isSuper}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isSuper
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer'
                    }`}
                    title={isSuper ? 'Super Admins always possess full permissions' : 'Configure accessible pages'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Permissions</span>
                  </button>

                  {!isMe && (
                    <button
                      onClick={() => handleToggleStatus(staff)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        staff.is_active !== false
                          ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={staff.is_active !== false ? 'Suspend staff member' : 'Reactivate account'}
                    >
                      {staff.is_active !== false ? 'Suspend' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW STAFF MEMBER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg tracking-tight">Provision New Staff Account</h3>
                    <p className="text-slate-400 text-xs">Create an isolated login with custom privileges</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateStaff} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Email input with domain selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Staff Email Handle
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-indigo-500 focus-within:bg-white transition-all">
                    <div className="pl-3.5 pr-2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. sarah.orders"
                      required
                      value={newStaffEmailPrefix}
                      onChange={(e) => setNewStaffEmailPrefix(e.target.value)}
                      className="w-full py-2.5 text-xs text-slate-800 bg-transparent focus:outline-none"
                    />
                    <select
                      value={newStaffDomain}
                      onChange={(e) => handleDomainChange(e.target.value)}
                      className="bg-slate-200 text-slate-800 text-xs font-semibold py-2.5 px-3 border-l border-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="@admin.com">@admin.com (Staff)</option>
                      <option value="@superadmin.com">@superadmin.com (Superadmin)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Resulting email: <strong className="text-indigo-600">{newStaffEmailPrefix.trim().toLowerCase() || 'name'}{newStaffDomain}</strong>
                  </p>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Sarah Jenkins"
                      required
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Job Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Role Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Order Fulfillment Lead, Catalog Manager"
                    value={newStaffRoleTitle}
                    onChange={(e) => setNewStaffRoleTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Granular Page-Level Permissions */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Permitted Pages & Tabs
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewStaffPermissions(['orders'])}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold"
                      >
                        Orders Only
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setNewStaffPermissions(ALL_AVAILABLE_PAGES.map(p => p.id))}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    {ALL_AVAILABLE_PAGES.map((page) => {
                      const isChecked = newStaffPermissions.includes(page.id);
                      return (
                        <label
                          key={page.id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-all cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${isChecked ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                              <page.icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{page.label}</p>
                              <p className="text-[10px] text-slate-400">{page.desc}</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAddPermission(page.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNew}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingNew ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Provisioning...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT GRANULAR PERMISSIONS */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEditPermsModalOpen && selectedStaffForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100"
            >
              <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg tracking-tight">Configure Permissions</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    For <strong className="text-indigo-400">{selectedStaffForEdit.name || selectedStaffForEdit.email}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setIsEditPermsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Select which pages this staff member can view and interact with. Restricted pages will be removed from their navigation menu.
                </p>

                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  {ALL_AVAILABLE_PAGES.map((page) => {
                    const isChecked = editingPermissions.includes(page.id);
                    return (
                      <label
                        key={page.id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-all cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${isChecked ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                            <page.icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{page.label}</p>
                            <p className="text-[10px] text-slate-400">{page.desc}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEditPermission(page.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditPermsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePermissions}
                    disabled={isUpdatingPerms}
                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingPerms ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Access Rights</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
