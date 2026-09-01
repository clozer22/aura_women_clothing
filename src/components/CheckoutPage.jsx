import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  Check,
  Lock,
  Smartphone,
  CreditCard,
  Truck,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  getRegions,
  getProvinces,
  getCities,
  getBarangays,
} from '../lib/phAddressApi';
import { createXenditInvoice } from '../lib/xendit';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { removeItemsFromWishlist } from '../lib/wishlistManager';

export default function CheckoutPage({
  checkoutItems = [],
  onBackToShop,
  onOrderCompleted,
}) {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1); // 1: Shipping, 2: Review, 3: Payment

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    street: '',
    country: 'Philippines',
    regionCode: '',
    regionName: '',
    provinceCode: '',
    provinceName: '',
    cityCode: '',
    cityName: '',
    barangayCode: '',
    barangayName: '',
    zipCode: '',
    saveAddress: false,
  });

  const [formErrors, setFormErrors] = useState({});

  // Dynamic Address Dropdown Options
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [loadingAddress, setLoadingAddress] = useState({
    regions: true,
    provinces: false,
    cities: false,
    barangays: false,
  });

  // Payment Selection State
  const [paymentMethod, setPaymentMethod] = useState('GCASH'); // 'GCASH' | 'MAYA' | 'CARD'
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Load saved profile / address from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aura_saved_shipping_address');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {}
  }, []);

  // Pre-fill logged-in customer info
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || profile?.full_name || user.user_metadata?.full_name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || profile?.phone || '',
      }));
    }
  }, [user, profile]);

  // Fetch initial Regions
  useEffect(() => {
    let mounted = true;
    async function loadRegions() {
      setLoadingAddress((prev) => ({ ...prev, regions: true }));
      const data = await getRegions();
      if (mounted) {
        setRegions(data);
        setLoadingAddress((prev) => ({ ...prev, regions: false }));
      }
    }
    loadRegions();
    return () => {
      mounted = false;
    };
  }, []);

  // When Region changes, fetch Provinces
  const handleRegionChange = async (e) => {
    const code = e.target.value;
    const selected = regions.find((r) => r.code === code);
    const regionName = selected ? selected.name : '';

    setFormData((prev) => ({
      ...prev,
      regionCode: code,
      regionName,
      provinceCode: '',
      provinceName: '',
      cityCode: '',
      cityName: '',
      barangayCode: '',
      barangayName: '',
    }));

    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (code) {
      setLoadingAddress((prev) => ({ ...prev, provinces: true }));
      const provs = await getProvinces(code);
      setProvinces(provs);
      setLoadingAddress((prev) => ({ ...prev, provinces: false }));

      // If NCR, also preload cities
      if (code === '130000000') {
        setLoadingAddress((prev) => ({ ...prev, cities: true }));
        const ncrCities = await getCities('NCR_MANILA', code);
        setCities(ncrCities);
        setLoadingAddress((prev) => ({ ...prev, cities: false }));
      }
    }
  };

  // When Province changes, fetch Cities
  const handleProvinceChange = async (e) => {
    const code = e.target.value;
    const selected = provinces.find((p) => p.code === code);
    const provinceName = selected ? selected.name : '';

    setFormData((prev) => ({
      ...prev,
      provinceCode: code,
      provinceName,
      cityCode: '',
      cityName: '',
      barangayCode: '',
      barangayName: '',
    }));

    setCities([]);
    setBarangays([]);

    if (code) {
      setLoadingAddress((prev) => ({ ...prev, cities: true }));
      const cityList = await getCities(code, formData.regionCode);
      setCities(cityList);
      setLoadingAddress((prev) => ({ ...prev, cities: false }));
    }
  };

  // When City changes, fetch Barangays
  const handleCityChange = async (e) => {
    const code = e.target.value;
    const selected = cities.find((c) => c.code === code);
    const cityName = selected ? selected.name : '';

    setFormData((prev) => ({
      ...prev,
      cityCode: code,
      cityName,
      barangayCode: '',
      barangayName: '',
    }));

    setBarangays([]);

    if (code) {
      setLoadingAddress((prev) => ({ ...prev, barangays: true }));
      const brgyList = await getBarangays(code);
      setBarangays(brgyList);
      setLoadingAddress((prev) => ({ ...prev, barangays: false }));
    }
  };

  // When Barangay changes
  const handleBarangayChange = (e) => {
    const code = e.target.value;
    const selected = barangays.find((b) => b.code === code);
    setFormData((prev) => ({
      ...prev,
      barangayCode: code,
      barangayName: selected ? selected.name : '',
    }));
  };

  // Calculations
  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
    0
  );
  const shippingFee = checkoutItems.length > 0 ? 150 : 0;
  const totalAmount = subtotal + shippingFee;

  // Validation
  const validateShippingForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.street.trim()) errors.street = 'Street address is required';
    if (!formData.regionCode) errors.regionCode = 'Region is required';
    if (!formData.cityCode && !formData.cityName) errors.cityCode = 'City is required';
    if (!formData.barangayCode && !formData.barangayName) errors.barangayCode = 'Barangay is required';
    if (!formData.zipCode.trim()) errors.zipCode = 'Zip code is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinueToReview = (e) => {
    e.preventDefault();
    if (validateShippingForm()) {
      if (formData.saveAddress) {
        try {
          localStorage.setItem('aura_saved_shipping_address', JSON.stringify(formData));
        } catch (err) {}
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Complete Order via Xendit
  const handleCompleteOrder = async () => {
    setIsProcessingOrder(true);
    setPaymentError(null);

    const orderReference = `AC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      // 1. Create Invoice via Xendit
      const invoiceResult = await createXenditInvoice({
        orderNumber: orderReference,
        amount: totalAmount,
        customerEmail: formData.email || 'guest@aurawomen.com',
        customerName: formData.fullName,
        customerPhone: formData.phone,
        items: checkoutItems,
        paymentMethod,
      });

      // 2. Prepare Order Record
      const newOrder = {
        order_reference: orderReference,
        customer_name: formData.fullName,
        customer_phone: formData.phone,
        customer_email: formData.email || '',
        shipping_address: {
          street: formData.street,
          region: formData.regionName,
          province: formData.provinceName || 'Metro Manila',
          city: formData.cityName,
          barangay: formData.barangayName,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        items: checkoutItems.map((item) => ({
          id: item.id,
          name: item.name,
          image: item.image,
          size: item.size || 'Standard',
          color: item.color || 'Standard',
          price: item.price,
          quantity: item.quantity || 1,
        })),
        subtotal,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: 'PENDING',
        status: 'PENDING',
        user_id: user?.id || null,
        xendit_invoice_id: invoiceResult.invoiceId || null,
        xendit_invoice_url: invoiceResult.invoiceUrl || null,
        created_at: new Date().toISOString(),
      };

      // 3. Save single active order for confirmation redirect
      try {
        localStorage.removeItem('aura_guest_orders');
        localStorage.setItem('aura_last_order', JSON.stringify(newOrder));
      } catch (err) {}

      // 4. Try saving to Supabase orders table
      try {
        await supabase.from('orders').insert([newOrder]);
      } catch (dbErr) {
        console.warn('Notice: Could not insert to Supabase orders table:', dbErr.message);
      }

      // Clear checked-out items from active cart and Supabase database
      try {
        await removeItemsFromWishlist(checkoutItems);
      } catch (e) {}

      // 5. REDIRECT TO XENDIT PAYMENT GATEWAY FOR ACTUAL PAYMENT
      if (invoiceResult && invoiceResult.invoiceUrl) {
        // Directly navigate to Xendit's secure payment interface (GCash / Maya / Card)
        window.location.href = invoiceResult.invoiceUrl;
        return;
      }

      setIsProcessingOrder(false);

      // Fallback notification
      if (onOrderCompleted) {
        onOrderCompleted(newOrder);
      }
    } catch (err) {
      console.error('Order submission error:', err);
      setPaymentError(err.message || 'Payment processing failed. Please try again.');
      setIsProcessingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF5F2] text-[#2C1E1B] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation & Security Banner */}
        <div className="flex items-center justify-between pb-6 border-b border-[#E8DCD7] mb-8">
          <button
            onClick={onBackToShop}
            className="text-xs uppercase font-brand font-semibold tracking-[0.2em] text-[#705B56] hover:text-[#2C1E1B] flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Shop</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-brand text-emerald-800 bg-emerald-50 px-3 py-1.5 border border-emerald-200">
            <Lock className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              256-Bit SSL Encrypted Checkout
            </span>
          </div>
        </div>

        {/* Step Indicator Header */}
        <div className="flex items-center justify-center max-w-xl mx-auto mb-10">
          {/* Step 1: Shipping */}
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 flex items-center justify-center text-xs font-bold transition-all ${
                currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 1
                  ? 'bg-[#2C1E1B] text-white'
                  : 'bg-white border border-[#E8DCD7] text-[#705B56]'
              }`}
            >
              {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className="text-[11px] font-brand uppercase tracking-[0.18em] font-semibold mt-2 text-[#2C1E1B]">
              1. Shipping
            </span>
          </div>

          <div className={`w-20 sm:w-28 h-[1px] mx-2 -mt-6 ${currentStep > 1 ? 'bg-emerald-600' : 'bg-[#E8DCD7]'}`} />

          {/* Step 2: Review */}
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 flex items-center justify-center text-xs font-bold transition-all ${
                currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 2
                  ? 'bg-[#2C1E1B] text-white'
                  : 'bg-white border border-[#E8DCD7] text-[#705B56]'
              }`}
            >
              {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span
              className={`text-[11px] font-brand uppercase tracking-[0.18em] font-semibold mt-2 ${
                currentStep >= 2 ? 'text-[#2C1E1B]' : 'text-[#A38E88]'
              }`}
            >
              2. Review
            </span>
          </div>

          <div className={`w-20 sm:w-28 h-[1px] mx-2 -mt-6 ${currentStep > 2 ? 'bg-emerald-600' : 'bg-[#E8DCD7]'}`} />

          {/* Step 3: Payment */}
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 3
                  ? 'bg-[#2C1E1B] text-white'
                  : 'bg-white border border-[#E8DCD7] text-[#705B56]'
              }`}
            >
              3
            </div>
            <span
              className={`text-[11px] font-brand uppercase tracking-[0.18em] font-semibold mt-2 ${
                currentStep === 3 ? 'text-[#2C1E1B]' : 'text-[#A38E88]'
              }`}
            >
              3. Payment
            </span>
          </div>
        </div>

        {/* 2-Column Checkout Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Form Left Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* STEP 1: SHIPPING ADDRESS */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm"
              >
                <h2 className="font-brand text-sm uppercase tracking-[0.25em] font-bold text-[#2C1E1B] mb-6 pb-3 border-b border-[#E8DCD7]">
                  Shipping Address
                </h2>

                <form onSubmit={handleContinueToReview} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maria Santos"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors rounded-none"
                    />
                    {formErrors.fullName && (
                      <span className="text-[10px] text-rose-600 mt-1 block">{formErrors.fullName}</span>
                    )}
                  </div>

                  {/* Phone & Email Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        placeholder="+63 917 123 4567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors rounded-none"
                      />
                      {formErrors.phone && (
                        <span className="text-[10px] text-rose-600 mt-1 block">{formErrors.phone}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                        Email Address (for receipts)
                      </label>
                      <input
                        type="email"
                        placeholder="client@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors rounded-none"
                      />
                    </div>
                  </div>

                  {/* Street Address */}
                  <div>
                    <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      placeholder="House / Unit No., Street, Building Name"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors rounded-none"
                    />
                    {formErrors.street && (
                      <span className="text-[10px] text-rose-600 mt-1 block">{formErrors.street}</span>
                    )}
                  </div>

                  {/* Country & Region Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                        Country
                      </label>
                      <select
                        value={formData.country}
                        disabled
                        className="w-full px-3.5 py-2.5 bg-[#F3EAE6] border border-[#E8DCD7] text-xs text-[#705B56] rounded-none cursor-not-allowed"
                      >
                        <option value="Philippines">Philippines</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                        Region *
                      </label>
                      <select
                        value={formData.regionCode}
                        onChange={handleRegionChange}
                        className="w-full px-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors rounded-none"
                      >
                        <option value="">
                          {loadingAddress.regions ? 'Loading regions...' : 'Select Region'}
                        </option>
                        {regions.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.regionCode && (
                        <span className="text-[10px] text-rose-600 mt-1 block">{formErrors.regionCode}</span>
                      )}
                    </div>
                  </div>

                  {/* Province & City Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                        Province / State *
                      </label>
                      <select
                        value={formData.provinceCode}
                        onChange={handleProvinceChange}
                        disabled={!formData.regionCode || loadingAddress.provinces}
                        className="w-full px-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors rounded-none disabled:opacity-50"
                      >
                        <option value="">
                          {loadingAddress.provinces
                            ? 'Loading provinces...'
                            : formData.regionCode
                            ? 'Select Province'
                            : 'Select Region First'}
                        </option>
                        {provinces.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                        City / Municipality *
                      </label>
                      <select
                        value={formData.cityCode}
                        onChange={handleCityChange}
                        disabled={(!formData.provinceCode && formData.regionCode !== '130000000') || loadingAddress.cities}
                        className="w-full px-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors rounded-none disabled:opacity-50"
                      >
                        <option value="">
                          {loadingAddress.cities
                            ? 'Loading cities...'
                            : 'Select City / Municipality'}
                        </option>
                        {cities.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.cityCode && (
                        <span className="text-[10px] text-rose-600 mt-1 block">{formErrors.cityCode}</span>
                      )}
                    </div>
                  </div>

                  {/* Barangay & Zip Code Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                        Barangay *
                      </label>
                      <select
                        value={formData.barangayCode}
                        onChange={handleBarangayChange}
                        disabled={!formData.cityCode || loadingAddress.barangays}
                        className="w-full px-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors rounded-none disabled:opacity-50"
                      >
                        <option value="">
                          {loadingAddress.barangays
                            ? 'Loading barangays...'
                            : formData.cityCode
                            ? 'Select Barangay'
                            : 'Select City First'}
                        </option>
                        {barangays.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.barangayCode && (
                        <span className="text-[10px] text-rose-600 mt-1 block">{formErrors.barangayCode}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                        Zip Code *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1203"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] transition-colors rounded-none"
                      />
                      {formErrors.zipCode && (
                        <span className="text-[10px] text-rose-600 mt-1 block">{formErrors.zipCode}</span>
                      )}
                    </div>
                  </div>

                  {/* Save address checkbox */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.saveAddress}
                        onChange={(e) => setFormData({ ...formData, saveAddress: e.target.checked })}
                        className="w-4 h-4 rounded-none accent-[#2C1E1B]"
                      />
                      <span className="text-xs text-[#705B56]">
                        Save this address to my profile for future orders
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6">
                    <button
                      type="submit"
                      className="w-full bg-[#2C1E1B] hover:bg-[#B86B60] text-white py-4 px-6 text-xs uppercase font-bold tracking-[0.2em] shadow-md transition-all rounded-none cursor-pointer"
                    >
                      Continue to Order Review
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 2: ORDER REVIEW */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm space-y-6"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#E8DCD7]">
                  <h2 className="font-brand text-sm uppercase tracking-[0.25em] font-bold text-[#2C1E1B]">
                    Order Review
                  </h2>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] uppercase font-bold tracking-wider text-[#B86B60] hover:underline"
                  >
                    Edit Shipping
                  </button>
                </div>

                {/* Shipping Summary Box */}
                <div className="bg-[#FAF5F2] p-4 border border-[#E8DCD7] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#705B56]">Recipient:</span>
                    <span className="font-bold text-[#2C1E1B]">{formData.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#705B56]">Contact:</span>
                    <span className="text-[#2C1E1B]">{formData.phone}</span>
                  </div>
                  {formData.email && (
                    <div className="flex justify-between">
                      <span className="text-[#705B56]">Email:</span>
                      <span className="text-[#2C1E1B]">{formData.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-[#E8DCD7]/60">
                    <span className="text-[#705B56]">Address:</span>
                    <span className="text-right text-[#2C1E1B] max-w-xs font-medium">
                      {formData.street}, {formData.barangayName}, {formData.cityName},{' '}
                      {formData.provinceName || formData.regionName} {formData.zipCode}
                    </span>
                  </div>
                </div>

                {/* Items Summary Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-brand uppercase tracking-wider font-bold text-[#705B56]">
                    Items in this Order ({checkoutItems.length})
                  </h3>
                  <div className="divide-y divide-[#E8DCD7]">
                    {checkoutItems.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-14 object-cover bg-[#FAF5F2]"
                          />
                          <div>
                            <p className="font-semibold text-[#2C1E1B]">{item.name}</p>
                            <p className="text-[11px] text-[#B86B60]">
                              {typeof item.size === 'object' ? item.size?.name : (item.size || 'Standard')}
                              {item.color && (typeof item.color === 'object' ? item.color?.name : item.color) !== 'Standard'
                                ? ` / ${typeof item.color === 'object' ? item.color?.name : item.color}`
                                : ''}{' '}
                              • Qty: {item.quantity || 1}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-[#2C1E1B]">
                          ₱{((Number(item.price) || 0) * (item.quantity || 1)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 2 Actions */}
                <div className="pt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="sm:w-1/3 py-4 px-6 border border-[#2C1E1B] text-[#2C1E1B] hover:bg-[#FAF5F2] text-xs uppercase font-bold tracking-[0.2em] rounded-none transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 bg-[#2C1E1B] hover:bg-[#B86B60] text-white py-4 px-6 text-xs uppercase font-bold tracking-[0.2em] shadow-md transition-all rounded-none"
                  >
                    Continue to Payment
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: SELECT PAYMENT METHOD (Matching Image 3) */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm space-y-6"
              >
                <h2 className="font-brand text-sm uppercase tracking-[0.25em] font-bold text-[#2C1E1B] pb-3 border-b border-[#E8DCD7]">
                  Select Payment Method
                </h2>

                {paymentError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none">
                    {paymentError}
                  </div>
                )}

                {/* Payment Radio Options */}
                <div className="space-y-3">
                  {/* Option 1: GCash / E-Wallet */}
                  <label
                    onClick={() => setPaymentMethod('GCASH')}
                    className={`flex items-center justify-between p-4 border cursor-pointer transition-all ${
                      paymentMethod === 'GCASH'
                        ? 'border-[#2C1E1B] bg-[#FAF5F2]'
                        : 'border-[#E8DCD7] hover:border-[#B86B60] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === 'GCASH' ? 'border-[#2C1E1B]' : 'border-[#A38E88]'
                        }`}
                      >
                        {paymentMethod === 'GCASH' && (
                          <div className="w-2 h-2 rounded-full bg-[#2C1E1B]" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#2C1E1B]">
                          GCash / E-Wallet
                        </div>
                        <div className="text-[11px] text-[#705B56]">
                          Fast & instant e-wallet checkout via Xendit / PayMongo
                        </div>
                      </div>
                    </div>
                    <Smartphone className="w-5 h-5 text-blue-600" />
                  </label>

                  {/* Option 2: Maya (PayMaya) */}
                  <label
                    onClick={() => setPaymentMethod('MAYA')}
                    className={`flex items-center justify-between p-4 border cursor-pointer transition-all ${
                      paymentMethod === 'MAYA'
                        ? 'border-[#2C1E1B] bg-[#FAF5F2]'
                        : 'border-[#E8DCD7] hover:border-[#B86B60] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === 'MAYA' ? 'border-[#2C1E1B]' : 'border-[#A38E88]'
                        }`}
                      >
                        {paymentMethod === 'MAYA' && (
                          <div className="w-2 h-2 rounded-full bg-[#2C1E1B]" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#2C1E1B]">
                          Maya (PayMaya)
                        </div>
                        <div className="text-[11px] text-[#705B56]">
                          Pay with Maya wallet or Maya credit
                        </div>
                      </div>
                    </div>
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                  </label>

                  {/* Option 3: Credit / Debit Card */}
                  <label
                    onClick={() => setPaymentMethod('CARD')}
                    className={`flex items-center justify-between p-4 border cursor-pointer transition-all ${
                      paymentMethod === 'CARD'
                        ? 'border-[#2C1E1B] bg-[#FAF5F2]'
                        : 'border-[#E8DCD7] hover:border-[#B86B60] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === 'CARD' ? 'border-[#2C1E1B]' : 'border-[#A38E88]'
                        }`}
                      >
                        {paymentMethod === 'CARD' && (
                          <div className="w-2 h-2 rounded-full bg-[#2C1E1B]" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#2C1E1B]">
                          Credit / Debit Card
                        </div>
                        <div className="text-[11px] text-[#705B56]">
                          Visa, Mastercard, JCB processed securely
                        </div>
                      </div>
                    </div>
                    <CreditCard className="w-5 h-5 text-[#2C1E1B]" />
                  </label>
                </div>

                {/* Step 3 Actions */}
                <div className="pt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    disabled={isProcessingOrder}
                    className="sm:w-1/3 py-4 px-6 border border-[#2C1E1B] text-[#2C1E1B] hover:bg-[#FAF5F2] text-xs uppercase font-bold tracking-[0.2em] rounded-none transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteOrder}
                    disabled={isProcessingOrder}
                    className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white py-4 px-6 text-xs uppercase font-bold tracking-[0.2em] shadow-lg transition-all rounded-none flex items-center justify-center gap-2 disabled:opacity-75"
                  >
                    {isProcessingOrder ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete Order (₱{totalAmount.toLocaleString()})</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Order Summary (Matching Image 2 & 3) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#E8DCD7] p-6 sm:p-8 shadow-sm space-y-6">
              <h3 className="font-brand text-xs uppercase tracking-[0.25em] font-bold text-[#2C1E1B] pb-3 border-b border-[#E8DCD7]">
                Order Summary ({checkoutItems.length})
              </h3>

              {/* Items List */}
              <div className="space-y-4 divide-y divide-[#E8DCD7]">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="pt-4 first:pt-0 flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-20 object-cover bg-[#FAF5F2] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-brand text-xs font-bold text-[#2C1E1B] truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] font-brand tracking-wider uppercase text-[#B86B60]">
                        {typeof item.size === 'object' ? item.size?.name : (item.size || 'Standard')}
                        {item.color && (typeof item.color === 'object' ? item.color?.name : item.color) !== 'Standard'
                          ? ` / ${typeof item.color === 'object' ? item.color?.name : item.color}`
                          : ''}
                      </p>
                      <p className="text-[11px] text-[#705B56]">Qty: {item.quantity || 1}</p>
                      <p className="font-hero text-xs font-bold text-[#2C1E1B] mt-1">
                        ₱{((Number(item.price) || 0) * (item.quantity || 1)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2 text-xs font-brand pt-4 border-t border-[#E8DCD7]">
                <div className="flex justify-between text-[#705B56]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#2C1E1B]">₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#705B56]">
                  <span>Nationwide Shipping</span>
                  <span className="font-semibold text-[#2C1E1B]">₱{shippingFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-[#E8DCD7] pt-3 flex justify-between text-sm font-bold text-[#2C1E1B]">
                  <span className="uppercase tracking-wider">Total Amount</span>
                  <span className="font-hero text-base">₱{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Shopping Protection Box */}
              <div className="bg-[#FAF5F2] border border-[#E8DCD7] p-4 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-[#2C1E1B]">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Shopping Protection</span>
                </div>
                <p className="text-[11px] text-[#705B56] leading-relaxed">
                  Free returns within 30 days. All orders include door-to-door tracking and authenticated atelier inspection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
