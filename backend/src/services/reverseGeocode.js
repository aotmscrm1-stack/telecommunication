const https = require('https');
const http = require('http');
const { isInsideOfficeGeofence, OFFICE_NAME, OFFICE_BUILDING, OFFICE_ADDRESS, OFFICE_AREA, OFFICE_CITY } = require('../config/officeConfig');

// In-memory spatial cache: Map<gridKey, AddressResult>
const geocodeCache = new Map();
const CACHE_MAX_SIZE = 5000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Creates a quantized spatial key (~11m grid resolution)
 */
function getGridKey(lat, lng) {
  const qLat = Number(lat).toFixed(4);
  const qLng = Number(lng).toFixed(4);
  return `${qLat},${qLng}`;
}

/**
 * Clean and format address components
 */
function formatAddressResult(raw = {}) {
  const address = raw.address || {};

  const road =
    address.road ||
    address.pedestrian ||
    address.street ||
    address.highway ||
    address.path ||
    address.footway ||
    address.commercial ||
    address.amenity ||
    'MG Road';

  const area =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.quarter ||
    address.subdistrict ||
    address.locality ||
    'Labbipet';

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    'Vijayawada';

  const parts = [];
  if (road && road !== 'MG Road') parts.push(road);
  else parts.push('MG Road');
  if (area && area !== road) parts.push(area);
  if (city && city !== area) parts.push(city);

  const formattedAddress = parts.length > 0 ? parts.join(', ') : raw.display_name || `${road}, ${city}`;

  return {
    road,
    area,
    city,
    formattedAddress,
    displayName: raw.display_name || formattedAddress,
    cachedAt: Date.now(),
  };
}

/**
 * Reverse geocodes a latitude and longitude to road, area, and city
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{road: string, area: string, city: string, formattedAddress: string, isOffice?: boolean}>}
 */
async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    return {
      road: 'Unknown Road',
      area: 'Unknown Area',
      city: 'Vijayawada',
      formattedAddress: 'Location unavailable',
    };
  }

  // 1. Office Geofence Match (0ms network cost)
  if (isInsideOfficeGeofence(lat, lng)) {
    return {
      road: 'MG Road',
      area: OFFICE_AREA,
      city: OFFICE_CITY,
      formattedAddress: `${OFFICE_NAME}, 2nd Floor, Pothuri Towers, MG Road, Near DV Manor, Opposite Lucky Shopping Mall, Vijayawada - 520010`,
      building: OFFICE_BUILDING,
      isOffice: true,
    };
  }

  const gridKey = getGridKey(lat, lng);

  // 2. In-Memory Cache Lookup
  const cached = geocodeCache.get(gridKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return {
      road: cached.road,
      area: cached.area,
      city: cached.city,
      formattedAddress: cached.formattedAddress,
    };
  }

  // 3. Perform Reverse Geocode HTTP Lookup
  try {
    const customProviderUrl = process.env.REVERSE_GEOCODE_URL;
    const url = customProviderUrl
      ? `${customProviderUrl}?lat=${lat}&lon=${lng}`
      : `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;

    const rawData = await fetchJsonWithTimeout(url, 4000);
    const parsed = formatAddressResult(rawData);

    // Cache management
    if (geocodeCache.size >= CACHE_MAX_SIZE) {
      const firstKey = geocodeCache.keys().next().value;
      geocodeCache.delete(firstKey);
    }
    geocodeCache.set(gridKey, parsed);

    return {
      road: parsed.road,
      area: parsed.area,
      city: parsed.city,
      formattedAddress: parsed.formattedAddress,
    };
  } catch (err) {
    // Graceful fallback on network or rate limit failure
    const fallback = {
      road: 'MG Road',
      area: 'Labbipet / Chandra Mouli Puram',
      city: 'Vijayawada',
      formattedAddress: `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)} (Near MG Road)`,
    };
    geocodeCache.set(gridKey, { ...fallback, cachedAt: Date.now() });
    return fallback;
  }
}

/**
 * Lightweight HTTP/HTTPS JSON fetcher with timeout and User-Agent compliance
 */
function fetchJsonWithTimeout(urlStr, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'AOTMS-FleetTracker/2.0 (contact@aotms.com; Field Logistics)',
          Accept: 'application/json',
        },
        timeout: timeoutMs,
      },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Reverse geocoding timeout'));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = {
  reverseGeocode,
  getGridKey,
};
