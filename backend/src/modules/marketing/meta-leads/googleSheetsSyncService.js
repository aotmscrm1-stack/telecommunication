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
    sheetRange: "'Digital Marketing_Leads'!A:ZZ",
    campaign: 'Digital Marketing_Leads',
    fieldMapping: {
      name: 'full_name',
      phone: 'phone_number',
      email: 'email',
      location: 'city'
    },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'SAP_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    sheetRange: "'SAP_Leads'!A:ZZ",
    campaign: 'SAP_Leads',
    fieldMapping: {
      name: 'full_name',
      phone: 'phone_number',
      email: 'email',
      location: 'city'
    },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'Python_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    sheetRange: "'Python_Leads'!A:ZZ",
    campaign: 'Python_Leads',
    fieldMapping: {
      name: 'full_name',
      phone: 'phone_number',
      email: 'email',
      location: 'city'
    },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'CyberSecurity_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    sheetRange: "'CyberSecurity_Leads'!A:ZZ",
    campaign: 'CyberSecurity_Leads',
    fieldMapping: {
      name: 'full_name',
      phone: 'phone_number',
      email: 'email',
      location: 'city'
    },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'DSAPython_workshop',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    sheetRange: "'DSAPython_workshop'!A:ZZ",
    campaign: 'DSAPython_workshop',
    fieldMapping: {
      name: 'full_name',
      phone: 'phone_number',
      email: 'email',
      location: 'city'
    },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'Cyber security workshop oct 22/10',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    sheetRange: "'Cyber security workshop oct 22/10'!A:ZZ",
    campaign: 'Cyber security workshop oct 22/10',
    fieldMapping: {
      name: 'full_name',
      phone: 'phone_number',
      email: 'email',
      location: 'city'
    },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'UI/UX_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    sheetRange: "'UI/UX_Leads'!A:ZZ",
    campaign: 'UI/UX_Leads',
    fieldMapping: {
      name: 'full_name',
      phone: 'phone_number',
      email: 'email',
      location: 'city'
    },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'Data_Careers_Leads',
    sheetId: '1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg',
    sheetRange: "'Data_Careers_Leads'!A:ZZ",
    campaign: 'Data_Careers_Leads',
    fieldMapping: {
      name: 'full_name',
      phone: 'phone_number',
      email: 'email',
      location: 'city'
    },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'Website_Leads',
    sheetId: '1M2GDTW065pJU6eBk0BiDrp1Tio1V6ffEevuNQnwbIe4',
    sheetRange: "'Website_Leads'!A:ZZ",
    campaign: 'Website_Leads',
    fieldMapping: {
      name: 'full_name',
      phone: 'phone_number',
      email: 'email',
      location: 'city'
    },
    columns: ['full_name', 'phone_number', 'email', 'city']
  },
  {
    name: 'Practice Sheet',
    sheetId: '1Df8LIYoUfZb-qvmv7ZHwAy5iV7gFv9H0QeFLXDZF1XI',
    sheetRange: "'Practice Sheet'!A:ZZ",
    campaign: 'Practice Sheet',
    fieldMapping: {
      name: 'full_name',
      phone: 'phone_number',
      email: 'email',
      location: 'city'
    },
    columns: ['full_name', 'phone_number', 'email', 'city']
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
  if (name && name.trim()) return name.trim();
  if (!range) return 'Sheet1';
  // If range is like "'Digital Marketing_Leads'!A:ZZ" or "SAP_Leads!A1:Z"
  const match = range.match(/^'?([^'!]+)'?!/);
  if (match) return match[1].trim();
  return range.split('!')[0].replace(/^'|'$/g, '').trim();
}

/**
 * Fetch rows from Google Sheet via GViz public CSV endpoint using matrix row parsing
 */
async function fetchSheetRows(sheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: { 'Accept': 'text/csv,application/octet-stream; charset=utf-8' }
  });
  const csvText = Buffer.isBuffer(response.data)
    ? response.data.toString('utf8').replace(/^\uFEFF/, '')
    : typeof response.data === 'string'
      ? response.data.replace(/^\uFEFF/, '')
      : Buffer.from(response.data).toString('utf8').replace(/^\uFEFF/, '');
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
    rows.push(obj);
  }
  return rows;
}

/**
 * Fetch column headers for a given sheet and tab range
 */
async function getSheetHeaders(sheetId, range) {
  const tabName = parseTabName(range);
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'Accept': 'text/csv,application/octet-stream; charset=utf-8' }
    });
    const csvText = Buffer.isBuffer(response.data)
      ? response.data.toString('utf8').replace(/^\uFEFF/, '')
      : typeof response.data === 'string'
        ? response.data.replace(/^\uFEFF/, '')
        : Buffer.from(response.data).toString('utf8').replace(/^\uFEFF/, '');
    const workbook = xlsx.read(csvText, { type: 'string', raw: false, codepage: 65001 });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawMatrix = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let headers = [];
    if (rawMatrix.length > 0) {
      headers = (rawMatrix[0] || []).filter(h => typeof h === 'string' && h.trim().length > 0 && !h.startsWith('__EMPTY'));
    }
    const cleanHeaders = headers.map(normalizeHeaderName).filter(h => h);
    const allowed = ['name', 'phone', 'email', 'city'];
    return { success: true, columns: Array.from(new Set([...allowed, ...cleanHeaders])) };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      columns: ['name', 'phone', 'email', 'city']
    };
  }
}

/**
 * Ingests rows into MetaLead model with deduplication
 */
async function ingestRowsIntoMetaLeads(rows, campaignName, sourceLabel) {
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

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

    // Strictly allow only Name, Phone, Email, Location / City
    const allowedRawData = {
      full_name: fullName,
      email: email || '',
      phone_number: phone || normalizedPhone,
      city: city || '',
      name: fullName,
      phone: phone || normalizedPhone,
      location: city || ''
    };

    if (existing) {
      // PRESERVE existing CRM status and employee assignments
      existing.metaLeadId = metaLeadId || existing.metaLeadId || undefined;
      existing.phone = phone || existing.phone || undefined;
      existing.normalizedPhone = normalizedPhone || existing.normalizedPhone || undefined;
      existing.email = email || existing.email || undefined;
      if (city) existing.city = city;
      if (fullName && fullName !== 'Unknown Lead') {
        existing.fullName = fullName;
      }
      existing.rawData = allowedRawData;
      existing.syncedAt = new Date();
      existing.source = sourceLabel || existing.source || 'google_sheets_meta';
      await existing.save();
      updatedCount++;
    } else {
      await MetaLead.create({
        campaign: campaignName,
        source: sourceLabel || 'google_sheets_meta',
        metaLeadId: metaLeadId || undefined,
        phone: phone || undefined,
        normalizedPhone: normalizedPhone || undefined,
        email: email || undefined,
        city: city || undefined,
        fullName: fullName || 'Unknown Lead',
        rawData: allowedRawData,
        status: 'New',
        syncedAt: new Date()
      });
      insertedCount++;
    }
  }

  return {
    total: rows.length,
    insertedCount,
    updatedCount,
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
      // Check if sheetSources is empty or missing sources
      const existingSources = integration.config?.sheetSources || [];
      if (existingSources.length < DEFAULT_META_SHEET_SOURCES.length) {
        integration.config = {
          ...(integration.config || {}),
          sheetSources: DEFAULT_META_SHEET_SOURCES,
          sheetId: DEFAULT_META_SHEET_SOURCES[0].sheetId,
          sheetRange: DEFAULT_META_SHEET_SOURCES[0].sheetRange,
          webhookUrl: ''
        };
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
  const sources = (integration?.config?.sheetSources && integration.config.sheetSources.length > 0)
    ? integration.config.sheetSources
    : DEFAULT_META_SHEET_SOURCES;

  let totalProcessed = 0;
  let insertedCount = 0;
  let updatedCount = 0;
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
      const rows = await fetchSheetRows(src.sheetId, tabName);
      const res = await ingestRowsIntoMetaLeads(rows, campaignName, 'google_sheets_meta');

      totalProcessed += res.total;
      insertedCount += res.insertedCount;
      updatedCount += res.updatedCount;
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
  fetchSheetRows,
  getSheetHeaders,
  ingestRowsIntoMetaLeads,
  ensureGoogleSheetsIntegration,
  syncAllMetaSheets
};

