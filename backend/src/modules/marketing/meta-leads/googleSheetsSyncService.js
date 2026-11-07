const axios = require('axios');
const xlsx = require('xlsx');
const MetaLead = require('../../../database/models/MetaLead');
const MetaSyncState = require('../../../database/models/MetaSyncState');
const Integration = require('../../../database/models/Integration');

// Default sheets configured for CRM Live Sync
const DEFAULT_META_SHEET_SOURCES = [
  {
    name: 'Digital Marketing_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    gid: '994032620',
    sheetRange: "'Digital Marketing_Leads'!A:ZZ",
    campaign: 'Digital Marketing_Leads',
    fieldMapping: { name: 'full_name', phone: 'phone_number', email: 'email', location: 'city' },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'SAP_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    gid: '462616912',
    sheetRange: "'SAP_Leads'!A:ZZ",
    campaign: 'SAP_Leads',
    fieldMapping: { name: 'full_name', phone: 'phone_number', email: 'email', location: 'city' },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'Python_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    gid: '1203358862',
    sheetRange: "'Python_Leads'!A:ZZ",
    campaign: 'Python_Leads',
    fieldMapping: { name: 'full_name', phone: 'phone_number', email: 'email', location: 'city' },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'CyberSecurity_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    gid: '678096374',
    sheetRange: "'CyberSecurity_Leads'!A:ZZ",
    campaign: 'CyberSecurity_Leads',
    fieldMapping: { name: 'full_name', phone: 'phone_number', email: 'email', location: 'city' },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'DSAPython_workshop',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    gid: '675987833',
    sheetRange: "'DSAPython_workshop'!A:ZZ",
    campaign: 'DSAPython_workshop',
    fieldMapping: { name: 'full_name', phone: 'phone_number', email: 'email', location: 'city' },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'Cyber security workshop oct 22/10',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    gid: '662686398',
    sheetRange: "'Cyber security workshop oct 22/10'!A:ZZ",
    campaign: 'Cyber security workshop oct 22/10',
    fieldMapping: { name: 'full_name', phone: 'phone_number', email: 'email', location: 'city' },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'UI/UX_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    gid: '1925193575',
    sheetRange: "'UI/UX_Leads'!A:ZZ",
    campaign: 'UI/UX_Leads',
    fieldMapping: { name: 'full_name', phone: 'phone_number', email: 'email', location: 'city' },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'Data_Careers_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    gid: '985928295',
    sheetRange: "'Data_Careers_Leads'!A:ZZ",
    campaign: 'Data_Careers_Leads',
    fieldMapping: { name: 'full_name', phone: 'phone_number', email: 'email', location: 'city' },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'Website_Leads',
    sheetId: '1M2GDTW065pJU6eBk0BiDrp1Tio1V6ffEevuNQnwbIe4',
    gid: '0',
    sheetRange: "'Website_Leads'!A:ZZ",
    campaign: 'Website_Leads',
    fieldMapping: { name: 'full_name', phone: 'phone_number', email: 'email', location: 'city' },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'Practice Sheet',
    sheetId: '1Df8LIYoUfZb-qvmv7ZHwAy5iV7gFv9H0QeFLXDZF1XI',
    gid: '0',
    sheetRange: "'Practice Sheet'!A:ZZ",
    campaign: 'Practice Sheet',
    fieldMapping: { name: 'full_name', phone: 'phone_number', email: 'email', location: 'city' },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'CyberSecurity_Lead_Form_Nov2026',
    sheetId: '12oaPnKPhH5B6tESkguUbkU-AGyyOkS32AlpOjECufGM',
    gid: '',
    sheetRange: "'CyberSecurity_Lead_Form_Nov2026'!A:ZZ",
    campaign: 'CyberSecurity_Lead_Form_Nov2026',
    fieldMapping: { name: 'full_name', phone: 'phone', email: 'email', location: 'city' },
    columns: ['full_name', 'phone', 'email', 'city', 'interested']
  },
  {
    name: 'DataAnalyticsAI_Lead_Form_Nov2026',
    sheetId: '12oaPnKPhH5B6tESkguUbkU-AGyyOkS32AlpOjECufGM',
    gid: '1445056527',
    sheetRange: "'DataAnalyticsAI_Lead_Form_Nov2026'!A:ZZ",
    campaign: 'DataAnalyticsAI_Lead_Form_Nov2026',
    fieldMapping: { name: 'full_name', phone: 'phone', email: 'email', location: 'city' },
    columns: ['full_name', 'phone', 'email', 'city', 'interested']
  },
  {
    name: 'SAP_Lead_Form_Nov0411',
    sheetId: '12oaPnKPhH5B6tESkguUbkU-AGyyOkS32AlpOjECufGM',
    gid: '',
    sheetRange: "'SAP_Lead_Form_Nov0411'!A:ZZ",
    campaign: 'SAP_Lead_Form_Nov0411',
    fieldMapping: { name: 'full_name', phone: 'phone', email: 'email', location: 'city' },
    columns: ['full_name', 'phone', 'email', 'city', 'interested']
  }
];

function cleanLeadName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  let str = rawName;

  // 1. Remove mojibake sequences of ZWNJ / ZWJ / BOM that got decoded as Windows-1252
  str = str.replace(/â€Œ/g, '')
           .replace(/â€‹/g, '')
           .replace(/â€/g, '')
           .replace(/ï»¿/g, '');

  // 2. Remove leading/trailing or repeated â characters if they are artifacts of zero-width mojibake
  str = str.replace(/^[\sâ\u00e2\uFFFD\u200B-\u200F\u202A-\u202E\uFEFF\u00A0]+/, '');
  str = str.replace(/[\sâ\u00e2\uFFFD\u200B-\u200F\u202A-\u202E\uFEFF\u00A0]+$/, '');

  // 3. Remove zero-width characters (\u200B = zero width space, \uFEFF = BOM, \u200E / \u200F = directional marks)
  str = str.replace(/[\u200B\uFEFF\u200E\u200F\u2060]/g, '');

  // Remove zero-width non-joiners (\u200C) or joiners (\u200D) unless between Indic virama and Indic character
  str = str.replace(/[\u200C\u200D]+/g, (match, offset, full) => {
    const prevChar = offset > 0 ? full[offset - 1] : '';
    const nextChar = offset + match.length < full.length ? full[offset + match.length] : '';
    const isIndic = (c) => c && c.charCodeAt(0) >= 0x0900 && c.charCodeAt(0) <= 0x0D7F;
    if (isIndic(prevChar) && isIndic(nextChar)) {
      return match;
    }
    return '';
  });

  // 4. Normalize multiple spaces
  str = str.replace(/\s+/g, ' ').trim();

  // 5. If word is lowercase Latin (like "shyam"), capitalize properly ("Shyam")
  if (/^[a-z]+(\s+[a-z]+)*$/.test(str)) {
    str = str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return str;
}

function normalize10DigitPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10 && digits.startsWith('0')) return digits.slice(-10);
  return digits.length >= 10 ? digits.slice(-10) : '';
}

function normalizeHeaderName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim().toLowerCase();
  if (s.startsWith('ad_name') || s.startsWith('adset_name') || s.startsWith('campaign_name')) return s.split(/\s+/)[0];
  if (s.startsWith('email')) return 'email';
  if (s.startsWith('phone') || s.startsWith('mobile') || s.startsWith('contact')) return 'phone';
  if (s.startsWith('city') || s.startsWith('location') || s.startsWith('town') || s.startsWith('address')) return 'city';
  if (s.startsWith('full_name') || s.startsWith('full name') || s.startsWith('candidate') || s.startsWith('student') || s === 'name' || s.startsWith('name ')) return 'name';
  if (s.startsWith('interst') || s.startsWith('interest') || s.startsWith('course') || s.startsWith('which_sap_module')) return 'interested';
  if (s.startsWith('l:') || s.startsWith('id') || s.startsWith('lead_id')) return 'id';
  return s.split(/\s+/)[0].replace(/[^a-z0-9_]/g, '');
}

function extractCoreIdentifiers(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    return { metaLeadId: '', phone: '', normalizedPhone: '', email: '', fullName: '', city: '', isEmptyRow: true };
  }

  // 1. Meta Lead ID
  let metaLeadId = rawData.id || rawData.lead_id || rawData.metaLeadId || rawData.MetaLeadId || '';
  if (!metaLeadId) {
    const idKey = Object.keys(rawData).find(k => k.startsWith('l:') || k.toLowerCase().includes('lead_id'));
    if (idKey) metaLeadId = rawData[idKey] || idKey;
  }
  if (typeof metaLeadId === 'string') metaLeadId = metaLeadId.trim();

  // 2. Phone Number
  let phone = rawData.phone || rawData.phone_number || rawData.Phone || rawData['Phone Number'] || rawData.mobile || rawData.Mobile || '';
  if (typeof phone === 'string') phone = phone.trim();

  if (!phone || phone === 'phone_number' || phone === 'phone') {
    const mangledPhoneKey = Object.keys(rawData).find(k => k.startsWith('p:') || k.toLowerCase().includes('phone'));
    if (mangledPhoneKey && rawData[mangledPhoneKey]) {
      phone = String(rawData[mangledPhoneKey]).trim();
    } else {
      const foundVal = Object.values(rawData).find(v => typeof v === 'string' && (v.trim().startsWith('p:') || normalize10DigitPhone(v).length === 10));
      if (foundVal) phone = foundVal.trim();
    }
  }

  const normalizedPhone = normalize10DigitPhone(phone);

  // 3. Email
  let email = rawData.email || rawData.Email || rawData['Email Address'] || rawData['email_address'] || '';
  if (typeof email === 'string') email = email.trim().toLowerCase();
  if (!email || email === 'email' || !email.includes('@')) {
    const foundEmail = Object.values(rawData).find(v => typeof v === 'string' && v.includes('@') && v.includes('.') && !v.includes(' '));
    if (foundEmail) email = foundEmail.trim().toLowerCase();
    else email = '';
  }

  // 4. Full Name (Priority on clean candidate name)
  let fullName = rawData.name || rawData.full_name || rawData.Name || rawData['Full Name'] || rawData['Candidate Name'] || rawData['Student Name'] || '';
  if (typeof fullName === 'string') fullName = fullName.trim();
  if (!fullName || fullName === 'full_name' || fullName === 'name') {
    for (const [k, v] of Object.entries(rawData)) {
      if (typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 50) {
        const s = v.trim();
        if (!s.includes('@') && !s.startsWith('p:') && !s.startsWith('ag:') && !s.startsWith('as:') &&
            !s.startsWith('c:') && !s.startsWith('f:') && !s.startsWith('l:') && !s.startsWith('202') &&
            !s.toLowerCase().includes('call') && !s.toLowerCase().includes('lead') &&
            !s.toLowerCase().includes('workshop') && !s.toLowerCase().includes('created') &&
            !s.toLowerCase().includes('immediately') && !s.toLowerCase().includes('exploring') &&
            !s.toLowerCase().includes('reel') && !s.toLowerCase().includes('campaign')) {
          const lk = k.toLowerCase();
          if (lk.includes('full_name') || lk === 'name' || lk.startsWith('name') || lk === 'aman shaik' || lk === 'bhavani') {
            fullName = s;
            break;
          }
        }
      }
    }
  }
  fullName = cleanLeadName(fullName);
  if (!fullName) fullName = 'Unknown Lead';

  // 5. City / Location
  let city = rawData.city || rawData.City || rawData.location || rawData.Location || rawData.town || rawData.Town || '';
  if (typeof city === 'string') city = city.trim();
  if (!city) {
    const foundCity = Object.entries(rawData).find(([k]) => k.toLowerCase().includes('city') || k.toLowerCase().includes('location'));
    if (foundCity && typeof foundCity[1] === 'string') city = foundCity[1].trim();
  }

  // 6. Empty / Header Row Check
  const isHeaderRow = (metaLeadId === 'id' || metaLeadId === 'lead_id') 
    || (phone === 'phone_number' || phone === 'phone')
    || (fullName.toLowerCase() === 'full_name' || fullName.toLowerCase() === 'name')
    || (email.toLowerCase() === 'email');

  const isEmptyRow = isHeaderRow || (!metaLeadId && !normalizedPhone && !email && (fullName === 'Unknown Lead' || !fullName));

  return {
    metaLeadId: metaLeadId && metaLeadId !== 'id' ? metaLeadId : '',
    phone: phone && phone !== 'phone_number' ? phone : '',
    normalizedPhone,
    email: email && email !== 'email' ? email : '',
    fullName,
    city: city || '',
    isEmptyRow
  };
}

function parseTabName(range, name) {
  if (range && typeof range === 'string') {
    const cleanRange = range.replace(/!:+/g, '!').trim();
    const match = cleanRange.match(/^'?([^'!]+)'?!/);
    if (match && match[1]) return match[1].trim();
    if (cleanRange.includes('!')) return cleanRange.split('!')[0].replace(/^'|'$/g, '').trim();
    if (cleanRange) return cleanRange.replace(/^'|'$/g, '').trim();
  }
  if (name && typeof name === 'string' && name.trim()) return name.trim();
  return 'Sheet1';
}

/**
 * Fetch rows from Google Sheet via direct CSV export endpoint (Priority 1) or GViz endpoint (Fallback)
 */
async function fetchSheetRows(sheetId, tabName, gid) {
  let csvText = '';
  let lastError = null;
  let lastHttpStatus = null;

  // Priority 1: Direct Google Sheets CSV export endpoint via gid (Returns ALL rows, no 59-row GViz cutoff!)
  if (gid !== undefined && gid !== null && String(gid).length > 0) {
    try {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      const response = await axios.get(exportUrl, {
        responseType: 'arraybuffer',
        timeout: 25000,
        headers: { 'Accept': 'text/csv,application/octet-stream; charset=utf-8' }
      });
      csvText = Buffer.from(response.data).toString('utf8').replace(/^\uFEFF/, '');
    } catch (exportErr) {
      lastError = exportErr;
      lastHttpStatus = exportErr.response?.status;
      console.warn(`[MetaLeads Native Sync] Direct CSV export via gid=${gid} failed (${exportErr.message}), trying GViz...`);
    }
  }

  // Priority 2: Fallback to GViz endpoint (always pass headers=1 so GViz never merges first data rows into header!)
  if (!csvText) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tabName)}`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: { 'Accept': 'text/csv,application/octet-stream; charset=utf-8' }
      });
      csvText = Buffer.isBuffer(response.data)
        ? response.data.toString('utf8').replace(/^\uFEFF/, '')
        : typeof response.data === 'string'
          ? response.data.replace(/^\uFEFF/, '')
          : Buffer.from(response.data).toString('utf8').replace(/^\uFEFF/, '');
    } catch (err2) {
      lastError = err2;
      lastHttpStatus = err2.response?.status;
    }
  }

  // Priority 3: Fallback to direct export without gid (Active Tab)
  if (!csvText) {
    try {
      const fallbackUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await axios.get(fallbackUrl, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: { 'Accept': 'text/csv,application/octet-stream; charset=utf-8' }
      });
      csvText = Buffer.from(response.data).toString('utf8').replace(/^\uFEFF/, '');
    } catch (err3) {
      lastError = err3;
      lastHttpStatus = err3.response?.status;
    }
  }

  if (!csvText || !csvText.trim()) {
    if (lastHttpStatus === 401) {
      throw new Error(`Google Sheet is Restricted (401). Please open Google Sheet, click Share (top right), and set General access to "Anyone with the link" (Viewer).`);
    } else if (lastHttpStatus === 404) {
      throw new Error(`Google Sheet not found (404). Please verify that the Sheet ID "${sheetId}" is correct (Google Sheet IDs are case-sensitive).`);
    } else if (lastError?.message) {
      throw new Error(`Could not read Google Sheet: ${lastError.message}`);
    }
    return [];
  }

  const workbook = xlsx.read(csvText, { type: 'string', raw: false, codepage: 65001 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!matrix || matrix.length === 0) return [];

  const rawHeaders = matrix[0] || [];
  const cleanHeaders = rawHeaders.map(normalizeHeaderName);

  const rows = [];
  for (let i = 1; i < matrix.length; i++) {
    const rawRow = matrix[i];
    if (!rawRow || rawRow.every(v => v === '' || v == null)) continue;
    const obj = {};
    cleanHeaders.forEach((key, colIdx) => {
      if (key && obj[key] === undefined) {
        obj[key] = rawRow[colIdx] != null ? String(rawRow[colIdx]).trim() : '';
      }
    });
    rawHeaders.forEach((rawKey, colIdx) => {
      if (rawKey && obj[rawKey] === undefined) {
        obj[rawKey] = rawRow[colIdx] != null ? String(rawRow[colIdx]).trim() : '';
      }
    });
    const hasAny = Object.values(obj).some(val => val && String(val).trim().length > 0);
    if (hasAny) {
      rows.push(obj);
    }
  }
  return rows;
}

/**
 * Fetch column headers for a given sheet and tab range
 */
async function getSheetHeaders(sheetId, range, gid) {
  const cleanRange = String(range || '').replace(/!:+/g, '!').trim();
  const tabName = parseTabName(cleanRange);
  let lastError = null;
  let lastHttpStatus = null;

  try {
    let csvText = '';

    // Priority 1: direct CSV export via gid if available
    if (gid !== undefined && gid !== null && String(gid).length > 0) {
      try {
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        const response = await axios.get(exportUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
          headers: { 'Accept': 'text/csv,application/octet-stream; charset=utf-8' }
        });
        csvText = Buffer.from(response.data).toString('utf8').replace(/^\uFEFF/, '');
      } catch (err1) {
        lastError = err1;
        lastHttpStatus = err1.response?.status;
      }
    }

    // Priority 2: GViz endpoint with tabName
    if (!csvText) {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tabName)}`;
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 15000,
          headers: { 'Accept': 'text/csv,application/octet-stream; charset=utf-8' }
        });
        csvText = Buffer.isBuffer(response.data)
          ? response.data.toString('utf8').replace(/^\uFEFF/, '')
          : typeof response.data === 'string'
            ? response.data.replace(/^\uFEFF/, '')
            : Buffer.from(response.data).toString('utf8').replace(/^\uFEFF/, '');
      } catch (err2) {
        lastError = err2;
        lastHttpStatus = err2.response?.status;
      }
    }

    // Priority 3: Fallback to active tab CSV export (works without needing tab name!)
    if (!csvText) {
      try {
        const fallbackUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        const response = await axios.get(fallbackUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
          headers: { 'Accept': 'text/csv,application/octet-stream; charset=utf-8' }
        });
        csvText = Buffer.from(response.data).toString('utf8').replace(/^\uFEFF/, '');
      } catch (err3) {
        lastError = err3;
        lastHttpStatus = err3.response?.status;
      }
    }

    if (!csvText || !csvText.trim()) {
      let msg = 'Could not fetch Google Sheet data.';
      if (lastHttpStatus === 401) {
        msg = 'Google Sheet is Restricted (401). Please open your Google Sheet, click Share (top right), and change General access to "Anyone with the link" (Role: Viewer).';
      } else if (lastHttpStatus === 404) {
        msg = 'Google Sheet not found (404). Please verify that the Sheet ID or URL is correct (Google Sheet IDs are case-sensitive).';
      } else if (lastError?.message) {
        msg = lastError.message;
      }
      return {
        success: false,
        message: msg,
        columns: [],
        rawHeaders: [],
        sampleRows: [],
        totalRows: 0
      };
    }

    const workbook = xlsx.read(csvText, { type: 'string', raw: false, codepage: 65001 });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawMatrix = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let headers = [];
    if (rawMatrix.length > 0) {
      headers = (rawMatrix[0] || []).filter(h => typeof h === 'string' && h.trim().length > 0 && !h.startsWith('__EMPTY'));
    }
    const cleanHeaders = headers.map(normalizeHeaderName).filter(h => h);
    const allowed = ['name', 'phone', 'email', 'city', 'interested'];
    const merged = Array.from(new Set([...headers, ...cleanHeaders, ...allowed])).filter(Boolean);
    const sampleRows = [];
    for (let i = 1; i < Math.min(rawMatrix.length, 6); i++) {
      const row = rawMatrix[i];
      if (row && row.some(cell => cell != null && String(cell).trim() !== '')) {
        const rowObj = {};
        headers.forEach((h, hIdx) => {
          rowObj[h] = row[hIdx] != null ? String(row[hIdx]).trim() : '';
        });
        sampleRows.push(rowObj);
      }
    }
    const totalDataRows = Math.max(0, rawMatrix.length - 1);
    return {
      success: true,
      columns: merged,
      rawHeaders: headers,
      sampleRows,
      totalRows: totalDataRows
    };
  } catch (err) {
    let errorMsg = err.message || 'Could not parse sheet data.';
    if (lastHttpStatus === 401 || err.response?.status === 401) {
      errorMsg = 'Google Sheet is Restricted (401). Please open your Google Sheet, click Share (top right), and change General access to "Anyone with the link" (Role: Viewer).';
    } else if (lastHttpStatus === 404 || err.response?.status === 404) {
      errorMsg = 'Google Sheet not found (404). Please verify that the Sheet ID or URL is correct (Google Sheet IDs are case-sensitive).';
    }
    return {
      success: false,
      message: errorMsg,
      columns: [],
      rawHeaders: [],
      sampleRows: [],
      totalRows: 0
    };
  }
}

function deriveStatusFromRow(rawData) {
  let updateText = '';
  for (const [k, v] of Object.entries(rawData)) {
    if (/^final/i.test(k) && typeof v === 'string' && v.trim()) {
      updateText = v.trim();
      break;
    }
  }
  if (!updateText) {
    for (const [k, v] of Object.entries(rawData)) {
      if (/^first/i.test(k) && typeof v === 'string' && v.trim()) {
        updateText = v.trim();
        break;
      }
    }
  }
  if (!updateText) {
    for (const [k, v] of Object.entries(rawData)) {
      if (/^update|remark|outcome/i.test(k) && typeof v === 'string' && v.trim()) {
        updateText = v.trim();
        break;
      }
    }
  }
  if (!updateText) {
    for (const [k, v] of Object.entries(rawData)) {
      if (/status/i.test(k) && typeof v === 'string' && v.trim() && !/synced|crm/i.test(v)) {
        updateText = v.trim();
        break;
      }
    }
  }

  if (!updateText) return { status: 'New', text: '' };

  const lower = updateText.toLowerCase();

  // Negative Sub-statuses
  if (/joined\s*(in\s*)?other|joined\s*another|joined\s*somewhere/i.test(lower)) {
    return { status: 'joined another institute/jobs', text: updateText };
  }
  if (/wrong\s*number|wrong\s*mumber|switch\s*off|blocked|bloked|out\s*of\s*service|out\s*of\s*netwo?rk/i.test(lower)) {
    return { status: 'WN-SO-ON', text: updateText };
  }
  if (/not\s*inter[es]*ted|dont\s*have\s*time|no\s*time|not\s*interested\s*in\s*course/i.test(lower)) {
    return { status: 'Not interested/Time pass', text: updateText };
  }

  // Positive Sub-statuses
  if (/office\s*visit|visit\s*ofc|visited/i.test(lower)) {
    return { status: "office visit's", text: updateText };
  }
  if (/\bjoined\b/i.test(lower) && !/other|another|somewhere|not\s*joined/i.test(lower)) {
    return { status: 'Converted', text: updateText };
  }
  if (/demo\s*schedule|demo\s*attended|need\s*demo|send\s*demo/i.test(lower)) {
    return { status: 'Demo attended', text: updateText };
  }
  if (/parents\s*approval|need\s*time|next\s*month|after\s*1\s*month|join\s*two\s*months|plan\s*of\s*joining|in\s*dec/i.test(lower)) {
    return { status: 'Interested/Need time(After few months) waiting for parents approval', text: updateText };
  }
  if (/fee\s*issue|money\s*issue|server\s*purchase/i.test(lower)) {
    return { status: 'time issues/Fee issues', text: updateText };
  }
  if (/call\s*back|we\s*will\s*call|confirm|interested|will\s*update/i.test(lower)) {
    return { status: 'Call back/We will Call', text: updateText };
  }
  if (/not\s*answering|did\s*not\s*answer|busy\s*tone|disconnect/i.test(lower)) {
    return { status: 'Not answering-call back/whats app text', text: updateText };
  }

  return { status: 'New', text: updateText };
}

/**
 * Ingests rows into MetaLead model with deduplication
 */
async function ingestRowsIntoMetaLeads(rows, campaignName, sourceLabel) {
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let deletedCount = 0;
  const activeLeadIds = [];

  for (const rawData of rows) {
    const { metaLeadId, phone, normalizedPhone, email, fullName, city, isEmptyRow } = extractCoreIdentifiers(rawData);
    if (isEmptyRow) {
      skippedCount++;
      continue;
    }

    let existing = null;
    if (metaLeadId) {
      existing = await MetaLead.findOne({
        campaign: campaignName,
        $or: [
          { metaLeadId: metaLeadId },
          { 'rawData.id': metaLeadId },
          { 'rawData.lead_id': metaLeadId },
          { ['rawData.l:1112700817794449']: metaLeadId }
        ]
      });
    }

    if (!existing && normalizedPhone && normalizedPhone.length === 10) {
      existing = await MetaLead.findOne({
        campaign: campaignName,
        $or: [
          { normalizedPhone: normalizedPhone },
          { phone: phone },
          { 'rawData.phone_number': phone },
          { 'rawData.phone': phone },
          { 'rawData.Phone': phone },
          { 'rawData.mobile': phone },
          { ['rawData.p:+919550160911']: phone }
        ]
      });
    }

    if (!existing && email && email.includes('@')) {
      existing = await MetaLead.findOne({
        campaign: campaignName,
        $or: [
          { email: email },
          { 'rawData.email': email },
          { 'rawData.Email': email }
        ]
      });
    }

    // Allow Name, Phone, Email, Location / City, Interested
    let interested = rawData.interested || rawData.Interested || rawData.intersted || rawData.Intersted || rawData.course || rawData.Course || rawData['Interested In'] || rawData['interested_in'] || '';
    if (typeof interested === 'string') interested = interested.trim();
    if (!interested) {
      const foundKey = Object.keys(rawData).find(k => /intere?st|course|program|module/i.test(k));
      if (foundKey && typeof rawData[foundKey] === 'string') interested = rawData[foundKey].trim();
    }
    const allowedRawData = {
      full_name: fullName,
      email: email || '',
      phone_number: phone || normalizedPhone,
      city: city || '',
      name: fullName,
      phone: phone || normalizedPhone,
      location: city || '',
      interested: interested || '',
      course: interested || ''
    };

    const derived = deriveStatusFromRow(rawData);

    if (existing) {
      // PRESERVE existing caller-assigned status; if currently 'New', assign derived sheet status
      if ((!existing.status || existing.status === 'New') && derived.status !== 'New') {
        existing.status = derived.status;
      }
      if (derived.text) {
        existing.notes = existing.notes || [];
        const alreadyHasNote = existing.notes.some(n => n.text && n.text.includes(derived.text));
        if (!alreadyHasNote) {
          existing.notes.push({ text: `Sheet Update: ${derived.text}`, createdAt: new Date() });
        }
      }
      existing.metaLeadId = metaLeadId || existing.metaLeadId || undefined;
      existing.phone = phone || existing.phone || undefined;
      existing.normalizedPhone = normalizedPhone || existing.normalizedPhone || undefined;
      existing.email = email || existing.email || undefined;
      if (city) existing.city = city;
      if (interested) {
        existing.interested = interested;
        existing.course = interested;
      }
      if (fullName && fullName !== 'Unknown Lead') {
        existing.fullName = fullName;
      }
      existing.rawData = allowedRawData;
      existing.syncedAt = new Date();
      existing.source = sourceLabel || existing.source || 'google_sheets_meta';
      await existing.save();
      activeLeadIds.push(existing._id);
      updatedCount++;
    } else {
      const initialNotes = derived.text ? [{ text: `Sheet Update: ${derived.text}`, createdAt: new Date() }] : [];
      const created = await MetaLead.create({
        campaign: campaignName,
        source: sourceLabel || 'google_sheets_meta',
        metaLeadId: metaLeadId || undefined,
        phone: phone || undefined,
        normalizedPhone: normalizedPhone || undefined,
        email: email || undefined,
        city: city || undefined,
        interested: interested || undefined,
        course: interested || undefined,
        fullName: fullName || 'Unknown Lead',
        rawData: allowedRawData,
        status: derived.status || 'New',
        notes: initialNotes,
        syncedAt: new Date()
      });
      activeLeadIds.push(created._id);
      insertedCount++;
    }
  }

  // Erase any leads from this campaign in DB that were deleted from Google Sheet
  if (activeLeadIds.length > 0) {
    const delRes = await MetaLead.deleteMany({
      campaign: campaignName,
      _id: { $nin: activeLeadIds }
    });
    deletedCount = delRes.deletedCount || 0;
    if (deletedCount > 0) {
      console.log(`[MetaLeads Native Sync] Erased ${deletedCount} deleted lead(s) from campaign "${campaignName}" that were removed from Google Sheet.`);
    }
  }

  return {
    total: rows.length,
    insertedCount,
    updatedCount,
    deletedCount,
    skippedCount
  };
}

/**
 * Ensure Google Sheets integration document exists and has all 10 sources
 */
async function ensureGoogleSheetsIntegration() {
  try {
    let integration = await Integration.findOne({ type: 'google_sheets' });
    if (!integration) {
      integration = await Integration.create({
        name: 'Google Sheets',
        type: 'google_sheets',
        status: 'active',
        description: 'Native Google Sheets multi-tab sync for Meta Leads & Campaigns',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg',
        config: {
          sheetSources: DEFAULT_META_SHEET_SOURCES,
          sheetId: DEFAULT_META_SHEET_SOURCES[0].sheetId,
          sheetRange: DEFAULT_META_SHEET_SOURCES[0].sheetRange
        },
        fieldMapping: {
          name: 'full_name',
          phone: 'phone_number',
          email: 'email',
          location: 'city'
        }
      });
    } else {
      // Check if sheetSources is completely empty or missing gids
      let sourcesUpdated = false;
      const existingSources = integration.config?.sheetSources || [];
      if (existingSources.length === 0) {
        integration.config = {
          ...(integration.config || {}),
          sheetSources: DEFAULT_META_SHEET_SOURCES,
          sheetId: DEFAULT_META_SHEET_SOURCES[0].sheetId,
          sheetRange: DEFAULT_META_SHEET_SOURCES[0].sheetRange,
          webhookUrl: ''
        };
        sourcesUpdated = true;
      } else {
        // Ensure every source has its gid mapped from DEFAULT_META_SHEET_SOURCES if missing
        const updatedSources = existingSources.map(src => {
          const s = typeof src.toObject === 'function' ? src.toObject() : { ...src };
          if (!s.gid) {
            const def = DEFAULT_META_SHEET_SOURCES.find(d =>
              d.sheetId === s.sheetId &&
              (d.name === s.name || d.campaign === s.campaign || d.sheetRange === s.sheetRange)
            );
            if (def && def.gid) {
              s.gid = def.gid;
              sourcesUpdated = true;
            }
          }
          return s;
        });
        if (sourcesUpdated) {
          integration.config = {
            ...(integration.config || {}),
            sheetSources: updatedSources
          };
        }
      }
      if (sourcesUpdated) {
        integration.markModified('config');
        integration.status = 'active';
        await integration.save();
      }
    }
    return integration;
  } catch (err) {
    console.error('[ensureGoogleSheetsIntegration Error]:', err.message);
    return null;
  }
}

/**
 * Sync all Meta Google Sheets natively into CRM
 */
async function syncAllMetaSheets() {
  const startTime = Date.now();
  console.log('[MetaLeads Native Sync] Starting in-build Google Sheets synchronization...');

  // Set sync lock atomically in MetaSyncState
  await MetaSyncState.findOneAndUpdate(
    { key: 'meta_leads_sync' },
    {
      key: 'meta_leads_sync',
      isSyncing: true,
      startedAt: new Date(),
      lastStatus: 'running',
      message: 'Reading Google Sheets natively...',
      totalProcessed: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0
    },
    { upsert: true, new: true }
  );

  const integration = await ensureGoogleSheetsIntegration();
  const rawSources = (integration?.config?.sheetSources && integration.config.sheetSources.length > 0)
    ? integration.config.sheetSources
    : DEFAULT_META_SHEET_SOURCES;

  const sources = rawSources.map(src => {
    const s = typeof src.toObject === 'function' ? src.toObject() : { ...src };
    if (!s.gid) {
      const def = DEFAULT_META_SHEET_SOURCES.find(d =>
        d.sheetId === s.sheetId &&
        (d.name === s.name || d.campaign === s.campaign || d.sheetRange === s.sheetRange)
      );
      if (def && def.gid) {
        s.gid = def.gid;
      }
    }
    return s;
  });

  let totalProcessed = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  let skippedCount = 0;
  const sheetResults = [];

  for (const src of sources) {
    const tabName = parseTabName(src.sheetRange, src.name);
    const campaignName = src.campaign || tabName;
    console.log(`[MetaLeads Native Sync] Ingesting tab "${tabName}" (Campaign: ${campaignName})...`);

    // Update progress state
    await MetaSyncState.findOneAndUpdate(
      { key: 'meta_leads_sync' },
      {
        $set: {
          message: `Ingesting tab: ${tabName} (${sheetResults.length + 1}/${sources.length})...`
        }
      }
    ).catch(() => {});

    try {
      const rows = await fetchSheetRows(src.sheetId, tabName, src.gid);
      const res = await ingestRowsIntoMetaLeads(rows, campaignName, 'google_sheets_meta');

      totalProcessed += res.total;
      insertedCount += res.insertedCount;
      updatedCount += res.updatedCount;
      deletedCount += (res.deletedCount || 0);
      skippedCount += res.skippedCount;

      sheetResults.push({
        name: tabName,
        campaign: campaignName,
        status: 'success',
        totalRows: res.total,
        inserted: res.insertedCount,
        updated: res.updatedCount,
        skipped: res.skippedCount
      });
      console.log(`[MetaLeads Native Sync] Tab "${tabName}" completed: ${res.insertedCount} new, ${res.updatedCount} updated.`);
    } catch (sheetErr) {
      console.warn(`[MetaLeads Native Sync] Warning: Could not ingest tab "${tabName}" (${sheetErr.message})`);
      sheetResults.push({
        name: tabName,
        campaign: campaignName,
        status: 'warning',
        error: sheetErr.message
      });
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  const completionMessage = `Sync completed in ${durationSec}s: ${totalProcessed} leads processed (${insertedCount} new, ${updatedCount} updated, ${skippedCount} skipped across ${sheetResults.length} sheets).`;

  // Update MetaSyncState completed status
  await MetaSyncState.findOneAndUpdate(
    { key: 'meta_leads_sync' },
    {
      $set: {
        isSyncing: false,
        lastFinishedAt: new Date(),
        lastStatus: 'completed',
        message: completionMessage,
        totalProcessed,
        insertedCount,
        updatedCount,
        skippedCount
      }
    }
  );

  // Update Integration stats
  if (integration) {
    await Integration.findByIdAndUpdate(integration._id, {
      $inc: { totalLeadsImported: insertedCount },
      lastAutoSyncAt: new Date(),
      lastAutoSyncResult: {
        imported: insertedCount,
        updated: updatedCount,
        processed: totalProcessed,
        durationSeconds: durationSec
      },
      lastAutoSyncError: ''
    }).catch(() => {});
  }

  try {
    const { broadcastWebSocketEvent } = require('../../../app/websocket');
    broadcastWebSocketEvent('meta_leads:changed', {
      totalProcessed,
      insertedCount,
      updatedCount,
      timestamp: Date.now()
    });
  } catch (_) {}

  console.log(`[MetaLeads Native Sync] ${completionMessage}`);
  return {
    success: true,
    message: completionMessage,
    totalProcessed,
    insertedCount,
    updatedCount,
    skippedCount,
    sheetResults
  };
}

module.exports = {
  DEFAULT_META_SHEET_SOURCES,
  normalize10DigitPhone,
  extractCoreIdentifiers,
  deriveStatusFromRow,
  fetchSheetRows,
  getSheetHeaders,
  ingestRowsIntoMetaLeads,
  ensureGoogleSheetsIntegration,
  syncAllMetaSheets,
  parseTabName
};

