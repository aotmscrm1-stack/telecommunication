const express = require('express');
const axios = require('axios');
const Lead = require('../models/Lead');
const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const { protect } = require('../middleware/auth');

const router = express.Router();

const MessageTemplate = require('../models/MessageTemplate');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

// Permission Guard: Only CTO, HR, and Managing Director (or CEO/Admin) can access Bulk Email Blast
const isBlastAllowed = (user) => {
  if (!user) return false;
  const d = String(user.designation || '').trim().toUpperCase();
  const name = String(user.name || '').trim().toLowerCase();
  if (d === 'MANAGING DIRECTOR' || d === 'MD' || d === 'CTO' || d === 'HR' || d === 'CEO') return true;
  if (name.includes('ameen') || name.includes('rabbani') || name.includes('deenaz') || name.includes('bhavani')) return true;
  if (user.role === 'admin' || user.role === 'manager') return true;
  return false;
};

const DEFAULT_BUSINESS_TEMPLATE = {
  id: 'business_notification',
  name: '1. Professional Communication',
  category: 'General Communication',
  fromEmail: 'hr@aotms.com',
  subject: 'Official Notification - {{employee_name}} ({{designation}})',
  body: `Dear Team / Client,

I hope this email finds you well.

I am writing to share an important update regarding our operations.

Employee Details:
• Name: {{employee_name}}
• Designation: {{designation}}
• Email: {{email}}
• Contact: {{phone}}

Please review and feel free to reach out if you have any questions or require additional details.

Thank you.

Sincerely,
{{employee_name}}
{{designation}}`,
};

// GET /api/email/templates — 1. Default template + custom templates
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
      imageUrl: t.imageUrl || '',
      isCustom: true,
      createdBy: t.createdBy,
    }));

    res.json({ templates: [DEFAULT_BUSINESS_TEMPLATE, ...formattedCustom] });
  } catch (err) {
    res.status(500).json({ message: err.message, templates: [DEFAULT_BUSINESS_TEMPLATE] });
  }
});

// POST /api/email/templates — Create new Email Template
router.post('/templates', protect, async (req, res) => {
  try {
    const { name, subject, body, category, imageUrl } = req.body;
    if (!name || !body) {
      return res.status(400).json({ message: 'Template name and body are required' });
    }

    const template = await MessageTemplate.create({
      type: 'email',
      shortcut: name.trim(),
      subject: (subject || name).trim(),
      message: body.trim(),
      imageUrl: (imageUrl || '').trim(),
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
        imageUrl: template.imageUrl || '',
        isCustom: true,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/email/templates/:id — Update an existing Email Template
router.put('/templates/:id', protect, async (req, res) => {
  try {
    const { name, subject, body, imageUrl } = req.body;
    const template = await MessageTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (name) template.shortcut = name.trim();
    if (subject !== undefined) template.subject = subject.trim();
    if (body) template.message = body.trim();
    if (imageUrl !== undefined) template.imageUrl = imageUrl.trim();

    await template.save();

    res.json({
      success: true,
      message: 'Template updated successfully',
      template: {
        id: template._id.toString(),
        name: template.shortcut,
        category: 'Custom Template',
        fromEmail: 'hr@aotms.com',
        subject: template.subject,
        body: template.message,
        imageUrl: template.imageUrl || '',
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

// POST /api/email/upload-image — Upload image to Cloudinary for Email templates / campaigns
router.post('/upload-image', protect, async (req, res) => {
  try {
    const { image, folder } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'No image data provided for upload' });
    }

    const uploadedUrl = await uploadToCloudinary(image, folder || 'email_campaign_images');
    if (!uploadedUrl) {
      return res.status(500).json({ message: 'Failed to upload image to Cloudinary' });
    }

    res.json({
      success: true,
      url: uploadedUrl,
      message: 'Image uploaded to Cloudinary successfully'
    });
  } catch (err) {
    console.error('[Email Image Upload Error]:', err.message);
    res.status(500).json({ message: err.message || 'Image upload failure' });
  }
});

// POST /api/email/upload-file — Upload any email attachment or photo to Cloudinary
router.post('/upload-file', protect, async (req, res) => {
  try {
    const { file, fileName, folder } = req.body;
    if (!file) {
      return res.status(400).json({ message: 'No file data provided for upload' });
    }

    const uploadedUrl = await uploadToCloudinary(file, folder || 'email_attachments', fileName);
    if (!uploadedUrl) {
      return res.status(500).json({ message: 'Failed to upload file to Cloudinary' });
    }

    let downloadUrl = uploadedUrl;
    if (uploadedUrl.includes('/upload/')) {
      downloadUrl = uploadedUrl.replace('/upload/', '/upload/fl_attachment/');
    }

    res.json({
      success: true,
      url: uploadedUrl,
      downloadUrl,
      fileName: fileName || 'attachment',
      message: 'File uploaded to Cloudinary successfully'
    });
  } catch (err) {
    console.error('[Email File Upload Error]:', err.message);
    res.status(500).json({ message: err.message || 'File upload failure' });
  }
});

// POST /api/email/bulk-blast — Trigger production n8n Bulk Email Broadcast
// Restricted exclusively to CTO, HR, and Managing Director (or CEO/Admin)
router.post('/bulk-blast', protect, async (req, res) => {
  try {
    if (!isBlastAllowed(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Bulk Email Blast is strictly restricted to CTO, HR, and Managing Director only.'
      });
    }

    const { recipients, subject, content, imageUrl, templateId } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipient email is required.' });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Email Subject is required.' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Email Content/Message body is required.' });
    }

    // Clean, validate, and deduplicate recipient emails
    const cleanRecipients = Array.from(new Set(
      recipients
        .map(e => String(e || '').trim().toLowerCase())
        .filter(e => e && e.includes('@') && e.includes('.'))
    ));

    if (cleanRecipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid recipient email addresses found in selection.' });
    }

    const webhookUrl = process.env.N8N_BULK_EMAIL_WEBHOOK_URL || 'https://aotms.app.n8n.cloud/webhook/AI-Mail';
    const finalSubject = subject.trim();
    const cleanBodyText = content.trim();

    // Professional responsive HTML layout with embedded Cloudinary banner
    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
    .email-container { max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
    .banner-img { width: 100%; max-height: 340px; object-fit: cover; display: block; border-bottom: 1px solid #f1f5f9; }
    .content-box { padding: 30px 26px; }
    .subject-title { font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .message-text { font-size: 15px; line-height: 1.65; color: #334155; white-space: pre-wrap; word-break: break-word; }
    .footer { padding: 16px 26px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="email-container">
    ${imageUrl ? `<img src="${imageUrl}" alt="Banner" class="banner-img" />` : ''}
    <div class="content-box">
      <h2 class="subject-title">${finalSubject}</h2>
      <div class="message-text">${cleanBodyText}</div>
    </div>
    <div class="footer">
      Official Communication • AOTMS CRM
    </div>
  </div>
</body>
</html>
`.trim();

    // n8n Bulk Email Broadcast payload matching workflow specification
    const n8nPayload = {
      recipients: cleanRecipients,
      subject: finalSubject,
      content: cleanBodyText,
      html: htmlEmail,
      body: cleanBodyText,
      message: cleanBodyText,
      imageUrl: imageUrl || '',
      sender: req.user?.email || 'hr@aotms.com',
      sentBy: req.user?.name || 'Administrator',
      sentByRole: req.user?.designation || req.user?.role || 'Staff',
      timestamp: new Date().toISOString()
    };

    console.log(`[Bulk Email Blast] Dispatching ${cleanRecipients.length} recipients to n8n webhook: ${webhookUrl}`);

    let n8nResponse = null;
    let n8nDispatched = false;

    try {
      const response = await axios.post(webhookUrl, n8nPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 35000
      });
      n8nResponse = response.data;
      n8nDispatched = true;
    } catch (netErr) {
      console.error('[Bulk Email n8n Webhook Error]:', netErr.response?.data || netErr.message);
      const isTimeout = netErr.code === 'ECONNABORTED' || /timeout/i.test(netErr.message);
      if (isTimeout) {
        // n8n webhook is executing workflow in background
        n8nDispatched = true;
        n8nResponse = { status: 'queued', message: 'Dispatched to n8n AI-Mail workflow; processing in background' };
      } else {
        return res.status(502).json({
          success: false,
          message: `Failed to trigger n8n Bulk Email Broadcast: ${netErr.response?.data?.message || netErr.message}`
        });
      }
    }

    // Log the broadcast event into EmailLog for CRM tracking
    try {
      await EmailLog.create({
        subject: finalSubject,
        body: cleanBodyText,
        recipientEmail: `${cleanRecipients.length} recipients (Bulk Broadcast)`,
        fromEmail: req.user?.email || 'hr@aotms.com',
        sentBy: req.user?._id,
        status: 'sent',
        direction: 'outbound',
        metadata: {
          isBulkBlast: true,
          totalRecipients: cleanRecipients.length,
          recipientsSample: cleanRecipients.slice(0, 10),
          imageUrl: imageUrl || '',
          templateId: templateId || '',
          n8nWebhook: webhookUrl,
          dispatchedAt: new Date().toISOString()
        }
      });
    } catch (logErr) {
      console.warn('[Bulk Email Log Warning]:', logErr.message);
    }

    return res.json({
      success: true,
      message: `Bulk Email Broadcast successfully dispatched to ${cleanRecipients.length} recipients via n8n!`,
      totalRecipients: cleanRecipients.length,
      webhookUrl,
      n8nResponse
    });
  } catch (err) {
    console.error('[Bulk Blast Exception]:', err);
    res.status(500).json({ success: false, message: err.message || 'Bulk broadcast internal error' });
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

    // 1. Auto-upload any base64 photos to Cloudinary so receiver inboxes (Gmail/Outlook) never get broken image icons
    let processedPhotos = Array.isArray(req.body.photos) ? [...req.body.photos] : [];
    for (let i = 0; i < processedPhotos.length; i++) {
      const p = processedPhotos[i];
      const dataStr = p.dataUrl || p.url || '';
      if (dataStr && dataStr.startsWith('data:')) {
        const cloudUrl = await uploadToCloudinary(dataStr, 'email_photos', p.name || `photo_${Date.now()}`);
        if (cloudUrl) {
          let downloadUrl = cloudUrl;
          if (cloudUrl.includes('/upload/')) {
            downloadUrl = cloudUrl.replace('/upload/', '/upload/fl_attachment/');
          }
          processedPhotos[i] = {
            ...p,
            url: cloudUrl,
            downloadUrl,
            dataUrl: '',
          };
        }
      }
    }

    // 2. Auto-upload any base64 attachments to Cloudinary so receiver inboxes have direct download links
    let processedAttachments = Array.isArray(req.body.attachmentsList) ? [...req.body.attachmentsList] : (Array.isArray(req.body.attachments) ? [...req.body.attachments] : []);
    for (let i = 0; i < processedAttachments.length; i++) {
      const a = processedAttachments[i];
      const dataStr = a.base64 || a.dataUrl || a.url || '';
      if (dataStr && dataStr.startsWith('data:')) {
        const cloudUrl = await uploadToCloudinary(dataStr, 'email_attachments', a.name || `attachment_${Date.now()}`);
        if (cloudUrl) {
          let downloadUrl = cloudUrl;
          if (cloudUrl.includes('/upload/')) {
            downloadUrl = cloudUrl.replace('/upload/', '/upload/fl_attachment/');
          }
          processedAttachments[i] = {
            ...a,
            url: cloudUrl,
            downloadUrl,
            base64: '',
            dataUrl: '',
          };
        }
      }
    }

    // 3. Sanitized HTML: ensure any base64 dataUrl images that were just uploaded get replaced with their Cloudinary URLs
    let finalHtml = req.body.html || emailBody.replace(/\n/g, '<br/>');
    processedPhotos.forEach(p => {
      if (p.url && p.name) {
        // If data:image was in the html, replace it with the secure Cloudinary url
        finalHtml = finalHtml.replace(/src=["']data:image\/[^"']+["']/i, `src="${p.url}"`);
      }
    });

    let sentVia = 'n8n Automation Webhook';
    let success = false;
    let n8nDetails = null;
    let n8nError = null;

    // 4. Dispatch via n8n webhook service if configured
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
            html: finalHtml,
            attachments: processedAttachments,
            fileAttachments: processedAttachments,
            driveLinks: req.body.driveLinks || [],
            photos: processedPhotos,
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

    // 2. Direct SMTP mailer (user-specific GoDaddy credentials or fallback to process.env)
    const smtpHost = req.user?.smtpConfig?.host || process.env.SMTP_HOST;
    const smtpUser = req.user?.smtpConfig?.user || process.env.SMTP_USER;
    const smtpPass = req.user?.smtpConfig?.pass || process.env.SMTP_PASS;
    const smtpPort = Number(req.user?.smtpConfig?.port || process.env.SMTP_PORT || 465);
    const smtpSecure = smtpPort === 465;

    if (!success && smtpHost && smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: { rejectUnauthorized: false }
        });

        await transporter.sendMail({
          from: `"${req.user?.name || 'AOTMS'}" <${smtpUser || senderEmail}>`,
          to: targetRecipient,
          replyTo: senderEmail || smtpUser,
          subject: emailSubject,
          text: emailBody,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; padding: 20px; background: #fafafa; border-radius: 8px;">
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
              ${emailBody.replace(/\n/g, '<br/>')}
            </div>
            <div style="margin-top: 16px; font-size: 12px; color: #6b7280; text-align: center;">
              Sent via AOTMS Platform · ${smtpUser || senderEmail}
            </div>
          </div>`,
        });
        sentVia = 'GoDaddy SMTP Mailer';
        success = true;
        n8nError = null; // Clear error since fallback succeeded
      } catch (smtpErr) {
        console.warn('[SMTP Direct Warning]:', smtpErr.message);
      }
    }

    // Determine final status
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
        html: finalHtml,
        attachments: processedAttachments,
        driveLinks: req.body.driveLinks || [],
        photos: processedPhotos,
        templateId,
        sentVia: success ? sentVia : 'n8n Automation Webhook (Failed)',
        status: finalStatus,
        errorMessage: finalErrorMsg,
        isLeaveRequest: false,
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

    // 2. Direct SMTP fallback (user-specific GoDaddy credentials or fallback to process.env)
    const replySmtpHost = req.user?.smtpConfig?.host || process.env.SMTP_HOST;
    const replySmtpUser = req.user?.smtpConfig?.user || process.env.SMTP_USER;
    const replySmtpPass = req.user?.smtpConfig?.pass || process.env.SMTP_PASS;
    const replySmtpPort = Number(req.user?.smtpConfig?.port || process.env.SMTP_PORT || 465);
    const replySmtpSecure = replySmtpPort === 465;

    if (!success && replySmtpHost && replySmtpUser && replySmtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: replySmtpHost,
          port: replySmtpPort,
          secure: replySmtpSecure,
          auth: {
            user: replySmtpUser,
            pass: replySmtpPass,
          },
          tls: { rejectUnauthorized: false }
        });

        await transporter.sendMail({
          from: `"${req.user?.name || 'AOTMS'}" <${replySmtpUser || senderEmail}>`,
          to: replyRecipient,
          replyTo: senderEmail || replySmtpUser,
          subject: replySubject,
          text: replyBody,
        });
        sentVia = 'GoDaddy SMTP Mailer';
        success = true;
      } catch (smtpErr) {
        console.warn('[Reply SMTP Direct Warning]:', smtpErr.message);
      }
    }

    const replyEntry = {
      senderEmail,
      senderName: req.user?.name || 'Staff',
      recipientEmail: replyRecipient,
      subject: replySubject,
      body: replyBody,
      sentVia,
      status: success ? 'Delivered' : 'Sent',
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

// POST /api/email/sync — Triggers real GoDaddy IMAP synchronization & fetches incoming data
router.post('/sync', protect, async (req, res) => {
  try {
    const syncResult = await syncGoDaddyMail(req.user, 50);

    const userDesig = String(req.user?.designation || '').trim().toUpperCase();
    const isMD = userDesig === 'MANAGING DIRECTOR' || userDesig === 'MD' || userDesig === 'CEO' || req.user?.role === 'admin' || req.user?.name?.toLowerCase().trim() === 'ameen';

    const filter = {};
    if (!isMD) {
      filter.$or = [
        { sender: req.user._id },
        { recipientEmail: new RegExp(`^${req.user.email}$`, 'i') },
        { fromEmail: new RegExp(`^${req.user.email}$`, 'i') }
      ];
    }

    const totalLogs = await EmailLog.countDocuments(filter);
    const unreadCount = await EmailLog.countDocuments({ ...filter, isRead: false });

    res.json({
      success: true,
      message: syncResult.message || 'Email data synchronized successfully',
      syncedCount: syncResult.synced || 0,
      threadedCount: syncResult.threaded || 0,
      syncedAt: new Date().toISOString(),
      stats: { totalLogs, unreadCount }
    });
  } catch (err) {
    console.error('[SYNC ENDPOINT ERROR]:', err);
    res.status(500).json({ success: false, message: err.message });
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

// GoDaddy Mail IMAP Synchronizer (Syncs both INBOX and Sent Folders)
async function syncGoDaddyMail(user, limit = 50) {
  const imapHost = user?.smtpConfig?.imapHost || (user?.smtpConfig?.host ? user.smtpConfig.host.replace('smtpout', 'imap') : null) || process.env.IMAP_HOST || 'imap.secureserver.net';
  const imapPort = Number(user?.smtpConfig?.imapPort || 993);
  const imapUser = user?.smtpConfig?.user || (user?.email && user.email.includes('@aotms.com') ? user.email : null) || process.env.SMTP_USER || 'jayaveer@aotms.com';
  const imapPass = user?.smtpConfig?.pass || process.env.SMTP_PASS || 'Aotms@2026';

  if (!imapUser || !imapPass) {
    return { success: false, synced: 0, message: 'No GoDaddy mail credentials configured' };
  }

  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: true,
    auth: { user: imapUser, pass: imapPass },
    tls: { rejectUnauthorized: false },
    logger: false
  });

  let syncedCount = 0;
  let threadedCount = 0;

  try {
    await client.connect();

    // Get list of mailboxes to detect Sent folders
    let mailboxesToSync = ['INBOX'];
    try {
      const boxes = await client.list();
      if (Array.isArray(boxes)) {
        const sentBox = boxes.find(b => {
          const name = (b.name || b.path || '').toLowerCase();
          return name.includes('sent') || (b.specialUse && b.specialUse.toLowerCase().includes('sent'));
        });
        if (sentBox && sentBox.path && !mailboxesToSync.includes(sentBox.path)) {
          mailboxesToSync.push(sentBox.path);
        }
      }
    } catch (_) {
      // Fallback common Sent folder names if list fails
      mailboxesToSync.push('Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent');
    }

    for (const boxPath of mailboxesToSync) {
      let lock = null;
      try {
        lock = await client.getMailboxLock(boxPath);
        const status = await client.status(boxPath, { messages: true });
        const totalMessages = status.messages || 0;
        if (totalMessages === 0) continue;

        const isSentFolder = boxPath.toLowerCase().includes('sent');
        const defaultDirection = isSentFolder ? 'outbound' : 'inbound';
        const defaultStatus = isSentFolder ? 'Sent' : 'Received';

        const startSeq = Math.max(1, totalMessages - limit + 1);
        for await (const msg of client.fetch({ seq: `${startSeq}:*` }, { envelope: true, source: true })) {
          try {
            const parsed = await simpleParser(msg.source);
            const messageId = (parsed.messageId || '').trim();

            if (messageId) {
              const alreadyExists = await EmailLog.findOne({
                $or: [
                  { messageId: messageId },
                  { 'replies.messageId': messageId }
                ]
              });
              if (alreadyExists) continue;
            }

            const fromEmail = parsed.from?.value?.[0]?.address || extractEmailAddress(parsed.from?.text) || imapUser;
            const toEmail = parsed.to?.value?.[0]?.address || extractEmailAddress(parsed.to?.text) || imapUser;
            const senderName = parsed.from?.value?.[0]?.name || extractSenderName(parsed.from?.text) || (fromEmail ? fromEmail.split('@')[0] : 'Sender');
            const rawSubject = (parsed.subject || 'No Subject').trim();
            const inReplyTo = (parsed.inReplyTo || '').trim();
            const references = (Array.isArray(parsed.references) ? parsed.references.join(' ') : (parsed.references || '')).trim();
            const rawBody = (parsed.text || parsed.html || '(No content)').trim();
            const bodyContent = stripQuotedEmailHistory(rawBody);
            const date = parsed.date || new Date();

            const normalizedSubject = rawSubject.replace(/^(re|fwd|fw|aw|antw):\s*/i, '').trim();

            let parentLog = null;
            if (inReplyTo) {
              parentLog = await EmailLog.findOne({
                $or: [{ messageId: inReplyTo }, { 'replies.messageId': inReplyTo }]
              });
            }
            if (!parentLog && references) {
              parentLog = await EmailLog.findOne({
                $or: [{ messageId: references }, { 'replies.messageId': references }]
              });
            }
            if (!parentLog && normalizedSubject) {
              parentLog = await EmailLog.findOne({
                $or: [
                  { subject: new RegExp(`^${normalizedSubject.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
                  { subject: new RegExp(normalizedSubject.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), recipientEmail: new RegExp(fromEmail, 'i') },
                  { subject: new RegExp(normalizedSubject.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), fromEmail: new RegExp(toEmail, 'i') }
                ]
              }).sort({ createdAt: -1 });
            }

            if (parentLog) {
              parentLog.replies.push({
                senderEmail: fromEmail,
                senderName,
                recipientEmail: toEmail,
                subject: rawSubject,
                body: bodyContent,
                direction: defaultDirection,
                messageId,
                inReplyTo,
                references,
                receivedAt: date,
                source: 'godaddy_imap'
              });
              if (defaultDirection === 'inbound') {
                parentLog.isRead = false;
                parentLog.status = 'Received';
              }
              await parentLog.save();
              threadedCount++;
              syncedCount++;
            } else {
              await EmailLog.create({
                senderName,
                senderEmail: fromEmail,
                senderDesignation: isSentFolder ? (user?.designation || 'Staff') : 'External / Client',
                fromEmail: fromEmail,
                recipientEmail: toEmail,
                subject: rawSubject,
                body: bodyContent,
                templateId: isSentFolder ? 'godaddy_sent' : 'godaddy_inbox',
                sentVia: 'GoDaddy IMAP Sync',
                status: defaultStatus,
                direction: defaultDirection,
                isReply: false,
                parentEmail: null,
                messageId,
                inReplyTo,
                references,
                isRead: isSentFolder ? true : false,
                createdAt: date,
                sender: user?._id || null
              });
              syncedCount++;
            }
          } catch (msgErr) {
            console.warn('[GoDaddy IMAP Message Error]:', msgErr.message);
          }
        }
      } catch (boxErr) {
        console.warn(`[GoDaddy IMAP Box Error - ${boxPath}]:`, boxErr.message);
      } finally {
        if (lock) lock.release();
      }
    }

    await client.logout();
    return {
      success: true,
      synced: syncedCount,
      threaded: threadedCount,
      message: `Successfully synced ${syncedCount} emails from GoDaddy INBOX & Sent folders (${threadedCount} threaded replies)`
    };
  } catch (err) {
    console.error('[GoDaddy IMAP Sync Error]:', err.message);
    return { success: false, synced: 0, message: err.message };
  }
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
      const uniqueSenders = await EmailLog.distinct('sender');

      stats = {
        totalSent: totalCount,
        todaySent: todayCount,
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
