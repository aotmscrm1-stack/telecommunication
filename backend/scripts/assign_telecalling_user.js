const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in environment.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const usersCollection = mongoose.connection.collection('users');
  const deptsCollection = mongoose.connection.collection('departments');
  const targetId = new mongoose.Types.ObjectId('6ab6449b62b25645faae28ed');

  // 1. Fetch current user state
  const currentUser = await usersCollection.findOne({ _id: targetId });
  if (!currentUser) {
    throw new Error('Target user with _id 6ab6449b62b25645faae28ed was NOT found in database.');
  }

  console.log('Found user before migration:');
  console.log({
    _id: currentUser._id,
    name: currentUser.name,
    email: currentUser.email,
    role: currentUser.role,
    department: currentUser.department,
    designation: currentUser.designation,
    isActive: currentUser.isActive
  });

  // 2. Write backup JSON
  const backupDir = path.resolve(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = path.join(backupDir, `user_${targetId.toString()}_pre_migration.json`);
  fs.writeFileSync(backupPath, JSON.stringify(currentUser, null, 2), 'utf8');
  console.log(`Saved pre-migration user backup to: ${backupPath}`);

  // 3. Ensure Telecalling canonical department exists
  let telecallingDept = await deptsCollection.findOne({
    name: { $regex: /^telecalling$/i }
  });

  if (!telecallingDept) {
    const insertResult = await deptsCollection.insertOne({
      name: 'Telecalling',
      code: 'TEL',
      description: 'Telecalling & Outbound Calling Team',
      color: '#0ea5e9',
      icon: 'phone',
      head: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Created canonical Telecalling department with _id:', insertResult.insertedId);
  } else {
    console.log('Canonical Telecalling department already exists with _id:', telecallingDept._id);
  }

  // 4. Update ONLY the department field
  const updateResult = await usersCollection.updateOne(
    { _id: targetId },
    {
      $set: {
        department: 'Telecalling'
      }
    }
  );

  console.log('Update result:', {
    matchedCount: updateResult.matchedCount,
    modifiedCount: updateResult.modifiedCount
  });

  // 5. Verification: Read back updated user
  const verifiedUser = await usersCollection.findOne({ _id: targetId });
  console.log('Verified user state after migration:');
  console.log({
    _id: verifiedUser._id,
    name: verifiedUser.name,
    email: verifiedUser.email,
    role: verifiedUser.role,
    department: verifiedUser.department,
    designation: verifiedUser.designation,
    isActive: verifiedUser.isActive,
    passwordUnchanged: verifiedUser.password === currentUser.password
  });

  if (verifiedUser.department !== 'Telecalling') {
    throw new Error('Verification failed: User department is not Telecalling!');
  }

  if (verifiedUser.role !== currentUser.role) {
    throw new Error('Verification failed: User role was unexpectedly modified!');
  }

  if (verifiedUser.email !== currentUser.email) {
    throw new Error('Verification failed: User email was unexpectedly modified!');
  }

  console.log('MIGRATION_SUCCESSFUL');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
