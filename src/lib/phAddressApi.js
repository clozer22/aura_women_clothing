/**
 * Philippine Standard Geographic Code (PSGC) API Service
 * Endpoint: https://psgc.gitlab.io/api/
 */

const BASE_URL = 'https://psgc.gitlab.io/api';
const memoryCache = new Map();

// Helper to fetch with caching
async function fetchWithCache(endpoint) {
  if (memoryCache.has(endpoint)) {
    return memoryCache.get(endpoint);
  }

  const sessionKey = `psgc_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
  try {
    const cached = sessionStorage.getItem(sessionKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      memoryCache.set(endpoint, parsed);
      return parsed;
    }
  } catch (err) {
    // Ignore sessionStorage issues
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    memoryCache.set(endpoint, data);
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(data));
    } catch (e) {}
    return data;
  } catch (error) {
    console.warn(`Failed to fetch from PSGC API (${endpoint}):`, error);
    return [];
  }
}

/**
 * Fetch all Philippine Regions
 */
export async function getRegions() {
  const data = await fetchWithCache('/regions/');
  if (data && data.length > 0) {
    return data.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Resilient fallback list of regions
  return [
    { code: '130000000', name: 'NCR (National Capital Region)', regionName: 'NCR' },
    { code: '040000000', name: 'CALABARZON (Region IV-A)', regionName: 'Region IV-A' },
    { code: '030000000', name: 'Central Luzon (Region III)', regionName: 'Region III' },
    { code: '070000000', name: 'Central Visayas (Region VII)', regionName: 'Region VII' },
    { code: '110000000', name: 'Davao Region (Region XI)', regionName: 'Region XI' },
    { code: '060000000', name: 'Western Visayas (Region VI)', regionName: 'Region VI' },
    { code: '010000000', name: 'Ilocos Region (Region I)', regionName: 'Region I' },
    { code: '020000000', name: 'Cagayan Valley (Region II)', regionName: 'Region II' },
    { code: '050000000', name: 'Bicol Region (Region V)', regionName: 'Region V' },
    { code: '080000000', name: 'Eastern Visayas (Region VIII)', regionName: 'Region VIII' },
    { code: '090000000', name: 'Zamboanga Peninsula (Region IX)', regionName: 'Region IX' },
    { code: '100000000', name: 'Northern Mindanao (Region X)', regionName: 'Region X' },
    { code: '120000000', name: 'SOCCSKSARGEN (Region XII)', regionName: 'Region XII' },
    { code: '140000000', name: 'CAR (Cordillera)', regionName: 'CAR' },
    { code: '160000000', name: 'Caraga (Region XIII)', regionName: 'Region XIII' },
    { code: '170000000', name: 'MIMAROPA', regionName: 'MIMAROPA' },
    { code: '150000000', name: 'BARMM', regionName: 'BARMM' }
  ];
}

/**
 * Fetch Provinces for a Region
 */
export async function getProvinces(regionCode) {
  if (!regionCode) return [];

  // Special handling for NCR (which doesn't have provinces)
  if (regionCode === '130000000') {
    return [
      { code: 'NCR_MANILA', name: 'Metro Manila' }
    ];
  }

  const data = await fetchWithCache(`/regions/${regionCode}/provinces/`);
  if (data && data.length > 0) {
    return data.sort((a, b) => a.name.localeCompare(b.name));
  }

  return [];
}

/**
 * Fetch Cities and Municipalities
 */
export async function getCities(provinceCode, regionCode) {
  if (!provinceCode && !regionCode) return [];

  // If NCR or province is Metro Manila, fetch directly from region endpoint
  if (regionCode === '130000000' || provinceCode === 'NCR_MANILA') {
    const data = await fetchWithCache('/regions/130000000/cities-municipalities/');
    if (data && data.length > 0) {
      return data.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  if (provinceCode && provinceCode !== 'NCR_MANILA') {
    const data = await fetchWithCache(`/provinces/${provinceCode}/cities-municipalities/`);
    if (data && data.length > 0) {
      return data.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return [];
}

/**
 * Fetch Barangays for a City/Municipality
 */
export async function getBarangays(cityCode) {
  if (!cityCode) return [];

  const data = await fetchWithCache(`/cities-municipalities/${cityCode}/barangays/`);
  if (data && data.length > 0) {
    return data.sort((a, b) => a.name.localeCompare(b.name));
  }

  return [];
}
