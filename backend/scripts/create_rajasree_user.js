const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/database/models/User');
const Department = require('../src/database/models/Department');

async function createOrUpdateUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully.');

    // 1. Ensure 'HR' Department exists
    let hrDept = await Department.findOne({ name: { $regex: /^hr$/i } });
    if (!hrDept) {
      console.log("Department 'HR' not found, creating department...");
      hrDept = await Department.create({
        name: 'HR',
        code: 'HR',
        description: 'Human Resources',
        color: '#10b981',
        icon: 'users'
      });
      console.log("Created 'HR' department:", hrDept._id);
    } else {
      console.log("Found existing 'HR' department:", hrDept._id);
    }

    const userData = {
      name: 'Raja Sri',
      firstName: 'Raja',
      lastName: 'Sri',
      email: 'rajasree@gmai.com'.toLowerCase().trim(),
      password: 'Aotms@2026',
      bloodGroup: 'O+',
      address: '13-81 seetapuram colony poranki vijayawada',
      employeeId: 'AOTMS-23',
      role: 'manager',
      department: 'HR',
      designation: 'HR Manager',
      displayName: 'Councellor',
      phone: '9493863959',
      approvalStatus: 'accepted',
      isActive: true
    };

    let user = await User.findOne({ email: userData.email });

    if (user) {
      console.log(`User ${userData.email} already exists (ID: ${user._id}). Updating details...`);
      user.name = userData.name;
      user.firstName = userData.firstName;
      user.lastName = userData.lastName;
      user.password = userData.password; // pre-save will re-hash
      user.bloodGroup = userData.bloodGroup;
      user.address = userData.address;
      user.employeeId = userData.employeeId;
      user.role = userData.role;
      user.department = userData.department;
      user.designation = userData.designation;
      user.displayName = userData.displayName;
      user.phone = userData.phone;
      user.approvalStatus = userData.approvalStatus;
      user.isActive = userData.isActive;
      await user.save();
      console.log(`User ${userData.email} updated successfully!`);
    } else {
      console.log(`Creating new user ${userData.email}...`);
      user = new User(userData);
      await user.save();
      console.log(`User created successfully with ID: ${user._id}`);
    }

    // Verify password comparison
    const passwordMatches = await user.comparePassword('Aotms@2026');
    console.log('Password verification check:', passwordMatches ? 'PASSED ✓' : 'FAILED ✗');

    // Fetch and print the saved user document (excluding password)
    const savedUser = await User.findById(user._id).lean();
    delete savedUser.password;
    console.log('\n--- Saved MongoDB User Record ---');
    console.log(JSON.stringify(savedUser, null, 2));

    await mongoose.disconnect();
    console.log('\nDatabase connection closed. User setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createOrUpdateUser();
