require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const User = require('../models/User');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const MessageTemplate = require('../models/MessageTemplate');
const Payslip = require('../models/Payslip');
const Notification = require('../models/Notification');
const EmployeeLocation = require('../models/EmployeeLocation');

const USERS_TO_CREATE = [
  // Admins
  { name: 'Ameen', email: 'ameen@aotms.com', role: 'admin', phone: '' },
  { name: 'Rabbani', email: 'rabbani@aotms.com', role: 'admin', phone: '' },
  // Manager
  { name: 'Deenaz', email: 'deenaz@aotms.com', role: 'manager', phone: '' },
  // Junior Manager
  { name: 'Bhavani', email: 'bhavani@aotms.com', role: 'manager', phone: '' },
  // Employees
  { name: 'Saadiya', email: 'saadiya@aotms.com', role: 'employee', phone: '' },
  { name: 'Jayaveer', email: 'jayaveer@aotms.com', role: 'employee', phone: '' },
  { name: 'Ashok', email: 'ashok@aotms.com', role: 'employee', phone: '' },
  { name: 'Bhargav', email: 'bhargav@aotms.com', role: 'employee', phone: '' },
  { name: 'Adilakshmi', email: 'adilakshmi@aotms.com', role: 'employee', phone: '' },
  { name: 'Venkat', email: 'venkat@aotms.com', role: 'employee', phone: '' },
  { name: 'Eswar', email: 'eswar@aotms.com', role: 'employee', phone: '' },
];

const COMMON_PASSWORD = 'Aotms@2026';

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not found in environment');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB successfully.');

  // 1. Remove existing users
  const deletedCount = await User.deleteMany({});
  console.log(`Deleted ${deletedCount.deletedCount} existing user accounts.`);

  // 2. Create the new user accounts
  const createdUsers = [];
  for (const u of USERS_TO_CREATE) {
    const newUser = await User.create({
      name: u.name,
      email: u.email,
      role: u.role,
      password: COMMON_PASSWORD,
      phone: u.phone,
      isActive: true,
    });
    createdUsers.push(newUser);
    console.log(`✓ Created: ${newUser.name} | ${newUser.email} | Role: ${newUser.role} | ID: ${newUser._id}`);
  }

  // Find primary admin user (Ameen)
  const primaryAdmin = createdUsers.find(u => u.email === 'ameen@aotms.com');

  // 3. Re-link existing documents to valid user IDs
  if (primaryAdmin) {
    const templateUpdate = await MessageTemplate.updateMany({}, { $set: { createdBy: primaryAdmin._id } });
    console.log(`Updated ${templateUpdate.modifiedCount} message templates createdBy -> ${primaryAdmin.email}`);

    const payslipUpdate = await Payslip.updateMany({}, { $set: { createdBy: primaryAdmin._id } });
    console.log(`Updated ${payslipUpdate.modifiedCount} payslips createdBy -> ${primaryAdmin.email}`);

    const leadUpdate = await Lead.updateMany({}, { $set: { assignedTo: primaryAdmin._id } });
    console.log(`Updated ${leadUpdate.modifiedCount} leads assignedTo -> ${primaryAdmin.email}`);

    const followupUpdate = await FollowUp.updateMany({}, { $set: { assignedTo: primaryAdmin._id } });
    console.log(`Updated ${followupUpdate.modifiedCount} followups assignedTo -> ${primaryAdmin.email}`);

    // Clear stale notifications and employee locations
    await Notification.deleteMany({});
    await EmployeeLocation.deleteMany({});
    console.log('Cleared stale notifications and employee location breadcrumbs.');
  }

  // 4. Verify authentication for all created accounts
  console.log('\n--- VERIFYING ACCOUNTS & PASSWORDS ---');
  for (const u of createdUsers) {
    const fetched = await User.findOne({ email: u.email }).select('+password');
    const isMatch = await fetched.comparePassword(COMMON_PASSWORD);
    console.log(`Account [${fetched.email}] (${fetched.role}) - Password verification: ${isMatch ? 'PASSED ✓' : 'FAILED ✗'}`);
  }

  console.log('\nAll accounts created and saved to MongoDB successfully!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
