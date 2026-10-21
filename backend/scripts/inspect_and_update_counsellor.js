const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function checkUser() {
  await mongoose.connect(process.env.MONGODB_URI);
  const usersCol = mongoose.connection.db.collection('users');
  
  // Find by string _id or ObjectId
  let user = await usersCol.findOne({ _id: '6ab6449b62b25645faae28ed' });
  if (!user && mongoose.Types.ObjectId.isValid('6ab6449b62b25645faae28ed')) {
    user = await usersCol.findOne({ _id: new mongoose.Types.ObjectId('6ab6449b62b25645faae28ed') });
  }
  if (!user) {
    user = await usersCol.findOne({ email: /bhavani/i });
  }
  
  console.log('User found:', JSON.stringify(user, null, 2));
  await mongoose.disconnect();
}

checkUser().catch(console.error);
