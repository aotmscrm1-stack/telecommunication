const mongoose = require('mongoose');

const ensureIndexes = async () => {
  try {
    const Lead = require('../database/models/Lead');
    const User = require('../database/models/User');

    if (Lead && Lead.collection) {
      await Lead.collection.createIndex({ phone: 1 });
      await Lead.collection.createIndex({ assignedTo: 1, status: 1 });
    }
    if (User && User.collection) {
      await User.collection.createIndex({ email: 1 }, { unique: true });
    }
    console.log('✅ [Database Indexes] Collection indexes initialized successfully');
  } catch (err) {
    console.warn('[Database Indexes] Index creation warning:', err.message);
  }
};

module.exports = { ensureIndexes };
