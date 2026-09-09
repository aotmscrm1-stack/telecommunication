const axios = require('axios');
const Lead = require('../../models/Lead');
const Integration = require('../../models/Integration');
const MessageTemplate = require('../../models/MessageTemplate');

// ── Webhook verification (Meta hub.challenge handshake) ────────────────────────
function verifyWebhookToken(mode, token, challenge, verifyToken) {
  const cleanToken = token ? String(token).trim() : '';
  const cleanVerifyToken = verifyToken ? String(verifyToken).trim() : '';
  if (mode === 'subscribe' && cleanToken && cleanVerifyToken && cleanToken === cleanVerifyToken) {
    return { valid: true, challenge };
  }
  return { valid: false, challenge: null };
}

// ── Upload media to Meta Resumable Upload API to get header_handle ───────────────
async function uploadMediaToMeta(fileBuffer, mimeType, accessToken) {
  const token = accessToken || process.env.META_WA_ACCESS_TOKEN;
  const appId = process.env.META_APP_ID || '1207473174896357';

  const sessionRes = await axios.post(`${WA_API}/${appId}/uploads`, null, {
    params: {
      file_length: fileBuffer.length,
      file_type: mimeType || 'image/png',
      access_token: token
    }
  });

  const uploadSessionId = sessionRes.data?.id;
  if (!uploadSessionId) throw new Error('Could not create Meta upload session');

  const uploadRes = await axios.post(`${WA_API}/${uploadSessionId}`, fileBuffer, {
    headers: {
      'Authorization': `OAuth ${token}`,
      'file_offset': 0,
      'Content-Type': mimeType || 'image/png'
    }
  });

  return uploadRes.data?.h; // header_handle
}

// ── Send a plain text message ───────────────────────────────────────────────────
async function sendTextMessage(phoneNumberId, accessToken, to, message) {
  const pId = phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
  const token = accessToken || process.env.META_WA_ACCESS_TOKEN;
  const res = await axios.post(
    `${WA_API}/${pId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// ── Send a pre-approved template message ────────────────────────────────────────
async function sendTemplateMessage(phoneNumberId, accessToken, to, templateName, languageCode, components) {
  const pId = phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
  const token = accessToken || process.env.META_WA_ACCESS_TOKEN;

  const templatePayload = {
    name: templateName,
    language: { code: languageCode || 'en_US' },
  };

  if (Array.isArray(components) && components.length > 0) {
    const validComponents = components.filter(c => c && c.type && Array.isArray(c.parameters) && c.parameters.length > 0);
    if (validComponents.length > 0) {
      templatePayload.components = validComponents;
    }
  }

  const res = await axios.post(
    `${WA_API}/${pId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: templatePayload,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// ── Send an interactive List message ────────────────────────────────────────────
async function sendListMessage(phoneNumberId, accessToken, to, list) {
  const pId = phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
  const token = accessToken || process.env.META_WA_ACCESS_TOKEN;
  const interactive = {
    type: 'list',
    body: { text: list.body },
    action: {
      button: list.buttonLabel,
      sections: (list.sections || []).map((s, idx) => ({
        title: s.title || undefined,
        rows: (s.rows || []).map((r, ridx) => ({
          id: r.id || `${idx}-${ridx}`,
          title: r.title,
          description: r.description || undefined,
        })),
      })),
    },
  };
  if (list.header) interactive.header = { type: 'text', text: list.header };
  if (list.footer) interactive.footer = { text: list.footer };

  const res = await axios.post(
    `${WA_API}/${pId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

function getEffectiveWabaId(providedWabaId) {
  const phoneId = process.env.META_WA_PHONE_NUMBER_ID;
  const envWabaId = process.env.META_WA_WABA_ID;
  if (!providedWabaId || providedWabaId === phoneId) {
    return envWabaId || providedWabaId || phoneId;
  }
  return providedWabaId;
}

// ── List approved message templates for a WABA ─────────────────────────────────
async function getTemplates(wabaId, accessToken) {
  const token = accessToken || process.env.META_WA_ACCESS_TOKEN;
  const targetId = getEffectiveWabaId(wabaId);
  const res = await axios.get(`${WA_API}/${targetId}/message_templates`, {
    params: { access_token: token, limit: 100 },
  });
  return res.data.data || [];
}

// ── Submit a new template to Meta for approval ──────────────────────────────────
async function submitTemplate(wabaId, accessToken, { name, category, language, components }) {
  const token = accessToken || process.env.META_WA_ACCESS_TOKEN;
  const targetId = getEffectiveWabaId(wabaId);
  const res = await axios.post(
    `${WA_API}/${targetId}/message_templates`,
    { name, category, language, components },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data; // { id, status: 'PENDING', category }
}

// ── Delete a template from Meta WABA ───────────────────────────────────────────
async function deleteTemplate(wabaId, accessToken, templateName) {
  const token = accessToken || process.env.META_WA_ACCESS_TOKEN;
  const targetId = getEffectiveWabaId(wabaId);
  const res = await axios.delete(
    `${WA_API}/${targetId}/message_templates`,
    {
      params: { name: templateName, access_token: token },
    }
  );
  return res.data;
}

// ── Handle incoming WhatsApp Cloud webhook events ───────────────────────────────
// Creates a Lead for first-time senders and fires workflow/webhook events for
// every inbound message so automations (auto-reply, assignment, etc.) can react.
async function handleWhatsAppWebhookEvent(body, integration) {
  const entries = body.entry || [];
  let created = 0;
  let processed = 0;

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const messages = value.messages || [];
      const contacts = value.contacts || [];

      // ── Inbound customer messages → move the lead to "Pending" ──────────────
      for (const msg of messages) {
        const phone = msg.from;
        if (!phone) continue;

        const contact = contacts.find(c => c.wa_id === phone);
        const name = contact?.profile?.name || 'WhatsApp Lead';
        const text =
          msg.text?.body ||
          msg.button?.text ||
          msg.interactive?.button_reply?.title ||
          '[non-text message]';

        let lead = await Lead.findOne({ phone });

        if (!lead) {
          lead = await Lead.create({
            name,
            phone,
            leadSource: 'Whatsapp',
            status: 'Fresh',
            campaign: integration.defaultCampaign || undefined,
            assignedTo: integration.defaultAssignedTo || undefined,
          });

          await Integration.findByIdAndUpdate(integration._id, {
            $inc: { totalLeadsImported: 1 },
            $set: { lastLeadAt: new Date() },
          });

          created++;
        }

        lead.activities = lead.activities || [];
        lead.activities.push({
          type: 'whatsapp',
          description: text,
          direction: 'inbound',
          metaMessageId: msg.id || '',
        });
        // THIS IS THE KEY TRANSITION: any inbound reply moves the lead to
        // "Pending" so an agent knows there's an unanswered message waiting.
        lead.waStatus = 'pending';
        lead.lastWaMessageAt = new Date();
        lead.lastWaMessagePreview = text;
        await lead.save();

        processed++;
      }

      // ── Template approval/rejection status updates ──────────────────────────
      // Meta sends these on the "message_template_status_update" webhook field.
      if (value.event && value.message_template_id !== undefined) {
        try {
          await MessageTemplate.findOneAndUpdate(
            { metaTemplateId: String(value.message_template_id) },
            {
              $set: {
                waStatus: value.event, // APPROVED | REJECTED | PAUSED | DISABLED
                rejectedReason: value.reason || '',
              },
            }
          );
        } catch (e) {
          // don't let a bad template update break the rest of the webhook batch
        }
      }
    }
  }

  return { processed, created };
}

module.exports = {
  verifyWebhookToken,
  sendTextMessage,
  sendTemplateMessage,
  sendListMessage,
  getTemplates,
  submitTemplate,
  deleteTemplate,
  uploadMediaToMeta,
  handleWhatsAppWebhookEvent,
};