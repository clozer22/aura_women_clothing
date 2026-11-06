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
  Crown,
  Tag,
  Copy,
  Check,
  Gift,
  Award,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
  TIER_KEYS,
  DEFAULT_TIER_CONFIG,
  getCustomerTierBenefits,
  calculateCustomerTier,
  getTierProgress,
} from '../lib/customerRanking';
import {
  getRegions,
  getProvinces,
  getCities,
  getBarangays,
} from '../lib/phAddressApi';

export default function CustomerProfilePage({ onBackToShop, onNavigateOrders, initialTab = 'profile' }) {
  const { user, profile, role, updatePassword, updateProfileData, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab); // 'profile' | 'vip' | 'security' | 'address' | 'orders'

  // VIP Customer Ranking States
  const [totalItemsOrdered, setTotalItemsOrdered] = useState(0);
  const [tierBenefits, setTierBenefits] = useState(getCustomerTierBenefits);
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  // Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const EMPTY_ADDRESS = {
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
  };

  // Multi-Address State (Address 1 & Address 2)
  const [address1, setAddress1] = useState(EMPTY_ADDRESS);
  const [address2, setAddress2] = useState(EMPTY_ADDRESS);
  const [hasAddress2, setHasAddress2] = useState(false);
  const [defaultAddressKey, setDefaultAddressKey] = useState('address1'); // 'address1' | 'address2'
  const [activeAddressTab, setActiveAddressTab] = useState('address1'); // 'address1' | 'address2'

  const currentAddress = activeAddressTab === 'address1' ? address1 : address2;

  const handleCurrentAddressChange = (patch) => {
    if (activeAddressTab === 'address1') {
      setAddress1((prev) => ({ ...prev, ...patch }));
    } else {
      setAddress2((prev) => ({ ...prev, ...patch }));
    }
  };

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
      const savedMulti = localStorage.getItem('aura_saved_addresses');
      if (savedMulti) {
        const parsed = JSON.parse(savedMulti);
        if (parsed.address1) setAddress1(parsed.address1);
        if (parsed.address2) {
          setAddress2(parsed.address2);
          setHasAddress2(true);
        }
        if (parsed.defaultKey) setDefaultAddressKey(parsed.defaultKey);
      } else {
        const saved = localStorage.getItem('aura_saved_shipping_address');
        if (saved) {
          setAddress1(JSON.parse(saved));
        }
      }
    } catch (e) { }

    if (user?.id) {
      supabase
        .from('user_profiles')
        .select('addresses')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.addresses) {
            if (data.addresses.address1) setAddress1(data.addresses.address1);
            if (data.addresses.address2) {
              setAddress2(data.addresses.address2);
              setHasAddress2(true);
            }
            if (data.addresses.defaultKey) setDefaultAddressKey(data.addresses.defaultKey);
          }
        });
    }

    // Load Philippine Regions
    getRegions().then((data) => setRegions(data || []));

    // Load customer ranking order data
    async function loadCustomerRanking() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, items, items_count, status, payment_status')
          .or(`user_id.eq.${user.id},customer_email.eq.${user.email}`);

        if (!error && Array.isArray(data)) {
          let itemsCount = 0;
          data.forEach(ord => {
            if (Array.isArray(ord.items) && ord.items.length > 0) {
              itemsCount += ord.items.reduce((s, it) => s + (Number(it?.quantity) || 1), 0);
            } else {
              itemsCount += (Number(ord.items_count) || 1);
            }
          });
          setTotalItemsOrdered(itemsCount);
        }
      } catch (err) {
        console.warn('Customer ranking orders fetch notice:', err);
      }
    }
    loadCustomerRanking();

    // Listen for tier benefits update from Admin
    const handleTierUpdated = (e) => {
      if (e.detail) setTierBenefits(e.detail);
    };
    window.addEventListener('aura_tier_benefits_updated', handleTierUpdated);
    return () => window.removeEventListener('aura_tier_benefits_updated', handleTierUpdated);
  }, [user]);

  const currentTier = calculateCustomerTier(totalItemsOrdered);
  const tierProgress = getTierProgress(totalItemsOrdered);
  const currentTierConfig = tierBenefits[currentTier] || DEFAULT_TIER_CONFIG[currentTier];

  const handleCopyVoucher = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedVoucher(code);
    setTimeout(() => setCopiedVoucher(false), 2000);
  };

  // Update dependent provinces for active address
  useEffect(() => {
    if (currentAddress.regionCode) {
      getProvinces(currentAddress.regionCode).then((data) => {
        setProvinces(data || []);
      });
    } else {
      setProvinces([]);
    }
  }, [currentAddress.regionCode, activeAddressTab]);

  // Update dependent cities for active address
  useEffect(() => {
    if (currentAddress.provinceCode) {
      getCities(currentAddress.provinceCode).then((data) => {
        setCities(data || []);
      });
    } else {
      setCities([]);
    }
  }, [currentAddress.provinceCode, activeAddressTab]);

  // Update dependent barangays for active address
  useEffect(() => {
    if (currentAddress.cityCode) {
      getBarangays(currentAddress.cityCode).then((data) => {
        setBarangays(data || []);
      });
    } else {
      setBarangays([]);
    }
  }, [currentAddress.cityCode, activeAddressTab]);

  // Save Profile Details
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setErrorMsg('');
    setProfileSuccess('');

    const cleanName = (fullName || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 80);
    if (!cleanName) {
      setErrorMsg('Full name cannot be empty.');
      setIsUpdatingProfile(false);
      return;
    }

    const cleanPhone = (phone || '').replace(/\D/g, '').slice(0, 11);
    if (cleanPhone && (cleanPhone.length !== 11 || !/^09\d{9}$/.test(cleanPhone))) {
      setErrorMsg('Phone number must be a valid 11-digit Philippine mobile number (09XXXXXXXXX).');
      setIsUpdatingProfile(false);
      return;
    }

    try {
      await updateProfileData({ full_name: cleanName, phone: cleanPhone });
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
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setErrorMsg('Password must contain both letters and at least one number.');
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

  const sanitizeAddressObj = (addr) => ({
    ...addr,
    street: (addr?.street || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 150),
    zipCode: (addr?.zipCode || '').replace(/\D/g, '').trim().slice(0, 10),
  });

  // Save Shipping Address & Preferences
  const handleSaveAddress = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSavingAddress(true);
    setErrorMsg('');
    try {
      const sanitized1 = sanitizeAddressObj(address1);
      const sanitized2 = hasAddress2 ? sanitizeAddressObj(address2) : null;
      const resolvedDefaultKey =
        !hasAddress2 && defaultAddressKey === 'address2' ? 'address1' : defaultAddressKey;
      const defaultAddr =
        resolvedDefaultKey === 'address2' && sanitized2 ? sanitized2 : sanitized1;

      const multiPayload = {
        address1: sanitized1,
        address2: sanitized2,
        defaultKey: resolvedDefaultKey,
      };

      localStorage.setItem('aura_saved_addresses', JSON.stringify(multiPayload));
      localStorage.setItem('aura_saved_shipping_address', JSON.stringify(defaultAddr));

      if (user?.id) {
        await supabase
          .from('user_profiles')
          .update({ addresses: multiPayload, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      setAddressSuccess(
        `Address saved! ${resolvedDefaultKey === 'address2' ? 'Address 2' : 'Address 1'} is set as your default delivery address.`
      );
      setTimeout(() => setAddressSuccess(''), 4500);
    } catch (err) {
      console.error('Save address error:', err);
      setErrorMsg('Could not save address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (key) => {
    setDefaultAddressKey(key);
    try {
      const sanitized1 = sanitizeAddressObj(address1);
      const sanitized2 = hasAddress2 ? sanitizeAddressObj(address2) : null;
      const defaultAddr = key === 'address2' && sanitized2 ? sanitized2 : sanitized1;

      const multiPayload = {
        address1: sanitized1,
        address2: sanitized2,
        defaultKey: key,
      };

      localStorage.setItem('aura_saved_addresses', JSON.stringify(multiPayload));
      localStorage.setItem('aura_saved_shipping_address', JSON.stringify(defaultAddr));

      if (user?.id) {
        await supabase
          .from('user_profiles')
          .update({ addresses: multiPayload, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      setAddressSuccess(
        `${key === 'address2' ? 'Address 2' : 'Address 1'} is now saved as your default delivery address.`
      );
      setTimeout(() => setAddressSuccess(''), 3500);
    } catch (err) {
      console.warn('Set default error:', err);
    }
  };

  const handleRemoveAddress2 = () => {
    if (!window.confirm('Are you sure you want to remove Address 2?')) return;
    setHasAddress2(false);
    setAddress2(EMPTY_ADDRESS);
    setDefaultAddressKey('address1');
    setActiveAddressTab('address1');

    try {
      const sanitized1 = sanitizeAddressObj(address1);
      const multiPayload = {
        address1: sanitized1,
        address2: null,
        defaultKey: 'address1',
      };
      localStorage.setItem('aura_saved_addresses', JSON.stringify(multiPayload));
      localStorage.setItem('aura_saved_shipping_address', JSON.stringify(sanitized1));

      if (user?.id) {
        supabase
          .from('user_profiles')
          .update({ addresses: multiPayload, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      setAddressSuccess('Address 2 removed. Address 1 is now your default address.');
      setTimeout(() => setAddressSuccess(''), 3500);
    } catch (err) {
      console.warn('Remove address 2 error:', err);
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
            <span>Back</span>
          </button>


        </div>

        {/* Customer Header Banner */}
        <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 bg-[#FAF5F2] border border-[#E8DCD7] rounded-full flex items-center justify-center text-2xl font-brand font-bold text-[#2C1E1B] shadow-inner flex-shrink-0">
            {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <span className="text-[10px] font-brand uppercase tracking-[0.25em] text-[#B86B60] font-bold block mb-1">
              YOUR ACCOUNT
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
            className={`py-3.5 px-5 text-xs uppercase tracking-[0.2em] font-brand font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${activeTab === 'profile'
              ? 'border-[#2C1E1B] text-[#2C1E1B] bg-white'
              : 'border-transparent text-[#705B56] hover:text-[#2C1E1B]'
              }`}
          >
            <User className="w-4 h-4" />
            <span>Client Profile</span>
          </button>

          {/* Tab 2: VIP Ranking & Privileges */}
          <button
            onClick={() => setActiveTab('vip')}
            className={`py-3.5 px-5 text-xs uppercase tracking-[0.2em] font-brand font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${activeTab === 'vip'
              ? 'border-[#2C1E1B] text-[#2C1E1B] bg-white'
              : 'border-transparent text-[#705B56] hover:text-[#2C1E1B]'
              }`}
          >
            <Crown className="w-4 h-4 text-amber-600" />
            <span>VIP Privileges</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full font-sans font-bold">
              {currentTier}
            </span>
          </button>

          {/* Tab 3: Security & Password */}
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3.5 px-5 text-xs uppercase tracking-[0.2em] font-brand font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 relative ${activeTab === 'security'
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
            className={`py-3.5 px-5 text-xs uppercase tracking-[0.2em] font-brand font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${activeTab === 'address'
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
          <div className="space-y-6">
            {/* VIP TIER OVERVIEW CARD */}
            <div className="bg-gradient-to-br from-[#FAF5F2] via-white to-[#F5ECE8] border border-[#E8DCD7] p-6 sm:p-7 shadow-xs relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border ${
                    currentTier === TIER_KEYS.ROYAL
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : currentTier === TIER_KEYS.ICON
                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {currentTier === TIER_KEYS.ROYAL && <Crown className="w-6 h-6 text-amber-600" />}
                    {currentTier === TIER_KEYS.ICON && <ShieldCheck className="w-6 h-6 text-purple-600" />}
                    {currentTier === TIER_KEYS.MUSE && <Sparkles className="w-6 h-6 text-[#9E6D5F]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#A38E88]">
                        Customer Ranking
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${currentTierConfig?.pillClass || 'bg-slate-100'}`}>
                        {currentTier}
                      </span>
                    </div>
                    <h3 className="text-lg font-brand font-bold text-[#2C1E1B] mt-0.5">
                      {currentTier} • <span className="font-normal italic text-xs text-[#705B56]">{currentTierConfig?.tagline}</span>
                    </h3>
                    <p className="text-xs text-[#705B56] mt-1">
                      You have ordered <strong className="text-[#2C1E1B] font-mono">{totalItemsOrdered} {totalItemsOrdered === 1 ? 'item' : 'items'}</strong> from the AURA Atelier.
                    </p>
                  </div>
                </div>

                {/* Exclusive Voucher Snippet */}
                {currentTierConfig?.voucherCode && (
                  <div className="bg-white border border-[#E8DCD7] p-3 rounded-none flex items-center justify-between sm:justify-start gap-3 shadow-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[#A38E88] block">
                        Tier Voucher ({currentTierConfig.voucherDiscount})
                      </span>
                      <span className="text-sm font-mono font-bold tracking-wider text-[#2C1E1B]">
                        {currentTierConfig.voucherCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyVoucher(currentTierConfig.voucherCode)}
                      className="px-3 py-1.5 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedVoucher === currentTierConfig.voucherCode ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Progress to next tier */}
              <div className="mt-5 pt-4 border-t border-[#E8DCD7]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#705B56] text-[11px] font-medium">
                    {tierProgress.isMaxTier ? (
                      <span className="text-amber-800 font-bold flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5" /> Highest Atelier Sovereign Status
                      </span>
                    ) : (
                      tierProgress.message
                    )}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#2C1E1B]">
                    {tierProgress.progress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E8DCD7]/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#9E6D5F] via-purple-600 to-amber-500 rounded-full transition-all duration-700"
                    style={{ width: `${tierProgress.progress}%` }}
                  />
                </div>
              </div>
            </div>

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
                      type="tel"
                      maxLength={11}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="09171234567"
                      className="w-full pl-10 pr-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                    />
                  </div>
                  <span className="text-[10px] text-[#A38E88] mt-1 block">Exact 11 digits (e.g. 09171234567)</span>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                    Ranking Status
                  </label>
                  <div className="py-3 px-3.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>{currentTier}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('vip')}
                      className="text-[10px] text-amber-700 hover:text-amber-900 underline font-sans font-bold capitalize cursor-pointer"
                    >
                      View Privileges
                    </button>
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
        </div>
        )}

        {/* TAB 2: VIP RANKINGS & PRIVILEGES */}
        {activeTab === 'vip' && (
          <div className="space-y-8 animate-fade-in-up">
            {/* VIP Header Banner */}
            <div className="bg-gradient-to-br from-[#2C1E1B] via-[#3E2C28] to-[#1F1513] text-white p-7 sm:p-9 shadow-md relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-xs rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 border border-white/10 mb-3">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>AURA VIP Client Privileges</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-brand font-bold tracking-wide text-white">
                    Customer Ranking & Exclusive Rewards
                  </h2>
                  <p className="text-xs text-[#D5C2BC] max-w-xl mt-2 leading-relaxed">
                    Every garment acquired at AURA advances your ranking. Unlock private capsules, tier discount vouchers, and complimentary express delivery tailored to your patron tier.
                  </p>
                </div>

                {/* Standing Summary */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 text-center min-w-[180px]">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#D5C2BC] block">
                    Your Current Status
                  </span>
                  <span className="text-lg font-brand font-bold text-amber-300 block mt-0.5">
                    {currentTier}
                  </span>
                  <span className="text-[11px] text-white/80 font-mono block mt-1">
                    {totalItemsOrdered} {totalItemsOrdered === 1 ? 'item ordered' : 'items ordered'}
                  </span>
                </div>
              </div>

              {/* Progress Line */}
              <div className="mt-6 pt-5 border-t border-white/10 relative z-10">
                <div className="flex items-center justify-between text-xs mb-2 text-white/90">
                  <span className="text-[11px]">
                    {tierProgress.message}
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {tierProgress.progress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-300 via-purple-400 to-amber-400 rounded-full transition-all duration-700"
                    style={{ width: `${tierProgress.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3 TIERS COMPARISON GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* TIER 1: AURA MUSE */}
              {(() => {
                const cfg = tierBenefits[TIER_KEYS.MUSE] || DEFAULT_TIER_CONFIG[TIER_KEYS.MUSE];
                const isActive = currentTier === TIER_KEYS.MUSE;
                return (
                  <div className={`bg-white border transition-all flex flex-col justify-between p-6 sm:p-7 shadow-xs relative ${
                    isActive ? 'border-[#9E6D5F] ring-2 ring-[#9E6D5F]/20' : 'border-[#E8DCD7]'
                  }`}>
                    {isActive && (
                      <span className="absolute -top-3 left-6 px-3 py-0.5 bg-[#9E6D5F] text-white text-[10px] uppercase font-bold tracking-widest shadow-xs">
                        Active Tier
                      </span>
                    )}
                    <div>
                      <div className="w-10 h-10 rounded-full bg-[#FDF7F5] border border-[#E8DCD7] text-[#9E6D5F] flex items-center justify-center mb-4">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#A38E88] block">
                        Tier 1 • {cfg.thresholdLabel || '5 items or below'}
                      </span>
                      <h3 className="text-lg font-brand font-bold text-[#2C1E1B] mt-0.5">
                        {TIER_KEYS.MUSE}
                      </h3>
                      <p className="text-xs italic text-[#705B56] mt-0.5">
                        {cfg.tagline}
                      </p>

                      {/* Voucher Card */}
                      {cfg.voucherCode && (
                        <div className="mt-4 p-3 bg-[#FAF5F2] border border-[#E8DCD7] flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-[#A38E88] block">
                              Voucher ({cfg.voucherDiscount})
                            </span>
                            <span className="text-xs font-mono font-bold text-[#2C1E1B]">
                              {cfg.voucherCode}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyVoucher(cfg.voucherCode)}
                            className="px-2.5 py-1 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            {copiedVoucher === cfg.voucherCode ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}

                      {/* Perks */}
                      <ul className="mt-5 space-y-2.5 text-xs text-[#2C1E1B]">
                        {(cfg.benefits || []).map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#9E6D5F] flex-shrink-0 mt-0.5" />
                            <span className="leading-snug">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}

              {/* TIER 2: AURA ICON */}
              {(() => {
                const cfg = tierBenefits[TIER_KEYS.ICON] || DEFAULT_TIER_CONFIG[TIER_KEYS.ICON];
                const isActive = currentTier === TIER_KEYS.ICON;
                return (
                  <div className={`bg-white border transition-all flex flex-col justify-between p-6 sm:p-7 shadow-xs relative ${
                    isActive ? 'border-purple-600 ring-2 ring-purple-500/20' : 'border-[#E8DCD7]'
                  }`}>
                    {isActive && (
                      <span className="absolute -top-3 left-6 px-3 py-0.5 bg-purple-700 text-white text-[10px] uppercase font-bold tracking-widest shadow-xs">
                        Active Tier
                      </span>
                    )}
                    <div>
                      <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center mb-4">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#A38E88] block">
                        Tier 2 • {cfg.thresholdLabel || '6–15 items'}
                      </span>
                      <h3 className="text-lg font-brand font-bold text-[#2C1E1B] mt-0.5">
                        {TIER_KEYS.ICON}
                      </h3>
                      <p className="text-xs italic text-[#705B56] mt-0.5">
                        {cfg.tagline}
                      </p>

                      {/* Voucher Card */}
                      {cfg.voucherCode && (
                        <div className="mt-4 p-3 bg-purple-50/50 border border-purple-200/70 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-purple-600 block">
                              Voucher ({cfg.voucherDiscount})
                            </span>
                            <span className="text-xs font-mono font-bold text-[#2C1E1B]">
                              {cfg.voucherCode}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyVoucher(cfg.voucherCode)}
                            className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            {copiedVoucher === cfg.voucherCode ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}

                      {/* Perks */}
                      <ul className="mt-5 space-y-2.5 text-xs text-[#2C1E1B]">
                        {(cfg.benefits || []).map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span className="leading-snug">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}

              {/* TIER 3: AURA ROYAL */}
              {(() => {
                const cfg = tierBenefits[TIER_KEYS.ROYAL] || DEFAULT_TIER_CONFIG[TIER_KEYS.ROYAL];
                const isActive = currentTier === TIER_KEYS.ROYAL;
                return (
                  <div className={`bg-white border transition-all flex flex-col justify-between p-6 sm:p-7 shadow-xs relative ${
                    isActive ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-[#E8DCD7]'
                  }`}>
                    {isActive && (
                      <span className="absolute -top-3 left-6 px-3 py-0.5 bg-amber-600 text-white text-[10px] uppercase font-bold tracking-widest shadow-xs">
                        Active Tier
                      </span>
                    )}
                    <div>
                      <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-300 text-amber-700 flex items-center justify-center mb-4">
                        <Crown className="w-5 h-5 text-amber-600" />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 block">
                        Tier 3 • {cfg.thresholdLabel || 'More than 15 items'}
                      </span>
                      <h3 className="text-lg font-brand font-bold text-[#2C1E1B] mt-0.5 flex items-center gap-1.5">
                        <span>{TIER_KEYS.ROYAL}</span>
                        <Crown className="w-4 h-4 text-amber-600" />
                      </h3>
                      <p className="text-xs italic text-[#705B56] mt-0.5">
                        {cfg.tagline}
                      </p>

                      {/* Voucher Card */}
                      {cfg.voucherCode && (
                        <div className="mt-4 p-3 bg-amber-50/70 border border-amber-300/80 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-amber-800 block">
                              Voucher ({cfg.voucherDiscount})
                            </span>
                            <span className="text-xs font-mono font-bold text-[#2C1E1B]">
                              {cfg.voucherCode}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyVoucher(cfg.voucherCode)}
                            className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            {copiedVoucher === cfg.voucherCode ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}

                      {/* Perks */}
                      <ul className="mt-5 space-y-2.5 text-xs text-[#2C1E1B]">
                        {(cfg.benefits || []).map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span className="leading-snug">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Note on Admin Managed Perks */}
            <div className="bg-[#FAF5F2] border border-[#E8DCD7] p-5 text-center">
              <p className="text-xs text-[#705B56] leading-relaxed max-w-xl mx-auto">
                <strong className="text-[#2C1E1B]">Atelier Privileges Note:</strong> Benefits and exclusive vouchers are curated and granted by the AURA Administration based on items ordered. To redeem a voucher, enter the code in checkout.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY & PASSWORD */}
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
                    {hasSetPassword ? 'New Password *' : 'Create Password *'} (Min. 8 characters, letters & numbers)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      minLength={8}
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
                      minLength={8}
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

        {/* TAB 3: DELIVERY ADDRESSES */}
        {activeTab === 'address' && (
          <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="pb-3 border-b border-[#E8DCD7] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-brand font-bold uppercase tracking-[0.2em] text-[#2C1E1B]">
                  Delivery Addresses
                </h2>
                <p className="text-xs text-[#705B56] mt-0.5">
                  Manage your primary and secondary shipping locations. Pre-fills automatically at Checkout.
                </p>
              </div>

              {!hasAddress2 && (
                <button
                  type="button"
                  onClick={() => {
                    setHasAddress2(true);
                    setActiveAddressTab('address2');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5F2] hover:bg-[#FAF0EC] text-[#2C1E1B] border border-[#E8DCD7] hover:border-[#B86B60] text-xs font-brand uppercase tracking-wider font-bold transition-all cursor-pointer self-start sm:self-auto shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#B86B60]" />
                  <span>Add Address 2</span>
                </button>
              )}
            </div>

            {/* Address Tabs Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#FAF5F2] pb-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Address 1 Tab */}
                <button
                  type="button"
                  onClick={() => setActiveAddressTab('address1')}
                  className={`px-4 py-2 text-xs font-brand uppercase tracking-wider font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                    activeAddressTab === 'address1'
                      ? 'bg-[#2C1E1B] text-white border-[#2C1E1B] shadow-xs'
                      : 'bg-[#FAF5F2] text-[#705B56] border-[#E8DCD7] hover:border-[#B86B60] hover:text-[#2C1E1B]'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Address 1 (Primary)</span>
                  {defaultAddressKey === 'address1' && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 uppercase tracking-wider font-bold ${
                        activeAddressTab === 'address1'
                          ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      Default
                    </span>
                  )}
                </button>

                {/* Address 2 Tab */}
                {hasAddress2 && (
                  <button
                    type="button"
                    onClick={() => setActiveAddressTab('address2')}
                    className={`px-4 py-2 text-xs font-brand uppercase tracking-wider font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                      activeAddressTab === 'address2'
                        ? 'bg-[#2C1E1B] text-white border-[#2C1E1B] shadow-xs'
                        : 'bg-[#FAF5F2] text-[#705B56] border-[#E8DCD7] hover:border-[#B86B60] hover:text-[#2C1E1B]'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Address 2 (Secondary)</span>
                    {defaultAddressKey === 'address2' && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 uppercase tracking-wider font-bold ${
                          activeAddressTab === 'address2'
                            ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        Default
                      </span>
                    )}
                  </button>
                )}
              </div>

              {hasAddress2 && activeAddressTab === 'address2' && (
                <button
                  type="button"
                  onClick={handleRemoveAddress2}
                  className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  title="Delete Address 2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Address 2</span>
                </button>
              )}
            </div>

            {/* Default Status & Quick Switch Banner */}
            {defaultAddressKey === activeAddressTab ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    This address is your <strong>Default Delivery Address</strong> and will pre-fill automatically at checkout.
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2 py-0.5 font-bold shrink-0">
                  Active Default
                </span>
              </div>
            ) : (
              <div className="p-3.5 bg-[#FAF5F2] border border-[#E8DCD7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[#705B56]">
                  <MapPin className="w-4 h-4 text-[#B86B60] shrink-0" />
                  <span>
                    This address is currently secondary. Make it your primary address for faster checkout.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSetDefaultAddress(activeAddressTab)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer self-start sm:self-auto shadow-2xs shrink-0"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save as Default Address</span>
                </button>
              </div>
            )}

            {/* Address Form for Active Address */}
            <form onSubmit={handleSaveAddress} className="space-y-6 pt-2">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                  House / Unit / Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={currentAddress.street || ''}
                  onChange={(e) => handleCurrentAddressChange({ street: e.target.value })}
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
                    value={currentAddress.regionCode || ''}
                    onChange={(e) => {
                      const sel = regions.find((r) => r.code === e.target.value);
                      handleCurrentAddressChange({
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
                    disabled={!currentAddress.regionCode}
                    value={currentAddress.provinceCode || ''}
                    onChange={(e) => {
                      const sel = provinces.find((p) => p.code === e.target.value);
                      handleCurrentAddressChange({
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
                    disabled={!currentAddress.provinceCode}
                    value={currentAddress.cityCode || ''}
                    onChange={(e) => {
                      const sel = cities.find((c) => c.code === e.target.value);
                      handleCurrentAddressChange({
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
                    disabled={!currentAddress.cityCode}
                    value={currentAddress.barangayCode || ''}
                    onChange={(e) => {
                      const sel = barangays.find((b) => b.code === e.target.value);
                      handleCurrentAddressChange({
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
                    value={currentAddress.zipCode || ''}
                    onChange={(e) => handleCurrentAddressChange({ zipCode: e.target.value })}
                    placeholder="e.g. 1780"
                    className="w-full px-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8DCD7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {defaultAddressKey !== activeAddressTab ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefaultAddress(activeAddressTab)}
                    className="text-xs uppercase font-brand font-bold tracking-wider text-[#B86B60] hover:text-[#2C1E1B] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Set as Default Delivery Address</span>
                  </button>
                ) : (
                  <div className="text-xs text-emerald-800 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Currently set as Default Address</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="py-3.5 px-8 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs uppercase font-bold tracking-[0.2em] transition-all rounded-none shadow-md cursor-pointer disabled:opacity-75 self-end sm:self-auto"
                >
                  {isSavingAddress ? 'Saving Addresses...' : 'Save Delivery Address'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
