const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb+srv://aotmsmarketing_db_user:Aotms@cluster0.98dzwez.mongodb.net/Whatsapp';

async function updateRoles() {
  await mongoose.connect(uri);
  const usersCol = mongoose.connection.collection('users');

  // 1. Admin (6ab9f622dab3a1da6ab7f9ca)
  await usersCol.updateOne(
    { _id: new mongoose.Types.ObjectId('6ab9f622dab3a1da6ab7f9ca') },
    { $set: { role: 'admin', designation: 'Admin', department: 'Admin' } }
  );

  // 2. Managers
  const managerIds = ['6ab6449b62b25645faae28ed', '6ab38a233312a90866e3c76c', '6ad8ba8cf32fe447c4783eda'];
  for (const id of managerIds) {
    await usersCol.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { role: 'manager', designation: 'Manager', department: 'Management' } }
    );
  }

  // 3. Marketing Executives
  const mktIds = ['6ab63ad762b25645faae244e', '6abe21442605716ce3869045', '6abe233b2605716ce38691a2'];
  for (const id of mktIds) {
    await usersCol.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { role: 'employee', designation: 'Marketing Executive', department: 'Marketing' } }
    );
  }

  // 4. Software Developers
  const devIds = ['6ab25b5dc6d2062c7cd12eea', '6ab386d83312a90866e3c6d5'];
  for (const id of devIds) {
    await usersCol.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { role: 'employee', designation: 'Software Developer', department: 'Development' } }
    );
  }

  // 5. Trainers
  const trainerIds = ['6aba5c2fffdd149e031957ba', '6aba63a7ffdd149e03195cb7', '6ab7af419b0606da1d050728'];
  for (const id of trainerIds) {
    await usersCol.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { role: 'employee', designation: 'Trainer', department: 'Trainer' } }
    );
  }

  const updatedUsers = await usersCol.find({}).toArray();
  console.log('✅ Successfully updated all 12 users in DB:');
  console.table(updatedUsers.map(u => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    designation: u.designation,
    department: u.department
  })));

  await mongoose.disconnect();
}

updateRoles().catch(err => {
  console.error(err);
  process.exit(1);
});
