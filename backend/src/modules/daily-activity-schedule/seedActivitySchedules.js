require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const User = require('../../database/models/User');
const EmployeeDailyActivitySchedule = require('../../database/models/EmployeeDailyActivitySchedule');

const CONFIRMED_PROFILES = [
  {
    email: 'deenaz@aotms.in',
    employeeId: 'AOTMS-04',
    workingHours: {
      loginTime: '09:30 AM',
      logoutTime: '',
      note: 'Shift ends upon completion of daily follow-ups, demos, payments, and reviews'
    },
    keyResponsibilities: [
      'Maintain daily HR operations, staff attendance, and employee coordination',
      'Oversee trainer demo scheduling, preparations, and follow-ups',
      'Supervise college workshop handling (SRK College) and hackathon student ambassadors from different colleges',
      'Monitor fee collections, pending payments follow-ups, and verifications',
      'Coordinate active projects and organizational tracking',
      'Handle extra add-on administrative works and final evening reviews'
    ],
    regularActivities: [
      '10:00 AM: Check WhatsApp messages & updates',
      'Mails checking & incoming reviews',
      'Check students & staff activities',
      'Prepare daily work list & priorities',
      'Follow up on pending data & check latest enquiries',
      'Demo preparations & follow up with trainers for demos',
      'SRK College workshop handling',
      'Coordinate hackathon student ambassadors from different colleges',
      'Pending calls data follow-ups',
      'Pending payments follow-ups',
      'Project coordination & updates',
      'Review pending tasks & final follow-ups',
      'Extra add-on administrative works',
      'Before end of day: Review all pending activities, follow-ups, demos, payments, and coordination tasks'
    ],
    weeklyResponsibilities: [
      'Weekly HR operations review and alignment with MD'
    ],
    recurringMeetings: [
      {
        title: 'Department Heads Coordination Meeting',
        days: ['Monday'],
        time: '10:30 AM',
        description: 'Weekly alignment with MD and department heads'
      }
    ],
    additionalInformation: 'HR specialist responsibilities and institutional coordination.',
    publishStatus: 'published',
    isHrConfirmed: true,
    hrConfirmationNote: 'Confirmed schedule for HR Specialist.'
  },
  {
    email: 'bhavani@aotms.in',
    employeeId: 'AOTMS-18',
    workingHours: {
      loginTime: '09:00 AM',
      logoutTime: '05:45 PM',
      note: 'Eswar Sir update at 04:30 PM; post updates on groups before 05:45 PM logout'
    },
    keyResponsibilities: [
      'Staff & trainers on-time follow-ups & monitor late logins',
      "Trainers' breaks & classes check-up",
      'Collect student feedback for Jayveer',
      'Check and maintain daily ESSL attendance report',
      'Telecalling operations and candidate communication',
      'Follow up on JustDial (JD) and Meta enquiries',
      'Maintain college follow-ups in tracking sheet',
      'Maintain monthly water cans count',
      'Monitor Google, Instagram, and Facebook reviews',
      'Post daily work updates on official groups before logout'
    ],
    regularActivities: [
      '09:00 AM: Login and staff/trainers on-time punctuality check',
      "Trainers' breaks and classes monitoring",
      'Student feedback collection for Jayveer',
      'Daily ESSL attendance report generation',
      'Telecalling on candidate leads',
      'JustDial (JD) and Meta lead follow-ups',
      '04:30 PM: Daily update to Eswar Sir',
      'College follow-ups updating in tracking sheet',
      'Monthly water cans count maintenance',
      'Google, Instagram, and Facebook reviews monitoring',
      'Post daily work updates on groups before 05:45 PM logout'
    ],
    weeklyResponsibilities: [
      'Maintain weekly college follow-up records and review count summaries'
    ],
    recurringMeetings: [
      {
        title: 'Department Heads Meeting',
        days: ['Monday'],
        time: '10:30 AM',
        description: 'Weekly department heads meeting'
      },
      {
        title: 'Digital Marketing Meeting',
        days: ['Tuesday'],
        time: '10:30 AM',
        description: 'Weekly digital marketing meeting'
      },
      {
        title: 'Development Team Meeting',
        days: ['Wednesday'],
        time: '10:30 AM',
        description: 'Weekly development team meeting'
      },
      {
        title: 'Telecalling Meeting',
        days: ['Thursday'],
        time: '10:30 AM',
        description: 'Weekly telecalling meeting'
      },
      {
        title: 'Staff Employees Meeting',
        days: ['Friday'],
        time: '10:30 AM',
        description: 'Weekly staff employees meeting'
      },
      {
        title: 'Trainers Meeting with Rabbani',
        days: ['Saturday'],
        time: '02:30 PM',
        description: 'Meeting with Rabbani & trainers'
      },
      {
        title: 'Telecalling Evening Sync',
        days: ['Monday', 'Wednesday', 'Friday'],
        time: '05:30 PM',
        description: 'Evening telecalling meeting conducted every 2 days'
      }
    ],
    additionalInformation: 'Counseling, staff punctuality coordination, and cross-department meeting management.',
    publishStatus: 'published',
    isHrConfirmed: true,
    hrConfirmationNote: 'Confirmed schedule for Dasari Durga Bhavani.'
  },
  {
    email: 'rajasree@gmail.com',
    employeeId: 'AOTMS-23',
    workingHours: {
      loginTime: '09:30 AM',
      logoutTime: '06:30 PM',
      note: 'Standard shift: 09:30 AM to 06:30 PM'
    },
    keyResponsibilities: [
      'Handling SAP calls and doing regular follow-ups',
      'Handling old data calls and candidate follow-ups',
      'Posting promotional posters in student groups',
      'Creating meeting links on Thursdays',
      'Creating demo links for SAP'
    ],
    regularActivities: [
      '09:30 AM login and daily telecalling on SAP candidate leads',
      'Old data calling and student re-engagement follow-ups',
      'Posting educational and promotional posters in student groups',
      'Setting up and circulating SAP demo links'
    ],
    weeklyResponsibilities: [
      'Creating and circulating meeting links on Thursdays',
      'Weekly SAP demo calendar coordination'
    ],
    recurringMeetings: [
      {
        title: 'Thursday Telecalling Meeting',
        days: ['Thursday'],
        time: '10:30 AM',
        description: 'Weekly telecaller coordination and link distribution'
      }
    ],
    additionalInformation: 'Emp ID: 13, Role: Jr Telecaller (linked to CRM User AOTMS-23 Raja Sri).',
    publishStatus: 'published',
    isHrConfirmed: true,
    hrConfirmationNote: 'Confirmed schedule for Rajasree Vanukuru (Emp ID 13).'
  },
  {
    email: 'bhargav@aotms.in',
    employeeId: 'AOTMS-16',
    workingHours: {
      loginTime: '09:30 AM',
      logoutTime: '06:30 PM',
      note: 'Reference class hours (Nov 2026): ML Class (10:00 AM – 11:30 AM), Python Full Stack (05:00 PM – 06:30 PM)'
    },
    keyResponsibilities: [
      'Machine Learning (ML) class: 10:00 AM to 11:30 AM',
      'Python Full Stack class: 05:00 PM to 06:30 PM',
      'Completing course modules and practical assignments',
      'Giving technical demos for prospective students'
    ],
    regularActivities: [
      '09:30 AM: Login and lecture preparation',
      '10:00 AM – 11:30 AM: Machine Learning batch lecture and practicals',
      'Course module completion, student doubts clearing, and assignment evaluation',
      'Giving technical demos as scheduled',
      '05:00 PM – 06:30 PM: Python Full Stack class lecture and hands-on coding'
    ],
    weeklyResponsibilities: [
      'Track course syllabus completion and student project progress'
    ],
    recurringMeetings: [
      {
        title: 'Saturday Trainers Review Meeting',
        days: ['Saturday'],
        time: '02:30 PM',
        description: 'Weekly meeting with Rabbani and all trainers'
      }
    ],
    additionalInformation: 'Emp ID: 16, Role: Trainer.',
    publishStatus: 'published',
    isHrConfirmed: true,
    hrConfirmationNote: 'Confirmed schedule for Bhargav Possimsetty.'
  },
  {
    email: 'venkatasai@aotms.in',
    employeeId: 'AOTMS-09',
    workingHours: {
      loginTime: '11:00 AM',
      logoutTime: '07:45 PM',
      note: 'Online class from 08:00 AM – 09:15 AM; Office login at 11:00 AM (Chiranjeevi); Evening classes conclude between 07:45 PM and 08:00 PM'
    },
    keyResponsibilities: [
      'Conduct Computer Science (CS) online and offline classes',
      'Class preparation and note documentation (12:30 PM – 01:00 PM)',
      'Provide technical mentoring to individual students and batches'
    ],
    regularActivities: [
      '08:00 AM – 09:15 AM: Online Class',
      '11:00 AM: Login time (Chiranjeevi)',
      '11:15 AM – 12:30 PM: CS class online (Priyanka)',
      '12:30 PM – 01:00 PM: Preparation time note documentation',
      '01:00 PM – 02:30 PM: CS class offline (Yaswanth)',
      '03:00 PM – 04:30 PM: CS class offline (Surya)',
      '05:00 PM – 06:30 PM: CS class offline (Simrah)',
      '06:30 PM – 08:00 PM: Offline class (Oneeka, Lasya, Ganesh, Balaji, Abhinaya, Tejaswini)',
      '07:45 PM – 08:00 PM: Logout'
    ],
    weeklyResponsibilities: [
      'Weekly student syllabus progression and code evaluation'
    ],
    recurringMeetings: [
      {
        title: 'Saturday Trainers Review Meeting',
        days: ['Saturday'],
        time: '02:30 PM',
        description: 'Weekly meeting with Rabbani and all trainers'
      }
    ],
    additionalInformation: 'Lead Trainer - Computer Science. Reference class timetable preserved for informational transparency.',
    publishStatus: 'published',
    isHrConfirmed: true,
    hrConfirmationNote: 'Confirmed schedule for Venkat Sai.'
  },
  {
    email: 'adilakshmi@aotms.in',
    employeeId: 'AOTMS-05',
    workingHours: {
      loginTime: '09:30 AM',
      logoutTime: '05:30 PM',
      note: 'Class preparation: 09:30 AM – 10:00 AM; Lunch break: 01:00 PM – 01:30 PM'
    },
    keyResponsibilities: [
      'Prepare training materials and lab exercises for Data Analytics (DA)',
      'Conduct Data Analytics (DA) training batches',
      'Handle instructional video recordings and video editing (03:00 PM – 05:30 PM)'
    ],
    regularActivities: [
      '09:30 AM: Login to office',
      '09:30 AM – 10:00 AM: Prepare for class',
      '10:00 AM – 11:30 AM: Data Analytics (DA) class session 1',
      '11:30 AM – 01:00 PM: Data Analytics (DA) class session 2',
      '01:00 PM – 01:30 PM: Lunch break',
      '01:30 PM – 03:00 PM: Data Analytics (DA) class session 3',
      '03:00 PM – 05:30 PM: Video recordings and editings',
      '05:30 PM: Logout'
    ],
    weeklyResponsibilities: [
      'Weekly student project evaluation and video lecture archiving'
    ],
    recurringMeetings: [
      {
        title: 'Saturday Trainers Review Meeting',
        days: ['Saturday'],
        time: '02:30 PM',
        description: 'Weekly meeting with Rabbani and all trainers'
      }
    ],
    additionalInformation: 'Technical Trainer - Data Analytics (DA).',
    publishStatus: 'published',
    isHrConfirmed: true,
    hrConfirmationNote: 'Confirmed schedule for Adilakshmi Vemala.'
  },
  {
    email: 'moeen@aotms.in',
    employeeId: 'AOTMS-25',
    workingHours: {
      loginTime: '09:30 AM',
      logoutTime: '06:30 PM',
      note: 'Standard shift: 09:30 AM to 06:30 PM'
    },
    keyResponsibilities: [
      'Checking META comments and replying',
      'Creating posters / Carousel graphics',
      'Editing promotional and educational videos',
      'Taking photo and video shoots',
      'Scheduling reels or videos across brand accounts'
    ],
    regularActivities: [
      'Reviewing META (Facebook/Instagram) comments and responding to student inquiries',
      'Designing daily posters and carousels',
      'Editing videos for social media releases',
      'Taking photo/video shoots of students and trainers',
      'Scheduling reels and video posts'
    ],
    weeklyResponsibilities: [
      'Weekly video production calendar coordination'
    ],
    recurringMeetings: [
      {
        title: 'Digital Marketing Meeting',
        days: ['Tuesday'],
        time: '10:30 AM',
        description: 'Weekly creative content and marketing strategy review'
      }
    ],
    additionalInformation: 'Emp ID: 11, Role: Jr. Marketing Executive (linked to CRM User AOTMS-25 Moeen Ahmad Mahammad).',
    publishStatus: 'published',
    isHrConfirmed: true,
    hrConfirmationNote: 'Confirmed schedule for Moeen Ahmad (Emp ID 11).'
  },
  {
    email: 'manasa@aotms.in',
    employeeId: 'AOTMS-24',
    workingHours: {
      loginTime: '09:15 AM',
      logoutTime: '06:15 PM',
      note: 'Standard shift: 09:15 AM to 06:15 PM'
    },
    keyResponsibilities: [
      'Generating content for the week',
      'Planning the weekly marketing calendar',
      'Generating posters, reels, and carousels',
      'Posting content across social media accounts',
      'Reposting and managing Reshares across all social media accounts',
      'Run and monitor campaigns on Google Ads',
      'Research about SEO and keyword opportunities',
      'Checking LinkedIn comments and messages, reply to relevant enquiries',
      'Reviewing LinkedIn page reach, engagement, and follower growth'
    ],
    regularActivities: [
      '09:15 AM login and daily content planning',
      'Generating daily posters, reels, and carousel graphics',
      'Publishing content and coordinating Reshares across all handles',
      'Monitoring Google Ads campaigns and performance',
      'Conducting SEO research for target programs',
      'Checking LinkedIn messages and replying to enquiries',
      'Reviewing LinkedIn page metrics (reach, engagement, followers)'
    ],
    weeklyResponsibilities: [
      'Planning weekly content calendar',
      'Weekly digital marketing performance analytics reporting'
    ],
    recurringMeetings: [
      {
        title: 'Digital Marketing Meeting',
        days: ['Tuesday'],
        time: '10:30 AM',
        description: 'Weekly digital marketing strategy review'
      }
    ],
    additionalInformation: 'Emp ID: 12, Role: Digital Marketing Executive (linked to CRM User AOTMS-24 Chinthala Manasa).',
    publishStatus: 'published',
    isHrConfirmed: true,
    hrConfirmationNote: 'Confirmed schedule for Manasa Chinthala (Emp ID 12).'
  },
  {
    email: 'saadiya@aotms.in',
    employeeId: 'AOTMS-21',
    workingHours: {
      loginTime: '09:15 AM',
      logoutTime: '06:15 PM',
      note: '09:15 AM Login & Daily Planning; 06:15 PM Logout'
    },
    keyResponsibilities: [
      'Project Development & Execution',
      'Google Business Profile (GBP) Management',
      'SEO, AEO & GEO Activities',
      'Client Research & Lead Generation for Projects',
      'Project Maintenance & Monitoring',
      'Department Instagram Account Management'
    ],
    regularActivities: [
      '09:15 AM: Login & Daily Planning',
      'Daily: Project Development & Execution',
      'Daily: Google Business Profile (GBP) Management',
      'Daily: SEO, AEO & GEO Activities',
      'Daily: Client Research & Lead Generation for Projects',
      'Daily: Project Maintenance & Monitoring',
      'Daily: Department Instagram Account Management',
      '06:15 PM: Logout'
    ],
    weeklyResponsibilities: [
      'Weekly project review and technical SEO performance check'
    ],
    recurringMeetings: [
      {
        title: 'Weekly Team Meeting',
        days: ['Wednesday'],
        time: '10:30 AM',
        description: 'Development department weekly team meeting'
      }
    ],
    additionalInformation: 'Jr. Software Developer (AOTMS-21).',
    publishStatus: 'published',
    isHrConfirmed: true,
    hrConfirmationNote: 'Confirmed schedule for Saadiya Mohammad.'
  },
  {
    email: 'jayaveer@aotms.in',
    employeeId: 'AOTMS-20',
    workingHours: {
      loginTime: '09:15 AM',
      logoutTime: '06:15 PM',
      note: '09:15 AM Login & Daily Planning; 06:15 PM Logout'
    },
    keyResponsibilities: [
      'Project Development & Execution',
      'Google Business Profile (GBP) Management',
      'SEO, AEO & GEO Activities',
      'Client Research & Lead Generation for Projects',
      'Project Maintenance & Monitoring',
      'Department Instagram Account Management'
    ],
    regularActivities: [
      '09:15 AM: Login & Daily Planning',
      'Daily: Project Development & Execution',
      'Daily: Google Business Profile (GBP) Management',
      'Daily: SEO, AEO & GEO Activities',
      'Daily: Client Research & Lead Generation for Projects',
      'Daily: Project Maintenance & Monitoring',
      'Daily: Department Instagram Account Management',
      '06:15 PM: Logout'
    ],
    weeklyResponsibilities: [
      'Weekly sprint review and architectural milestone tracking'
    ],
    recurringMeetings: [
      {
        title: 'Weekly Team Meeting',
        days: ['Wednesday'],
        time: '10:30 AM',
        description: 'Development department weekly team meeting'
      }
    ],
    additionalInformation: 'Sr. Software Developer (AOTMS-20).',
    publishStatus: 'published',
    isHrConfirmed: true,
    hrConfirmationNote: 'Confirmed schedule for Ramanadham Jayaveer.'
  }
];

async function seedConfirmedSchedules() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB for Daily Activity Schedule seeding...');

  let createdCount = 0;
  let updatedCount = 0;

  for (const prof of CONFIRMED_PROFILES) {
    const user = await User.findOne({
      $or: [
        { email: prof.email.toLowerCase() },
        { employeeId: prof.employeeId }
      ]
    });

    if (!user) {
      console.warn(`User not found for ${prof.email} (${prof.employeeId}) — skipping`);
      continue;
    }

    const existing = await EmployeeDailyActivitySchedule.findOne({ employee: user._id });

    const scheduleData = {
      employee: user._id,
      workingHours: prof.workingHours,
      keyResponsibilities: prof.keyResponsibilities,
      regularActivities: prof.regularActivities,
      weeklyResponsibilities: prof.weeklyResponsibilities,
      recurringMeetings: prof.recurringMeetings,
      additionalInformation: prof.additionalInformation,
      publishStatus: prof.publishStatus,
      isHrConfirmed: prof.isHrConfirmed,
      hrConfirmationNote: prof.hrConfirmationNote,
      createdBy: user._id,
      updatedBy: user._id
    };

    if (!existing) {
      scheduleData.auditHistory = [{
        action: 'created',
        performedBy: user._id,
        performedAt: new Date(),
        summary: `Initial schedule configuration for ${user.name}`,
        fieldChanges: []
      }];
      await EmployeeDailyActivitySchedule.create(scheduleData);
      createdCount++;
      console.log(`Created confirmed schedule for ${user.name} (${user.employeeId})`);
    } else {
      const fieldChanges = [];
      // Compute field diffs if updating
      for (const [key, val] of Object.entries(scheduleData)) {
        if (key === 'auditHistory' || key === 'createdBy' || key === 'updatedBy' || key === 'employee') continue;
        const oldVal = existing[key];
        const oldStr = JSON.stringify(oldVal);
        const newStr = JSON.stringify(val);
        if (oldStr !== newStr) {
          fieldChanges.push({
            field: key,
            previousValue: typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal || ''),
            updatedValue: typeof val === 'object' ? JSON.stringify(val) : String(val || '')
          });
        }
      }

      const history = existing.auditHistory || [];
      if (fieldChanges.length > 0) {
        history.unshift({
          action: 'updated',
          performedBy: user._id,
          performedAt: new Date(),
          summary: `Updated schedule data based on confirmed work schedule specifications`,
          fieldChanges
        });
      }

      scheduleData.auditHistory = history;
      await EmployeeDailyActivitySchedule.updateOne({ _id: existing._id }, { $set: scheduleData });
      updatedCount++;
      console.log(`Updated confirmed schedule for ${user.name} (${user.employeeId}) with ${fieldChanges.length} changes`);
    }
  }

  console.log(`Seeding complete: ${createdCount} created, ${updatedCount} updated.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  seedConfirmedSchedules().then(() => process.exit(0)).catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = { seedConfirmedSchedules, CONFIRMED_PROFILES };
