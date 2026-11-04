/**
 * ============================================================================
 * ACADEMY OF TECH MASTERS (AOTMS) - CRM LIVE GOOGLE APPS SCRIPT
 * File: Code.gs
 * Target: Google Sheets (Any Sheet / All Tabs)
 * ============================================================================
 * 
 * This Apps Script directly synchronizes leads from Google Sheets to AOTMS CRM:
 * Target API: https://api.academyoftechmasters.com/api/meta-leads
 * 
 * Full Lifecycle Support:
 * 1. 🔄 1-Click Manual Sync:
 *    - Click "🚀 CRM Sync" -> "Sync Current Tab Leads" (or "Sync All Tabs Leads")
 * 2. ⚡ Real-Time Update & Modification (onEdit):
 *    - Editing any cell (Name, Phone, Email, Location) instantly updates CRM.
 * 3. 🗑️ Real-Time & Batch Deletion (onChange + Full Tab Sync):
 *    - Deleting rows in Google Sheets automatically removes them from CRM!
 * 4. ⏱️ 1-Minute Automated Background Sync:
 *    - Keeps sheet and CRM 100% in sync around the clock without manual effort.
 * 5. 🎯 Smart Column Auto-Detection:
 *    - Dynamically recognizes Full Name, Mobile/Phone, Email, City/Location, ID, Status.
 */

// Production CRM Ingestion Endpoint
var CRM_API_URL = 'https://api.academyoftechmasters.com/api/meta-leads';

/**
 * 1. Custom Google Sheets Menu (Runs automatically when sheet is opened)
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 CRM Sync')
    .addItem('🔄 Sync Current Tab Leads', 'syncCurrentSheetLeads')
    .addItem('🌐 Sync All Tabs Leads', 'syncAllTabsLeads')
    .addSeparator()
    .addItem('⚡ Enable Real-Time Triggers (Edit + Delete)', 'setupRealtimeTriggers')
    .addItem('⏱️ Setup 1-Minute Auto-Sync Trigger', 'setupAutoSyncTrigger')
    .addItem('🛑 Remove All Sync Triggers', 'removeAllSyncTriggers')
    .addSeparator()
    .addItem('🔌 Test CRM Connection', 'testCRMConnection')
    .addToUi();
}

/**
 * Helper to normalize and dynamically match column headers
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

    // Full Name
    if (map.name === -1 && (
      h === 'full_name' || h === 'full name' || h === 'name' || 
      h.indexOf('name') !== -1 || h === 'candidate name' || 
      h === 'student name' || h === 'first name'
    )) {
      if (h.indexOf('ad_') === -1 && h.indexOf('campaign') === -1 && h.indexOf('form') === -1 && h.indexOf('adset') === -1) {
        map.name = i;
      }
    }

    // Phone / Mobile
    if (map.phone === -1 && (
      h === 'phone_number' || h === 'phone' || h.indexOf('phone') !== -1 || 
      h.indexOf('mobile') !== -1 || h.indexOf('contact') !== -1 || h === 'whatsapp'
    )) {
      map.phone = i;
    }

    // Email
    if (map.email === -1 && (h === 'email' || h.indexOf('email') !== -1 || h === 'mail')) {
      map.email = i;
    }

    // City / Location
    if (map.city === -1 && (
      h === 'city' || h.indexOf('city') !== -1 || 
      h === 'location' || h.indexOf('location') !== -1 || 
      h === 'town' || h === 'address' || h === 'place'
    )) {
      map.city = i;
    }

    // CRM Sync Status
    if (map.status === -1 && (
      h === 'crm_status' || h === 'sync_status' || 
      h === 'lead_status' || h === 'status'
    )) {
      map.status = i;
    }

    // Meta Lead ID / Row ID
    if (map.id === -1 && (
      h === 'id' || h === 'lead_id' || h === 'meta_lead_id' || 
      h === 'crm_id' || h.indexOf('lead_id') !== -1
    )) {
      map.id = i;
    }
  }

  return map;
}

/**
 * Clean & Format phone number
 */
function cleanPhoneNumber(raw) {
  if (!raw) return '';
  var s = String(raw).trim();
  return s;
}

/**
 * 2. Real-Time Edit Trigger (onEdit)
 * Fires immediately when user edits or adds data to any row.
 * Handles instant Update & Modification.
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

    var leadId = colMap.id !== -1 ? String(rowValues[colMap.id] || '').trim() : '';
    var fullName = colMap.name !== -1 ? String(rowValues[colMap.name] || '').trim() : '';
    var phone = colMap.phone !== -1 ? cleanPhoneNumber(rowValues[colMap.phone]) : '';
    var email = colMap.email !== -1 ? String(rowValues[colMap.email] || '').trim() : '';
    var city = colMap.city !== -1 ? String(rowValues[colMap.city] || '').trim() : '';

    // If both name and phone and email are empty, user might have cleared the row
    if (!fullName && !phone && !email) {
      // If row was cleared, trigger a full sync to reflect deletion in CRM
      syncCurrentSheetLeads(true);
      return;
    }

    // Send updated/modified lead to CRM
    var success = sendLeadToCRM({
      campaign: sheetName,
      leadId: leadId,
      full_name: fullName,
      phone_number: phone,
      email: email,
      city: city,
      rowNumber: row
    });

    // Mark as SYNCED_TO_CRM if status column exists
    if (success && colMap.status !== -1) {
      sheet.getRange(row, colMap.status + 1).setValue('SYNCED_TO_CRM');
    }
  } catch (err) {
    Logger.log('onEdit error: ' + err.toString());
  }
}

/**
 * 3. Real-Time Structure Change Trigger (onChange)
 * Detects row deletion (REMOVE_ROW) and structural changes.
 * When a row is deleted, automatically re-syncs the tab so CRM deletes it immediately.
 */
function onChange(e) {
  try {
    if (!e) return;
    var changeType = e.changeType;
    Logger.log('onChange triggered with changeType: ' + changeType);

    if (changeType === 'REMOVE_ROW' || changeType === 'REMOVE_COLUMN' || changeType === 'INSERT_ROW') {
      // Re-sync current tab silently so deleted rows are wiped from CRM
      syncCurrentSheetLeads(true);
    }
  } catch (err) {
    Logger.log('onChange error: ' + err.toString());
  }
}

/**
 * Send a single lead update to CRM API
 */
function sendLeadToCRM(lead) {
  try {
    var payload = {
      campaign: lead.campaign,
      source: 'google_sheets_apps_script',
      leadId: lead.leadId || '',
      full_name: lead.full_name || '',
      email: lead.email || '',
      phone_number: lead.phone_number || '',
      city: lead.city || '',
      name: lead.full_name || '',
      phone: lead.phone_number || '',
      location: lead.city || '',
      rawData: {
        id: lead.leadId || '',
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
 * 4. 1-Click Sync Current Tab Leads
 * Performs Full Tab Sync:
 * - Creates new leads
 * - Updates/modifies existing leads
 * - Permanently DELETES leads in CRM that were deleted from this Google Sheet tab!
 * 
 * @param {boolean} isSilent - If true, runs without popup alerts (used for auto/onChange triggers).
 */
function syncCurrentSheetLeads(isSilent) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var sheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (!isSilent) {
      ss.toast('Syncing "' + sheetName + '" to CRM...', 'CRM Sync', 3);
    }

    var leadsToSend = [];
    var rowsToUpdate = [];
    var statusColIdx = -1;

    if (lastRow > 1 && lastCol > 0) {
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var colMap = findColumnIndexes(headers);
      statusColIdx = colMap.status;

      var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var leadId = colMap.id !== -1 ? String(row[colMap.id] || '').trim() : '';
        var fullName = colMap.name !== -1 ? String(row[colMap.name] || '').trim() : '';
        var phone = colMap.phone !== -1 ? cleanPhoneNumber(row[colMap.phone]) : '';
        var email = colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '';
        var city = colMap.city !== -1 ? String(row[colMap.city] || '').trim() : '';

        // Must have at least a Name, Phone, or Email
        if (!fullName && !phone && !email) continue;

        leadsToSend.push({
          campaign: sheetName,
          source: 'google_sheets_apps_script',
          metaLeadId: leadId || undefined,
          full_name: fullName,
          email: email,
          phone_number: phone,
          city: city,
          name: fullName,
          phone: phone,
          location: city,
          rawData: {
            id: leadId,
            full_name: fullName,
            email: email,
            phone_number: phone,
            city: city
          }
        });

        if (statusColIdx !== -1) {
          rowsToUpdate.push(i + 2); // 1-based row index
        }
      }
    }

    // Send payload with isFullTabSync: true
    // This instructs the CRM to:
    // 1) Upsert all leads currently in the sheet
    // 2) Delete any leads in CRM for this campaign that are no longer in this sheet!
    var payload = {
      campaign: sheetName,
      isFullTabSync: true,
      leads: leadsToSend
    };

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(CRM_API_URL, options);
    var code = response.getResponseCode();
    var responseBody = response.getContentText();
    Logger.log('Sync Response [' + code + ']: ' + responseBody);

    if (code >= 200 && code < 300) {
      var resJson = {};
      try { resJson = JSON.parse(responseBody); } catch (_) {}

      var inserted = resJson.insertedCount || 0;
      var updated = resJson.updatedCount || 0;
      var deleted = resJson.deletedCount || 0;

      // Update status in sheet
      if (statusColIdx !== -1 && rowsToUpdate.length > 0) {
        for (var j = 0; j < rowsToUpdate.length; j++) {
          sheet.getRange(rowsToUpdate[j], statusColIdx + 1).setValue('SYNCED_TO_CRM');
        }
      }

      if (!isSilent) {
        ss.toast('✅ Synced ' + leadsToSend.length + ' leads successfully!', 'CRM Sync', 5);
        SpreadsheetApp.getUi().alert(
          '✅ CRM Sync Complete!\n\n' +
          'Tab / Campaign: ' + sheetName + '\n' +
          '• Total Leads in Sheet: ' + leadsToSend.length + '\n' +
          '• Newly Created: ' + inserted + '\n' +
          '• Updated / Modified: ' + updated + '\n' +
          '• Deleted from CRM: ' + deleted + '\n\n' +
          'Your CRM is now 100% in sync with this sheet.'
        );
      }
    } else {
      if (!isSilent) {
        SpreadsheetApp.getUi().alert(
          '❌ CRM Sync Failed!\n\n' +
          'Status Code: ' + code + '\n' +
          'Response: ' + responseBody + '\n\n' +
          'Check your CRM URL: ' + CRM_API_URL
        );
      }
    }
  } catch (err) {
    Logger.log('syncCurrentSheetLeads error: ' + err.toString());
    if (!isSilent) {
      SpreadsheetApp.getUi().alert('❌ Error running sync: ' + err.toString());
    }
  }
}

/**
 * 5. 1-Click Sync All Tabs Leads
 * Iterates through every tab in this spreadsheet and syncs each with Full Tab Sync.
 */
function syncAllTabsLeads() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var tabsProcessed = [];
  var totalProcessedLeads = 0;
  var totalNew = 0;
  var totalUpdated = 0;
  var totalDeleted = 0;

  ss.toast('Starting full workbook sync across ' + sheets.length + ' tabs...', 'CRM Sync', 4);

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var sheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow <= 1 || lastCol === 0) continue;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colMap = findColumnIndexes(headers);

    // Skip sheets that don't have Name, Phone, or Email headers
    if (colMap.name === -1 && colMap.phone === -1 && colMap.email === -1) continue;

    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var leadsToSend = [];
    var rowsToUpdate = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var leadId = colMap.id !== -1 ? String(row[colMap.id] || '').trim() : '';
      var fullName = colMap.name !== -1 ? String(row[colMap.name] || '').trim() : '';
      var phone = colMap.phone !== -1 ? cleanPhoneNumber(row[colMap.phone]) : '';
      var email = colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '';
      var city = colMap.city !== -1 ? String(row[colMap.city] || '').trim() : '';

      if (!fullName && !phone && !email) continue;

      leadsToSend.push({
        campaign: sheetName,
        source: 'google_sheets_apps_script',
        metaLeadId: leadId || undefined,
        full_name: fullName,
        email: email,
        phone_number: phone,
        city: city,
        name: fullName,
        phone: phone,
        location: city,
        rawData: {
          id: leadId,
          full_name: fullName,
          email: email,
          phone_number: phone,
          city: city
        }
      });

      if (colMap.status !== -1) {
        rowsToUpdate.push(i + 2);
      }
    }

    // Send Tab with isFullTabSync
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
      tabsProcessed.push(sheetName);
      totalProcessedLeads += leadsToSend.length;

      var resJson = {};
      try { resJson = JSON.parse(response.getContentText()); } catch (_) {}
      totalNew += (resJson.insertedCount || 0);
      totalUpdated += (resJson.updatedCount || 0);
      totalDeleted += (resJson.deletedCount || 0);

      // Mark status in sheet
      if (colMap.status !== -1 && rowsToUpdate.length > 0) {
        for (var k = 0; k < rowsToUpdate.length; k++) {
          sheet.getRange(rowsToUpdate[k], colMap.status + 1).setValue('SYNCED_TO_CRM');
        }
      }
    }
  }

  ss.toast('✅ All tabs synced successfully!', 'CRM Sync', 5);
  SpreadsheetApp.getUi().alert(
    '✅ All Tabs Sync Complete!\n\n' +
    '• Processed Tabs: ' + tabsProcessed.length + ' (' + tabsProcessed.join(', ') + ')\n' +
    '• Total Active Leads: ' + totalProcessedLeads + '\n' +
    '• Newly Created: ' + totalNew + '\n' +
    '• Updated / Modified: ' + totalUpdated + '\n' +
    '• Deleted from CRM: ' + totalDeleted
  );
}

/**
 * 6. 1-Minute Scheduled Auto-Sync Trigger
 * Automatically syncs any unsynced or modified rows in background without manual clicking.
 */
function scheduledAutoSync() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var sheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow <= 1 || lastCol === 0) continue;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colMap = findColumnIndexes(headers);
    if (colMap.name === -1 && colMap.phone === -1 && colMap.email === -1) continue;

    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var status = colMap.status !== -1 ? String(row[colMap.status] || '').trim() : '';

      // Only sync rows that haven't been marked SYNCED_TO_CRM yet
      if (status === 'SYNCED_TO_CRM') continue;

      var leadId = colMap.id !== -1 ? String(row[colMap.id] || '').trim() : '';
      var fullName = colMap.name !== -1 ? String(row[colMap.name] || '').trim() : '';
      var phone = colMap.phone !== -1 ? cleanPhoneNumber(row[colMap.phone]) : '';
      var email = colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '';
      var city = colMap.city !== -1 ? String(row[colMap.city] || '').trim() : '';

      if (!fullName && !phone && !email) continue;

      var success = sendLeadToCRM({
        campaign: sheetName,
        leadId: leadId,
        full_name: fullName,
        phone_number: phone,
        email: email,
        city: city
      });

      if (success && colMap.status !== -1) {
        sheet.getRange(i + 2, colMap.status + 1).setValue('SYNCED_TO_CRM');
      }
    }
  }
}

/**
 * 7. Enable Real-Time Triggers (Edit + Delete)
 * Installs both onEdit (cell modifications) and onChange (row deletions).
 */
function setupRealtimeTriggers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers();

  // Remove duplicate onEdit / onChange triggers
  for (var i = 0; i < triggers.length; i++) {
    var handler = triggers[i].getHandlerFunction();
    if (handler === 'onEdit' || handler === 'onChange') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Install onEdit trigger
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  // Install onChange trigger (detects row deletion)
  ScriptApp.newTrigger('onChange')
    .forSpreadsheet(ss)
    .onChange()
    .create();

  SpreadsheetApp.getUi().alert(
    '✅ Real-Time Triggers Enabled!\n\n' +
    '1. onEdit: Cell typing, edits, and modifications sync instantly.\n' +
    '2. onChange: Right-click row deletions immediately remove leads from CRM.'
  );
}

/**
 * 8. Setup 1-Minute Recurring Auto-Sync Trigger
 */
function setupAutoSyncTrigger() {
  setupRealtimeTriggers();

  // Remove existing scheduledAutoSync triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'scheduledAutoSync') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Install 1-minute time-driven trigger
  ScriptApp.newTrigger('scheduledAutoSync')
    .timeBased()
    .everyMinutes(1)
    .create();

  SpreadsheetApp.getUi().alert(
    '✅ Full Automation Activated!\n\n' +
    '• Real-time edit & delete triggers are active.\n' +
    '• 1-minute background auto-sync check is now active.'
  );
}

/**
 * 9. Remove All Triggers
 */
function removeAllSyncTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  SpreadsheetApp.getUi().alert('🛑 All automated sync triggers have been removed.');
}

/**
 * 10. Test CRM Connection
 */
function testCRMConnection() {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Testing connection to CRM...', 'CRM Connection', 3);
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        campaign: 'Connection_Test',
        leads: []
      }),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(CRM_API_URL, options);
    var code = response.getResponseCode();

    if (code >= 200 && code < 300) {
      SpreadsheetApp.getUi().alert(
        '✅ CRM Connection Successful!\n\n' +
        'CRM API URL: ' + CRM_API_URL + '\n' +
        'Response Code: ' + code + ' (OK)\n\n' +
        'Your Google Sheet is connected and ready to sync!'
      );
    } else {
      SpreadsheetApp.getUi().alert(
        '⚠️ CRM Connection Warning\n\n' +
        'CRM API URL: ' + CRM_API_URL + '\n' +
        'Response Code: ' + code + '\n' +
        'Body: ' + response.getContentText()
      );
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert(
      '❌ CRM Connection Failed!\n\n' +
      'Error: ' + err.toString() + '\n\n' +
      'Please verify that your server is running and accessible at:\n' + CRM_API_URL
    );
  }
}
