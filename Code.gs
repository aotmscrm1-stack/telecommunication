/**
 * ============================================================================
 * ACADEMY OF TECH MASTERS (AOTMS) - CRM LIVE GOOGLE APPS SCRIPT
 * File: Code.js
 * Target: Google Sheets (Spreadsheet ID: 1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg)
 * ============================================================================
 * 
 * This Apps Script directly syncs leads from Google Sheets tabs to AOTMS CRM:
 * Target API: https://api.academyoftechmasters.com/api/meta-leads
 * 
 * Features:
 * 1. Real-time Instant Sync (onEdit): Sends lead immediately upon typing/editing a row.
 * 2. Auto-Sync Schedule: Periodically checks and syncs any new/unsynced leads across all tabs.
 * 3. Custom Menu: Adds "🚀 CRM Sync" in Google Sheets toolbar for 1-click manual sync.
 * 4. Extracts strictly the 4 standardized fields:
 *    - full_name
 *    - email
 *    - phone_number
 *    - city
 * 5. Automatic status tagging: Marks "lead_status" column as "SYNCED_TO_CRM" with date.
 */

// Production CRM Ingestion Endpoint
var CRM_API_URL = 'https://api.academyoftechmasters.com/api/meta-leads';

/**
 * 1. Custom Google Sheets Menu (Runs on sheet open)
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 CRM Sync')
    .addItem('🔄 Sync Current Tab Leads', 'syncCurrentSheetLeads')
    .addItem('🌐 Sync All Tabs Leads', 'syncAllTabsLeads')
    .addSeparator()
    .addItem('⏱️ Setup 1-Minute Auto-Sync Trigger', 'setupAutoSyncTrigger')
    .addItem('🛑 Remove Auto-Sync Triggers', 'removeAutoSyncTriggers')
    .addToUi();
}

/**
 * Helper to normalize and match column headers dynamically
 */
function findColumnIndexes(headers) {
  var map = {
    id: -1,
    name: -1,
    phone: -1,
    email: -1,
    city: -1,
    status: -1
  };

  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').trim().toLowerCase();
    if (!h) continue;

    if (map.name === -1 && (h === 'full_name' || h === 'full name' || h === 'name' || h.indexOf('name') !== -1 || h === 'candidate name' || h === 'student name')) {
      if (h.indexOf('ad_') === -1 && h.indexOf('campaign') === -1 && h.indexOf('form') === -1 && h.indexOf('adset') === -1) {
        map.name = i;
      }
    }
    if (map.phone === -1 && (h === 'phone_number' || h === 'phone' || h.indexOf('phone') !== -1 || h.indexOf('mobile') !== -1 || h.indexOf('contact') !== -1)) {
      map.phone = i;
    }
    if (map.email === -1 && (h === 'email' || h.indexOf('email') !== -1)) {
      map.email = i;
    }
    if (map.city === -1 && (h === 'city' || h.indexOf('city') !== -1 || h === 'location' || h.indexOf('location') !== -1 || h === 'town')) {
      map.city = i;
    }
    if (map.status === -1 && (h === 'lead_status' || h === 'status' || h === 'synced_status' || h === 'crm_status')) {
      map.status = i;
    }
    if (map.id === -1 && (h === 'id' || h === 'lead_id' || h === 'meta_lead_id')) {
      map.id = i;
    }
  }

  return map;
}

/**
 * Clean & Format phone number
 */
function formatPhoneNumber(raw) {
  if (!raw) return '';
  var s = String(raw).trim();
  return s;
}

/**
 * 2. Real-Time Trigger (onEdit)
 * Fires immediately when user edits or adds data to any row.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();
    var row = e.range.getRow();

    // Ignore header row (Row 1)
    if (row <= 1) return;

    var numColumns = sheet.getLastColumn();
    if (numColumns === 0) return;

    var headers = sheet.getRange(1, 1, 1, numColumns).getValues()[0];
    var colMap = findColumnIndexes(headers);
    var rowValues = sheet.getRange(row, 1, 1, numColumns).getValues()[0];

    var fullName = colMap.name !== -1 ? String(rowValues[colMap.name] || '').trim() : '';
    var phone = colMap.phone !== -1 ? String(rowValues[colMap.phone] || '').trim() : '';
    var email = colMap.email !== -1 ? String(rowValues[colMap.email] || '').trim() : '';
    var city = colMap.city !== -1 ? String(rowValues[colMap.city] || '').trim() : '';
    var status = colMap.status !== -1 ? String(rowValues[colMap.status] || '').trim() : '';

    // If both name and phone are empty, ignore
    if (!fullName && !phone && !email) return;

    // Send to CRM
    var success = sendLeadToCRM({
      campaign: sheetName,
      full_name: fullName,
      phone_number: phone,
      email: email,
      city: city,
      rowNumber: row
    });

    // Mark as SYNCED_TO_CRM if status column exists
    if (success && colMap.status !== -1 && status !== 'SYNCED_TO_CRM') {
      sheet.getRange(row, colMap.status + 1).setValue('SYNCED_TO_CRM');
    }
  } catch (err) {
    Logger.log('onEdit error: ' + err.toString());
  }
}

/**
 * Send a single lead to CRM API
 */
function sendLeadToCRM(lead) {
  try {
    var payload = {
      campaign: lead.campaign,
      source: 'google_sheets_apps_script',
      full_name: lead.full_name || '',
      email: lead.email || '',
      phone_number: lead.phone_number || '',
      city: lead.city || '',
      name: lead.full_name || '',
      phone: lead.phone_number || '',
      location: lead.city || '',
      rawData: {
        full_name: lead.full_name || '',
        email: lead.email || '',
        phone_number: lead.phone_number || '',
        city: lead.city || ''
      }
    };

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(CRM_API_URL, options);
    var code = response.getResponseCode();
    Logger.log('CRM Response [' + code + ']: ' + response.getContentText());
    return (code >= 200 && code < 300);
  } catch (e) {
    Logger.log('sendLeadToCRM error: ' + e.toString());
    return false;
  }
}

/**
 * 3. Sync Current Tab Leads
 */
function syncCurrentSheetLeads() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No lead rows found in current tab: ' + sheetName);
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var colMap = findColumnIndexes(headers);
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var leadsToSend = [];
  var rowsToUpdate = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var fullName = colMap.name !== -1 ? String(row[colMap.name] || '').trim() : '';
    var phone = colMap.phone !== -1 ? String(row[colMap.phone] || '').trim() : '';
    var email = colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '';
    var city = colMap.city !== -1 ? String(row[colMap.city] || '').trim() : '';
    var status = colMap.status !== -1 ? String(row[colMap.status] || '').trim() : '';

    if (!fullName && !phone && !email) continue;

    leadsToSend.push({
      campaign: sheetName,
      source: 'google_sheets_apps_script',
      full_name: fullName,
      email: email,
      phone_number: phone,
      city: city,
      name: fullName,
      phone: phone,
      location: city,
      rawData: {
        full_name: fullName,
        email: email,
        phone_number: phone,
        city: city
      }
    });

    if (colMap.status !== -1) {
      rowsToUpdate.push(i + 2); // 1-based row number
    }
  }

  if (leadsToSend.length === 0) {
    SpreadsheetApp.getUi().alert('No valid leads with Name or Phone found in tab: ' + sheetName);
    return;
  }

  // Send batch to CRM API (mirrors Google Sheet and erases any deleted leads)
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      campaign: sheetName,
      isFullTabSync: true,
      leads: leadsToSend
    }),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(CRM_API_URL, options);
  var code = response.getResponseCode();

  if (code >= 200 && code < 300) {
    // Update status in sheet
    if (colMap.status !== -1) {
      for (var j = 0; j < rowsToUpdate.length; j++) {
        sheet.getRange(rowsToUpdate[j], colMap.status + 1).setValue('SYNCED_TO_CRM');
      }
    }
    SpreadsheetApp.getUi().alert('✅ Success!\n\nSynced ' + leadsToSend.length + ' leads from tab "' + sheetName + '" to CRM successfully.');
  } else {
    SpreadsheetApp.getUi().alert('❌ Error syncing leads to CRM.\nStatus: ' + code + '\n' + response.getContentText());
  }
}

/**
 * 4. Sync All Tabs Leads
 */
function syncAllTabsLeads() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var totalSynced = 0;
  var allLeads = [];
  var tabsProcessed = [];

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var sheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow <= 1) continue;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colMap = findColumnIndexes(headers);
    if (colMap.name === -1 && colMap.phone === -1) continue;

    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var fullName = colMap.name !== -1 ? String(row[colMap.name] || '').trim() : '';
      var phone = colMap.phone !== -1 ? String(row[colMap.phone] || '').trim() : '';
      var email = colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '';
      var city = colMap.city !== -1 ? String(row[colMap.city] || '').trim() : '';

      if (!fullName && !phone && !email) continue;

      allLeads.push({
        campaign: sheetName,
        source: 'google_sheets_apps_script',
        full_name: fullName,
        email: email,
        phone_number: phone,
        city: city,
        name: fullName,
        phone: phone,
        location: city,
        rawData: {
          full_name: fullName,
          email: email,
          phone_number: phone,
          city: city
        }
      });
    }

    tabsProcessed.push(sheetName);
  }

  if (allLeads.length === 0) {
    SpreadsheetApp.getUi().alert('No valid lead rows found across any tabs.');
    return;
  }

  // Send batch chunks of 100 to avoid payload size limit
  var chunkSize = 100;
  var successCount = 0;

  for (var c = 0; c < allLeads.length; c += chunkSize) {
    var chunk = allLeads.slice(c, c + chunkSize);
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(chunk),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(CRM_API_URL, options);
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      successCount += chunk.length;
    }
  }

  SpreadsheetApp.getUi().alert('✅ All Tabs Sync Complete!\n\nSuccessfully synced ' + successCount + ' leads across ' + tabsProcessed.length + ' tabs:\n' + tabsProcessed.join(', '));
}

/**
 * 5. 1-Minute Scheduled Auto-Sync Trigger
 * Automatically syncs unsynced leads in background without manual clicking.
 */
function scheduledAutoSync() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var leadsToSend = [];

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var sheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow <= 1) continue;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colMap = findColumnIndexes(headers);
    if (colMap.name === -1 && colMap.phone === -1) continue;

    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var status = colMap.status !== -1 ? String(row[colMap.status] || '').trim() : '';

      // Only sync if not already marked SYNCED_TO_CRM
      if (status === 'SYNCED_TO_CRM') continue;

      var fullName = colMap.name !== -1 ? String(row[colMap.name] || '').trim() : '';
      var phone = colMap.phone !== -1 ? String(row[colMap.phone] || '').trim() : '';
      var email = colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '';
      var city = colMap.city !== -1 ? String(row[colMap.city] || '').trim() : '';

      if (!fullName && !phone && !email) continue;

      leadsToSend.push({
        sheet: sheet,
        rowNumber: i + 2,
        statusCol: colMap.status,
        payload: {
          campaign: sheetName,
          source: 'google_sheets_apps_script',
          full_name: fullName,
          email: email,
          phone_number: phone,
          city: city,
          name: fullName,
          phone: phone,
          location: city,
          rawData: {
            full_name: fullName,
            email: email,
            phone_number: phone,
            city: city
          }
        }
      });
    }
  }

  if (leadsToSend.length === 0) return;

  for (var k = 0; k < leadsToSend.length; k++) {
    var item = leadsToSend[k];
    var success = sendLeadToCRM(item.payload);
    if (success && item.statusCol !== -1) {
      item.sheet.getRange(item.rowNumber, item.statusCol + 1).setValue('SYNCED_TO_CRM');
    }
  }
}

/**
 * Trigger Installer: Sets up 1-minute recurring auto-sync
 */
function setupAutoSyncTrigger() {
  removeAutoSyncTriggers();

  // Install 1-minute timer
  ScriptApp.newTrigger('scheduledAutoSync')
    .timeBased()
    .everyMinutes(1)
    .create();

  // Install onEdit trigger
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert('✅ Auto-Sync Activated!\n\n1. Leads will sync immediately when edited or added.\n2. A 1-minute background auto-sync check is now active.');
}

/**
 * Remove existing triggers
 */
function removeAutoSyncTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

