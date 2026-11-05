const axios = require('axios');

/**
 * Outpero AI Voice Calling Integration Service
 * Automatically dispatches new leads to Outpero so the AI voice agent can initiate instant calls.
 */

const DEFAULT_OUTPERO_URL = 'https://api.outpero.com/lead-intake/7b8iBMGIlDdrIOBdxf2Vrg';

/**
 * Format phone number to E.164 (+91XXXXXXXXXX) required by Outpero
 */
function formatPhoneForOutpero(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/[^\d+]/g, '').trim();

  // Already has +
  if (digits.startsWith('+')) return digits;

  // 10-digit standard Indian phone
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // 12-digit without plus (e.g., 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  // Fallback: prepend + if missing
  return `+${digits}`;
}

/**
 * Send a lead to Outpero for automated AI calling
 * @param {Object} leadData
 * @param {string} leadData.name - Lead's full name
 * @param {string} leadData.phone - Lead's contact phone number
 * @param {string} [leadData.course] - Course of interest (e.g., 'SAP')
 * @param {string} [leadData.campaign] - Campaign name
 */
async function dispatchLeadToOutpero({ name, phone, course, campaign }) {
  const intakeUrl = process.env.OUTPERO_LEAD_INTAKE_URL || DEFAULT_OUTPERO_URL;
  const secretKey = (process.env.OUTPERO_LEAD_SECRET || '').trim();

  if (!secretKey) {
    console.log('[Outpero Auto-Call] Skipped: OUTPERO_LEAD_SECRET not configured in .env');
    return { skipped: true, reason: 'secret_not_configured' };
  }

  const formattedPhone = formatPhoneForOutpero(phone);
  if (!formattedPhone || formattedPhone.replace(/\D/g, '').length < 10) {
    console.warn('[Outpero Auto-Call] Skipped: Invalid phone number', { phone });
    return { skipped: true, reason: 'invalid_phone' };
  }

  const payload = {
    lead_name: name || 'Valued Lead',
    phone: formattedPhone,
    course: course || campaign || 'SAP',
  };

  try {
    console.log(`[Outpero Auto-Call] Dispatching lead to Outpero: ${payload.lead_name} (${formattedPhone}) for course: ${payload.course}`);
    const response = await axios.post(intakeUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Outpero-Lead-Secret': secretKey,
      },
      timeout: 10000,
    });

    console.log('[Outpero Auto-Call] Dispatched successfully:', response.data || response.status);
    return { success: true, data: response.data };
  } catch (err) {
    console.error('[Outpero Auto-Call Error]:', err.response?.data || err.message);
    return { success: false, error: err.response?.data || err.message };
  }
}

module.exports = {
  dispatchLeadToOutpero,
  formatPhoneForOutpero,
};

