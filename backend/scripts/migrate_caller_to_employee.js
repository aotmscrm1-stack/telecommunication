const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for caller -> employee migration');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  let totalUpdated = 0;

  for (const colInfo of collections) {
    const colName = colInfo.name;
    const col = db.collection(colName);

    // Update role: 'caller' -> 'employee'
    const roleRes = await col.updateMany({ role: 'caller' }, { $set: { role: 'employee' } });
    if (roleRes.modifiedCount > 0) {
      console.log(`[${colName}] updated ${roleRes.modifiedCount} documents (role: caller -> employee)`);
      totalUpdated += roleRes.modifiedCount;
    }

    // Update userRole: 'caller' -> 'employee'
    const userRoleRes = await col.updateMany({ userRole: 'caller' }, { $set: { userRole: 'employee' } });
    if (userRoleRes.modifiedCount > 0) {
      console.log(`[${colName}] updated ${userRoleRes.modifiedCount} documents (userRole: caller -> employee)`);
      totalUpdated += userRoleRes.modifiedCount;
    }

    // Update assignedRole / allowedRoles
    const assignedRoleRes = await col.updateMany({ assignedRole: 'caller' }, { $set: { assignedRole: 'employee' } });
    if (assignedRoleRes.modifiedCount > 0) {
      console.log(`[${colName}] updated ${assignedRoleRes.modifiedCount} documents (assignedRole)`);
      totalUpdated += assignedRoleRes.modifiedCount;
    }
  }

  console.log(`Migration finished. Total documents updated: ${totalUpdated}`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
