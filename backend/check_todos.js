const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const depts = await db.collection('departments').find().toArray();
  console.log('Departments:', depts.map(d => ({ _id: d._id, name: d.name, code: d.code })));

  await mongoose.disconnect();
}

check().catch(console.error);
