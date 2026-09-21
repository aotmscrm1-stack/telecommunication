const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB');

    // Update Ameen -> Managing Director
    const r1 = await mongoose.connection.collection('users').updateOne(
      { email: 'ameen@aotms.com' },
      { $set: { designation: 'Managing Director', department: 'Management' } }
    );
    console.log(`Updated Ameen: matched=${r1.matchedCount}, modified=${r1.modifiedCount}`);

    // Update Rabbani -> CTO
    const r2 = await mongoose.connection.collection('users').updateOne(
      { email: 'rabbani@aotms.com' },
      { $set: { designation: 'CTO', department: 'Technology' } }
    );
    console.log(`Updated Rabbani: matched=${r2.matchedCount}, modified=${r2.modifiedCount}`);

    const verified = await mongoose.connection.collection('users').find(
      {},
      { projection: { name: 1, email: 1, role: 1, designation: 1, department: 1 } }
    ).toArray();

    console.log('\n--- VERIFIED USERS IN MONGODB ---');
    console.table(verified.map(u => ({
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Designation: u.designation,
      Department: u.department,
    })));

    process.exit(0);
  } catch (err) {
    console.error('Error updating designations:', err);
    process.exit(1);
  }
}

run();
