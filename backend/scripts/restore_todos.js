const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;

async function restoreTodos() {
  if (!uri) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const backupFile = path.join(__dirname, '../backups/restored_oct21_nov04_todos.json');
  if (!fs.existsSync(backupFile)) {
    console.error('Backup file not found:', backupFile);
    process.exit(1);
  }

  const items = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  console.log(`Restoring ${items.length} todos into 'todos' collection only...`);

  let count = 0;
  for (const item of items) {
    const doc = {
      ...item,
      _id: new mongoose.Types.ObjectId(item._id),
      assignedTo: item.assignedTo ? new mongoose.Types.ObjectId(item.assignedTo) : null,
      assignedBy: item.assignedBy ? new mongoose.Types.ObjectId(item.assignedBy) : null,
      createdBy: item.createdBy ? new mongoose.Types.ObjectId(item.createdBy) : null,
      completedBy: null,
      status: 'upcoming',
      completedAt: null,
      departmentId: item.departmentId ? new mongoose.Types.ObjectId(item.departmentId) : null,
      scheduledAt: item.scheduledAt ? new Date(item.scheduledAt) : null,
      initialScheduledAt: item.initialScheduledAt ? new Date(item.initialScheduledAt) : null,
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
    };

    await db.collection('todos').updateOne(
      { _id: doc._id },
      { $set: doc },
      { upsert: true }
    );
    count++;
  }

  const total = await db.collection('todos').countDocuments();
  console.log(`Successfully restored ${count} todos.`);
  console.log(`Total todos in 'todos' collection now: ${total}`);

  await mongoose.disconnect();
}

restoreTodos().catch(console.error);

