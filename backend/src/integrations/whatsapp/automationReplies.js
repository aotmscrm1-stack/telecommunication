/**
 * WhatsApp auto-reply planner (rule based, side-effect free).
 *
 * Problem this solves: the old bot pushed the same greeting + course list on
 * every keyword hit ("info", "fees", "details", "courses", "hi", ...), so a
 * customer who kept typing kept receiving the identical template.
 *
 * Now every inbound text is classified into the topic the customer actually
 * asked about and gets a short, specific answer. The academic-project answers
 * come from the "Final Year Projects 2026 — B.Tech & M.Tech" offering.
 *
 * The planner only decides WHAT to answer. whatsapp.js owns sending, the
 * duplicate-reply guard and activity logging.
 */

// ── Knowledge taken from the Final Year Projects 2026 poster ───────────────────
// Every field below is printed on the poster, so the bot never invents an offer.
const PROJECT_OFFERING = {
  brand: 'AOTMS Global Pvt. Ltd.',
  tagline: 'Learn Today, Lead Tomorrow',
  program: 'Final Year Projects 2026',
  audience: 'B.Tech & M.Tech Students',
  headline: 'Final Year Projects 2026 — B.Tech & M.Tech Students',
  technologies: [
    'Generative AI',
    'Agentic AI',
    'Artificial Intelligence',
    'Machine Learning',
    'Deep Learning',
    'NLP',
    'Data Science',
  ],
  visualizationTools: ['Power BI', 'Microsoft Fabric', 'Snowflake'],
  domains: [
    { title: 'Cloud', items: ['AWS', 'Azure', 'GCP'] },
    { title: 'Stack', items: ['Java', 'Python', 'MEAN', 'MERN'] },
    { title: 'DevOps', items: ['Multiple Cloud', 'Single Cloud'] },
    { title: 'Embedded Systems, IoT', items: [] },
  ],
  addOns: ['AICTE Approved Internship Certificate', 'Stipend Based Internship Provided'],
  phone: '8019942233',
  email: 'hr@aotms.com',
  address: '2nd Floor, Pothuri Towers, MG Rd near DV Manor, Vijayawada - 540010',
};

const RX = {
  greeting:
    /^(hi+|hello+|hey+|hlo+|namaste|hai|vanakkam|start|good\s*(morning|afternoon|evening))[\s!.,]*$/i,
  thanks: /^(thanks?|thank\s*you|tq|ok(ay)?|k|kk|fine|great|super|done|noted)[\s!.,]*$/i,
  project:
    /\b(projects?|final\s*year|mini\s*project|major\s*project|college\s*project|academic\s*project|semester\s*project)\b/i,
  internship: /\b(internship|intern|certificate|certification|stipend|aicte)\b/i,
  fees: /\b(fee|fees|price|pricing|cost|charges?|payment|emi|installments?)\b/i,
  duration: /\b(duration|how\s*(many|much)\s*(months?|time|days?)|how\s*long|timeline)\b/i,
  batch: /\b(batch|batches|timing|timings|weekend|weekday|morning|evening|schedule)\b/i,
  placement: /\b(placement|placements|job|jobs|salary|package|career|interview)\b/i,
  demo: /\b(free\s*demo|demo|trial|sample\s*class)\b/i,
  callback: /\b(call\s*me|call\s*back|callback|talk\s*to|speak\s*to|counsell?or|expert|contact\s*me)\b/i,
  location: /\b(location|address|where|branch|campus|vijayawada|near\s*me|reach)\b/i,
  contact: /\b(contact|phone|number|email|mail|whatsapp)\b/i,
  menu: /\b(courses?|course\s*list|menu|all\s*courses|details|info|information|syllabus)\b/i,
};

// Short messages that only make sense as an answer to a broadcast. "yes",
// "interested", "details" etc. must resolve against the blast, never against
// the generic course menu.
const BLAST_FOLLOW_UP =
  /^(?:yes|yeah|yep|yup|ya|haan|ha|avunu|sure|ok|okay|okey|k|kk|fine|interested|i\s*am\s*interested|details|detail|full\s*details|course\s*details|more\s*details|more\s*info|more\s*information|tell\s*me\s*more|send\s*details|send\s*me\s*details|send\s*info|send\s*me\s*info|share\s*details|share\s*me\s*details|share\s*info|share\s*me\s*info|info|information|syllabus|price\s*details)[\s!.,]*$/i;

// Some poster keywords are also course names ("AI", "Power BI", "AWS"...).
// With these words in the message the customer wants training, not a project.
const COURSE_INTENT = /\b(courses?|training|classes|batches?|syllabus|placement|duration|fees?)\b/i;

const COURSE_ALIASES = [
  { re: /\b(data\s*analytics|data\s*science|power\s*bi|tableau|advanced\s*excel)\b/i, name: /data analytics/i },
  { re: /\b(mern|mean|full\s*stack\s*web|web\s*dev\w*|react|nodejs|node\.js|node)\b/i, name: /mern|web development/i },
  { re: /\b(python|django)\b/i, name: /python/i },
  { re: /\b(digital\s*marketing|seo|google\s*ads|social\s*media|meta\s*ads)\b/i, name: /digital marketing/i },
  { re: /\b(java|spring|spring\s*boot)\b/i, name: /java/i },
  { re: /\b(cyber|hacking|vapt|soc)\b/i, name: /cyber/i },
  { re: /\b(testing|selenium|qa|automation\s*testing)\b/i, name: /testing/i },
  { re: /\b(aws|cloud|devops|docker|kubernetes)\b/i, name: /aws|cloud|devops/i },
  // "AI course" / "AI demo" — the closest training program is Data Analytics & AI.
  { re: /\bai\b/i, name: /\bai\b/i },
];

// ── Small text helpers ─────────────────────────────────────────────────────────
function stripFiller(text) {
  return String(text || '')
    .replace(/\b(sir|madam|garu|bro|akka|dear|please|pls|plz)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolvePhone(config) {
  return config?.counsellorPhone || PROJECT_OFFERING.phone;
}

function contactFooter(config) {
  return `📞 ${resolvePhone(config)} | ✉️ ${PROJECT_OFFERING.email}`;
}

function firstName(lead) {
  const raw = String(lead?.name || '').trim();
  if (!raw || /^whatsapp\s+(lead|contact)$/i.test(raw)) return '';
  return raw.split(/\s+/)[0];
}

function formatMoney(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

function feeAmount(course) {
  const n = parseInt(String(course?.fee || '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function feeRange(courses = []) {
  const amounts = courses.map(feeAmount).filter(Boolean);
  if (!amounts.length) return '';
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

function durationList(courses = []) {
  const list = [...new Set(courses.map((c) => String(c?.duration || '').trim()).filter(Boolean))];
  if (!list.length) return '3 – 6 months';
  return list.join(', ');
}

function matchCourse(text, courses = []) {
  const raw = String(text || '').toLowerCase();
  if (!raw) return null;

  // Exact course name / short title mentioned inside the message
  for (const course of courses) {
    const names = [course?.name, course?.shortTitle]
      .filter(Boolean)
      .map((n) => String(n).toLowerCase());
    if (names.some((n) => n.length >= 4 && raw.includes(n))) return course;
  }

  // Keyword aliases → the closest configured course
  for (const alias of COURSE_ALIASES) {
    if (!alias.re.test(raw)) continue;
    const hit = courses.find((c) => alias.name.test(String(c?.name || '')));
    if (hit) return hit;
  }

  return null;
}

function courseFromLead(lead, courses = []) {
  const wanted = String(lead?.customFields?.lastSelectedCourse || lead?.customFields?.interested || '').toLowerCase();
  if (!wanted) return null;
  return courses.find((c) => String(c?.name || '').toLowerCase() === wanted) || null;
}

// Readable name of the broadcast the customer is answering, e.g.
// "data_analytics_offer_2026" -> "data analytics offer 2026".
function humanizeBlastLabel(blast) {
  const raw = String(blast?.courseHint || blast?.label || blast?.templateName || blast?.description || '')
    .replace(/\[\s*template\s*:\s*/gi, ' ')
    .replace(/[[\]_\-|]+/g, ' ')
    .replace(/\b(template|broadcast|blast|message|msg)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Generic template names carry no offer context — never quote them back.
  if (/^(hello\s*world|hello|hi+|hey|welcome|test|sample|campaign|greeting|aotms)$/i.test(raw)) return '';
  return raw.slice(0, 60);
}

// Which course was the blast about? Template names such as
// "mern_fullstack_2026" or "aws_cloud_batch" are matched through the aliases.
function courseFromBlast(blast, courses = []) {
  if (!blast) return null;
  const hay = [blast.courseHint, blast.label, blast.templateName, blast.description]
    .filter(Boolean)
    .join(' ')
    .replace(/[_\-]+/g, ' ');
  if (!hay.trim()) return null;
  return matchCourse(hay, courses);
}

// ── Poster topics: one keyword group per item printed on the poster ────────────
const POSTER_CLOUD = 'Cloud: AWS, Azure, GCP';
const POSTER_STACK = 'Stack: Java, Python, MEAN, MERN';
const POSTER_VIZ = 'Visualization: Power BI, Microsoft Fabric, Snowflake';
const POSTER_ADDONS = `Add-ons: ${PROJECT_OFFERING.addOns.join(' • ')}`;

/**
 * Ordered most-specific → most-generic; the first match wins.
 * `requiresProjectContext` = the keyword is also a course name ("aws", "power
 * bi", "python"...), so it only answers as a project when the message actually
 * talks about a project; otherwise the course card is the better answer.
 */
const PROJECT_TOPICS = [
  {
    id: 'genai',
    re: /\b(generative|gen\s*ai|genai|llms?|large\s*language\s*models?)\b/i,
    emoji: '✨',
    title: 'Generative AI — Final Year Project',
    bullets: [
      'Technology: Generative AI, Agentic AI',
      POSTER_STACK,
      `${POSTER_CLOUD} • ${POSTER_VIZ}`,
    ],
    hint: 'Send your branch and the idea you want to build — for example *"GenAI chatbot for college admissions"*.',
  },
  {
    id: 'agentic',
    re: /\b(agentic|ai\s*agents?|autonomous\s*agents?)\b/i,
    emoji: '🤖',
    title: 'Agentic AI — Final Year Project',
    bullets: ['Technology: Agentic AI, Generative AI', POSTER_STACK, POSTER_CLOUD],
    hint: 'Tell me your branch and the task you want the AI agent to handle.',
  },
  {
    id: 'snowflake',
    re: /\b(snowflake)\b/i,
    emoji: '❄️',
    title: 'Snowflake — Final Year Project',
    bullets: [
      'Tool: Snowflake (Data Visualization)',
      'Combine with: Data Science, Machine Learning, AI',
      'Also available: Power BI, Microsoft Fabric',
    ],
    hint: 'Share your branch and the dataset you want to visualize.',
  },
  {
    id: 'fabric',
    re: /\b(microsoft\s*fabric|fabric)\b/i,
    emoji: '🧵',
    title: 'Microsoft Fabric — Final Year Project',
    bullets: [
      'Tool: Microsoft Fabric (Data Visualization)',
      'Combine with: Data Science, Machine Learning, AI',
      'Also available: Power BI, Snowflake',
    ],
    hint: 'Share your branch and the dataset you want to visualize.',
  },
  {
    id: 'visualization',
    re: /\b(data\s*visuali[sz]ation|visuali[sz]ation|data\s*viz|dashboards?)\b/i,
    emoji: '📊',
    title: 'Data Visualization — Final Year Project',
    bullets: [
      'Tools: Power BI, Microsoft Fabric, Snowflake',
      'Combine with: Data Science, Machine Learning, AI',
      `${POSTER_CLOUD} • ${POSTER_STACK}`,
    ],
    hint: 'Tell me your branch and the data you want to visualize.',
  },
  {
    id: 'powerbi',
    re: /\b(power\s*bi|powerbi)\b/i,
    requiresProjectContext: true,
    emoji: '📊',
    title: 'Power BI — Final Year Project',
    bullets: [
      'Tool: Power BI (Data Visualization)',
      'Combine with: Data Science, Machine Learning, AI',
      'Also available: Microsoft Fabric, Snowflake',
    ],
    hint: 'Share your branch and the dataset you want to visualize.',
  },
  {
    id: 'nlp',
    re: /\b(nlp|natural\s*language\s*processing|text\s*(?:analytics|mining)|sentiment\s*analysis)\b/i,
    emoji: '💬',
    title: 'NLP — Final Year Project',
    bullets: ['Technology: NLP, Deep Learning, Machine Learning', POSTER_STACK, POSTER_VIZ],
    hint: 'Share your branch and the language task you have in mind.',
  },
  {
    id: 'deeplearning',
    re: /\b(deep\s*learning|\bdl\b|neural\s*net\w*)\b/i,
    emoji: '🧠',
    title: 'Deep Learning — Final Year Project',
    bullets: ['Technology: Deep Learning, Machine Learning, NLP', POSTER_STACK, POSTER_VIZ],
    hint: 'Share your branch and the model or dataset you want to work with.',
  },
  {
    id: 'machinelearning',
    re: /\b(machine\s*learning|\bml\b)\b/i,
    emoji: '⚙️',
    title: 'Machine Learning — Final Year Project',
    bullets: ['Technology: Machine Learning, Deep Learning, Data Science', POSTER_STACK, POSTER_VIZ],
    hint: 'Share your branch and the problem you want the model to solve.',
  },
  {
    id: 'datascience',
    re: /\b(data\s*science|data\s*analytics)\b/i,
    requiresProjectContext: true,
    emoji: '📈',
    title: 'Data Science — Final Year Project',
    bullets: [
      'Technology: Data Science, Machine Learning, Artificial Intelligence',
      POSTER_VIZ,
      POSTER_STACK,
    ],
    hint: 'Share your branch and the dataset you want to analyze.',
  },
  {
    id: 'ai',
    re: /\b(artificial\s*intelligence|ai)\b/i,
    courseKeyword: true,
    emoji: '🤖',
    title: 'Artificial Intelligence — Final Year Project',
    bullets: [
      'Technologies: Artificial Intelligence, Machine Learning, Deep Learning, NLP, Generative AI, Agentic AI, Data Science',
      POSTER_VIZ,
      POSTER_STACK,
    ],
    hint: 'Reply with your branch and the AI idea you prefer. (Want training instead of a project? Our course is *Data Analytics & AI*.)',
  },
  {
    id: 'aicte',
    re: /\b(aicte|certificate|certification)\b/i,
    hideAddOns: true,
    emoji: '🏅',
    title: 'AICTE Approved Internship Certificate',
    bullets: [
      'Add-on: AICTE Approved Internship Certificate',
      'Also included: Stipend Based Internship Provided',
      `Part of ${PROJECT_OFFERING.program} for ${PROJECT_OFFERING.audience}`,
    ],
    hint: 'Reply with your branch and domain to start the project + internship.',
  },
  {
    id: 'stipend',
    re: /\b(stipend|stipend\s*based|paid\s*internship)\b/i,
    hideAddOns: true,
    emoji: '💼',
    title: 'Stipend Based Internship Provided',
    bullets: [
      'Add-on: Stipend Based Internship Provided',
      'Also included: AICTE Approved Internship Certificate',
      `Part of ${PROJECT_OFFERING.program} for ${PROJECT_OFFERING.audience}`,
    ],
    hint: 'Reply with your branch and domain to start the project + internship.',
  },
  {
    id: 'embedded',
    re: /\b(embedded|microcontroller\w*|arduino|raspberry\s*pi)\b/i,
    emoji: '🔌',
    title: 'Embedded Systems — Final Year Project',
    bullets: [
      'Domain: Embedded Systems, IoT',
      'Companion app stack: Java, Python, MEAN, MERN',
      POSTER_VIZ,
    ],
    hint: 'Share your branch and the hardware idea you have.',
  },
  {
    id: 'iot',
    re: /\b(iot|internet\s*of\s*things)\b/i,
    emoji: '📡',
    title: 'IoT — Final Year Project',
    bullets: [
      'Domain: Embedded Systems, IoT',
      'Companion app stack: Java, Python, MEAN, MERN',
      POSTER_VIZ,
    ],
    hint: 'Share your branch and the IoT idea you like — for example *"smart agriculture monitoring"*.',
  },
  {
    id: 'multicloud',
    re: /\b(multi\s*cloud|multiple\s*cloud|multicloud)\b/i,
    emoji: '🛠️',
    title: 'DevOps — Multiple Cloud Project',
    bullets: [
      'Domain: DevOps — Multiple Cloud',
      'Clouds: AWS, Azure, GCP',
      'Also available: Single Cloud DevOps',
    ],
    hint: 'Tell me your branch and the two clouds you want to combine.',
  },
  {
    id: 'singlecloud',
    re: /\b(single\s*cloud)\b/i,
    emoji: '🛠️',
    title: 'DevOps — Single Cloud Project',
    bullets: [
      'Domain: DevOps — Single Cloud',
      'Clouds: AWS, Azure, GCP',
      'Also available: Multiple Cloud DevOps',
    ],
    hint: 'Tell me your branch and the cloud you prefer.',
  },
  {
    id: 'devops',
    re: /\b(devops|ci\/?cd|docker|kubernetes)\b/i,
    requiresProjectContext: true,
    emoji: '🛠️',
    title: 'DevOps — Final Year Project',
    bullets: ['Domain: DevOps — Multiple Cloud, Single Cloud', 'Cloud: AWS, Azure, GCP', POSTER_STACK],
    hint: 'Share your branch and the cloud setup you prefer.',
  },
  {
    id: 'azure',
    re: /\b(azure)\b/i,
    emoji: '☁️',
    title: 'Azure — Final Year Project',
    bullets: ['Domain: Cloud — Azure', 'Also available: AWS, GCP', 'DevOps: Single Cloud, Multiple Cloud'],
    hint: 'Share your branch and the idea you want to deploy on Azure.',
  },
  {
    id: 'gcp',
    re: /\b(gcp|google\s*cloud)\b/i,
    emoji: '☁️',
    title: 'GCP — Final Year Project',
    bullets: ['Domain: Cloud — GCP', 'Also available: AWS, Azure', 'DevOps: Single Cloud, Multiple Cloud'],
    hint: 'Share your branch and the idea you want to deploy on GCP.',
  },
  {
    id: 'aws',
    re: /\b(aws|amazon\s*web\s*services)\b/i,
    requiresProjectContext: true,
    emoji: '☁️',
    title: 'AWS — Final Year Project',
    bullets: ['Domain: Cloud — AWS', 'Also available: Azure, GCP', 'DevOps: Single Cloud, Multiple Cloud'],
    hint: 'Share your branch and the idea you want to deploy on AWS.',
  },
  {
    id: 'mean',
    re: /\b(mean)\b/i,
    requiresProjectContext: true,
    emoji: '💻',
    title: 'MEAN Stack — Final Year Project',
    bullets: ['Domain: Stack — MEAN', 'Other stacks: Java, Python, MERN', POSTER_CLOUD],
    hint: 'Share your branch and the module you want to build.',
  },
  {
    id: 'mern',
    re: /\b(mern)\b/i,
    requiresProjectContext: true,
    emoji: '💻',
    title: 'MERN Stack — Final Year Project',
    bullets: ['Domain: Stack — MERN', 'Other stacks: Java, Python, MEAN', POSTER_CLOUD],
    hint: 'Share your branch and the module you want to build.',
  },
  {
    id: 'python',
    re: /\b(python|django)\b/i,
    requiresProjectContext: true,
    emoji: '💻',
    title: 'Python Stack — Final Year Project',
    bullets: ['Domain: Stack — Python', 'Other stacks: Java, MEAN, MERN', POSTER_VIZ],
    hint: 'Share your branch and the project idea you have.',
  },
  {
    id: 'java',
    re: /\b(java|spring\s*boot)\b/i,
    requiresProjectContext: true,
    emoji: '💻',
    title: 'Java Stack — Final Year Project',
    bullets: ['Domain: Stack — Java', 'Other stacks: Python, MEAN, MERN', POSTER_VIZ],
    hint: 'Share your branch and the project idea you have.',
  },
  {
    id: 'stack',
    re: /\b(stack|tech\s*stack|project\s*stack)\b/i,
    requiresProjectContext: true,
    emoji: '💻',
    title: 'Project Stack — Final Year Project',
    bullets: [
      'Stacks: Java, Python, MEAN, MERN',
      'AI layer: Generative AI, Agentic AI, AI, ML, DL, NLP, Data Science',
      POSTER_VIZ,
    ],
    hint: 'Tell me the stack you are comfortable with and the project idea.',
  },
  {
    id: 'cloud',
    re: /\b(cloud)\b/i,
    requiresProjectContext: true,
    emoji: '☁️',
    title: 'Cloud — Final Year Project',
    bullets: ['Domain: Cloud — AWS, Azure, GCP', 'DevOps: Multiple Cloud, Single Cloud', POSTER_STACK],
    hint: 'Tell me your branch and whether you want single or multiple cloud.',
  },
  {
    id: 'eligibility',
    re: /\b(eligib\w*|who\s*can\s*(?:apply|join)|which\s*(?:branch|stream)s?)\b/i,
    hideAddOns: true,
    emoji: '🎓',
    title: `Eligibility — ${PROJECT_OFFERING.program}`,
    bullets: [
      `Who can join: ${PROJECT_OFFERING.audience}`,
      `Domains: Cloud (AWS, Azure, GCP) • Stack (Java, Python, MEAN, MERN) • DevOps (Multiple/Single Cloud) • Embedded Systems, IoT`,
      POSTER_ADDONS,
    ],
    hint: 'Tell me your branch and domain to get the project plan and fee.',
  },
];

function posterFooter(config) {
  return (
    `📞 *${resolvePhone(config)}*  •  ✉️ ${PROJECT_OFFERING.email}\n` +
    `📍 ${PROJECT_OFFERING.address}`
  );
}

function buildProjectTopicReply(topicId, config) {
  const topic = PROJECT_TOPICS.find((t) => t.id === topicId);
  if (!topic) return projectsReply(config);
  const bullets = topic.bullets.map((line) => `• ${line}`).join('\n');
  // Add-on topics already list the add-ons in their bullets.
  const addOnBlock = topic.hideAddOns ? '' : `🎁 ${POSTER_ADDONS}\n\n`;
  return (
    `${topic.emoji} *${topic.title}*\n` +
    `_${PROJECT_OFFERING.program} • ${PROJECT_OFFERING.audience}_\n\n` +
    `${bullets}\n\n` +
    addOnBlock +
    `${topic.hint}\n\n` +
    posterFooter(config)
  );
}

// Keyword → poster topic. Topics that are also course names only answer as a
// project when the customer actually talks about a project.
function matchProjectTopic(text, hasProjectContext = false) {
  const raw = String(text || '');
  if (!raw.trim()) return null;
  // "AI course" is a training enquiry, not a project enquiry — let the course
  // card answer it.
  const courseIntent = !hasProjectContext && COURSE_INTENT.test(raw);
  for (const topic of PROJECT_TOPICS) {
    if (topic.requiresProjectContext && !hasProjectContext) continue;
    if (courseIntent && topic.courseKeyword) continue;
    if (topic.re.test(raw)) return topic;
  }
  return null;
}

// Full poster — used for "project", "final year project" and unknown project questions.
function projectsReply(config) {
  const domains = PROJECT_OFFERING.domains
    .map((d) => (d.items.length ? `• *${d.title}* — ${d.items.join(', ')}` : `• *${d.title}*`))
    .join('\n');
  return (
    `🎓 *${PROJECT_OFFERING.headline}*\n` +
    `_${PROJECT_OFFERING.brand} — ${PROJECT_OFFERING.tagline}_\n\n` +
    `🤖 *Technologies*\n${PROJECT_OFFERING.technologies.join(', ')}\n\n` +
    `📊 *Data Visualization*\n${PROJECT_OFFERING.visualizationTools.join(', ')}\n\n` +
    `🧩 *Project Domains*\n${domains}\n\n` +
    `🎁 *Add-ons*\n${PROJECT_OFFERING.addOns.map((a) => `• ${a}`).join('\n')}\n\n` +
    `Reply with any keyword — *GenAI*, *Agentic AI*, *AI*, *ML*, *DL*, *NLP*, *Data Science*, *Power BI*, *Fabric*, *Snowflake*, *AWS*, *Azure*, *GCP*, *Java*, *Python*, *MEAN*, *MERN*, *DevOps* (single/multi cloud), *Embedded*, *IoT* — and I'll send that domain's project plan.\n\n` +
    posterFooter(config)
  );
}

function feesReply(courses, config) {
  const range = feeRange(courses);
  return (
    `💰 *Fees*\n` +
    (range ? `Course fees are between *${range}* depending on the program (${durationList(courses)}).\n` : '') +
    `Final-year project fees depend on the domain you choose.\n\n` +
    `Reply with the course or domain — for example *AWS fees* or *AI project fee* — and I'll share the exact amount.\n` +
    contactFooter(config)
  );
}

function durationReply(courses, config) {
  return (
    `⏳ *Duration*\n` +
    `Our programs run ${durationList(courses)} depending on the course.\n` +
    `Classes are available online and in the classroom, with weekday and weekend batches.\n\n` +
    `Reply with the course name for its exact duration.\n` +
    contactFooter(config)
  );
}

function batchReply(courses, config) {
  return (
    `🕒 *Batches*\n` +
    `Weekday and weekend batches are available in online and classroom mode.\n` +
    `Program lengths: ${durationList(courses)}.\n\n` +
    `Tell me the course and the time that suits you (morning or evening) and our counsellor will confirm your batch.\n` +
    contactFooter(config)
  );
}

function placementReply() {
  return (
    `🎯 *Placement Support*\n` +
    `Dedicated placement assistance — resume preparation, mock interviews and drives with hiring partners.\n` +
    `Every program also includes real-time projects and a completion certificate.\n\n` +
    `Which course are you planning? I'll share its placement track.`
  );
}

function internshipReply(config) {
  return (
    `🎁 *Internship Add-ons*\n` +
    PROJECT_OFFERING.addOns.map((a) => `✅ ${a}`).join('\n') +
    `\n\nIncluded with ${PROJECT_OFFERING.program} for ${PROJECT_OFFERING.audience}.\n` +
    `Share your branch and domain to get started.\n` +
    posterFooter(config)
  );
}

function locationReply(config) {
  return (
    `📍 *${PROJECT_OFFERING.brand} — Location*\n` +
    `${PROJECT_OFFERING.address}\n\n` +
    `Online batches are also available if you can't visit the campus.\n` +
    `📞 ${resolvePhone(config)}  •  ✉️ ${PROJECT_OFFERING.email}`
  );
}

// Photos, voice notes, documents and stickers carry nothing the bot can read.
// It still has to answer, otherwise the customer waits for a reply that never
// comes — so acknowledge the attachment and name the keyword they probably want.
const MEDIA_LABEL_RE = /^(🖼️|🎬|🎤|📄|💟|👤)/;

function mediaAckReply(config) {
  return (
    `📎 *Attachment received!*\n` +
    `I can't read photos or voice notes yet — please type your question.\n\n` +
    `Useful words: *location* (campus address & map), *fees*, *courses*, *demo*, or any project keyword (*AI*, *NLP*, *AWS*, *IoT*).\n` +
    posterFooter(config)
  );
}

function contactReply(config) {
  return (
    `🏛️ *${PROJECT_OFFERING.brand}* — _${PROJECT_OFFERING.tagline}_\n\n` +
    `📞 *Contact Us*\n` +
    `Phone / WhatsApp: ${resolvePhone(config)}\n` +
    `Email: ${PROJECT_OFFERING.email}\n` +
    `Address: ${PROJECT_OFFERING.address}`
  );
}

function demoQuestionReply() {
  return (
    `Sure — which course should the free demo be for?\n` +
    `Reply with the course name, for example *AWS demo* or *Python demo*, and our counsellor will confirm the slot.`
  );
}

function greetingReply(config, lead) {
  const name = firstName(lead);
  return (
    `Hi${name ? ` *${name}*` : ''}! 👋\n` +
    `How can I help — course fees/duration, or a *Final Year Project 2026* keyword: GenAI, Agentic AI, AI, ML, DL, NLP, Data Science, Power BI, Microsoft Fabric, Snowflake, AWS, Azure, GCP, Java, Python, MEAN, MERN, DevOps, Embedded, IoT, internship certificate, or a free demo?\n` +
    contactFooter(config)
  );
}

function menuAgainReply(courses) {
  const max = courses.length || 8;
  return (
    `The course list is just above ☝️\n` +
    `Reply with a course name or its number (1–${max}) and I'll send the full details.`
  );
}

// ── Replies used when the customer is answering a WhatsApp blast ───────────────
function blastAskCourseReply(config, blast, courses = []) {
  const label = humanizeBlastLabel(blast);
  const opened = label
    ? `Thanks for getting back to us about *${label}*! 🙌\n\n`
    : 'Thanks for your message! 🙌\n\n';
  const list = courses
    .slice(0, 6)
    .map((c, idx) => `${idx + 1}. ${c.name}`)
    .join('\n');
  return (
    `${opened}Which program should I send the details for?\n` +
    `${list}\n\n` +
    `Reply with the course name or its number, and I'll share fees, duration and the next batch.\n` +
    contactFooter(config)
  );
}

function blastFallbackReply(config, blast) {
  const label = humanizeBlastLabel(blast);
  const opened = label ? `Thanks for your reply about *${label}*.\n\n` : '';
  return (
    `${opened}Tell me what you need and I'll answer that directly:\n` +
    `• Course fees, duration or syllabus\n` +
    `• Final-year project domains (AI, Cloud, DevOps, Embedded/IoT)\n` +
    `• AICTE internship certificate or a free demo\n\n` +
    `For example: *"MERN fees"*, *"AI final year project"* or *"AWS demo"*.\n` +
    contactFooter(config)
  );
}

function fallbackReply(config) {
  return (
    `I can help you with:\n` +
    `• Course details, fees and duration\n` +
    `• Final Year Projects 2026 keywords — GenAI, Agentic AI, AI, ML, DL, NLP, Data Science\n` +
    `• Data Visualization — Power BI, Microsoft Fabric, Snowflake\n` +
    `• Project domains — Cloud (AWS/Azure/GCP), Stack (Java/Python/MEAN/MERN), DevOps (single/multi cloud), Embedded Systems & IoT\n` +
    `• AICTE Approved Internship Certificate & Stipend Based Internship\n` +
    `• Free demo or a counsellor call-back\n\n` +
    `Tell me which one you need (for example *"AWS course fees"* or *"NLP project"*).\n` +
    contactFooter(config)
  );
}

// ── Canonical texts used for activity logging + duplicate detection ───────────
function buildGreetingSummary(config = {}, studentName = 'Student', courses = []) {
  const header = config.greetingHeader || '👋 Welcome to AOTMS!';
  const bodyText = String(config.greetingBody || '')
    .replace(/\{\{\s*name\s*\}\}/gi, studentName)
    .replace(/\{\{\s*1\s*\}\}/g, studentName);
  const courseListPreview = courses
    .slice(0, 10)
    .map((c, idx) => `${idx + 1}. *${c.name}* (${c.duration} • ${c.fee})`)
    .join('\n');
  return `${header}\n\n${bodyText}\n\n📚 *Courses Menu Sent:*\n${courseListPreview}`;
}

function buildCourseDetailText(course = {}) {
  const detailText =
    `📘 *Course:* ${course.name}\n` +
    `⏳ *Duration:* ${course.duration || '4 Months'}\n` +
    `💰 *Course Fee:* ${course.fee || 'Contact Counsellor'}\n` +
    `💻 *Mode:* ${course.mode || 'Online & Offline (Classroom)'}\n\n` +
    `✨ *Key Syllabus & Highlights:*\n${course.highlights || '100% Practical Training with Live Projects & Placement Support.'}\n\n` +
    `🎯 *Includes:* Real-Time Projects, Course Completion Certificate & Placement Assistance!\n\n` +
    `👇 *Choose an option below:*`;
  const logText = `🎓 *${course.name}*\n\n${detailText}\n\n[Buttons: 📅 Book Free Demo | 📞 Talk to Expert | 📚 All Courses]`;
  return { detailText, logText };
}

// ── Planner ───────────────────────────────────────────────────────────────────
/**
 * Decide how the bot should answer one inbound text message.
 *
 * @param {object}  params.blastContext  Broadcast the customer is answering
 *   ({ templateName, description, courseHint, sentAt }), or null. When present
 *   a short reply such as "yes" / "details" is resolved against the blast
 *   instead of falling back to the generic course menu.
 * @returns {{kind:'greeting_menu'|'course_details'|'demo_confirm'|'callback_confirm'|'text', intent:string, text?:string, course?:object}}
 */
function planBotReply({
  text,
  courses = [],
  config = {},
  lead = null,
  isFirstMessageInSession = false,
  blastContext = null,
}) {
  const raw = String(text || '').trim();
  const normalized = stripFiller(raw);
  const t = raw.toLowerCase();

  // Pure greeting — full menu only for the first message of the session
  if (RX.greeting.test(normalized)) {
    return isFirstMessageInSession
      ? { kind: 'greeting_menu', intent: 'greeting' }
      : { kind: 'text', intent: 'greeting', text: greetingReply(config, lead) };
  }

  // A shared location pin arrives as the word "Location"; every other attachment
  // type arrives as an emoji label — answer both instead of staying silent.
  if (MEDIA_LABEL_RE.test(raw)) {
    return { kind: 'text', intent: 'media', text: mediaAckReply(config) };
  }

  // Answer to a broadcast ("yes", "interested", "send details"...). This runs
  // BEFORE the plain acknowledgement check so "ok" after a blast is treated as
  // interest, not as the end of the conversation.
  if (blastContext && BLAST_FOLLOW_UP.test(normalized)) {
    const blastCourse = courseFromBlast(blastContext, courses) || courseFromLead(lead, courses);
    if (blastCourse) {
      return { kind: 'course_details', intent: 'blast_interest', course: blastCourse };
    }
    // The broadcast may itself have been a Final Year Projects campaign — answer
    // with that project's poster card instead of asking for a course name.
    const blastLabel = humanizeBlastLabel(blastContext);
    if (blastLabel) {
      const blastTopic = matchProjectTopic(blastLabel, true);
      if (blastTopic) {
        return {
          kind: 'text',
          intent: `project_${blastTopic.id}`,
          text: buildProjectTopicReply(blastTopic.id, config),
        };
      }
      if (RX.project.test(blastLabel)) {
        return { kind: 'text', intent: 'projects', text: projectsReply(config) };
      }
    }
    return { kind: 'text', intent: 'blast_interest', text: blastAskCourseReply(config, blastContext, courses) };
  }

  // Closing acknowledgements
  if (RX.thanks.test(normalized)) {
    return {
      kind: 'text',
      intent: 'ack',
      text: `🙏 Happy to help! If you need course fees, project domains or a demo, just tell me.`,
    };
  }

  // "1".."10" — the customer is picking a numbered course
  if (/^\d{1,2}$/.test(raw)) {
    const picked = courses[Number(raw) - 1];
    if (picked) return { kind: 'course_details', intent: 'course_selection', course: picked };
  }

  // Free demo / counsellor callback are explicit actions — checked before the
  // poster keywords so "AWS demo" still books a demo.
  if (RX.demo.test(t)) {
    const demoCourse =
      matchCourse(t, courses) || courseFromBlast(blastContext, courses) || courseFromLead(lead, courses);
    return demoCourse
      ? { kind: 'demo_confirm', intent: 'demo', course: demoCourse }
      : { kind: 'text', intent: 'demo', text: demoQuestionReply() };
  }

  if (RX.callback.test(t)) {
    return { kind: 'callback_confirm', intent: 'callback' };
  }

  // Final Year Projects 2026 poster: every printed keyword (technologies,
  // visualization tools, project domains, add-ons) answers with its own reply.
  const hasProjectContext = RX.project.test(t);
  const projectTopic = matchProjectTopic(t, hasProjectContext);
  if (projectTopic) {
    return {
      kind: 'text',
      intent: `project_${projectTopic.id}`,
      text: buildProjectTopicReply(projectTopic.id, config),
    };
  }

  if (RX.internship.test(t)) {
    return { kind: 'text', intent: 'internship', text: internshipReply(config) };
  }

  const course = matchCourse(t, courses);
  if (course) {
    // Any course-specific question (fees, duration, syllabus, stack...) → detail card
    return { kind: 'course_details', intent: 'course_details', course };
  }

  if (RX.fees.test(t)) return { kind: 'text', intent: 'fees', text: feesReply(courses, config) };
  if (RX.duration.test(t)) return { kind: 'text', intent: 'duration', text: durationReply(courses, config) };
  if (RX.batch.test(t)) return { kind: 'text', intent: 'batch', text: batchReply(courses, config) };
  if (RX.placement.test(t)) return { kind: 'text', intent: 'placement', text: placementReply() };
  if (RX.location.test(t)) return { kind: 'text', intent: 'location', text: locationReply(config) };
  if (RX.contact.test(t)) return { kind: 'text', intent: 'contact', text: contactReply(config) };

  // A project question with no recognisable keyword → send the whole poster.
  if (hasProjectContext) {
    return { kind: 'text', intent: 'projects', text: projectsReply(config) };
  }

  if (RX.menu.test(t)) {
    if (blastContext) {
      // Right after a broadcast "courses/details" means "tell me the options for
      // what you just sent", not "the list is above" (the customer never got one).
      return { kind: 'text', intent: 'menu', text: blastAskCourseReply(config, blastContext, courses) };
    }
    return isFirstMessageInSession
      ? { kind: 'greeting_menu', intent: 'menu' }
      : { kind: 'text', intent: 'menu', text: menuAgainReply(courses) };
  }

  // Nothing recognisable: greet first-timers, otherwise ask a focused question
  if (isFirstMessageInSession) {
    return { kind: 'greeting_menu', intent: 'first_contact' };
  }
  return {
    kind: 'text',
    intent: 'fallback',
    text: blastContext ? blastFallbackReply(config, blastContext) : fallbackReply(config),
  };
}

module.exports = {
  PROJECT_OFFERING,
  buildGreetingSummary,
  buildCourseDetailText,
  planBotReply,
  matchCourse,
};
