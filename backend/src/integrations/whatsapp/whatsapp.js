const axios = require('axios');
const Lead = require('../../database/models/Lead');
const Integration = require('../../database/models/Integration');
const MessageTemplate = require('../../database/models/MessageTemplate');

const WA_API = 'https://graph.facebook.com/v22.0';

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

const FormData = require('form-data');
const { uploadToCloudinary } = require('../../core/utils/cloudinary');

// ── Upload media directly to Meta's WhatsApp Media API ({phone_id}/media) ─────
async function uploadWhatsAppMedia(phoneNumberId, accessToken, fileInput, mimeType = 'image/png') {
  try {
    const pId = phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
    const token = accessToken || process.env.META_WA_ACCESS_TOKEN;

    let buffer = fileInput;
    let type = mimeType;

    if (typeof fileInput === 'string') {
      if (fileInput.startsWith('data:')) {
        const base64Data = fileInput.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
        const match = fileInput.match(/^data:([^;]+);/);
        if (match) type = match[1];
      } else if (fileInput.startsWith('http')) {
        const imgRes = await axios.get(fileInput, { responseType: 'arraybuffer' });
        buffer = Buffer.from(imgRes.data);
        if (imgRes.headers['content-type']) type = imgRes.headers['content-type'];
      }
    }

    if (!Buffer.isBuffer(buffer)) return null;

    const ext = type.includes('jpeg') || type.includes('jpg') ? 'jpg' : 'png';
    const form = new FormData();
    form.append('file', buffer, { filename: `header_media.${ext}`, contentType: type });
    form.append('messaging_product', 'whatsapp');
    form.append('type', type);

    const res = await axios.post(
      `${WA_API}/${pId}/media`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return res.data?.id || null;
  } catch (err) {
    console.warn('[WhatsApp Media ID Upload Warning]:', err.response?.data || err.message);
    return null;
  }
}

// ── Helper: Ensure recipient phone has country code (default 91 for 10-digit IN) ──
function formatRecipientPhone(to) {
  const digits = String(to || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

// ── Send a plain text message ───────────────────────────────────────────────────
async function sendTextMessage(phoneNumberId, accessToken, to, message) {
  const pId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID;
  const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN;
  const recipient = formatRecipientPhone(to);
  const res = await axios.post(
    `${WA_API}/${pId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: { body: String(message || '').slice(0, 4096) },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// ── Robust Template Lookup with Auto-Sync Fallback ────────────────────────────
async function findOrFetchTemplate(templateName, wabaId, accessToken) {
  if (!templateName) return null;
  const MessageTemplate = require('../../database/models/MessageTemplate');

  const rawName = String(templateName).trim();
  const normalized = rawName.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

  let template = await MessageTemplate.findOne({
    $or: [
      { metaTemplateName: normalized },
      { shortcut: normalized },
      { metaTemplateName: rawName },
      { shortcut: rawName },
      { metaTemplateName: new RegExp('^' + normalized + '$', 'i') },
      { shortcut: new RegExp('^' + normalized + '$', 'i') },
    ]
  });

  if (!template || !Array.isArray(template.components) || template.components.length === 0) {
    try {
      const metaTemplates = await getTemplates(wabaId, accessToken);
      const mt = metaTemplates.find(t =>
        t.name.toLowerCase() === normalized ||
        t.name.toLowerCase() === rawName.toLowerCase()
      );
      if (mt) {
        const bodyComp = (mt.components || []).find(c => c.type === 'BODY');
        const message = bodyComp?.text || mt.name;
        template = await MessageTemplate.findOneAndUpdate(
          { $or: [{ metaTemplateId: String(mt.id) }, { metaTemplateName: String(mt.name) }, { shortcut: String(mt.name) }] },
          {
            $set: {
              type: 'whatsapp',
              shortcut: mt.name,
              message,
              isShared: true,
              metaTemplateId: String(mt.id),
              metaTemplateName: mt.name,
              category: mt.category || 'MARKETING',
              language: mt.language || 'en_US',
              components: mt.components || [],
              waStatus: mt.status || 'APPROVED',
            }
          },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      console.warn('[Template Lookup] Auto-sync fallback error:', err.message);
    }
  }

  return template;
}

// ── Build send-time components matching template specs ────────────────────────
async function buildTemplateComponents(template, lead = {}, customComponents = null, customHeaderImageUrl = null, phoneNumberId = null, accessToken = null) {
  if (Array.isArray(customComponents) && customComponents.length > 0) {
    const valid = customComponents.filter(c => c && c.type && Array.isArray(c.parameters) && c.parameters.length > 0);
    if (valid.length > 0) return valid;
  }

  const sendComponents = [];
  const metaComps = Array.isArray(template?.components) ? template.components : [];

  const headerMetaComp = metaComps.find(c => String(c.type).toUpperCase() === 'HEADER');
  const headerFormat = String(headerMetaComp?.format || template?.headerType || '').toUpperCase();

  if (headerFormat === 'IMAGE' || headerFormat === 'MEDIA' || customHeaderImageUrl || template?.mediaUrl) {
    let imageUrl = customHeaderImageUrl || template?.mediaUrl || template?.imageUrl;
    
    if (!imageUrl && headerMetaComp?.example?.header_handle?.[0]) {
      const handle = headerMetaComp.example.header_handle[0];
      if (typeof handle === 'string' && handle.startsWith('http')) {
        imageUrl = handle;
      }
    }

    if (!imageUrl) {
      imageUrl = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=60';
    }

    let mediaId = null;
    let cloudinaryUrl = null;

    // 1. Upload to Meta WhatsApp Media Endpoint ({phone_id}/media) to get Meta Media ID (prevents 403 Forbidden downloading)
    if (imageUrl) {
      try {
        mediaId = await uploadWhatsAppMedia(phoneNumberId, accessToken, imageUrl);
      } catch (e) {
        console.warn('Meta WhatsApp media upload warning:', e.message);
      }
    }

    // 2. Upload to Cloudinary as CDN URL fallback
    if (!mediaId && imageUrl) {
      try {
        cloudinaryUrl = await uploadToCloudinary(imageUrl);
      } catch (e) {
        console.warn('Cloudinary upload warning:', e.message);
      }
    }

    if (mediaId) {
      sendComponents.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { id: mediaId },
          },
        ],
      });
    } else {
      const finalLink = cloudinaryUrl || imageUrl;
      sendComponents.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { link: finalLink },
          },
        ],
      });
    }
  } else if (headerFormat === 'TEXT') {
    const headerText = headerMetaComp?.text || template?.headerText || '';
    const matches = headerText.match(/\{\{([^}]+)\}\}/g);
    if (matches && matches.length > 0) {
      const params = matches.map((m, idx) => {
        let val = lead.name || 'Notice';
        if (idx === 1 && lead.company) val = lead.company;
        return { type: 'text', text: String(val) };
      });
      sendComponents.push({
        type: 'header',
        parameters: params,
      });
    }
  }

  const bodyMetaComp = metaComps.find(c => String(c.type).toUpperCase() === 'BODY');
  const bodyText = bodyMetaComp?.text || template?.message || template?.content || '';
  const bodyMatches = bodyText.match(/\{\{([^}]+)\}\}/g);

  if (bodyMatches && bodyMatches.length > 0) {
    const bodyParams = bodyMatches.map((token, idx) => {
      const cleanToken = token.replace(/[\{\}\s]/g, '').toLowerCase();
      let val = '';
      if (cleanToken === '1' || cleanToken === 'name' || cleanToken === 'student_name' || cleanToken === 'lead_name') {
        val = lead.name || 'Student';
      } else if (cleanToken === '2' || cleanToken === 'first_name') {
        val = (lead.name || '').split(' ')[0] || 'Student';
      } else if (cleanToken === '3' || cleanToken === 'phone' || cleanToken === 'mobile') {
        val = lead.phone || '';
      } else if (cleanToken === '4' || cleanToken === 'email') {
        val = lead.email || '';
      } else if (cleanToken === 'company' || cleanToken === 'course') {
        val = lead.company || lead.course || 'Program';
      } else {
        if (idx === 0) val = lead.name || 'Student';
        else if (idx === 1) val = (lead.name || '').split(' ')[0] || 'Student';
        else if (idx === 2) val = lead.phone || 'Contact';
        else val = 'Val';
      }
      return { type: 'text', text: String(val || 'Val') };
    });

    sendComponents.push({
      type: 'body',
      parameters: bodyParams,
    });
  }

  return sendComponents;
}

// ── Send a pre-approved template message ────────────────────────────────────────
async function sendTemplateMessage(phoneNumberId, accessToken, to, templateName, languageCode, components) {
  const pId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID;
  const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN;
  const recipient = formatRecipientPhone(to);

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
      to: recipient,
      type: 'template',
      template: templatePayload,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// ── Send an interactive List message ────────────────────────────────────────────
async function sendListMessage(phoneNumberId, accessToken, to, list) {
  const pId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID;
  const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN;
  const recipient = formatRecipientPhone(to);

  const interactive = {
    type: 'list',
    body: { text: String(list.body || 'Please select an option:').slice(0, 1024) },
    action: {
      button: String(list.buttonLabel || 'View Courses').slice(0, 20),
      sections: (list.sections || []).map((s, idx) => ({
        title: s.title ? String(s.title).slice(0, 24) : undefined,
        rows: (s.rows || []).slice(0, 10).map((r, ridx) => ({
          id: String(r.id || `${idx}-${ridx}`).slice(0, 200),
          title: String(r.title || `Option ${ridx + 1}`).slice(0, 24),
          description: r.description ? String(r.description).slice(0, 72) : undefined,
        })),
      })),
    },
  };
  if (list.header) interactive.header = { type: 'text', text: String(list.header).slice(0, 60) };
  if (list.footer) interactive.footer = { text: String(list.footer).slice(0, 60) };

  const res = await axios.post(
    `${WA_API}/${pId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'interactive',
      interactive,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// ── Send interactive reply buttons (up to 3 buttons) ─────────────────────────
async function sendInteractiveButtonsMessage(phoneNumberId, accessToken, to, text, buttons = [], headerText = null, footerText = null) {
  const pId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID;
  const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN;
  const recipient = formatRecipientPhone(to);

  const buttonItems = (buttons || []).slice(0, 3).map((b, idx) => ({
    type: 'reply',
    reply: {
      id: String(b.id || `btn_${idx + 1}`).slice(0, 256),
      title: String(b.title || b.text || `Option ${idx + 1}`).slice(0, 20),
    },
  }));

  const interactive = {
    type: 'button',
    body: { text: String(text || 'Please select an option:').slice(0, 1024) },
    action: { buttons: buttonItems },
  };

  if (headerText) interactive.header = { type: 'text', text: String(headerText).slice(0, 60) };
  if (footerText) interactive.footer = { text: String(footerText).slice(0, 60) };

  const res = await axios.post(
    `${WA_API}/${pId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'interactive',
      interactive,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// ── Send Media message (Image, Document, Audio, Video, Sticker) ────────────────
async function sendMediaMessage(phoneNumberId, accessToken, to, mediaType = 'image', fileInput = null, caption = '', filename = 'document.pdf') {
  const pId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID;
  const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN;
  const recipient = formatRecipientPhone(to);

  const validTypes = ['image', 'document', 'audio', 'video', 'sticker'];
  const type = validTypes.includes(mediaType.toLowerCase()) ? mediaType.toLowerCase() : 'image';

  let mediaPayload = {};

  if (typeof fileInput === 'string' && (fileInput.startsWith('http') || fileInput.startsWith('https'))) {
    mediaPayload.link = fileInput;
  } else {
    const uploadedMediaId = await uploadWhatsAppMedia(pId, token, fileInput);
    if (uploadedMediaId) {
      mediaPayload.id = uploadedMediaId;
    } else {
      throw new Error('Failed to prepare media attachment for WhatsApp');
    }
  }

  if (caption && (type === 'image' || type === 'document' || type === 'video')) {
    mediaPayload.caption = caption;
  }
  if (filename && type === 'document') {
    mediaPayload.filename = filename;
  }

  const res = await axios.post(
    `${WA_API}/${pId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: recipient,
      type,
      [type]: mediaPayload,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// ── Mark Inbound Message as Read (Read Receipt) ──────────────────────────────
async function markAsRead(phoneNumberId, accessToken, messageId) {
  if (!messageId) return null;
  const pId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID;
  const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN;

  try {
    const res = await axios.post(
      `${WA_API}/${pId}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  } catch (err) {
    console.warn('[WhatsApp markAsRead warning]:', err.response?.data || err.message);
    return null;
  }
}

// ── Send Typing Indicator / Presence Indicator ──────────────────────────────────
async function startTyping(phoneNumberId, accessToken, to, messageId = null) {
  if (messageId) {
    await markAsRead(phoneNumberId, accessToken, messageId);
  }
  return { status: 'typing_indicator_active' };
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

// ── Default AOTMS Courses & Bot Automation Configuration ────────────────────────
const DEFAULT_BOT_COURSES = [
  {
    id: 'course_data_analytics',
    name: 'Data Analytics & AI',
    shortTitle: 'Data Analytics & AI',
    duration: '4 Months',
    fee: '₹25,000',
    mode: 'Online & Offline (Classroom)',
    highlights: 'Python, SQL, Power BI, Tableau, Advanced Excel, Machine Learning Basics & 4 Real-Time Industry Projects.',
  },
  {
    id: 'course_mern_fullstack',
    name: 'Full Stack Web Development (MERN)',
    shortTitle: 'Full Stack Web (MERN)',
    duration: '6 Months',
    fee: '₹30,000',
    mode: 'Online & Offline (Classroom)',
    highlights: 'HTML5, CSS3, Tailwind, JavaScript (ES6+), React.js, Node.js, Express.js, MongoDB, Git & Cloud Deployment.',
  },
  {
    id: 'course_python_fullstack',
    name: 'Python Full Stack Development',
    shortTitle: 'Python Full Stack',
    duration: '5 Months',
    fee: '₹28,000',
    mode: 'Online & Offline (Classroom)',
    highlights: 'Core & Advanced Python, OOPs, Django, REST APIs, MySQL/PostgreSQL, React.js, HTML/CSS & Placement Training.',
  },
  {
    id: 'course_digital_marketing',
    name: 'Digital Marketing with AI Tools',
    shortTitle: 'Digital Marketing + AI',
    duration: '3 Months',
    fee: '₹18,000',
    mode: 'Online & Offline (Classroom)',
    highlights: 'SEO, SEM (Google Ads), Social Media Marketing (Meta/Instagram Ads), Content AI Tools, Email Marketing & Live Ad Campaigns.',
  },
  {
    id: 'course_java_fullstack',
    name: 'Java Full Stack Development',
    shortTitle: 'Java Full Stack',
    duration: '6 Months',
    fee: '₹30,000',
    mode: 'Online & Offline (Classroom)',
    highlights: 'Core Java, J2EE, Spring Boot, Microservices, Hibernate, MySQL, React.js & Mock Technical Interviews.',
  },
  {
    id: 'course_cyber_security',
    name: 'Cyber Security & Ethical Hacking',
    shortTitle: 'Cyber Security & VAPT',
    duration: '4 Months',
    fee: '₹28,000',
    mode: 'Online & Offline (Classroom)',
    highlights: 'Network Security, Ethical Hacking, VAPT, Kali Linux, SOC Analyst, Web App Security & Hands-on Cyber Labs.',
  },
  {
    id: 'course_software_testing',
    name: 'Software Testing (Manual + Automation)',
    shortTitle: 'Software Testing (QA)',
    duration: '3.5 Months',
    fee: '₹20,000',
    mode: 'Online & Offline (Classroom)',
    highlights: 'Manual Testing, Selenium WebDriver with Java/Python, TestNG, API Testing (Postman), JIRA & Agile Framework.',
  },
  {
    id: 'course_aws_devops',
    name: 'AWS Cloud & DevOps Engineering',
    shortTitle: 'AWS Cloud & DevOps',
    duration: '4 Months',
    fee: '₹26,000',
    mode: 'Online & Offline (Classroom)',
    highlights: 'Linux, AWS (EC2, S3, VPC, IAM, RDS), Docker, Kubernetes, Jenkins, Git, Terraform & CI/CD Automation.',
  },
];

const DEFAULT_AUTOMATION_CONFIG = {
  enabled: true,
  replyToAllFirstMessages: true,
  instituteName: 'Academy of Tech Masters (AOTMS)',
  greetingHeader: '👋 Welcome to AOTMS!',
  greetingBody:
    'Hello *{{name}}*! 🙏\nWelcome to *Academy of Tech Masters (AOTMS)* — Leading IT Training & Placement Institute.\n\n🎓 *Why Join AOTMS?*\n✅ 100% Job-Oriented Practical Training\n✅ Real-Time Live Projects & Internship\n✅ Dedicated Placement Assistance\n✅ Online & Classroom Batches Available\n\n📚 *Select a course below* to get complete Course Syllabus, Duration, Fee & Free Demo details:',
  greetingFooter: 'Tap "View Courses" or reply with course name',
  listButtonLabel: '📚 View Courses',
  counsellorPhone: '+91 80199 42233',
  courses: DEFAULT_BOT_COURSES,
};

async function getWhatsAppAutomationConfig(integrationDoc = null) {
  let integration = integrationDoc;
  if (!integration) {
    integration = await Integration.findOne({ type: 'whatsapp_cloud', status: 'active' }).lean().catch(() => null);
    if (!integration) {
      integration = await Integration.findOne({ type: 'whatsapp_cloud' }).lean().catch(() => null);
    }
  }

  const saved = integration?.config?.extraConfig?.whatsappAutomation || {};
  let courses = Array.isArray(saved.courses) && saved.courses.length > 0 ? saved.courses : null;

  if (!courses) {
    try {
      const Course = require('../../database/models/Course');
      const dbCourses = await Course.find({ isActive: { $ne: false } }).lean();
      if (Array.isArray(dbCourses) && dbCourses.length > 0) {
        const merged = dbCourses.map((c, idx) => {
          const fallback = DEFAULT_BOT_COURSES.find(
            d => d.name.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(d.shortTitle.toLowerCase())
          );
          return {
            id: `course_${c._id || idx}`,
            dbId: String(c._id || ''),
            name: c.name,
            shortTitle: String(c.name).slice(0, 24),
            duration: c.duration || fallback?.duration || '4 Months',
            fee: c.cost ? `₹${Number(c.cost).toLocaleString('en-IN')}` : (fallback?.fee || 'Contact for Fee'),
            mode: fallback?.mode || 'Online & Offline (Classroom)',
            highlights: c.description || fallback?.highlights || '100% Practical Training with Real-Time Projects & Placement Support.',
          };
        });
        // Append any default courses not yet in DB up to 10 total
        for (const def of DEFAULT_BOT_COURSES) {
          if (merged.length >= 10) break;
          const exists = merged.some(m => m.name.toLowerCase() === def.name.toLowerCase());
          if (!exists) merged.push(def);
        }
        courses = merged;
      }
    } catch (e) {
      // ignore DB course lookup error and use DEFAULT_BOT_COURSES
    }
  }

  return {
    ...DEFAULT_AUTOMATION_CONFIG,
    ...saved,
    courses: (courses && courses.length > 0 ? courses : DEFAULT_BOT_COURSES).slice(0, 10),
  };
}

async function saveWhatsAppAutomationConfig(newConfig = {}) {
  let integration = await Integration.findOne({ type: 'whatsapp_cloud', status: 'active' });
  if (!integration) {
    integration = await Integration.findOne({ type: 'whatsapp_cloud' });
  }
  if (!integration) {
    integration = await Integration.create({
      name: 'Meta WhatsApp Business',
      type: 'whatsapp_cloud',
      status: 'active',
      config: {
        phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || '',
        wabaId: process.env.META_WA_WABA_ID || '',
        accessToken: process.env.META_WA_ACCESS_TOKEN || '',
        extraConfig: {},
      },
    });
  }

  const current = await getWhatsAppAutomationConfig(integration);
  const merged = {
    ...current,
    ...newConfig,
    courses: Array.isArray(newConfig.courses) ? newConfig.courses.slice(0, 10) : current.courses,
    updatedAt: new Date().toISOString(),
  };

  integration.config = integration.config || {};
  integration.config.extraConfig = {
    ...(integration.config.extraConfig || {}),
    whatsappAutomation: merged,
  };
  integration.markModified('config');
  await integration.save();
  return merged;
}

// ── Helper: Record Bot Outbound Message on Lead & Broadcast to CRM UI ───────────
async function recordBotActivityAndBroadcast(lead, description, metaMessageId = '') {
  const { broadcastWebSocketEvent } = require('../../app/websocket');
  lead.activities = lead.activities || [];
  const activity = {
    type: 'whatsapp',
    description,
    direction: 'outbound_bot',
    metaMessageId: metaMessageId || '',
    deliveryStatus: 'sent',
    performedByName: '🤖 AOTMS Courses Bot',
    userName: '🤖 AOTMS Courses Bot',
    createdAt: new Date(),
  };
  lead.activities.push(activity);
  lead.lastWaMessageAt = new Date();
  lead.lastWaMessagePreview = description;
  await lead.save();

  broadcastWebSocketEvent('whatsapp:incoming_message', {
    leadId: lead._id,
    phone: lead.phone,
    name: lead.name,
    text: description,
    direction: 'outbound_bot',
    performedByName: '🤖 AOTMS Courses Bot',
    messageId: metaMessageId || `bot_${Date.now()}`,
    waStatus: lead.waStatus,
    timestamp: new Date(),
  });
}

// ── Send Greeting + Interactive Courses List to a Lead ──────────────────────────
async function sendAutomatedGreetingMenu({ lead, phone, name, integration, config }) {
  const cfg = config || (await getWhatsAppAutomationConfig(integration));
  const pId = integration?.config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID;
  const token = integration?.config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN;
  const targetPhone = phone || lead?.phone;
  const studentName = (name || lead?.name || 'Student').replace(/^WhatsApp (Lead|Contact)$/i, 'Student');

  const bodyText = String(cfg.greetingBody || DEFAULT_AUTOMATION_CONFIG.greetingBody)
    .replace(/\{\{\s*name\s*\}\}/gi, studentName)
    .replace(/\{\{\s*1\s*\}\}/g, studentName);

  const courses = Array.isArray(cfg.courses) && cfg.courses.length > 0 ? cfg.courses : DEFAULT_BOT_COURSES;

  const rows = courses.slice(0, 10).map((c, idx) => ({
    id: c.id || `course_${idx}`,
    title: String(c.shortTitle || c.name || `Course ${idx + 1}`).slice(0, 24),
    description: `${c.duration || '4 Months'} | Fee: ${c.fee || 'Ask Us'} — Tap for details`.slice(0, 72),
  }));

  let sendRes = null;
  let logSummary = '';

  try {
    sendRes = await sendListMessage(pId, token, targetPhone, {
      header: cfg.greetingHeader || '👋 Welcome to AOTMS!',
      body: bodyText,
      footer: cfg.greetingFooter || 'Tap below to explore our courses',
      buttonLabel: cfg.listButtonLabel || '📚 View Courses',
      sections: [
        {
          title: '🎓 Popular Courses',
          rows,
        },
      ],
    });

    const courseListPreview = courses
      .slice(0, 10)
      .map((c, idx) => `${idx + 1}. *${c.name}* (${c.duration} • ${c.fee})`)
      .join('\n');
    logSummary = `${cfg.greetingHeader || '👋 Welcome to AOTMS!'}\n\n${bodyText}\n\n📚 *Courses Menu Sent:*\n${courseListPreview}`;
  } catch (listErr) {
    console.warn('[WhatsApp Bot] Interactive List fallback to text:', listErr.response?.data || listErr.message);
    const numberedCourses = courses
      .slice(0, 10)
      .map((c, idx) => `*${idx + 1}.* ${c.name} _(${c.duration} | ${c.fee})_`)
      .join('\n');
    const fallbackText = `${cfg.greetingHeader || '👋 Welcome to AOTMS!'}\n\n${bodyText}\n\n${numberedCourses}\n\n👉 *Reply with a course number (1-${courses.length}) or course name* to get full details!`;
    sendRes = await sendTextMessage(pId, token, targetPhone, fallbackText);
    logSummary = fallbackText;
  }

  if (lead) {
    await recordBotActivityAndBroadcast(lead, logSummary, sendRes?.messages?.[0]?.id || '');
  }

  return sendRes;
}

// ── Send Specific Course Details + Interactive Action Buttons ───────────────────
async function sendAutomatedCourseDetails({ lead, phone, name, course, integration, config }) {
  const cfg = config || (await getWhatsAppAutomationConfig(integration));
  const pId = integration?.config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID;
  const token = integration?.config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN;
  const targetPhone = phone || lead?.phone;

  // Save course interest on Lead
  if (lead && course?.name) {
    const prefs = Array.isArray(lead.preferredCourses) ? [...lead.preferredCourses] : [];
    if (!prefs.includes(course.name)) prefs.push(course.name);
    lead.preferredCourses = prefs;
    lead.customFields = {
      ...(lead.customFields || {}),
      interested: course.name,
      lastSelectedCourse: course.name,
    };
    lead.markModified('customFields');
  }

  const detailText =
    `📘 *Course:* ${course.name}\n` +
    `⏳ *Duration:* ${course.duration || '4 Months'}\n` +
    `💰 *Course Fee:* ${course.fee || 'Contact Counsellor'}\n` +
    `💻 *Mode:* ${course.mode || 'Online & Offline (Classroom)'}\n\n` +
    `✨ *Key Syllabus & Highlights:*\n${course.highlights || '100% Practical Training with Live Projects & Placement Support.'}\n\n` +
    `🎯 *Includes:* Real-Time Projects, Course Completion Certificate & 100% Placement Assistance!\n\n` +
    `👇 *Choose an option below:*`;

  const buttons = [
    { id: `book_demo|${course.id}`, title: '📅 Book Free Demo' },
    { id: `talk_exec|${course.id}`, title: '📞 Talk to Expert' },
    { id: 'show_courses_menu', title: '📚 All Courses' },
  ];

  let sendRes = null;
  try {
    sendRes = await sendInteractiveButtonsMessage(
      pId,
      token,
      targetPhone,
      detailText,
      buttons,
      `🎓 ${String(course.shortTitle || course.name).slice(0, 55)}`,
      cfg.instituteName || 'Academy of Tech Masters (AOTMS)'
    );
  } catch (btnErr) {
    console.warn('[WhatsApp Bot] Interactive Buttons fallback to text:', btnErr.response?.data || btnErr.message);
    const fallbackText =
      `🎓 *${course.name}*\n\n${detailText}\n` +
      `• Reply *DEMO* to book a Free Demo session\n` +
      `• Reply *CALL* to request a callback from our Counsellor\n` +
      `• Reply *MENU* to view all courses`;
    sendRes = await sendTextMessage(pId, token, targetPhone, fallbackText);
  }

  if (lead) {
    await recordBotActivityAndBroadcast(
      lead,
      `🎓 *${course.name}*\n\n${detailText}\n\n[Buttons: 📅 Book Free Demo | 📞 Talk to Expert | 📚 All Courses]`,
      sendRes?.messages?.[0]?.id || ''
    );
  }

  return sendRes;
}

// ── Send Confirmation when Student Books Demo or Requests Counsellor Call ──────
async function sendAutomatedActionConfirmation({ lead, phone, name, actionType, course, integration, config }) {
  const cfg = config || (await getWhatsAppAutomationConfig(integration));
  const pId = integration?.config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID;
  const token = integration?.config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN;
  const targetPhone = phone || lead?.phone;
  const studentName = (name || lead?.name || 'Student').replace(/^WhatsApp (Lead|Contact)$/i, 'Student');
  const selectedCourseName = course?.name || lead?.customFields?.lastSelectedCourse || lead?.customFields?.interested || 'our IT Program';

  if (lead) {
    if (!lead.status || lead.status === 'Fresh' || lead.status === 'Contact') {
      lead.status = 'Interested';
    }
    lead.waStatus = 'pending'; // Keep in pending so human counsellor follows up
    lead.customFields = {
      ...(lead.customFields || {}),
      interested: selectedCourseName,
      botIntent: actionType === 'demo' ? 'Requested Free Demo' : 'Requested Counsellor Callback',
    };
    lead.markModified('customFields');
  }

  const isDemo = actionType === 'demo';
  const confirmText = isDemo
    ? `✅ *Free Demo Request Confirmed!*\n\nThank you *${studentName}*! 🎉\nWe have registered your request for a *Free Live Demo* of *${selectedCourseName}*.\n\n👨‍💼 Our Academic Counsellor will contact you shortly with the Demo link & batch schedule.\n\n📞 *Direct Helpline:* ${cfg.counsellorPhone || '+91 80199 42233'}\n🏛️ *${cfg.instituteName || 'Academy of Tech Masters (AOTMS)'}*`
    : `📞 *Counsellor Callback Requested!*\n\nThank you *${studentName}*! 🙏\nOur Senior Career Counsellor has been notified regarding your interest in *${selectedCourseName}* and will call you shortly.\n\n📞 *Direct Helpline:* ${cfg.counsellorPhone || '+91 80199 42233'}\n🏛️ *${cfg.instituteName || 'Academy of Tech Masters (AOTMS)'}*`;

  let sendRes = null;
  try {
    sendRes = await sendInteractiveButtonsMessage(
      pId,
      token,
      targetPhone,
      confirmText,
      [{ id: 'show_courses_menu', title: '📚 Explore Courses' }],
      isDemo ? '📅 Demo Registered' : '📞 Callback Scheduled',
      'We look forward to speaking with you!'
    );
  } catch (err) {
    sendRes = await sendTextMessage(pId, token, targetPhone, confirmText);
  }

  if (lead) {
    await recordBotActivityAndBroadcast(lead, confirmText, sendRes?.messages?.[0]?.id || '');
  }

  return sendRes;
}

// ── Main Inbound Bot Decision Engine ────────────────────────────────────────────
async function processWhatsAppBotAutomation({
  msg,
  text,
  interactiveId,
  phone,
  name,
  lead,
  integration,
  isNewLead,
  priorInboundCount,
}) {
  try {
    const config = await getWhatsAppAutomationConfig(integration);
    if (!config || config.enabled === false) {
      return { handled: false, reason: 'automation_disabled' };
    }

    const pId = integration?.config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_NUMBER_ID;
    const token = integration?.config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN;

    if (msg?.id) {
      markAsRead(pId, token, msg.id).catch(() => {});
    }

    const courses = Array.isArray(config.courses) && config.courses.length > 0 ? config.courses : DEFAULT_BOT_COURSES;
    const cleanText = String(text || '').trim();
    const lowerText = cleanText.toLowerCase();
    const cleanId = String(interactiveId || '').trim();

    // 1. Check Interactive Button / List Reply IDs first
    if (cleanId === 'show_courses_menu') {
      await sendAutomatedGreetingMenu({ lead, phone, name, integration, config });
      return { handled: true, action: 'courses_menu' };
    }

    if (cleanId.startsWith('book_demo|') || cleanId.startsWith('talk_exec|')) {
      const [actPrefix, courseId] = cleanId.split('|');
      const matchedCourse = courses.find(c => c.id === courseId);
      await sendAutomatedActionConfirmation({
        lead,
        phone,
        name,
        actionType: actPrefix === 'book_demo' ? 'demo' : 'call',
        course: matchedCourse,
        integration,
        config,
      });
      return { handled: true, action: actPrefix };
    }

    const interactiveCourse = courses.find(c => c.id === cleanId);
    if (interactiveCourse) {
      await sendAutomatedCourseDetails({
        lead,
        phone,
        name,
        course: interactiveCourse,
        integration,
        config,
      });
      return { handled: true, action: 'course_details', course: interactiveCourse.name };
    }

    // 2. Check if user typed a number (e.g., "1", "2", ... up to courses.length)
    if (/^\d+$/.test(cleanText)) {
      const idx = parseInt(cleanText, 10) - 1;
      if (idx >= 0 && idx < courses.length) {
        await sendAutomatedCourseDetails({
          lead,
          phone,
          name,
          course: courses[idx],
          integration,
          config,
        });
        return { handled: true, action: 'course_details_by_number', course: courses[idx].name };
      }
    }

    // 3. Check if user typed a Demo / Callback keyword
    if (
      /\b(book\s*demo|free\s*demo|demo\s*class|demo)\b/i.test(lowerText) &&
      (lead?.customFields?.lastSelectedCourse || lead?.customFields?.interested)
    ) {
      await sendAutomatedActionConfirmation({
        lead,
        phone,
        name,
        actionType: 'demo',
        course: { name: lead.customFields.lastSelectedCourse || lead.customFields.interested },
        integration,
        config,
      });
      return { handled: true, action: 'demo_by_text' };
    }

    if (/\b(call\s*me|callback|talk\s*to|counsellor|counselor|expert|contact\s*me)\b/i.test(lowerText)) {
      await sendAutomatedActionConfirmation({
        lead,
        phone,
        name,
        actionType: 'call',
        course: { name: lead?.customFields?.lastSelectedCourse || lead?.customFields?.interested || 'AOTMS Courses' },
        integration,
        config,
      });
      return { handled: true, action: 'call_by_text' };
    }

    // 4. Check if user typed a specific course name or keyword
    const matchedCourseByText = courses.find(c => {
      const cName = String(c.name || '').toLowerCase();
      const cShort = String(c.shortTitle || '').toLowerCase();
      if (lowerText === cName || lowerText === cShort) return true;
      if (lowerText.length >= 3 && (cName.includes(lowerText) || lowerText.includes(cShort))) return true;
      // Specific course keyword aliases
      if (cName.includes('data analytics') && /\b(data\s*analytics|data\s*science|power\s*bi|tableau)\b/i.test(lowerText)) return true;
      if (cName.includes('mern') && /\b(mern|web\s*dev|react|node|full\s*stack\s*web)\b/i.test(lowerText)) return true;
      if (cName.includes('python') && /\b(python|django)\b/i.test(lowerText)) return true;
      if (cName.includes('digital marketing') && /\b(digital\s*marketing|seo|google\s*ads|meta\s*ads)\b/i.test(lowerText)) return true;
      if (cName.includes('java') && /\b(java|spring\s*boot)\b/i.test(lowerText)) return true;
      if (cName.includes('cyber') && /\b(cyber|hacking|ethical|vapt|soc)\b/i.test(lowerText)) return true;
      if (cName.includes('testing') && /\b(testing|selenium|qa|manual\s*testing|automation\s*testing)\b/i.test(lowerText)) return true;
      if (cName.includes('aws') && /\b(aws|devops|cloud|docker|kubernetes)\b/i.test(lowerText)) return true;
      return false;
    });

    if (matchedCourseByText) {
      await sendAutomatedCourseDetails({
        lead,
        phone,
        name,
        course: matchedCourseByText,
        integration,
        config,
      });
      return { handled: true, action: 'course_details_by_keyword', course: matchedCourseByText.name };
    }

    // 5. Check Greeting / Menu / General Enquiry Keywords OR First-Time Inbound Message
    const isGreetingOrMenuKeyword =
      /\b(hi+|hello+|hey+|hlo|namaste|hai|vanakkam|good\s*morning|good\s*afternoon|good\s*evening|start|menu|courses?|details|info|information|fees?|price|cost|batch|batches|training|coaching|institute|aotms|admission|join|help|brochure|syllabus|curriculum)\b/i.test(
        lowerText
      ) || cleanText === '?';

    if (isGreetingOrMenuKeyword || (config.replyToAllFirstMessages !== false && (isNewLead || priorInboundCount === 0))) {
      await sendAutomatedGreetingMenu({ lead, phone, name, integration, config });
      return { handled: true, action: 'greeting_menu' };
    }

    return { handled: false, reason: 'no_trigger_matched' };
  } catch (err) {
    console.error('[WhatsApp Bot Automation Error]:', err.response?.data || err.message);
    return { handled: false, error: err.message };
  }
}

// ── Handle incoming WhatsApp Cloud webhook events ───────────────────────────────
// Creates a Lead for first-time senders and fires workflow/webhook events for
// every inbound message so automations (auto-reply, assignment, etc.) can react.
async function handleWhatsAppWebhookEvent(body, integration) {
  const entries = body.entry || [];
  let created = 0;
  let processed = 0;

  const { broadcastWebSocketEvent } = require('../../app/websocket');
  const { normalizePhone10 } = require('../../core/utils/phone');

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const messages = value.messages || [];
      const contacts = value.contacts || [];

      // ── Inbound customer messages → move the lead to "Pending" & run Bot ────
      for (const msg of messages) {
        const phone = msg.from;
        if (!phone) continue;

        const clean10 = normalizePhone10(phone) || String(phone).slice(-10);
        const contact = contacts.find(c => c.wa_id === phone);
        const name = contact?.profile?.name || 'WhatsApp Lead';
        const text =
          msg.text?.body ||
          msg.button?.text ||
          msg.interactive?.button_reply?.title ||
          msg.interactive?.list_reply?.title ||
          '[non-text message]';
        const interactiveId =
          msg.interactive?.button_reply?.id ||
          msg.interactive?.list_reply?.id ||
          msg.button?.payload ||
          '';

        let lead = await Lead.findOne({
          $or: [
            { phone: clean10 },
            { phone },
            { phone: { $regex: clean10 + '$' } },
          ],
        });

        let isNewLead = false;
        if (!lead) {
          isNewLead = true;
          lead = await Lead.create({
            name,
            phone: clean10,
            leadSource: 'Whatsapp',
            status: 'Fresh',
            campaign: integration?.defaultCampaign || undefined,
            assignedTo: integration?.defaultAssignedTo || undefined,
          });

          if (integration?._id && String(integration._id).length === 24) {
            await Integration.findByIdAndUpdate(integration._id, {
              $inc: { totalLeadsImported: 1 },
              $set: { lastLeadAt: new Date() },
            }).catch(() => {});
          }

          created++;
        } else if (
          name &&
          name !== 'WhatsApp Lead' &&
          (!lead.name || lead.name === 'WhatsApp Lead' || lead.name === 'WhatsApp Contact')
        ) {
          lead.name = name;
        }

        // Count prior inbound messages in last 12 hours to know if this is a fresh session
        const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
        const priorInboundCount = (lead.activities || []).filter(
          a => a.type === 'whatsapp' && a.direction === 'inbound' && new Date(a.createdAt).getTime() > twelveHoursAgo
        ).length;

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

        broadcastWebSocketEvent('whatsapp:incoming_message', {
          leadId: lead._id,
          phone: lead.phone,
          name: lead.name,
          text,
          direction: 'inbound',
          messageId: msg.id || '',
          waStatus: 'pending',
          timestamp: new Date(),
        });

        // Trigger Automated WhatsApp Greeting & Courses Bot
        await processWhatsAppBotAutomation({
          msg,
          text,
          interactiveId,
          phone,
          name: lead.name || name,
          lead,
          integration,
          isNewLead,
          priorInboundCount,
        });

        processed++;
      }

      // ── Message delivery / failure status updates from Meta ──────────────────
      const statuses = value.statuses || [];
      for (const st of statuses) {
        const messageId = st.id;
        const statusStr = st.status; // sent | delivered | read | failed
        const recipientPhone = st.recipient_id;
        const errors = st.errors || [];

        console.log(`[Meta WA Delivery Status] Msg ${messageId} to ${recipientPhone} -> ${statusStr?.toUpperCase()}`, errors.length ? errors : '');

        let targetLeadId = null;
        if (recipientPhone) {
          try {
            const cleanRecipient10 = normalizePhone10(recipientPhone) || String(recipientPhone).slice(-10);
            const lead = await Lead.findOne({
              $or: [
                { phone: cleanRecipient10 },
                { phone: recipientPhone },
              ],
            });
            if (lead) {
              targetLeadId = lead._id;
              if (Array.isArray(lead.activities)) {
                const act = lead.activities.find(a => a.metaMessageId === messageId);
                if (act) {
                  act.deliveryStatus = statusStr;
                  if (errors.length > 0) {
                    act.errorReason = errors.map(e => `${e.title || e.message} (code ${e.code})`).join('; ');
                  }
                  await lead.save();
                }
              }
            }
          } catch (e) {
            console.warn('[Webhook Status Update] Lead activity update error:', e.message);
          }
        }

        broadcastWebSocketEvent('whatsapp:status_update', {
          leadId: targetLeadId,
          recipientPhone,
          messageId,
          status: statusStr,
          errors: errors.length ? errors : undefined,
          timestamp: new Date()
        });
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

const { getWhatsAppBot, verifyWebhookSignature } = require('./whatsappAdapter');

module.exports = {
  verifyWebhookToken,
  verifyWebhookSignature,
  getWhatsAppBot,
  sendTextMessage,
  sendMediaMessage,
  sendInteractiveButtonsMessage,
  sendTemplateMessage,
  buildTemplateComponents,
  findOrFetchTemplate,
  sendListMessage,
  markAsRead,
  startTyping,
  getTemplates,
  submitTemplate,
  deleteTemplate,
  uploadMediaToMeta,
  handleWhatsAppWebhookEvent,
  getWhatsAppAutomationConfig,
  saveWhatsAppAutomationConfig,
  sendAutomatedGreetingMenu,
  sendAutomatedCourseDetails,
  processWhatsAppBotAutomation,
  DEFAULT_BOT_COURSES,
};