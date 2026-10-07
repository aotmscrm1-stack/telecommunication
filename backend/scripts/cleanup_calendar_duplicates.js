require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function cleanup() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aotms';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const DigitalCalendar = require('../src/database/models/DigitalCalendar');
  const all = await DigitalCalendar.find({}).sort({ createdAt: 1 });
  console.log('Total calendar records before cleanup:', all.length);

  const seen = new Set();
  const duplicateIds = [];

  for (const it of all) {
    const dStr = it.content_date ? new Date(it.content_date).toISOString().slice(0, 10) : '';
    const key = `${(it.content_title || '').trim().toLowerCase()}_${dStr}`;
    if (seen.has(key)) {
      duplicateIds.push(it._id);
    } else {
      seen.add(key);
    }
  }

  console.log(`Found ${duplicateIds.length} duplicate records to remove.`);
  if (duplicateIds.length > 0) {
    await DigitalCalendar.deleteMany({ _id: { $in: duplicateIds } });
    console.log('Duplicate records successfully deleted.');
  }

  const remaining = await DigitalCalendar.find({});
  console.log('Total calendar records after cleanup:', remaining.length);
  remaining.forEach(r => {
    console.log(`- ${r.content_date.toISOString().slice(0, 10)}: ${r.content_title} (${r.content_type}) [${r.overall_status}]`);
  });

  await mongoose.disconnect();
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
