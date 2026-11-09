// Customer Ranking & Tier Benefits Definition for Aura Women's Clothing
// 3 types of customers based on total items ordered:
// 1. AURA Muse: 5 item orders below (<= 5 items)
// 2. AURA Icon: 6-15 item orders (6 to 15 items)
// 3. AURA Royal: more than 15 items (> 15 items)

export const TIER_KEYS = {
  MUSE: 'AURA Muse',
  ICON: 'AURA Icon',
  ROYAL: 'AURA Royal',
};

export const DEFAULT_TIER_CONFIG = {
  [TIER_KEYS.MUSE]: {
    name: 'AURA Muse',
    tagline: 'Bespoke Initiate',
    minItems: 0,
    maxItems: 5,
    thresholdLabel: '5 items or below',
    accentColor: '#9E6D5F',
    badgeClass: 'bg-[#FDF7F5] text-[#9E6D5F] border-[#E8DCD7]',
    pillClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    voucherCode: 'MUSE10',
    voucherDiscount: '10% OFF',
    benefits: [
      'Welcome VIP Voucher: 10% off (Code: MUSE10)',
      'Standard Order Care & Order Tracking',
      'Seasonal Drop & Collection Early Notifications',
      'Access to AURA Customer Support Hub'
    ],
  },
  [TIER_KEYS.ICON]: {
    name: 'AURA Icon',
    tagline: 'Distinguished Patron',
    minItems: 6,
    maxItems: 15,
    thresholdLabel: '6 – 15 items',
    accentColor: '#6B46C1',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    pillClass: 'bg-purple-50 text-purple-700 border border-purple-200',
    voucherCode: 'ICON15',
    voucherDiscount: '15% OFF',
    benefits: [
      'Icon VIP Voucher: 15% off (Code: ICON15)',
      'Free Express Delivery on orders over ₱1,500',
      'Priority Gift Packaging & Ribboned Box',
      '12-Hour Early Access to Limited Capsule Drops',
      'Direct Stylist Consultation via Live Chat'
    ],
  },
  [TIER_KEYS.ROYAL]: {
    name: 'AURA Royal',
    tagline: 'High VIP Sovereign',
    minItems: 16,
    maxItems: Infinity,
    thresholdLabel: 'More than 15 items',
    accentColor: '#B45309',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    pillClass: 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs',
    voucherCode: 'ROYAL20',
    voucherDiscount: '20% OFF',
    benefits: [
      'Royal VIP Voucher: 20% off all orders (Code: ROYAL20)',
      'Complimentary Express Nationwide Delivery on ALL orders',
      'Dedicated 1-on-1 Concierge & Custom Sizing Advisory',
      'Exclusive Annual Birthday Voucher & Surprise Gift Box',
      'Private Previews & Invitation to Runway Showcases'
    ],
  },
};

const STORAGE_KEY = 'aura_customer_tier_benefits_v1';

/**
 * Get active tier benefits (Admin-configurable with local storage persistence)
 */
export const getCustomerTierBenefits = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_TIER_CONFIG,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('Failed to parse saved tier benefits:', err);
  }
  return DEFAULT_TIER_CONFIG;
};

/**
 * Save updated tier benefits configured by Admin
 */
export const saveCustomerTierBenefits = (updatedConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfig));
    // Dispatch a storage event so all tabs/windows update reactively
    window.dispatchEvent(new CustomEvent('aura_tier_benefits_updated', { detail: updatedConfig }));
    return true;
  } catch (err) {
    console.error('Failed to save tier benefits:', err);
    return false;
  }
};

/**
 * Reset tier benefits back to factory defaults
 */
export const resetCustomerTierBenefits = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('aura_tier_benefits_updated', { detail: DEFAULT_TIER_CONFIG }));
    return DEFAULT_TIER_CONFIG;
  } catch (err) {
    console.error('Failed to reset tier benefits:', err);
    return DEFAULT_TIER_CONFIG;
  }
};

/**
 * Determine a customer's ranking tier based on total items ordered
 * • 5 item orders below: AURA Muse
 * • 6-15 item orders: AURA Icon
 * • More than 15 items: AURA Royal
 */
export const calculateCustomerTier = (totalItemsCount = 0) => {
  const count = Number(totalItemsCount) || 0;
  if (count > 15) return TIER_KEYS.ROYAL;
  if (count >= 6) return TIER_KEYS.ICON;
  return TIER_KEYS.MUSE;
};

/**
 * Calculate progress to the next ranking tier
 */
export const getTierProgress = (totalItemsCount = 0) => {
  const count = Number(totalItemsCount) || 0;
  const currentTier = calculateCustomerTier(count);

  if (currentTier === TIER_KEYS.MUSE) {
    const itemsNeeded = Math.max(0, 6 - count);
    const progress = Math.min(100, Math.round((count / 6) * 100));
    return {
      currentTier,
      nextTier: TIER_KEYS.ICON,
      itemsNeeded,
      progress,
      isMaxTier: false,
      message: `${itemsNeeded} more ${itemsNeeded === 1 ? 'item' : 'items'} to reach ${TIER_KEYS.ICON}`,
    };
  }

  if (currentTier === TIER_KEYS.ICON) {
    const itemsNeeded = Math.max(0, 16 - count);
    const progress = Math.min(100, Math.round(((count - 5) / (16 - 5)) * 100));
    return {
      currentTier,
      nextTier: TIER_KEYS.ROYAL,
      itemsNeeded,
      progress,
      isMaxTier: false,
      message: `${itemsNeeded} more ${itemsNeeded === 1 ? 'item' : 'items'} to reach ${TIER_KEYS.ROYAL}`,
    };
  }

  return {
    currentTier,
    nextTier: null,
    itemsNeeded: 0,
    progress: 100,
    isMaxTier: true,
    message: 'You have achieved our highest Sovereign status!',
  };
};
