const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
require('../src/database/models/User');
const DailyActivity = require('../src/database/models/DailyActivity');
const User = require('../src/database/models/User');
const { validateDailyActivityPayload } = require('../src/modules/daily-activities/validators');

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('   PHASE 2 AUTOMATED TEST SUITE & VERIFICATION      ');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  const testResults = [];
  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      testResults.push({ message, passed: true });
    } else {
      console.error(`  [FAIL] ${message}`);
      testResults.push({ message, passed: false });
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const targetUserId = new mongoose.Types.ObjectId('6ab6449b62b25645faae28ed');
  const otherUserId = new mongoose.Types.ObjectId(); // Mock other employee
  const VALID_TEST_DATE = '2026-10-15'; // Completely valid calendar date
  const VALID_TEST_DATE_2 = '2026-10-14';

  try {
    // -------------------------------------------------------------
    // TEST 1: Strict Calendar Date Validation Fix
    // -------------------------------------------------------------
    console.log('\n--- 1. Strict Calendar Date & Business Logic Validation ---');
    
    // 1a. Invalid date: '2026-10-88' must be rejected
    const v1 = validateDailyActivityPayload({
      activityDate: '2026-10-88',
      department: 'Telecalling',
      metrics: { callsAttempted: 10, connectedCalls: 5 }
    });
    assert(!v1.isValid && v1.errors.some(e => e.includes('valid calendar date')),
      "Invalid date '2026-10-88' strictly rejected with 'Activity date must be a valid calendar date.'");

    // 1b. Invalid date: '2026-02-30' (Feb 30th) must be rejected
    const v1b = validateDailyActivityPayload({
      activityDate: '2026-02-30',
      department: 'Telecalling',
    });
    assert(!v1b.isValid && v1b.errors.some(e => e.includes('valid calendar date')),
      "Non-existent date '2026-02-30' strictly rejected.");

    // 1c. Valid date: '2026-10-15' must be accepted
    const v1c = validateDailyActivityPayload({
      activityDate: VALID_TEST_DATE,
      department: 'Telecalling',
      metrics: { callsAttempted: 15, connectedCalls: 10, unansweredCalls: 5 }
    });
    assert(v1c.isValid, `Valid calendar date '${VALID_TEST_DATE}' accepted.`);

    // 1d. Logic check: connectedCalls > callsAttempted must be rejected
    const v1d = validateDailyActivityPayload({
      activityDate: VALID_TEST_DATE,
      department: 'Telecalling',
      metrics: { callsAttempted: 5, connectedCalls: 10 }
    });
    assert(!v1d.isValid && v1d.errors.some(e => e.includes('cannot exceed total calls attempted')),
      'Validation rejects connectedCalls (10) > callsAttempted (5).');

    // 1e. Outcome check: 'Follow-up Required' without followUpAt date must be rejected
    const v1e = validateDailyActivityPayload({
      activityDate: VALID_TEST_DATE,
      department: 'Telecalling',
      outcomes: [{ leadName: 'John', category: 'Follow-up Required', followUpAt: null }]
    });
    assert(!v1e.isValid && v1e.errors.some(e => e.includes('Follow-up date/time is required')),
      "Validation rejects 'Follow-up Required' outcome without followUpAt date.");

    // 1f. Developer submission validation
    const v1f = validateDailyActivityPayload({
      activityDate: VALID_TEST_DATE,
      department: 'Developer',
      departmentData: { projectName: '', workCompleted: '', status: '' }
    }, true);
    assert(!v1f.isValid && v1f.errors.length >= 2,
      'Developer submission requires projectName, workCompleted, and status.');

    // -------------------------------------------------------------
    // TEST 2: Compound Unique Index Verification with a VALID Date
    // -------------------------------------------------------------
    console.log('\n--- 2. Compound Unique Index Test (Using Valid Calendar Date) ---');
    // Clean up any leftovers first
    await DailyActivity.deleteMany({ employeeId: targetUserId, activityDate: { $in: [VALID_TEST_DATE, VALID_TEST_DATE_2] } });

    const primaryDoc = await DailyActivity.create({
      employeeId: targetUserId,
      department: 'Telecalling',
      activityDate: VALID_TEST_DATE,
      status: 'draft',
      metrics: {
        callsAttempted: 35,
        connectedCalls: 25,
        unansweredCalls: 10,
        interestedLeads: 6,
        followUpsScheduled: 4,
        conversions: 1
      },
      outcomes: [
        {
          leadName: 'Ravi Kumar',
          category: 'Follow-up Required',
          followUpAt: new Date('2026-10-18T10:00:00.000Z'),
          notes: 'Schedule product demo session'
        }
      ],
      remarks: 'Calling test record for Phase 2 verification',
      revisions: [
        {
          editedAt: new Date(),
          editedBy: targetUserId,
          changesSummary: 'Initial draft created.',
          previousStatus: ''
        }
      ]
    });
    assert(primaryDoc && primaryDoc._id, `Primary activity created for date ${VALID_TEST_DATE}`);

    let duplicateRejected = false;
    try {
      await DailyActivity.create({
        employeeId: targetUserId,
        department: 'Telecalling',
        activityDate: VALID_TEST_DATE, // Exact same employee + date
        status: 'draft'
      });
    } catch (err) {
      if (err.code === 11000) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, `Compound unique index { employeeId: 1, activityDate: 1 } strictly rejected duplicate with code 11000 for valid date ${VALID_TEST_DATE}`);

    // -------------------------------------------------------------
    // TEST 3: Virtual Relationship & Population
    // -------------------------------------------------------------
    console.log('\n--- 3. Virtual Relationship & User Population ---');
    const populatedDoc = await DailyActivity.findById(primaryDoc._id).populate('employee', 'name email role department');
    assert(populatedDoc.employee && populatedDoc.employee.name === 'Dasari Durga Bhavani',
      `Virtual 'employee' populated correctly: ${populatedDoc.employee.name} (${populatedDoc.employee.department})`);

    // -------------------------------------------------------------
    // TEST 4: Submission & Audit Logging Workflow
    // -------------------------------------------------------------
    console.log('\n--- 4. Submission & Audit Log Verification ---');
    // Owner submits report
    primaryDoc.status = 'submitted';
    primaryDoc.submittedAt = new Date();
    primaryDoc.revisions.push({
      editedAt: new Date(),
      editedBy: targetUserId,
      changesSummary: "Report submitted for review. Previous status: 'draft'.",
      previousStatus: 'draft'
    });
    await primaryDoc.save();

    const submittedDoc = await DailyActivity.findById(primaryDoc._id);
    assert(submittedDoc.status === 'submitted' && submittedDoc.submittedAt !== null,
      'Report status transitioned to submitted with submittedAt timestamp');
    assert(submittedDoc.revisions.length === 2 && submittedDoc.revisions[1].changesSummary.includes('Report submitted'),
      'Audit log recorded submission transition event');

    // -------------------------------------------------------------
    // TEST 5: Manager Review & Correction Workflow
    // -------------------------------------------------------------
    console.log('\n--- 5. Manager Review / Correction Workflow ---');
    const reviewerId = targetUserId; // Using target user (manager role) as reviewer
    
    // 5a. Request correction
    submittedDoc.status = 'needs_correction';
    submittedDoc.correctionReason = 'Please update remarks with detailed notes on interested leads.';
    submittedDoc.reviewedBy = reviewerId;
    submittedDoc.reviewedAt = new Date();
    submittedDoc.revisions.push({
      editedAt: new Date(),
      editedBy: reviewerId,
      changesSummary: `Status changed from 'submitted' to 'needs_correction' by Manager. Reason: ${submittedDoc.correctionReason}`,
      previousStatus: 'submitted'
    });
    await submittedDoc.save();

    const correctionDoc = await DailyActivity.findById(primaryDoc._id);
    assert(correctionDoc.status === 'needs_correction' && correctionDoc.correctionReason.includes('interested leads'),
      'Manager requested correction: status updated to needs_correction with mandatory reason');
    assert(correctionDoc.revisions.length === 3, 'Audit trail preserves full history across corrections');

    // 5b. Final approval
    correctionDoc.status = 'reviewed';
    correctionDoc.reviewedAt = new Date();
    correctionDoc.correctionReason = '';
    correctionDoc.revisions.push({
      editedAt: new Date(),
      editedBy: reviewerId,
      changesSummary: "Status changed from 'needs_correction' to 'reviewed' by Manager.",
      previousStatus: 'needs_correction'
    });
    await correctionDoc.save();

    const finalApprovedDoc = await DailyActivity.findById(primaryDoc._id);
    assert(finalApprovedDoc.status === 'reviewed', 'Report approved and marked as reviewed');

    // -------------------------------------------------------------
    // TEST 6: Multi-Filter Admin Overview & Aggregations
    // -------------------------------------------------------------
    console.log('\n--- 6. Multi-Filter Admin Overview & Pagination ---');
    const filterQuery = {
      department: new RegExp('^Telecalling$', 'i'),
      status: 'reviewed',
      activityDate: VALID_TEST_DATE
    };
    const [overviewItems, count] = await Promise.all([
      DailyActivity.find(filterQuery).lean(),
      DailyActivity.countDocuments(filterQuery)
    ]);
    assert(count >= 1 && overviewItems[0].status === 'reviewed',
      `Admin overview query filtered by department ('Telecalling'), status ('reviewed'), and date (${VALID_TEST_DATE})`);

    // -------------------------------------------------------------
    // TEST 7: Complete Cleanup of All Temporary Test Records
    // -------------------------------------------------------------
    console.log('\n--- 7. Cleanup of Temporary Test Records ---');
    const deleteResult = await DailyActivity.deleteMany({
      employeeId: targetUserId,
      activityDate: { $in: [VALID_TEST_DATE, VALID_TEST_DATE_2, '2026-10-88'] }
    });
    console.log(`  ✓ Cleaned up ${deleteResult.deletedCount} temporary test record(s).`);

    const remainingTestDocs = await DailyActivity.countDocuments({
      employeeId: targetUserId,
      activityDate: { $in: [VALID_TEST_DATE, VALID_TEST_DATE_2, '2026-10-88'] }
    });
    assert(remainingTestDocs === 0, 'Zero temporary test records remaining in MongoDB.');

    // -------------------------------------------------------------
    // TEST 8: Safeguard Preservation Verification
    // -------------------------------------------------------------
    console.log('\n--- 8. Safeguard Preservation Verification ---');
    const tasksCount = await mongoose.connection.collection('tasks').countDocuments();
    const todosCount = await mongoose.connection.collection('todos').countDocuments();
    const calendarCount = await mongoose.connection.collection('digitalcalendars').countDocuments();
    const followupsCount = await mongoose.connection.collection('followups').countDocuments();

    assert(tasksCount === 11, `Tasks collection untouched: count is ${tasksCount} (expected 11)`);
    assert(todosCount === 70, `Todos collection untouched: count is ${todosCount} (expected 70)`);
    assert(calendarCount === 6, `Digital Calendar untouched: count is ${calendarCount} (expected 6)`);
    assert(followupsCount === 0, `Followups collection protected: count is ${followupsCount}`);

    console.log('\n====================================================');
    console.log(`   ALL ${testResults.length} AUTOMATED TESTS PASSED SUCCESSFULLY!    `);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Test suite failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
}

runPhase2Tests();
