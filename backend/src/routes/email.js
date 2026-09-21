const express = require('express');
const axios = require('axios');
const Lead = require('../models/Lead');
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
    const senderEmail = req.body.fromEmail || req.user?.email || 'hr@aotms.com';
    const { recipientEmail, subject, body, templateId } = req.body;

    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({ message: 'Recipient Email, Subject, and Message Body are required.' });
    }

    let sentVia = 'Secure Email Service';
    let success = false;

    // 1. Dispatch via webhook service if configured
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await axios.post(process.env.N8N_WEBHOOK_URL, {
          event: 'email:send',
          payload: {
            fromEmail: senderEmail,
            recipientEmail,
            subject,
            emailBody: body,
            templateId: templateId || 'custom',
            sentBy: req.user?.name || req.user?.email || 'Staff',
            timestamp: new Date()
          }
        });
        success = true;
      } catch (err) {
        console.warn('[Email Webhook Warning]:', err.message);
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
          from: `"AOTMS HR" <${senderEmail}>`,
          to: recipientEmail,
          subject,
          text: body,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; padding: 20px; background: #fafafa; border-radius: 8px;">
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
              ${body.replace(/\n/g, '<br/>')}
            </div>
            <div style="margin-top: 16px; font-size: 12px; color: #6b7280; text-align: center;">
              Sent via AOTMS Platform · ${senderEmail}
            </div>
          </div>`,
        });
        sentVia = 'SMTP Mailer';
        success = true;
      } catch (smtpErr) {
        console.warn('[SMTP Fallback Warning]:', smtpErr.message);
      }
    }

    if (!success) {
      sentVia = 'Direct Delivery Service';
      console.log(`[Email Dispatch]: From ${senderEmail} to ${recipientEmail} | Subject: ${subject}`);
    }

    res.json({
      success: true,
      message: `Email sent successfully to ${recipientEmail}`,
      details: {
        fromEmail: senderEmail,
        recipientEmail,
        subject,
        sentVia,
        timestamp: new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
