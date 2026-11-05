const express = require('express');
const Department = require('../../../database/models/Department');
const User = require('../../../database/models/User');
const { protect, authorize } = require('../../../core/middleware/auth');
const router = express.Router();

// Fallback high-quality professional avatars when not uploaded in DB
const FALLBACK_AVATARS = {
  raja: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  rajasree: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  venkat: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  venkatasai: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  moeen: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  female: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  male: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80'
};

function assignUserAvatar(user) {
  if (user && user.avatar && String(user.avatar).trim() !== '') {
    return user.avatar;
  }
  const name = String(user?.name || '').toLowerCase();
  const email = String(user?.email || '').toLowerCase();
  if (name.includes('raja') || name.includes('rajasree') || email.includes('rajasree')) {
    return FALLBACK_AVATARS.rajasree;
  }
  if (name.includes('venkat') || email.includes('venkat')) {
    return FALLBACK_AVATARS.venkat;
  }
  if (name.includes('moeen') || email.includes('moeen')) {
    return FALLBACK_AVATARS.moeen;
  }
  if (name.includes('manasa') || name.includes('bhavani') || name.includes('deenaz') || name.includes('saadiya') || name.includes('adilakshmi')) {
    return FALLBACK_AVATARS.female;
  }
  return FALLBACK_AVATARS.male;
}

// 4 Canonical Departments
const CANONICAL_DEPARTMENTS = [
  {
    key: 'hr',
    name: 'HR Department',
    code: 'HR',
    description: 'Human Resources & Talent Management',
    color: '#ec4899', // Pink
    icon: 'users',
    headMatch: u => {
      const n = String(u.name || '').toLowerCase();
      const e = String(u.email || '').toLowerCase();
      return n.includes('deenaz') || e.includes('deenaz');
    },
    headDesignation: 'Sr. HR Specialist',
    teamMatches: [
      u => {
        const n = String(u.name || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        return n.includes('bhavani') || n.includes('durga') || e.includes('bhavani');
      },
      u => {
        const n = String(u.name || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        return n.includes('raja') || n.includes('rajasree') || e.includes('rajasree');
      }
    ]
  },
  {
    key: 'development',
    name: 'Development Department',
    code: 'DEV',
    description: 'Software Engineering & IT Systems',
    color: '#0284c7', // Sky Blue
    icon: 'code',
    headMatch: u => {
      const n = String(u.name || '').toLowerCase();
      const e = String(u.email || '').toLowerCase();
      return n.includes('jayaveer') || e.includes('jayaveer');
    },
    headDesignation: 'Lead Software Developer',
    teamMatches: [
      u => {
        const n = String(u.name || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        return n.includes('saadiya') || e.includes('saadiya');
      }
    ]
  },
  {
    key: 'marketing',
    name: 'Digital Marketing Department',
    code: 'MKT',
    description: 'Growth, SEO, Ads & Social Marketing',
    color: '#f97316', // Orange
    icon: 'trending-up',
    headMatch: u => {
      const n = String(u.name || '').toLowerCase();
      const e = String(u.email || '').toLowerCase();
      return n.includes('ashok') || e.includes('ashok');
    },
    headDesignation: 'Sr. Marketing Lead',
    teamMatches: [
      u => {
        const n = String(u.name || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        return n.includes('manasa') || e.includes('manasa');
      },
      u => {
        const n = String(u.name || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        return n.includes('moeen') || e.includes('moeen');
      }
    ]
  },
  {
    key: 'trainers',
    name: 'Trainers',
    code: 'TRN',
    description: 'Technical & Skill Training Faculty',
    color: '#10b981', // Emerald Green
    icon: 'book',
    headMatch: null,
    headDesignation: null,
    teamMatches: [
      u => {
        const n = String(u.name || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        return n.includes('adilakshmi') || e.includes('adilakshmi');
      },
      u => {
        const n = String(u.name || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        return n.includes('bhargav') || e.includes('bhargav');
      },
      u => {
        const n = String(u.name || '').toLowerCase();
        const e = String(u.email || '').toLowerCase();
        return n.includes('venkat') || e.includes('venkat');
      }
    ]
  }
];

// Ensure only canonical departments exist in MongoDB
async function ensureDepartmentsExist() {
  const canonicalNames = CANONICAL_DEPARTMENTS.map(d => d.name);

  // Remove any legacy / duplicate departments (Developer, Telecalling, Manager, etc.)
  await Department.deleteMany({
    name: {
      $nin: [
        ...canonicalNames,
        'HR',
        'Development',
        'Digital Marketing',
        'Trainer'
      ]
    }
  }).catch(() => {});

  for (const cfg of CANONICAL_DEPARTMENTS) {
    let existing = await Department.findOne({
      $or: [
        { name: cfg.name },
        { code: cfg.code }
      ]
    });

    if (!existing) {
      await Department.create({
        name: cfg.name,
        code: cfg.code,
        description: cfg.description,
        color: cfg.color,
        icon: cfg.icon
      });
    } else {
      let needSave = false;
      if (existing.name !== cfg.name) { existing.name = cfg.name; needSave = true; }
      if (existing.code !== cfg.code) { existing.code = cfg.code; needSave = true; }
      if (existing.description !== cfg.description) { existing.description = cfg.description; needSave = true; }
      if (existing.color !== cfg.color) { existing.color = cfg.color; needSave = true; }
      if (existing.icon !== cfg.icon) { existing.icon = cfg.icon; needSave = true; }
      if (needSave) await existing.save();
    }
  }

  // Also clean up any extra non-canonical records if multiple matched
  const allInDb = await Department.find({});
  for (const doc of allInDb) {
    if (!canonicalNames.includes(doc.name)) {
      await Department.findByIdAndDelete(doc._id).catch(() => {});
    }
  }
}

// GET /api/departments - Dynamically fetch exact canonical departments & employees
router.get('/', protect, async (req, res) => {
  try {
    await ensureDepartmentsExist();

    const dbDepartments = await Department.find({
      name: { $in: CANONICAL_DEPARTMENTS.map(d => d.name) }
    }).lean();

    const allUsers = await User.find({ isActive: { $ne: false } })
      .select('-password')
      .sort({ name: 1 })
      .lean();

    // Top Admin user from MongoDB
    const adminUser = allUsers.find(u => 
      u.role === 'admin' || 
      (u.department && u.department.toLowerCase() === 'admin') ||
      (u.name && u.name.toLowerCase().includes('ameen'))
    ) || {
      name: 'Ameen Sayyed',
      email: 'ameen@aotms.in',
      designation: 'Managing Director & Admin',
      department: 'Admin',
      phone: '+91 9876543210'
    };
    adminUser.avatar = assignUserAvatar(adminUser);

    const formattedDepartments = [];
    const assignedUserIds = new Set();
    if (adminUser._id) assignedUserIds.add(String(adminUser._id));

    for (const cfg of CANONICAL_DEPARTMENTS) {
      const dbDept = dbDepartments.find(d => d.name === cfg.name || d.code === cfg.code) || {};
      
      let headUser = null;
      if (cfg.headMatch) {
        headUser = allUsers.find(u => !assignedUserIds.has(String(u._id)) && cfg.headMatch(u));
        if (!headUser) {
          headUser = allUsers.find(cfg.headMatch);
        }
        if (headUser) {
          headUser = { ...headUser };
          headUser.avatar = assignUserAvatar(headUser);
          headUser.isHead = true;
          if (cfg.headDesignation && (!headUser.designation || headUser.designation === 'Team Member')) {
            headUser.designation = cfg.headDesignation;
          }
          headUser.department = cfg.name;
          assignedUserIds.add(String(headUser._id));
        }
      }

      const teamUsers = [];
      for (const matcher of cfg.teamMatches) {
        const found = allUsers.find(u => !assignedUserIds.has(String(u._id)) && matcher(u));
        if (found) {
          const userObj = { ...found };
          userObj.avatar = assignUserAvatar(userObj);
          userObj.isHead = false;
          userObj.department = cfg.name;
          teamUsers.push(userObj);
          assignedUserIds.add(String(userObj._id));
        }
      }

      // If any other active users have their department matching this department code or name, add them to team
      for (const u of allUsers) {
        if (!assignedUserIds.has(String(u._id))) {
          const uDept = String(u.department || '').toLowerCase();
          const matchesDept = 
            (cfg.key === 'hr' && (uDept === 'hr' || uDept.includes('human'))) ||
            (cfg.key === 'development' && (uDept === 'development' || uDept === 'developer' || uDept === 'dev')) ||
            (cfg.key === 'marketing' && (uDept.includes('market') || uDept === 'mkt')) ||
            (cfg.key === 'trainers' && (uDept.includes('train') || uDept === 'trn'));

          if (matchesDept) {
            const userObj = { ...u };
            userObj.avatar = assignUserAvatar(userObj);
            userObj.isHead = false;
            userObj.department = cfg.name;
            teamUsers.push(userObj);
            assignedUserIds.add(String(userObj._id));
          }
        }
      }

      // Build consolidated members array
      const allMembers = [];
      if (headUser) allMembers.push(headUser);
      allMembers.push(...teamUsers);

      formattedDepartments.push({
        _id: dbDept._id || `dept_${cfg.key}`,
        name: cfg.name,
        code: cfg.code,
        description: dbDept.description || cfg.description,
        color: cfg.color,
        icon: cfg.icon,
        head: headUser,
        employees: allMembers,
        team: teamUsers,
        allMembers,
        employeeCount: allMembers.length
      });
    }

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
      password: password || 'Password@123',
      role: role || 'employee',
      designation: designation || 'Team Member',
      department: department.trim(),
      phone: phone || '',
      avatar: avatar || '',
      approvalStatus: 'accepted',
      approvedBy: req.user._id,
      approvedAt: new Date(),
      isActive: true
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
