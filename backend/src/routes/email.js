const express = require('express');
const axios = require('axios');
const Lead = require('../models/Lead');
const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const { protect } = require('../middleware/auth');

const router = express.Router();

const MessageTemplate = require('../models/MessageTemplate');

const LEAVE_TEMPLATE = {
  id: 'leave_template',
  name: '1. Leave template',
  category: 'Leave Application',
  fromEmail: 'hr@aotms.com',
  subject: 'Leave Application - {{employee_name}} ({{designation}})',
  body: `Respected HR Team,

I am writing this email to formally request leave of absence.

Employee Details:
• Name: {{employee_name}}
• Designation: {{designation}}
• Email: {{email}}
• Contact: {{phone}}

Leave Details:
• Leave Type: Casual / Sick Leave
• From Date: [DD/MM/YYYY]
• To Date: [DD/MM/YYYY]
• Total Days: [1 Day]
• Reason: [Specify reason for leave]

I will ensure that all my pending tasks and responsibilities are properly handled and handed over prior to my leave. I will remain reachable on phone or email for any critical updates.

Kindly approve my leave request.

Thank you.

Sincerely,
{{employee_name}}
{{designation}}`,
};

// GET /api/email/templates — 1. Leave template + custom templates
router.get('/templates', protect, async (req, res) => {
  try {
    const custom = await MessageTemplate.find({ type: 'email' })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    const formattedCustom = custom.map(t => ({
      id: t._id.toString(),
      name: t.shortcut,
      category: 'Custom Template',
      fromEmail: 'hr@aotms.com',
      subject: t.subject || t.shortcut,
      body: t.message,
      isCustom: true,
      createdBy: t.createdBy,
    }));

    res.json({ templates: [LEAVE_TEMPLATE, ...formattedCustom] });
  } catch (err) {
    res.status(500).json({ message: err.message, templates: [LEAVE_TEMPLATE] });
  }
});

// POST /api/email/templates — Create new Email Template
router.post('/templates', protect, async (req, res) => {
  try {
    const { name, subject, body, category } = req.body;
    if (!name || !body) {
      return res.status(400).json({ message: 'Template name and body are required' });
    }

    const template = await MessageTemplate.create({
      type: 'email',
      shortcut: name.trim(),
      subject: (subject || name).trim(),
      message: body.trim(),
      isShared: true,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: {
        id: template._id.toString(),
        name: template.shortcut,
        category: category || 'Custom Template',
        fromEmail: 'hr@aotms.com',
        subject: template.subject,
        body: template.message,
        isCustom: true,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/email/templates/:id — Delete a custom template
router.delete('/templates/:id', protect, async (req, res) => {
  try {
    const template = await MessageTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    await MessageTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/email/send — Sends Email via n8n Webhook or direct Nodemailer/SMTP
router.post('/send', protect, async (req, res) => {
  try {
    const targetRecipient = (
      req.body.recipientEmail ||
      req.body.receiptEmail ||
      req.body.toEmail ||
      req.body.to ||
      req.body.recipient ||
      req.body.receiverEmail ||
      req.body.email ||
      ''
    ).trim();

    const senderEmail = (
      req.body.fromEmail ||
      req.body.from ||
      req.body.senderEmail ||
      req.body.sender ||
      req.user?.email ||
      process.env.DEFAULT_FROM_EMAIL ||
      'admin@aotms.com'
    ).trim();

    const emailSubject = (req.body.subject || req.body.title || 'Notification from AOTMS CRM').trim();
    const emailBody = (req.body.body || req.body.emailBody || req.body.message || req.body.content || '').trim();
    const templateId = req.body.templateId || 'custom';

    if (!targetRecipient || !emailSubject || !emailBody) {
      return res.status(400).json({ message: 'Recipient Email, Subject, and Message Body are required.' });
    }

    let sentVia = 'n8n Automation Webhook';
    let success = false;
    let n8nDetails = null;
    let n8nError = null;

    // 1. Dispatch via n8n webhook service if configured
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const n8nRes = await axios.post(process.env.N8N_WEBHOOK_URL, {
          event: 'email:send',
          payload: {
            fromEmail: senderEmail,
            senderEmail,
            from: senderEmail,
            recipientEmail: targetRecipient,
            receiptEmail: targetRecipient,
            toEmail: targetRecipient,
            to: targetRecipient,
            subject: emailSubject,
            emailBody: emailBody,
            body: emailBody,
            message: emailBody,
            templateId,
            sentBy: req.user?.name || req.user?.email || 'Staff',
            timestamp: new Date().toISOString()
          }
        }, { timeout: 35000 });

        const d = n8nRes.data;
        // Detect if n8n returned an error inside a 200 payload
        if (d && (d.errorMessage || d.error || d.status === 'error' || d.success === false)) {
          const errMsg = d.errorMessage || (typeof d.error === 'string' ? d.error : JSON.stringify(d.error)) || d.message || 'n8n workflow error';
          const nodeName = d.n8nDetails?.nodeName || '';
          n8nError = {
            message: nodeName ? `${errMsg} (in node: "${nodeName}")` : errMsg,
            status: 500,
            nodeName,
            raw: d
          };
        } else {
          success = true;
          sentVia = 'n8n Automation Webhook';
          n8nDetails = d || null;
        }
      } catch (err) {
        console.error('[Email Webhook Error]:', err.response?.data || err.message);
        const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message);
        if (isTimeout) {
          console.log('[Email Webhook]: Request sent to n8n; processing asynchronously in background.');
          success = true;
          sentVia = 'n8n Automation Webhook (Background Dispatched)';
          n8nDetails = { status: 'queued', message: 'Dispatched to n8n webhook; processing in background' };
          n8nError = null;
        } else {
          const rData = err.response?.data;
          let extractedMsg = '';
          let nodeName = '';

          if (rData && typeof rData === 'object') {
            if (rData.errorMessage) extractedMsg = rData.errorMessage;
            else if (rData.message) extractedMsg = rData.message;
            else if (rData.error) extractedMsg = typeof rData.error === 'string' ? rData.error : JSON.stringify(rData.error);
            if (rData.hint) {
              extractedMsg = `${extractedMsg} (${rData.hint})`;
            }
            else if (rData.errorDetails?.rawErrorMessage) {
              extractedMsg = Array.isArray(rData.errorDetails.rawErrorMessage)
                ? rData.errorDetails.rawErrorMessage.join('; ')
                : String(rData.errorDetails.rawErrorMessage);
            }
            if (rData.n8nDetails?.nodeName) {
              nodeName = rData.n8nDetails.nodeName;
            }
          }

          if (!extractedMsg) {
            extractedMsg = err.message || 'Webhook communication failure';
          }

          const fullMsg = nodeName ? `${extractedMsg} (at node: "${nodeName}")` : extractedMsg;

          n8nError = {
            message: fullMsg,
            status: err.response?.status || 500,
            nodeName,
            raw: rData || err.message
          };
        }
      }
    }

    // 2. Fallback to direct SMTP if configured
    if (!success && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"${req.user?.name || 'AOTMS HR'}" <${senderEmail}>`,
          to: targetRecipient,
          replyTo: senderEmail,
          subject: emailSubject,
          text: emailBody,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; padding: 20px; background: #fafafa; border-radius: 8px;">
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
              ${emailBody.replace(/\n/g, '<br/>')}
            </div>
            <div style="margin-top: 16px; font-size: 12px; color: #6b7280; text-align: center;">
              Sent via AOTMS Platform · ${senderEmail}
            </div>
          </div>`,
        });
        sentVia = 'SMTP Mailer';
        success = true;
        n8nError = null; // Clear error since fallback succeeded
      } catch (smtpErr) {
        console.warn('[SMTP Fallback Warning]:', smtpErr.message);
      }
    }

    // Determine final status
    const isLeave = templateId === 'leave_template' || /leave|absence|permission/i.test(emailSubject);
    const finalStatus = success ? 'Delivered' : (n8nError ? 'Failed' : 'Sent');
    const finalErrorMsg = n8nError ? n8nError.message : '';

    // Save Email Log in database for audit trail & Managing Director tracking
    let savedLog = null;
    try {
      savedLog = await EmailLog.create({
        sender: req.user?._id,
        senderName: req.user?.name || 'Staff',
        senderEmail: req.user?.email || senderEmail,
        senderDesignation: req.user?.designation || 'Staff',
        fromEmail: senderEmail,
        recipientEmail: targetRecipient,
        subject: emailSubject,
        body: emailBody,
        templateId,
        sentVia: success ? sentVia : 'n8n Automation Webhook (Failed)',
        status: finalStatus,
        errorMessage: finalErrorMsg,
        isLeaveRequest: isLeave,
        trackedByMD: true,
        direction: 'outbound',
        isRead: true,
        n8nDetails: n8nDetails || (n8nError ? n8nError.raw : null)
      });
    } catch (logErr) {
      console.warn('[EmailLog Save Warning]:', logErr.message);
    }

    // IF n8n reported an error and no SMTP fallback succeeded -> RETURN PROPER ERROR TO FRONTEND
    if (!success && n8nError) {
      return res.status(502).json({
        success: false,
        errorType: 'N8N_WEBHOOK_ERROR',
        message: `n8n Webhook Error: ${n8nError.message}`,
        error: n8nError.message,
        nodeName: n8nError.nodeName,
        details: n8nError.raw,
        log: savedLog
      });
    }

    res.json({
      success: true,
      message: `Email sent successfully to ${targetRecipient}`,
      log: savedLog,
      details: {
        fromEmail: senderEmail,
        recipientEmail: targetRecipient,
        receiptEmail: targetRecipient,
        toEmail: targetRecipient,
        subject: emailSubject,
        sentVia,
        n8nDetails,
        timestamp: new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/email/reply — Send reply in a thread from EmailCRM reading pane
router.post('/reply', protect, async (req, res) => {
  try {
    const { emailId, body, toEmail, subject } = req.body;
    if (!emailId || !body || !body.trim()) {
      return res.status(400).json({ message: 'Parent Email ID and reply body are required.' });
    }

    const parentLog = await EmailLog.findById(emailId);
    if (!parentLog) {
      return res.status(404).json({ message: 'Original email thread not found.' });
    }

    const replyRecipient = (toEmail || (parentLog.direction === 'inbound' ? parentLog.fromEmail : parentLog.recipientEmail) || '').trim();
    const replySubject = subject || (parentLog.subject.startsWith('Re:') ? parentLog.subject : `Re: ${parentLog.subject}`);
    const senderEmail = (
      req.body.fromEmail ||
      (parentLog.direction === 'inbound' ? (parentLog.recipientEmail || parentLog.toEmail) : parentLog.fromEmail) ||
      req.user?.email ||
      process.env.DEFAULT_FROM_EMAIL ||
      'hr@aotms.com'
    ).trim();
    const replyBody = body.trim();

    let success = false;
    let sentVia = 'n8n Automation Webhook';
    let n8nDetails = null;

    // 1. Try n8n webhook
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const gmailMessageId = parentLog.n8nDetails?.id || parentLog.n8nDetails?.messageId || '';
        const gmailThreadId = parentLog.n8nDetails?.threadId || '';
        console.log(`[EMAIL REPLY] Dispatching email:reply to ${process.env.N8N_WEBHOOK_URL} for ${replyRecipient} (Gmail MessageId: ${gmailMessageId || 'N/A'})`);

        const n8nRes = await axios.post(process.env.N8N_WEBHOOK_URL, {
          event: 'email:reply',
          payload: {
            parentEmailId: parentLog._id,
            messageId: gmailMessageId,
            id: gmailMessageId,
            threadId: gmailThreadId,
            fromEmail: senderEmail,
            senderEmail,
            from: senderEmail,
            recipientEmail: replyRecipient,
            receiptEmail: replyRecipient,
            toEmail: replyRecipient,
            to: replyRecipient,
            subject: replySubject,
            emailBody: replyBody,
            body: replyBody,
            message: replyBody,
            isReply: true,
            sentBy: req.user?.name || req.user?.email || 'Staff',
            timestamp: new Date().toISOString()
          }
        }, { timeout: 35000 });

        const d = n8nRes.data;
        if (d && (d.errorMessage || d.error || d.status === 'error' || d.success === false)) {
          const errMsg = d.errorMessage || (typeof d.error === 'string' ? d.error : JSON.stringify(d.error)) || d.message || 'n8n workflow error';
          console.warn('[Email Reply n8n Warning]:', errMsg);
          n8nDetails = d;
        } else {
          success = true;
          sentVia = 'n8n Automation Webhook';
          n8nDetails = d || null;
        }
      } catch (err) {
        console.error('[Email Reply Webhook Error]:', err.response?.data || err.message);
        const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message);
        if (isTimeout) {
          console.log('[Email Reply Webhook]: Request sent to n8n; processing reply in background.');
          success = true;
          sentVia = 'n8n Automation Webhook (Background Dispatched)';
          n8nDetails = { status: 'queued', message: 'Dispatched to n8n webhook; processing in background' };
        }
      }
    }

    // 2. SMTP fallback
    if (!success && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"${req.user?.name || 'AOTMS HR'}" <${senderEmail}>`,
          to: replyRecipient,
          replyTo: senderEmail,
          subject: replySubject,
          text: replyBody,
        });
        sentVia = 'SMTP Mailer';
        success = true;
      } catch (smtpErr) {
        console.warn('[Reply SMTP Warning]:', smtpErr.message);
      }
    }

    const replyEntry = {
      senderEmail,
      senderName: req.user?.name || 'Staff',
      recipientEmail: replyRecipient,
      subject: replySubject,
      body: replyBody,
      direction: 'outbound',
      receivedAt: new Date(),
      source: 'email_crm_reply',
      n8nDetails
    };

    parentLog.replies.push(replyEntry);
    await parentLog.save();

    res.json({
      success: true,
      message: `Reply sent successfully to ${replyRecipient}`,
      reply: replyEntry,
      updatedLog: parentLog
    });
  } catch (err) {
    console.error('[Email Reply Error]:', err);
    res.status(500).json({ message: 'Failed to send reply: ' + err.message });
  }
});

// Helper to safely extract clean email address from string, object, or array
function extractEmailAddress(raw) {
  if (!raw) return '';
  if (typeof raw === 'string') {
    const match = raw.match(/<([^>]+)>/) || raw.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return match ? match[1] || match[0] : raw.trim();
  }
  if (Array.isArray(raw)) {
    return extractEmailAddress(raw[0]);
  }
  if (typeof raw === 'object') {
    return (
      raw.address ||
      raw.text ||
      raw.value?.[0]?.address ||
      extractEmailAddress(raw.value) ||
      extractEmailAddress(raw.text) ||
      ''
    );
  }
  return String(raw).trim();
}

// Helper to safely extract sender display name
function extractSenderName(raw) {
  if (!raw) return '';
  if (typeof raw === 'string') {
    const match = raw.match(/^"?([^"<]+)"?\s*</);
    if (match) return match[1].trim();
    if (raw.includes('@')) return raw.split('@')[0];
    return raw.trim();
  }
  if (typeof raw === 'object') {
    return raw.name || raw.value?.[0]?.name || extractSenderName(raw.text) || '';
  }
  return '';
}

// Helper to strip previous quoted message history (e.g., 'On [date] ... wrote:') from email replies
function stripQuotedEmailHistory(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let text = rawText.trim();

  // If text starts with 'On [date] ... wrote:' (bottom-posting or nested forwarded reply), strip leading header
  text = text.replace(/^\s*On\s+.+?(?:wrote|wrote:|said):\s*[\r\n]+/i, '').trim();

  // Common email client reply delimiters
  const quoteDelimiters = [
    // Standard 'On Wed, Sep 23, 2026 at 10:43 AM ... wrote:'
    /\r?\n\s*On\s+.+?(?:wrote|wrote:|said):\s*[\r\n]/i,
    // Outlook style '-----Original Message-----'
    /\r?\n\s*-+\s*Original Message\s*-+/i,
    // Outlook 'From: ... Sent: ... To: ... Subject: ...'
    /\r?\n\s*From:\s+.+?\r?\n\s*(?:Sent|Date):\s+/i,
    // Horizontal divider lines
    /\r?\n\s*_{10,}\s*[\r\n]/,
    /\r?\n\s*-{10,}\s*[\r\n]/,
    // Signature dashes '-- '
    /\r?\n\s*--\s*[\r\n]/
  ];

  for (const delimiter of quoteDelimiters) {
    const matchIndex = text.search(delimiter);
    if (matchIndex !== -1) {
      text = text.substring(0, matchIndex);
    }
  }

  // Also remove lines starting with '>' (traditional RFC quotation marks)
  text = text
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('>'))
    .join('\n')
    .trim();

  return text || rawText.trim();
}

// Core Inbound Email Handler for GoDaddy IMAP & n8n webhooks
async function handleInboundEmail(req, res) {
  try {
    let data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (_) {}
    }
    if (data?.payload && typeof data.payload === 'object') data = data.payload;
    if (data?.body && typeof data.body === 'object') data = data.body;

    const from = extractEmailAddress(data.fromEmail || data.from || data.senderEmail || data.sender) || 'customer@external.com';
    const to = extractEmailAddress(data.toEmail || data.to || data.recipientEmail || data.recipient || data.mailbox) || '';
    const rawSubject = (data.subject || data.title || 'No Subject').trim();
    const rawBody = (data.body || data.textPlain || data.text || data.html || data.message || data.content || '(No message body recorded)').trim();
    const bodyContent = stripQuotedEmailHistory(rawBody);
    const senderName = (data.senderName || data.name || extractSenderName(data.from) || from.split('@')[0] || 'Customer').trim();
    const messageId = (data.messageId || data.headers?.['message-id'] || '').trim();
    const inReplyTo = (data.inReplyTo || data.headers?.['in-reply-to'] || '').trim();
    const references = (data.references || data.headers?.references || '').trim();
    const parentEmailId = data.parentEmailId || data.threadId || null;

    console.log(`[INCOMING GODADDY EMAIL] From: "${from}", To: "${to}", Subject: "${rawSubject}", MessageId: "${messageId}"`);

    // Clean subject to match original thread (e.g. "Re: Leave Application" -> "Leave Application")
    const normalizedSubject = rawSubject.replace(/^(re|fwd|fw|aw|antw):\s*/i, '').trim();

    let parentLog = null;

    // 1. Match by parentEmailId if explicitly provided
    if (parentEmailId) {
      try {
        parentLog = await EmailLog.findById(parentEmailId);
      } catch (_) {}
    }

    // 2. Match by inReplyTo / references (RFC 2822 exact email threading)
    if (!parentLog && inReplyTo) {
      parentLog = await EmailLog.findOne({
        $or: [
          { messageId: inReplyTo },
          { 'replies.messageId': inReplyTo }
        ]
      });
    }

    if (!parentLog && references) {
      parentLog = await EmailLog.findOne({
        $or: [
          { messageId: references },
          { 'replies.messageId': references }
        ]
      });
    }

    // 3. Fallback: match by normalized subject and participant email
    if (!parentLog && normalizedSubject) {
      parentLog = await EmailLog.findOne({
        $or: [
          { subject: new RegExp(`^${normalizedSubject.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
          { subject: new RegExp(normalizedSubject.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), recipientEmail: new RegExp(from, 'i') },
          { subject: new RegExp(normalizedSubject.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), fromEmail: new RegExp(to, 'i') }
        ]
      }).sort({ createdAt: -1 });
    }

    const replySubDoc = {
      senderEmail: from,
      senderName,
      recipientEmail: to,
      subject: rawSubject,
      body: bodyContent,
      direction: 'inbound',
      messageId,
      inReplyTo,
      references,
      receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
      source: 'godaddy_imap_n8n',
      n8nDetails: data
    };

    if (parentLog) {
      parentLog.replies.push(replySubDoc);
      parentLog.isRead = false; // Mark unread notification in CRM
      parentLog.status = 'Received';
      await parentLog.save();

      return res.json({
        success: true,
        message: 'Incoming reply matched and threaded into conversation',
        parentThreadId: parentLog._id,
        reply: replySubDoc
      });
    }

    // ONLY create a standalone Inbound EmailLog if this is a brand new, unthreaded cold email
    const newInboundLog = await EmailLog.create({
      senderName,
      senderEmail: from,
      senderDesignation: 'Customer / External',
      fromEmail: from,
      recipientEmail: to,
      subject: rawSubject,
      body: bodyContent,
      templateId: 'inbound_godaddy',
      sentVia: 'GoDaddy IMAP via n8n',
      status: 'Received',
      direction: 'inbound',
      isReply: false,
      parentEmail: null,
      messageId,
      inReplyTo,
      references,
      isRead: false,
      n8nDetails: data
    });

    res.json({
      success: true,
      message: 'New incoming email recorded in CRM inbox',
      logId: newInboundLog._id
    });
  } catch (err) {
    console.error('[INCOMING EMAIL WEBHOOK ERROR]:', err);
    res.status(500).json({ message: 'Error processing incoming email: ' + err.message });
  }
}

// POST /api/email/incoming — Endpoint called by n8n "Save Incoming Email to CRM" node
router.post('/incoming', handleInboundEmail);

// POST /api/email/inbound-reply — Backward-compatible endpoint for inbound replies
router.post('/inbound-reply', handleInboundEmail);

// POST /api/email/mark-read — Endpoint called by n8n "Mark Email Read - CRM" node
router.post('/mark-read', async (req, res) => {
  try {
    const data = req.body.payload || req.body;
    const targetId = data.emailId || data.id;
    const msgId = data.messageId;
    let log = null;

    if (targetId) {
      log = await EmailLog.findByIdAndUpdate(targetId, { isRead: true }, { new: true });
    } else if (msgId) {
      log = await EmailLog.findOneAndUpdate({ messageId: msgId }, { isRead: true }, { new: true });
    }

    res.json({ success: true, message: 'Email marked as read in CRM', log });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/email/logs/:id/read — Mark email thread as read
router.patch('/logs/:id/read', protect, async (req, res) => {
  try {
    const log = await EmailLog.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });

    // Also notify n8n to mark as read in Gmail if messageId exists
    if (process.env.N8N_WEBHOOK_URL && log) {
      const msgId = log.n8nDetails?.id || log.n8nDetails?.messageId;
      if (msgId) {
        axios.post(process.env.N8N_WEBHOOK_URL, {
          event: 'email:markRead',
          payload: {
            id: log._id,
            messageId: msgId,
            threadId: log.n8nDetails?.threadId || '',
            timestamp: new Date().toISOString()
          }
        }, { timeout: 8000 }).catch(err => {
          console.warn('[MarkRead n8n Webhook Notice]:', err.message);
        });
      }
    }

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/email/logs — Fetch email history. MD/Executive tracks all staff; staff sees own logs + incoming replies
router.get('/logs', protect, async (req, res) => {
  try {
    const userDesig = String(req.user?.designation || '').trim().toUpperCase();
    const isMD = userDesig === 'MANAGING DIRECTOR' || userDesig === 'MD' || userDesig === 'CEO' || req.user?.role === 'admin' || req.user?.name?.toLowerCase().trim() === 'ameen';

    const filter = {};
    if (!isMD) {
      filter.$or = [
        { sender: req.user._id },
        { recipientEmail: new RegExp(`^${req.user.email}$`, 'i') },
        { fromEmail: new RegExp(`^${req.user.email}$`, 'i') }
      ];
    } else if (req.query.employeeId && req.query.employeeId !== 'all') {
      filter.sender = req.query.employeeId;
    }

    if (req.query.search) {
      const s = req.query.search.trim();
      const searchRegex = new RegExp(s, 'i');
      const searchCond = [
        { recipientEmail: searchRegex },
        { fromEmail: searchRegex },
        { subject: searchRegex },
        { senderName: searchRegex },
        { 'replies.body': searchRegex },
        { 'replies.senderName': searchRegex }
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchCond }];
        delete filter.$or;
      } else {
        filter.$or = searchCond;
      }
    }

    const logs = await EmailLog.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(200);

    const totalSent = logs.filter(l => l.direction === 'outbound').length;
    const totalInbox = logs.filter(l => l.direction === 'inbound' || (l.replies && l.replies.length > 0)).length;
    const unreadCount = logs.filter(l => l.isRead === false).length;

    // Compute stats for Managing Director
    let stats = null;
    if (isMD) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const totalCount = await EmailLog.countDocuments();
      const todayCount = await EmailLog.countDocuments({ createdAt: { $gte: todayStart } });
      const leaveCount = await EmailLog.countDocuments({ isLeaveRequest: true });
      const uniqueSenders = await EmailLog.distinct('sender');

      stats = {
        totalSent: totalCount,
        todaySent: todayCount,
        leaveRequests: leaveCount,
        activeSenders: uniqueSenders.length,
        totalInbox,
        unreadCount
      };
    }

    res.json({
      success: true,
      isManagingDirector: isMD,
      stats,
      unreadCount,
      totalInbox,
      totalSent,
      logs
    });
  } catch (err) {
    res.status(500).json({ message: err.message, logs: [] });
  }
});

// GET /api/email/tracking-users — List users for Managing Director filter dropdown
router.get('/tracking-users', protect, async (req, res) => {
  try {
    const userDesig = String(req.user?.designation || '').trim().toUpperCase();
    const isMD = userDesig === 'MANAGING DIRECTOR' || userDesig === 'MD' || userDesig === 'CEO' || req.user?.role === 'admin' || req.user?.name?.toLowerCase().trim() === 'ameen';

    if (!isMD) {
      return res.json({
        users: [{
          _id: req.user._id,
          name: req.user.name,
          designation: req.user.designation,
          email: req.user.email
        }]
      });
    }

    const users = await User.find({ isActive: { $ne: false } }, 'name email designation role employeeId')
      .sort({ name: 1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message, users: [] });
  }
});

module.exports = router;
