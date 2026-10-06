const express = require('express');
const Department = require('../../../database/models/Department');
const User = require('../../../database/models/User');
const { protect, authorize } = require('../../../core/middleware/auth');
const router = express.Router();

// Ensure default Department categories exist in DB if empty
async function ensureDepartmentsExist() {
  const deptCount = await Department.countDocuments();
  if (deptCount === 0) {
    const defaultDepts = [
      { name: 'HR', code: 'HR', description: 'Human Resources & Talent Management', color: '#ec4899', icon: 'users' },
      { name: 'Developer', code: 'DEV', description: 'Software Engineering & IT', color: '#0284c7', icon: 'code' },
      { name: 'Trainer', code: 'TRN', description: 'Technical & Skill Training', color: '#f59e0b', icon: 'book' },
      { name: 'Marketing', code: 'MKT', description: 'Growth, Sales & Marketing', color: '#10b981', icon: 'trending-up' }
    ];
    await Department.insertMany(defaultDepts);
  }
}

// GET /api/departments - Dynamically fetch real MongoDB departments & employees
router.get('/', protect, async (req, res) => {
  try {
    await ensureDepartmentsExist();

    const dbDepartments = await Department.find({}).sort({ name: 1 }).lean();
    const allUsers = await User.find({}).select('-password').sort({ name: 1 }).lean();

    // Map departments from Department collection
    const deptMap = new Map();
    dbDepartments.forEach(dept => {
      deptMap.set(dept.name.toLowerCase().trim(), {
        ...dept,
        employeeCount: 0,
        employees: []
      });
    });

    // Group real MongoDB users by department (case insensitive match)
    allUsers.forEach(user => {
      if (!user.department || user.department.toLowerCase().trim() === 'admin') return;
      const userDept = user.department.trim();
      let matchedKey = null;

      for (const [key] of deptMap.entries()) {
        if (key === userDept.toLowerCase() || key.includes(userDept.toLowerCase()) || userDept.toLowerCase().includes(key)) {
          matchedKey = key;
          break;
        }
      }

      if (!matchedKey) {
        matchedKey = userDept.toLowerCase();
        deptMap.set(matchedKey, {
          _id: `auto_${matchedKey}`,
          name: userDept,
          code: userDept.slice(0, 3).toUpperCase(),
          description: `${userDept} Team`,
          color: '#0284c7',
          icon: 'building',
          employeeCount: 0,
          employees: []
        });
      }

      const deptObj = deptMap.get(matchedKey);
      deptObj.employees.push(user);
      deptObj.employeeCount = deptObj.employees.length;
    });

    const formattedDepartments = Array.from(deptMap.values());

    // Top Admin user from MongoDB
    const adminUser = allUsers.find(u => u.role === 'admin' || (u.department && u.department.toLowerCase() === 'admin')) || {
      name: 'Ameen Sayyed',
      email: 'ameen@aotms.com',
      designation: 'Managing Director & Admin',
      department: 'Admin',
      phone: '+91 9876543210'
    };

    res.json({
      ok: true,
      admin: adminUser,
      departments: formattedDepartments
    });
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// POST /api/departments - Create new dynamic department
router.post('/', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, code, description, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ ok: false, message: 'Department name is required' });
    }

    const existing = await Department.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ ok: false, message: 'Department with this name already exists' });
    }

    const newDept = await Department.create({
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : name.slice(0, 3).toUpperCase(),
      description: description || '',
      color: color || '#0284c7',
      icon: icon || 'building'
    });

    res.status(201).json({
      ok: true,
      message: `Department '${newDept.name}' created successfully`,
      department: {
        ...newDept.toObject(),
        employeeCount: 0,
        employees: []
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PUT /api/departments/:id - Update department
router.put('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, code, description, color, icon } = req.body;
    let dept = await Department.findById(req.params.id);
    
    if (!dept && req.params.id.startsWith('auto_')) {
      const realName = req.params.id.replace('auto_', '');
      dept = await Department.create({
        name: name || realName,
        code: code || realName.slice(0, 3).toUpperCase(),
        description: description || '',
        color: color || '#0284c7',
        icon: icon || 'building'
      });
    }

    if (!dept) {
      return res.status(404).json({ ok: false, message: 'Department not found' });
    }

    const oldName = dept.name;
    if (name && name.trim() !== oldName) {
      dept.name = name.trim();
      await User.updateMany(
        { department: oldName },
        { $set: { department: dept.name } }
      );
    }

    if (code !== undefined) dept.code = code.trim().toUpperCase();
    if (description !== undefined) dept.description = description.trim();
    if (color !== undefined) dept.color = color;
    if (icon !== undefined) dept.icon = icon;

    await dept.save();

    const employees = await User.find({ department: dept.name }).select('-password').lean();

    res.json({
      ok: true,
      message: 'Department updated successfully',
      department: {
        ...dept.toObject(),
        employeeCount: employees.length,
        employees
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/departments/:id - Delete department
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (dept) {
      await User.updateMany({ department: dept.name }, { $set: { department: '' } });
      await Department.findByIdAndDelete(req.params.id);
    }
    res.json({ ok: true, message: `Department deleted successfully` });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// POST /api/departments/employee - Add a new employee directly into a department
router.post('/employee', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, email, password, role, designation, department, phone, avatar } = req.body;

    if (!name || !email || !department) {
      return res.status(400).json({ ok: false, message: 'Name, email, and department are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ ok: false, message: 'User with this email already exists' });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password || 'password123',
      role: role || 'employee',
      designation: designation || 'Team Member',
      department: department.trim(),
      phone: phone || '',
      avatar: avatar || ''
    });

    res.status(201).json({
      ok: true,
      message: `Employee '${newUser.name}' added to ${department} successfully`,
      employee: newUser.toJSON()
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
