import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Package,
  LogOut,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getRegions,
  getProvinces,
  getCities,
  getBarangays,
} from '../lib/phAddressApi';

export default function CustomerProfilePage({ onBackToShop, onNavigateOrders, initialTab = 'profile' }) {
  const { user, profile, role, updatePassword, updateProfileData, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab); // 'profile' | 'security' | 'address' | 'orders'

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  // Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Shipping Address State
  const [addressData, setAddressData] = useState({
    street: '',
    regionCode: '',
    regionName: '',
    provinceCode: '',
    provinceName: '',
    cityCode: '',
    cityName: '',
    barangayCode: '',
    barangayName: '',
    zipCode: '',
  });

  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Status Indicators
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [addressSuccess, setAddressSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const hasSetPassword = profile?.has_set_password ?? true;

  // Load saved address on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aura_saved_shipping_address');
      if (saved) {
        setAddressData(JSON.parse(saved));
      }
    } catch (e) {}

    // Load Philippine Regions
    getRegions().then((data) => setRegions(data || []));
  }, []);

  // Update dependent provinces
  useEffect(() => {
    if (addressData.regionCode) {
      getProvinces(addressData.regionCode).then((data) => {
        setProvinces(data || []);
      });
    } else {
      setProvinces([]);
    }
  }, [addressData.regionCode]);

  // Update dependent cities
  useEffect(() => {
    if (addressData.provinceCode) {
      getCities(addressData.provinceCode).then((data) => {
        setCities(data || []);
      });
    } else {
      setCities([]);
    }
  }, [addressData.provinceCode]);

  // Update dependent barangays
  useEffect(() => {
    if (addressData.cityCode) {
      getBarangays(addressData.cityCode).then((data) => {
        setBarangays(data || []);
      });
    } else {
      setBarangays([]);
    }
  }, [addressData.cityCode]);

  // Save Profile Details
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setErrorMsg('');
    setProfileSuccess('');

    try {
      await updateProfileData({ full_name: fullName, phone });
      setProfileSuccess('Profile details saved successfully.');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Save / Create Password
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSettingPassword(true);
    setErrorMsg('');
    setPasswordSuccess('');

    try {
      await updatePassword(newPassword);
      setPasswordSuccess(
        hasSetPassword
          ? 'Password updated successfully.'
          : 'Personal password created successfully! You can now log in directly using your email and password.'
      );
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setIsSettingPassword(false);
    }
  };

  // Save Default Shipping Address
  const handleSaveAddress = (e) => {
    e.preventDefault();
    setIsSavingAddress(true);
    try {
      localStorage.setItem('aura_saved_shipping_address', JSON.stringify(addressData));
      setAddressSuccess('Default delivery address saved for faster checkout.');
      setTimeout(() => setAddressSuccess(''), 4000);
    } catch (err) {
      setErrorMsg('Could not save address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF5F2] text-[#2C1E1B] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-[#E8DCD7] mb-8">
          <button
            onClick={onBackToShop}
            className="text-xs uppercase font-brand font-semibold tracking-[0.2em] text-[#705B56] hover:text-[#2C1E1B] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Boutique</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF0EC] border border-[#E8DCD7] text-[10px] uppercase font-bold tracking-[0.2em] text-[#B86B60]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Role: {role?.toUpperCase()}</span>
          </div>
        </div>

        {/* Customer Header Banner */}
        <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 bg-[#FAF5F2] border border-[#E8DCD7] rounded-full flex items-center justify-center text-2xl font-brand font-bold text-[#2C1E1B] shadow-inner flex-shrink-0">
            {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <span className="text-[10px] font-brand uppercase tracking-[0.25em] text-[#B86B60] font-bold block mb-1">
              AURA ATELIER CLIENT ACCOUNT
            </span>
            <h1 className="font-brand text-3xl text-[#2C1E1B] tracking-wide">
              {fullName || 'Atelier Client'}
            </h1>
            <p className="text-xs text-[#705B56] mt-1 font-sans">{user?.email}</p>

            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="text-[11px] bg-[#FAF5F2] border border-[#E8DCD7] text-[#705B56] px-2.5 py-1">
                Account Status: <strong className="text-[#2C1E1B]">Active</strong>
              </span>
              {!hasSetPassword && (
                <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Password Setup Recommended</span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              onBackToShop();
            }}
            className="py-2.5 px-4 bg-white hover:bg-rose-50 border border-[#E8DCD7] text-rose-700 text-xs uppercase font-bold tracking-[0.15em] transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {profileSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-none flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}
        {passwordSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-none flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}
        {addressSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-none flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{addressSuccess}</span>
          </div>
        )}

        {/* SETTINGS TABS NAVIGATION */}
        <div className="flex border-b border-[#E8DCD7] mb-8 overflow-x-auto">
          {/* Tab 1: Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 px-5 text-xs uppercase tracking-[0.2em] font-brand font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${
              activeTab === 'profile'
                ? 'border-[#2C1E1B] text-[#2C1E1B] bg-white'
                : 'border-transparent text-[#705B56] hover:text-[#2C1E1B]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Client Profile</span>
          </button>

          {/* Tab 2: Security & Password */}
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3.5 px-5 text-xs uppercase tracking-[0.2em] font-brand font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 relative ${
              activeTab === 'security'
                ? 'border-[#2C1E1B] text-[#2C1E1B] bg-white'
                : 'border-transparent text-[#705B56] hover:text-[#2C1E1B]'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Security & Password</span>
            {!hasSetPassword && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Action recommended" />
            )}
          </button>

          {/* Tab 3: Shipping Address */}
          <button
            onClick={() => setActiveTab('address')}
            className={`py-3.5 px-5 text-xs uppercase tracking-[0.2em] font-brand font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${
              activeTab === 'address'
                ? 'border-[#2C1E1B] text-[#2C1E1B] bg-white'
                : 'border-transparent text-[#705B56] hover:text-[#2C1E1B]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Delivery Address</span>
          </button>

          {/* Tab 4: Orders Link */}
          <button
            onClick={onNavigateOrders}
            className="py-3.5 px-5 text-xs uppercase tracking-[0.2em] font-brand font-bold border-b-2 border-transparent text-[#705B56] hover:text-[#2C1E1B] transition-all flex items-center gap-2 cursor-pointer flex-shrink-0"
          >
            <Package className="w-4 h-4" />
            <span>My Orders</span>
            <ExternalLink className="w-3 h-3 text-[#A38E88]" />
          </button>
        </div>

        {/* TAB 1: CLIENT PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm">
            <h2 className="text-sm font-brand font-bold uppercase tracking-[0.2em] text-[#2C1E1B] pb-3 border-b border-[#E8DCD7] mb-6">
              Personal Information
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Elena Vance"
                      className="w-full pl-10 pr-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    Email Address (Registered)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full pl-10 pr-3.5 py-3 bg-[#F0EBE7] border border-[#E8DCD7] text-xs text-[#705B56] cursor-not-allowed rounded-none"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-700 mt-1 block">✓ Verified Supabase Account</span>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    Contact Phone Number (For delivery updates)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+63 917 123 4567"
                      className="w-full pl-10 pr-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    Client Role Level
                  </label>
                  <div className="py-3 px-3.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] font-bold uppercase tracking-wider">
                    {role?.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8DCD7] flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="py-3.5 px-8 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs uppercase font-bold tracking-[0.2em] transition-all rounded-none shadow-md cursor-pointer disabled:opacity-75"
                >
                  {isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: SECURITY & PASSWORD */}
        {activeTab === 'security' && (
          <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm">
            <h2 className="text-sm font-brand font-bold uppercase tracking-[0.2em] text-[#2C1E1B] pb-3 border-b border-[#E8DCD7] mb-6">
              Account Security & Password
            </h2>

            {/* Google Notice Banner */}
            {!hasSetPassword ? (
              <div className="bg-[#FAF5F2] border-l-4 border-amber-500 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-[#2C1E1B] uppercase tracking-wider">
                      Create Your Personal Password
                    </h3>
                    <p className="text-xs text-[#705B56] mt-1 leading-relaxed">
                      You currently sign in via Google. Establish a personal password below so that you can also log in directly using your email address anytime.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#FAF5F2] border-l-4 border-emerald-600 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-[#2C1E1B] uppercase tracking-wider">
                      Personal Password Established
                    </h3>
                    <p className="text-xs text-[#705B56] mt-1 leading-relaxed">
                      Your account is protected with a personal password. You may change it below at any time.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSetPassword} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    {hasSetPassword ? 'New Password *' : 'Create Password *'} (Min. 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8DCD7] flex justify-end">
                <button
                  type="submit"
                  disabled={isSettingPassword}
                  className="py-3.5 px-8 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs uppercase font-bold tracking-[0.2em] transition-all rounded-none shadow-md cursor-pointer disabled:opacity-75 flex items-center gap-2"
                >
                  {isSettingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>{hasSetPassword ? 'Update Password' : 'Create Personal Password'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: DELIVERY ADDRESS */}
        {activeTab === 'address' && (
          <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm">
            <div className="pb-3 border-b border-[#E8DCD7] mb-6 flex items-center justify-between">
              <h2 className="text-sm font-brand font-bold uppercase tracking-[0.2em] text-[#2C1E1B]">
                Default Shipping Address
              </h2>
              <span className="text-[10px] text-[#705B56] uppercase tracking-wider">
                Pre-fills at Checkout
              </span>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-6">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                  House / Unit / Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={addressData.street}
                  onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                  placeholder="e.g. Unit 402, Ayala Alabang Village"
                  className="w-full px-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Region Dropdown */}
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    Region *
                  </label>
                  <select
                    required
                    value={addressData.regionCode}
                    onChange={(e) => {
                      const sel = regions.find((r) => r.code === e.target.value);
                      setAddressData({
                        ...addressData,
                        regionCode: e.target.value,
                        regionName: sel ? sel.name : '',
                        provinceCode: '',
                        provinceName: '',
                        cityCode: '',
                        cityName: '',
                        barangayCode: '',
                        barangayName: '',
                      });
                    }}
                    className="w-full px-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none cursor-pointer"
                  >
                    <option value="">Select Region</option>
                    {regions.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Province Dropdown */}
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    Province *
                  </label>
                  <select
                    required
                    disabled={!addressData.regionCode}
                    value={addressData.provinceCode}
                    onChange={(e) => {
                      const sel = provinces.find((p) => p.code === e.target.value);
                      setAddressData({
                        ...addressData,
                        provinceCode: e.target.value,
                        provinceName: sel ? sel.name : '',
                        cityCode: '',
                        cityName: '',
                        barangayCode: '',
                        barangayName: '',
                      });
                    }}
                    className="w-full px-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select Province</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City / Municipality Dropdown */}
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    City / Municipality *
                  </label>
                  <select
                    required
                    disabled={!addressData.provinceCode}
                    value={addressData.cityCode}
                    onChange={(e) => {
                      const sel = cities.find((c) => c.code === e.target.value);
                      setAddressData({
                        ...addressData,
                        cityCode: e.target.value,
                        cityName: sel ? sel.name : '',
                        barangayCode: '',
                        barangayName: '',
                      });
                    }}
                    className="w-full px-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select City / Municipality</option>
                    {cities.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Barangay Dropdown */}
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    Barangay *
                  </label>
                  <select
                    required
                    disabled={!addressData.cityCode}
                    value={addressData.barangayCode}
                    onChange={(e) => {
                      const sel = barangays.find((b) => b.code === e.target.value);
                      setAddressData({
                        ...addressData,
                        barangayCode: e.target.value,
                        barangayName: sel ? sel.name : '',
                      });
                    }}
                    className="w-full px-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select Barangay</option>
                    {barangays.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ZIP Code */}
                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    Postal / ZIP Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressData.zipCode}
                    onChange={(e) => setAddressData({ ...addressData, zipCode: e.target.value })}
                    placeholder="e.g. 1780"
                    className="w-full px-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8DCD7] flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="py-3.5 px-8 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs uppercase font-bold tracking-[0.2em] transition-all rounded-none shadow-md cursor-pointer disabled:opacity-75"
                >
                  {isSavingAddress ? 'Saving Address...' : 'Save Default Address'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
