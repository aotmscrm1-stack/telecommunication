const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB Connected:', mongoose.connection.name);

  const collections = await mongoose.connection.db.listCollections().toArray();
  let foundAny = false;

  for (const c of collections) {
    const col = mongoose.connection.db.collection(c.name);
    const countCaller = await col.countDocuments({ role: 'caller' });
    const countBaseRole = await col.countDocuments({ baseRole: 'caller' });
    if (countCaller > 0 || countBaseRole > 0) {
      console.log(`Found in collection "${c.name}": role:caller=${countCaller}, baseRole:caller=${countBaseRole}`);
      foundAny = true;
    }
  }

  if (!foundAny) {
    console.log('Verification PASSED: 0 documents found with role "caller" or baseRole "caller" in all collections.');
  }

  const users = await mongoose.connection.db.collection('users').find({}, { projection: { name: 1, email: 1, role: 1 } }).toArray();
  console.log('\n--- All Users in MongoDB ---');
  users.forEach(u => {
    console.log(`- ${u.email} | ${u.name} | role: [${u.role}]`);
  });

  await mongoose.disconnect();
}

verify().catch(console.error);
