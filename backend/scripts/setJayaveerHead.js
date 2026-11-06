require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../src/config/env');

async function run() {
  try {
    await mongoose.connect(env.MONGO_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const result = await User.updateOne(
      { _id: new mongoose.Types.ObjectId('6ab25b5dc6d2062c7cd12eea') },
      { $set: { isHead: true } }
    );
    console.log('Update result:', result);
    const u = await User.findById('6ab25b5dc6d2062c7cd12eea');
    console.log('User status:', { id: u._id, name: u.name, designation: u.designation, isHead: u.isHead });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
