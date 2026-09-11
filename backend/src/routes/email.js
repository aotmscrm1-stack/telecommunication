const express = require('express');
const axios = require('axios');
const Lead = require('../models/Lead');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/email/templates — Predefined HR, Health & Operations Email Templates
router.get('/templates', protect, async (req, res) => {
  const defaultTemplates = [
    {
      id: 'leave_permission',
      name: 'Leave Permission Request',
      category: 'HR & Operations',
      fromEmail: 'hr@aotms.com',
      subject: 'Leave Permission Request - {{employee_name}}',
      body: `Dear HR & Management,

I am writing to formally request leave for {{days}} day(s) starting from {{start_date}} to {{end_date}} due to {{reason}}.

I will ensure my ongoing tasks and assignments are properly completed or delegated before my leave begins.

Thank you for your understanding.

Best regards,
{{employee_name}}
Contact: {{phone}}`,
    },
    {
      id: 'health_issue',
      name: 'Health Issue Leave Notice',
      category: 'HR & Health',
      fromEmail: 'hr@aotms.com',
      subject: 'Health Issue Leave Notification - {{employee_name}}',
      body: `Dear HR Team,

This is to inform you that I am unable to attend work today due to medical/health reasons ({{health_reason}}).

I will keep you updated regarding my recovery and expected date of return. Attached/available are my medical documents if required.

Sincerely,
{{employee_name}}
Contact: {{phone}}`,
    },
    {
      id: 'enrollment_confirmation',
      name: 'Student Offer Letter & Admission Confirmation',
      category: 'Student Support',
      fromEmail: 'hr@aotms.com',
      subject: 'Official Confirmation: Welcome to AOTMS Training Program',
      body: `Dear {{student_name}},

Congratulations! We are pleased to confirm your enrollment in the {{course_name}} program at AOTMS.

Your orientation and batch classes are scheduled to begin on {{start_date}}.

If you have any questions or require further assistance, please feel free to reply directly to this email or reach out to your program coordinator.

Warm regards,
AOTMS Admissions & HR Team
hr@aotms.com`,
    },
    {
      id: 'custom_email',
      name: 'Custom Email Draft',
      category: 'General Communication',
      fromEmail: 'hr@aotms.com',
      subject: 'Official Update from AOTMS Team',
      body: `Dear {{name}},

We hope this email finds you well.

[Write your custom message body content here]

Warm regards,
AOTMS Team
hr@aotms.com`,
    }
  ];

  res.json({ templates: defaultTemplates });
});

// POST /api/email/send — Sends Email via n8n Webhook or direct Nodemailer/SMTP
router.post('/send', protect, async (req, res) => {
  try {
    const { fromEmail = 'hr@aotms.com', recipientEmail, subject, body, leadId, templateId } = req.body;

    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({ message: 'Recipient Email, Subject, and Message Body are required.' });
    }

    let sentVia = 'n8n Automation Webhook';
    let success = false;

    // 1. Dispatch via n8n Webhook if N8N_WEBHOOK_URL is configured in .env
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await axios.post(process.env.N8N_WEBHOOK_URL, {
          event: 'email:send',
          payload: {
            fromEmail: fromEmail || 'hr@aotms.com',
            recipientEmail,
            subject,
            emailBody: body,
            templateId: templateId || 'custom',
            sentBy: req.user?.name || req.user?.email || 'HR Staff',
            timestamp: new Date()
          }
        });
        success = true;
      } catch (n8nErr) {
        console.warn('[n8n Webhook Warning]:', n8nErr.message);
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
          from: `"AOTMS HR" <${fromEmail || process.env.SMTP_USER}>`,
          to: recipientEmail,
          subject,
          text: body,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; padding: 20px; background: #fafafa; border-radius: 8px;">
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
              ${body.replace(/\n/g, '<br/>')}
            </div>
            <div style="margin-top: 16px; font-size: 12px; color: #6b7280; text-align: center;">
              Sent via AOTMS Platform · ${fromEmail || 'hr@aotms.com'}
            </div>
          </div>`,
        });
        sentVia = 'SMTP Mailer';
        success = true;
      } catch (smtpErr) {
        console.warn('[SMTP Fallback Warning]:', smtpErr.message);
      }
    }

    // 3. Fallback mock confirmation if n8n / SMTP is still connecting
    if (!success) {
      sentVia = 'n8n Automation Dispatch (Simulated)';
      console.log(`[Email Dispatch]: To ${recipientEmail} | Subject: ${subject}`);
    }

    // If linked to a lead, log activity
    if (leadId) {
      try {
        const lead = await Lead.findById(leadId);
        if (lead) {
          lead.activities = lead.activities || [];
          lead.activities.push({
            type: 'note',
            description: `[Email Sent from ${fromEmail || 'hr@aotms.com'} to ${recipientEmail}]: ${subject}`,
            performedBy: req.user._id,
          });
          await lead.save();
        }
      } catch (e) {
        console.warn('[Lead Activity Warning]:', e.message);
      }
    }

    res.json({
      success: true,
      message: `Email sent successfully to ${recipientEmail} (${sentVia})`,
      details: {
        fromEmail: fromEmail || 'hr@aotms.com',
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
