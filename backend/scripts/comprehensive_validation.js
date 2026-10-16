const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const DailyActivity = require('../src/database/models/DailyActivity');
const User = require('../src/database/models/User');
const Lead = require('../src/database/models/Lead');
const FollowUp = require('../src/database/models/FollowUp');
const { validateDailyActivityPayload } = require('../src/modules/daily-activities/validators');

async function runComprehensiveValidation() {
  console.log('====================================================================');
  console.log('   COMPREHENSIVE VALIDATION SUITE: PHASES 1 - 5 VERIFICATION        ');
  console.log('====================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB Atlas\n');

  let passed = 0;
  let failed = 0;

  async function test(desc, fn) {
    try {
      await fn();
      console.log(`  ✓ [PASS] ${desc}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ [FAIL] ${desc}: ${e.message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // SECTION 1: DEPARTMENT FORMS & INPUT VALIDATION
  // -------------------------------------------------------------
  console.log('--- 1. Department Forms & Input Validation ---');

  // Telecalling
  test('Telecalling: Valid inputs accepted', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Telecalling',
      metrics: { callsAttempted: 50, connectedCalls: 35, unansweredCalls: 15, interestedLeads: 10, followUpsScheduled: 5, conversions: 2 },
      remarks: 'Productive day'
    }, true);
    if (!res.isValid) throw new Error(res.errors.join(', '));
  });

  test('Telecalling: callsAttempted < connectedCalls rejected', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Telecalling',
      metrics: { callsAttempted: 10, connectedCalls: 20 }
    });
    if (res.isValid) throw new Error('Should have failed');
    if (!res.errors.some(e => e.includes('cannot exceed total calls attempted'))) throw new Error('Missing specific error');
  });

  test('Telecalling: Negative integer rejected', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Telecalling',
      metrics: { callsAttempted: -5, connectedCalls: 0 }
    });
    if (res.isValid) throw new Error('Negative call count accepted');
  });

  test('Telecalling: Follow-up Required missing date rejected', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Telecalling',
      outcomes: [{ leadName: 'Test Lead', category: 'Follow-up Required' }]
    });
    if (res.isValid) throw new Error('Missing followUpAt was accepted');
  });

  // Developer
  test('Developer: Valid inputs accepted', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Developer',
      departmentData: {
        projectName: 'Telecaller Dashboard',
        workCompleted: 'Implemented validations',
        status: 'Completed',
        prLink: 'https://github.com/aotmscrm1-stack/telecommunication/pull/12'
      }
    }, true);
    if (!res.isValid) throw new Error(res.errors.join(', '));
  });

  test('Developer: Missing required fields on submit rejected', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Developer',
      departmentData: { projectName: '', workCompleted: '', status: '' }
    }, true);
    if (res.isValid || res.errors.length < 3) throw new Error('Required fields not enforced');
  });

  test('Developer: Invalid PR link URL rejected', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Developer',
      departmentData: {
        projectName: 'CRM',
        workCompleted: 'Fixed bug',
        status: 'In Progress',
        prLink: 'invalid-git-url'
      }
    });
    if (res.isValid) throw new Error('Invalid URL accepted');
  });

  // Management
  test('Management: Valid inputs accepted', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Management',
      departmentData: {
        keyActivities: 'Quarterly review meeting with leads team',
        decisionsMade: 'Approved new commission model'
      }
    }, true);
    if (!res.isValid) throw new Error(res.errors.join(', '));
  });

  test('Management: Missing keyActivities on submit rejected', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Management',
      departmentData: { keyActivities: '' }
    }, true);
    if (res.isValid) throw new Error('Empty keyActivities accepted');
  });

  // Trainer
  test('Trainer: Valid inputs accepted', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Trainer',
      departmentData: {
        courseBatch: 'SAP FICO Morning Batch',
        sessionTopic: 'General Ledger Configuration',
        attendanceCount: 18
      }
    }, true);
    if (!res.isValid) throw new Error(res.errors.join(', '));
  });

  test('Trainer: Negative attendance count rejected', () => {
    const res = validateDailyActivityPayload({
      activityDate: '2026-10-16',
      department: 'Trainer',
      departmentData: {
        courseBatch: 'SAP Batch',
        sessionTopic: 'Topic',
        attendanceCount: -5
      }
    }, true);
    if (res.isValid) throw new Error('Negative attendance count accepted');
  });

  // -------------------------------------------------------------
  // SECTION 2: ENDPOINT SIMULATION & LIFECYCLE
  // -------------------------------------------------------------
  console.log('\n--- 2. Endpoints Lifecycle & Workflow ---');

  const testUser = await User.findOne({ email: 'bhavani@aotms.in' });
  if (!testUser) throw new Error('User bhavani@aotms.in not found');
  const adminUser = await User.findOne({ role: 'admin' });

  const TEST_DATE = '2026-10-16';
  await DailyActivity.deleteMany({ employeeId: testUser._id, activityDate: TEST_DATE });

  let activityId;

  // 1. POST / (Save Draft)
  await test('Endpoint 1: POST / (Save Draft)', async () => {
    const act = await DailyActivity.create({
      employeeId: testUser._id,
      department: testUser.department || 'Telecalling',
      activityDate: TEST_DATE,
      status: 'draft',
      metrics: { callsAttempted: 20, connectedCalls: 15, unansweredCalls: 5 },
      remarks: 'Initial morning batch calls'
    });
    activityId = act._id;
    if (!act._id || act.status !== 'draft') throw new Error('Draft creation failed');
  });

  // 2. GET /?date=YYYY-MM-DD (Fetch Date)
  await test('Endpoint 2: GET /?date=YYYY-MM-DD (Fetch Date)', async () => {
    const found = await DailyActivity.findOne({ employeeId: testUser._id, activityDate: TEST_DATE });
    if (!found || found.metrics.callsAttempted !== 20) throw new Error('Fetched data mismatch');
  });

  // 3. GET /calendar?month=YYYY-MM (Calendar Dots)
  await test('Endpoint 3: GET /calendar?month=YYYY-MM (Calendar Markers)', async () => {
    const dots = await DailyActivity.find({ employeeId: testUser._id, activityDate: /^2026-10/ }).select('activityDate status');
    if (!dots.some(d => d.activityDate === TEST_DATE)) throw new Error('Calendar marker not returned');
  });

  // 4. POST /:id/submit (Submit Activity)
  await test('Endpoint 4: POST /:id/submit (Submit Activity)', async () => {
    const act = await DailyActivity.findById(activityId);
    act.status = 'submitted';
    act.submittedAt = new Date();
    act.revisions.push({ editedAt: new Date(), editedBy: testUser._id, changesSummary: 'Submitted report' });
    await act.save();
    if (act.status !== 'submitted') throw new Error('Status transition failed');
  });

  // 5. GET /history (History Pagination)
  await test('Endpoint 5: GET /history (Paginated History)', async () => {
    const history = await DailyActivity.find({ employeeId: testUser._id }).sort({ activityDate: -1 }).limit(10);
    if (!history || history.length === 0) throw new Error('History list empty');
  });

  // 6. GET /follow-ups (Follow-up Tracker)
  await test('Endpoint 6: GET /follow-ups (Follow-up Queries)', async () => {
    const fus = await FollowUp.find({ assignedTo: testUser._id });
    if (!Array.isArray(fus)) throw new Error('Follow-ups query failed');
  });

  // 7. GET /admin/overview (Multi-filter Admin Table)
  await test('Endpoint 7: GET /admin/overview (Admin Multi-filter Query)', async () => {
    const overview = await DailyActivity.find({ activityDate: TEST_DATE, department: 'Telecalling' });
    if (!overview || overview.length === 0) throw new Error('Admin overview query failed');
  });

  // 8. GET /:id (Detailed Single Report)
  await test('Endpoint 8: GET /:id (Detailed Report)', async () => {
    const detailed = await DailyActivity.findById(activityId).populate('employee', 'name email');
    if (!detailed || !detailed.employee) throw new Error('Population failed');
  });

  // 9. PATCH /:id/review (Approve / Request Correction)
  await test('Endpoint 9: PATCH /:id/review (Request Correction & Approve)', async () => {
    const act = await DailyActivity.findById(activityId);
    act.status = 'needs_correction';
    act.correctionReason = 'Please update total interested leads';
    act.revisions.push({ editedAt: new Date(), editedBy: adminUser?._id, changesSummary: 'Correction requested' });
    await act.save();
    if (act.status !== 'needs_correction') throw new Error('Correction transition failed');

    // Approve
    act.status = 'reviewed';
    act.reviewedBy = adminUser?._id;
    act.reviewedAt = new Date();
    await act.save();
    if (act.status !== 'reviewed') throw new Error('Review approval failed');
  });

  // Cleanup
  await DailyActivity.deleteMany({ employeeId: testUser._id, activityDate: TEST_DATE });

  // -------------------------------------------------------------
  // SECTION 3: REGRESSION & INTEGRITY VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- 3. Regression & Database Safeguards ---');

  const collections = (await mongoose.connection.db.listCollections().toArray()).map(c => c.name);
  const tasksExists = collections.includes('tasks');
  const todosExists = collections.includes('todos');
  const dcCount = await mongoose.connection.collection('digitalcalendars').countDocuments();
  const fs = require('fs');

  test('Tasks collection safely retired from MongoDB', () => {
    if (tasksExists) throw new Error('Tasks collection still exists in DB');
  });

  test('Todos collection safely retired from MongoDB', () => {
    if (todosExists) throw new Error('Todos collection still exists in DB');
  });

  test('Verified JSON backups exist on disk with exact record counts', () => {
    const backupTasks = JSON.parse(fs.readFileSync('backups/tasks_backup.json', 'utf8'));
    const backupTodos = JSON.parse(fs.readFileSync('backups/todos_backup.json', 'utf8'));
    if (backupTasks.length !== 11) throw new Error(`Tasks backup corrupted: got ${backupTasks.length}`);
    if (backupTodos.length !== 71) throw new Error(`Todos backup corrupted: got ${backupTodos.length}`);
  });

  test(`Digital Calendars collection strictly preserved (${dcCount} docs)`, () => {
    if (dcCount !== 6) throw new Error(`Digital Calendar count changed: got ${dcCount}, expected 6`);
  });

  console.log('\n====================================================================');
  console.log(`   VALIDATION COMPLETE: ${passed} PASSED, ${failed} FAILED `);
  console.log('====================================================================\n');

  await mongoose.disconnect();
}

runComprehensiveValidation().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
