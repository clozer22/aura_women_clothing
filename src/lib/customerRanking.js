// Customer Ranking & Tier Benefits Definition for Aura Women's Clothing
// 3 types of customers based on total items ordered:
// 1. AURA Muse (Tier 1): 1–5 items (Entry Membership)
// 2. AURA Icon (Tier 2): 6–14 items (VIP Membership)
// 3. AURA Royal (Tier 3): 16+ items (Elite Membership)

export const TIER_KEYS = {
  MUSE: 'AURA Muse',
  ICON: 'AURA Icon',
  ROYAL: 'AURA Royal',
};

// Official Rank Voucher Catalog (All strictly one-time use per customer)
export const RANK_VOUCHER_CATALOG = {
  // Tier 1: AURA Muse (1–5 items | Entry Membership)
  MUSEBDAY50: {
    code: 'MUSEBDAY50',
    tier: TIER_KEYS.MUSE,
    title: '₱50 Birthday Voucher',
    description: '₱50 OFF birthday privilege for AURA Muse members (One-time use)',
    discount_type: 'fixed',
    discount_value: 50,
    min_order_value: 0,
    min_order_items: 1,
    min_historical_items: 1,
    one_time_per_user: true,
    is_active: true,
  },
  MUSELOYAL30: {
    code: 'MUSELOYAL30',
    tier: TIER_KEYS.MUSE,
    title: '₱30 Loyalty Voucher (3+ Items)',
    description: '₱30 OFF loyalty voucher for every 3-item purchase (One-time use)',
    discount_type: 'fixed',
    discount_value: 30,
    min_order_value: 0,
    min_order_items: 3,
    min_historical_items: 0,
    one_time_per_user: true,
    is_active: true,
  },
  MUSE50: {
    code: 'MUSE50',
    tier: TIER_KEYS.MUSE,
    title: '₱50 OFF Voucher (Min. Spend ₱999)',
    description: '₱50 OFF with a minimum spend of ₱999 (One-time use)',
    discount_type: 'fixed',
    discount_value: 50,
    min_order_value: 999,
    min_order_items: 1,
    min_historical_items: 0,
    one_time_per_user: true,
    is_active: true,
  },

  // Tier 2: AURA Icon (6–14 items | VIP Membership)
  ICONBDAY100: {
    code: 'ICONBDAY100',
    tier: TIER_KEYS.ICON,
    title: '₱100 Birthday Voucher',
    description: '₱100 OFF birthday privilege for AURA Icon VIP members (One-time use)',
    discount_type: 'fixed',
    discount_value: 100,
    min_order_value: 0,
    min_order_items: 1,
    min_historical_items: 6,
    one_time_per_user: true,
    is_active: true,
  },
  ICONLOYAL50: {
    code: 'ICONLOYAL50',
    tier: TIER_KEYS.ICON,
    title: '₱50 Loyalty Voucher (4+ Items)',
    description: '₱50 OFF loyalty voucher for every 4-item purchase (One-time use)',
    discount_type: 'fixed',
    discount_value: 50,
    min_order_value: 0,
    min_order_items: 4,
    min_historical_items: 6,
    one_time_per_user: true,
    is_active: true,
  },
  ICON100: {
    code: 'ICON100',
    tier: TIER_KEYS.ICON,
    title: '₱100 OFF Voucher (Min. Spend ₱1,299)',
    description: '₱100 OFF with a minimum spend of ₱1,299 (One-time use)',
    discount_type: 'fixed',
    discount_value: 100,
    min_order_value: 1299,
    min_order_items: 1,
    min_historical_items: 6,
    one_time_per_user: true,
    is_active: true,
  },
  ICON10ITEMS50: {
    code: 'ICON10ITEMS50',
    tier: TIER_KEYS.ICON,
    title: '₱50 Milestone Voucher (10+ Items)',
    description: 'Additional ₱50 OFF upon reaching 10 successfully purchased items (One-time use)',
    discount_type: 'fixed',
    discount_value: 50,
    min_order_value: 0,
    min_order_items: 1,
    min_historical_items: 10,
    one_time_per_user: true,
    is_active: true,
  },

  // Tier 3: AURA Royal (16+ items | Elite Membership)
  ROYALBDAY200: {
    code: 'ROYALBDAY200',
    tier: TIER_KEYS.ROYAL,
    title: '₱200 Birthday Voucher',
    description: '₱200 OFF birthday privilege for AURA Royal Elite members (One-time use)',
    discount_type: 'fixed',
    discount_value: 200,
    min_order_value: 0,
    min_order_items: 1,
    min_historical_items: 15,
    one_time_per_user: true,
    is_active: true,
  },
  ROYALLOYAL100: {
    code: 'ROYALLOYAL100',
    tier: TIER_KEYS.ROYAL,
    title: '₱100 Loyalty Voucher (6+ Items)',
    description: '₱100 OFF loyalty voucher for 6-item purchase (One-time use)',
    discount_type: 'fixed',
    discount_value: 100,
    min_order_value: 0,
    min_order_items: 6,
    min_historical_items: 15,
    one_time_per_user: true,
    is_active: true,
  },
  ROYAL300: {
    code: 'ROYAL300',
    tier: TIER_KEYS.ROYAL,
    title: '₱300 OFF Voucher (Min. Spend ₱1,999)',
    description: '₱300 OFF with a minimum spend of ₱1,999 (One-time use)',
    discount_type: 'fixed',
    discount_value: 300,
    min_order_value: 1999,
    min_order_items: 1,
    min_historical_items: 15,
    one_time_per_user: true,
    is_active: true,
  },
  ROYAL10ITEMS100: {
    code: 'ROYAL10ITEMS100',
    tier: TIER_KEYS.ROYAL,
    title: '₱100 Milestone Voucher (10+ Items)',
    description: 'Additional ₱100 OFF upon reaching 10+ purchased items (One-time use)',
    discount_type: 'fixed',
    discount_value: 100,
    min_order_value: 0,
    min_order_items: 1,
    min_historical_items: 10,
    one_time_per_user: true,
    is_active: true,
  },
};

export const DEFAULT_TIER_CONFIG = {
  [TIER_KEYS.MUSE]: {
    name: 'AURA Muse',
    tierNumber: 'Tier 1',
    tagline: 'Entry Membership',
    minItems: 1,
    maxItems: 5,
    thresholdLabel: '1–5 items',
    accentColor: '#9E6D5F',
    badgeClass: 'bg-[#FDF7F5] text-[#9E6D5F] border-[#E8DCD7]',
    pillClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    voucherCode: 'MUSE50',
    voucherDiscount: '₱50 OFF (Min. ₱999)',
    vouchers: [
      { code: 'MUSEBDAY50', label: '₱50 Birthday Voucher', sublabel: 'No min. spend • One-time use' },
      { code: 'MUSELOYAL30', label: '₱30 Loyalty Voucher', sublabel: 'Every 3-item purchase • One-time use' },
      { code: 'MUSE50', label: '₱50 OFF Voucher', sublabel: 'Min. spend of ₱999 • One-time use' },
    ],
    benefits: [
      '₱50 birthday voucher (Code: MUSEBDAY50)',
      '₱30 loyalty voucher for every 3 item purchase (Code: MUSELOYAL30)',
      '₱50 OFF voucher with a minimum spend of ₱999 (Code: MUSE50)',
      'All rank vouchers are strictly one-time use per customer at checkout',
    ],
  },
  [TIER_KEYS.ICON]: {
    name: 'AURA Icon',
    tierNumber: 'Tier 2',
    tagline: 'VIP Membership',
    minItems: 6,
    maxItems: 14,
    thresholdLabel: '6–14 items',
    accentColor: '#6B46C1',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    pillClass: 'bg-purple-50 text-purple-700 border border-purple-200',
    voucherCode: 'ICON100',
    voucherDiscount: '₱100 OFF (Min. ₱1,299)',
    vouchers: [
      { code: 'ICONBDAY100', label: '₱100 Birthday Voucher', sublabel: 'No min. spend • One-time use' },
      { code: 'ICONLOYAL50', label: '₱50 Loyalty Voucher', sublabel: 'Every 4-item purchase • One-time use' },
      { code: 'ICON100', label: '₱100 OFF Voucher', sublabel: 'Min. spend of ₱1,299 • One-time use' },
      { code: 'ICON10ITEMS50', label: 'Additional ₱50 Milestone Voucher', sublabel: 'Upon reaching 10 purchased items • One-time use', minHistoricalItems: 10 },
    ],
    benefits: [
      '₱100 birthday voucher (Code: ICONBDAY100)',
      '₱50 loyalty voucher for every 4 item purchase (Code: ICONLOYAL50)',
      '₱100 OFF voucher with a minimum spend of ₱1,299 (Code: ICON100)',
      'Additional ₱50 voucher upon reaching 10 successfully purchased items (Code: ICON10ITEMS50)',
      'All rank vouchers are strictly one-time use per customer at checkout',
    ],
  },
  [TIER_KEYS.ROYAL]: {
    name: 'AURA Royal',
    tierNumber: 'Tier 3',
    tagline: 'Elite Membership',
    minItems: 16,
    maxItems: Infinity,
    thresholdLabel: '16+ items',
    accentColor: '#B45309',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    pillClass: 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs',
    voucherCode: 'ROYAL300',
    voucherDiscount: '₱300 OFF (Min. ₱1,999)',
    vouchers: [
      { code: 'ROYALBDAY200', label: '₱200 Birthday Voucher', sublabel: 'No min. spend • One-time use' },
      { code: 'ROYALLOYAL100', label: '₱100 Loyalty Voucher', sublabel: 'For 6-item purchase • One-time use' },
      { code: 'ROYAL300', label: '₱300 OFF Voucher', sublabel: 'Min. spend of ₱1,999 • One-time use' },
      { code: 'ROYAL10ITEMS100', label: 'Additional ₱100 Milestone Voucher', sublabel: 'Upon reaching 10+ items • One-time use', minHistoricalItems: 10 },
    ],
    benefits: [
      '₱200 birthday voucher (Code: ROYALBDAY200)',
      '₱100 loyalty voucher for 6 item purchase (Code: ROYALLOYAL100)',
      '₱300 OFF voucher with a minimum spend of ₱1,999 (Code: ROYAL300)',
      'Additional ₱100 voucher upon reaching 10 items (Code: ROYAL10ITEMS100)',
      'All rank vouchers are strictly one-time use per customer at checkout',
    ],
  },
};

const STORAGE_KEY = 'aura_customer_tier_benefits_v2';

/**
 * Get active tier benefits (Admin-configurable with local storage persistence)
 */
export const getCustomerTierBenefits = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        [TIER_KEYS.MUSE]: { ...DEFAULT_TIER_CONFIG[TIER_KEYS.MUSE], ...(parsed[TIER_KEYS.MUSE] || {}) },
        [TIER_KEYS.ICON]: { ...DEFAULT_TIER_CONFIG[TIER_KEYS.ICON], ...(parsed[TIER_KEYS.ICON] || {}) },
        [TIER_KEYS.ROYAL]: { ...DEFAULT_TIER_CONFIG[TIER_KEYS.ROYAL], ...(parsed[TIER_KEYS.ROYAL] || {}) },
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
 * Determine a customer's ranking tier based on total items ordered:
 * • Tier 1 (AURA Muse): 1–5 items (or 0–5 for new accounts)
 * • Tier 2 (AURA Icon): 6–14 items
 * • Tier 3 (AURA Royal): 16+ items (15+ transitions into Royal Elite)
 */
export const calculateCustomerTier = (totalItemsCount = 0) => {
  const count = Number(totalItemsCount) || 0;
  if (count >= 15) return TIER_KEYS.ROYAL;
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
      message: `${itemsNeeded} more ${itemsNeeded === 1 ? 'item' : 'items'} to reach ${TIER_KEYS.ICON} (Tier 2 VIP)`,
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
      message: `${itemsNeeded} more ${itemsNeeded === 1 ? 'item' : 'items'} to reach ${TIER_KEYS.ROYAL} (Tier 3 Elite)`,
    };
  }

  return {
    currentTier,
    nextTier: null,
    itemsNeeded: 0,
    progress: 100,
    isMaxTier: true,
    message: 'You have achieved our highest AURA Royal Elite Membership!',
  };
};
