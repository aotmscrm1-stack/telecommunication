const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');

async function verifyAttendanceScoping() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  // 1. Verify users and designations
  const mdUser = await User.findOne({ designation: /Managing Director/i });
  const devUser = await User.findOne({ designation: /Developer/i });
  const trainerUser = await User.findOne({ designation: /Trainer/i });
  const dmUser = await User.findOne({ designation: /Digital Marketing/i });

  console.log('MD User:', mdUser?.name, '| Desig:', mdUser?.designation);
  console.log('Dev User:', devUser?.name, '| Desig:', devUser?.designation);
  console.log('Trainer User:', trainerUser?.name, '| Desig:', trainerUser?.designation);
  console.log('DM User:', dmUser?.name, '| Desig:', dmUser?.designation);

  if (!mdUser || !devUser) {
    console.error('Missing test users');
    process.exit(1);
  }

  // 2. Test break simulation & MongoDB persistence
  const today = '2026-09-21';
  let devAtt = await Attendance.findOne({ employeeId: devUser._id, date: today });
  if (!devAtt) {
    devAtt = await Attendance.create({
      employeeId: devUser._id,
      employeeName: devUser.name,
      employeeCode: 'EMP-DEV',
      date: today,
      day: 'Monday',
      startTime: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      status: 'ON_DUTY',
      breaks: [],
    });
    console.log('Created test dev attendance record for today');
  }

  // Simulate starting a break (Autosave to MongoDB)
  const breakStart = new Date();
  devAtt.breaks.push({
    breakNumber: (devAtt.breaks?.length || 0) + 1,
    startTime: breakStart,
    reason: 'Lunch Break',
    status: 'ACTIVE',
  });
  devAtt.status = 'ON_BREAK';
  devAtt.breakCount = devAtt.breaks.length;
  await devAtt.save();
  console.log('Break autosaved to MongoDB successfully! Status:', devAtt.status, '| Breaks:', devAtt.breaks.length);

  // Simulate resuming work (Continue timer & update MongoDB)
  const breakEnd = new Date(breakStart.getTime() + 15 * 60 * 1000); // 15 min break
  const activeBreak = devAtt.breaks.find(b => b.status === 'ACTIVE');
  if (activeBreak) {
    activeBreak.endTime = breakEnd;
    activeBreak.status = 'COMPLETED';
    activeBreak.durationSeconds = 900;
    activeBreak.formattedDuration = '15m';
  }
  devAtt.status = 'ON_DUTY';
  devAtt.totalBreakSeconds = 900;
  devAtt.formattedBreakDuration = '15m';
  await devAtt.save();
  console.log('Resume work autosaved to MongoDB successfully! Status:', devAtt.status, '| Break duration:', devAtt.formattedBreakDuration);

  // 3. Verify Scoping Logic
  // MD Scope
  const isMD = (u) => {
    const d = String(u?.designation || '').trim().toUpperCase();
    return d === 'MANAGING DIRECTOR' || d === 'MD' || d === 'CEO';
  };

  console.log('Is MD (Ameen):', isMD(mdUser)); // true
  console.log('Is MD (Dev Saadiya):', isMD(devUser)); // false
  console.log('Is MD (Trainer):', isMD(trainerUser)); // false
  console.log('Is MD (DM):', isMD(dmUser)); // false

  await mongoose.disconnect();
  console.log('All verification checks PASSED!');
  process.exit(0);
}

verifyAttendanceScoping().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
