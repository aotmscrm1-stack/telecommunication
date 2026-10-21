const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function updateCounsellorUser() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const usersCol = mongoose.connection.db.collection('users');

  let filter = { _id: '6ab6449b62b25645faae28ed' };
  let existing = await usersCol.findOne(filter);
  if (!existing && mongoose.Types.ObjectId.isValid('6ab6449b62b25645faae28ed')) {
    filter = { _id: new mongoose.Types.ObjectId('6ab6449b62b25645faae28ed') };
    existing = await usersCol.findOne(filter);
  }
  if (!existing) {
    filter = { email: 'bhavani@aotms.in' };
    existing = await usersCol.findOne(filter);
  }

  if (!existing) {
    console.error('User 6ab6449b62b25645faae28ed not found!');
    await mongoose.disconnect();
    return;
  }

  console.log('Found user before update:', {
    _id: existing._id,
    name: existing.name,
    email: existing.email,
    department: existing.department,
    role: existing.role,
    designation: existing.designation,
    displayName: existing.displayName
  });

  const updateDoc = {
    $set: {
      department: 'HR',
      designation: 'Counsellor',
      displayName: 'Telecaller Councellor',
      role: 'employee',
      updatedAt: new Date()
    }
  };

  const result = await usersCol.updateOne(filter, updateDoc);
  console.log('Update result:', result);

  const updated = await usersCol.findOne(filter);
  console.log('User after update:', {
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    department: updated.department,
    role: updated.role,
    designation: updated.designation,
    displayName: updated.displayName
  });

  await mongoose.disconnect();
}

updateCounsellorUser().catch(console.error);
