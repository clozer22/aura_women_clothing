/**
 * Philippine Regional Shipping Calculator for Aura Women's Clothing
 * Aligned with J&T Express Philippines Standard Domestic Tariff Zones (Origin: Metro Manila / Salcedo Atelier)
 */

export const FREE_SHIPPING_THRESHOLD = 3000; // Free nationwide shipping for orders ₱3,000+

export const SHIPPING_ZONES = {
  NCR: {
    name: 'Metro Manila (NCR)',
    fee: 95,
    eta: '1–2 Business Days',
    courier: 'J&T Express (Next-Day Courier)',
  },
  LUZON: {
    name: 'Luzon Provincial',
    fee: 145,
    eta: '2–4 Business Days',
    courier: 'J&T Express (Luzon Express)',
  },
  VISAYAS: {
    name: 'Visayas Region',
    fee: 175,
    eta: '4–6 Business Days',
    courier: 'J&T Express (Inter-Island Air/Sea)',
  },
  MINDANAO: {
    name: 'Mindanao & Island Provinces',
    fee: 195,
    eta: '5–8 Business Days',
    courier: 'J&T Express (Nationwide Logistics)',
  },
};

/**
 * Calculate the verified shipping fee based on Philippine region and province.
 * @param {Object} params
 * @param {string} params.regionCode - PSGC region code (e.g. "130000000" for NCR)
 * @param {string} params.regionName - Region name (e.g. "National Capital Region (NCR)")
 * @param {string} params.provinceName - Province name (e.g. "Cebu", "Cavite", "Davao del Sur")
 * @param {number} params.subtotal - Net subtotal after discounts (₱)
 * @param {number} [params.itemCount=1] - Total garment count
 * @returns {Object} Shipping calculation details
 */
export function calculateShippingFee({
  regionCode = '',
  regionName = '',
  provinceName = '',
  subtotal = 0,
  itemCount = 1,
} = {}) {
  // If cart is empty, fee is 0
  if (itemCount <= 0) {
    return {
      fee: 0,
      zone: 'No Items',
      isFree: false,
      eta: '—',
      courier: 'J&T Express',
      qualifiesForFreeShipping: false,
      amountNeededForFreeShipping: FREE_SHIPPING_THRESHOLD,
    };
  }

  // 1. Luxury Privilege: Free Nationwide Shipping Threshold
  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const amountNeededForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // 2. Normalize Names for Zone Matching
  const rCode = String(regionCode || '').trim();
  const rName = String(regionName || '').toUpperCase();
  const pName = String(provinceName || '').toUpperCase();

  let matchedZone = SHIPPING_ZONES.LUZON; // Sensible default for PH mainland

  // Check Zone 1: Metro Manila / NCR
  const isNcr =
    rCode === '130000000' ||
    rName.includes('NCR') ||
    rName.includes('NATIONAL CAPITAL') ||
    pName.includes('METRO MANILA') ||
    pName.includes('MANILA') ||
    pName.includes('MAKATI') ||
    pName.includes('QUEZON CITY') ||
    pName.includes('TAGUIG') ||
    pName.includes('PASIG');

  if (isNcr) {
    matchedZone = SHIPPING_ZONES.NCR;
  } else {
    // Check Zone 3: Visayas
    const isVisayas =
      rCode.startsWith('06') || // Region VI (Western Visayas)
      rCode.startsWith('07') || // Region VII (Central Visayas)
      rCode.startsWith('08') || // Region VIII (Eastern Visayas)
      rName.includes('REGION VI') ||
      rName.includes('REGION VII') ||
      rName.includes('REGION VIII') ||
      rName.includes('VISAYAS') ||
      pName.includes('CEBU') ||
      pName.includes('BOHOL') ||
      pName.includes('ILOILO') ||
      pName.includes('NEGROS') ||
      pName.includes('LEYTE') ||
      pName.includes('SAMAR') ||
      pName.includes('AKLAN') ||
      pName.includes('CAPIZ') ||
      pName.includes('ANTIQUE') ||
      pName.includes('GUIMARAS') ||
      pName.includes('BILIRAN');

    // Check Zone 4: Mindanao & Island Provinces
    const isMindanaoOrIslands =
      rCode.startsWith('09') || // Region IX (Zamboanga Peninsula)
      rCode.startsWith('10') || // Region X (Northern Mindanao)
      rCode.startsWith('11') || // Region XI (Davao Region)
      rCode.startsWith('12') || // Region XII (SOCCSKSARGEN)
      rCode.startsWith('16') || // Region XIII (Caraga)
      rCode.startsWith('19') || // BARMM
      rName.includes('REGION IX') ||
      rName.includes('REGION X') ||
      rName.includes('REGION XI') ||
      rName.includes('REGION XII') ||
      rName.includes('REGION XIII') ||
      rName.includes('CARAGA') ||
      rName.includes('DAVAO') ||
      rName.includes('MINDANAO') ||
      rName.includes('BANGSAMORO') ||
      rName.includes('BARMM') ||
      pName.includes('DAVAO') ||
      pName.includes('MISAMIS') ||
      pName.includes('BUKIDNON') ||
      pName.includes('ZAMBOANGA') ||
      pName.includes('COTABATO') ||
      pName.includes('SULTAN KUDARAT') ||
      pName.includes('SOUTH COTABATO') ||
      pName.includes('AGUSAN') ||
      pName.includes('SURIGAO') ||
      pName.includes('BASILAN') ||
      pName.includes('SULU') ||
      pName.includes('TAWI-TAWI') ||
      pName.includes('LANAO') ||
      pName.includes('PALAWAN') ||
      pName.includes('BATANES');

    if (isMindanaoOrIslands) {
      matchedZone = SHIPPING_ZONES.MINDANAO;
    } else if (isVisayas) {
      matchedZone = SHIPPING_ZONES.VISAYAS;
    } else {
      // Region I, II, III, IV-A CALABARZON, MIMAROPA, Region V (Bicol), CAR
      matchedZone = SHIPPING_ZONES.LUZON;
    }
  }

  const finalFee = qualifiesForFreeShipping ? 0 : matchedZone.fee;

  return {
    fee: finalFee,
    originalFee: matchedZone.fee,
    zone: matchedZone.name,
    isFree: qualifiesForFreeShipping,
    eta: matchedZone.eta,
    courier: matchedZone.courier,
    qualifiesForFreeShipping,
    amountNeededForFreeShipping,
  };
}
