/**
 * Designation & Role-based Access Control Utilities
 * 
 * Rules:
 * 1. CEO (Ameen, Rabbani): Full unrestricted access. All actions shown and enabled.
 * 2. HR (Deenaz, Bhavani): All navigation and actions shown, but Delete options NOT shown.
 * 3. Developer (Saadiya, Jayaveer): Only show Information, Email CRM, Attendance.
 * 4. Trainer / Trainers (Bhargav, Adilakshmi, Venkat): Only show Information, Email CRM, Attendance.
 * 5. Digital Marketing (Ashok, Eswar): Only show Information, Email CRM, Attendance.
 */

export const normalizeDesignation = (user) => {
  return String(user?.designation || '').trim().toUpperCase();
};

export const isManagingDirector = (user) => {
  const d = normalizeDesignation(user);
  return d === 'MANAGING DIRECTOR' || d === 'MD';
};

export const isCTO = (user) => {
  const d = normalizeDesignation(user);
  return d === 'CTO';
};

export const isExecutive = (user) => {
  if (!user) return false;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  return isManagingDirector(user) || isCTO(user) || d === 'CEO' || user?.role === 'admin' || dept === 'ADMIN' || dept === 'MANAGEMENT';
};

export const isCEO = (user) => isExecutive(user);

export const isHR = (user) => {
  if (!user) return false;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  return d === 'HR' || d.includes('HR') || dept === 'HR';
};

export const isManager = (user) => {
  if (!user) return false;
  const d = normalizeDesignation(user);
  return d.includes('MANAGER') || user?.role === 'manager';
};

export const isDeveloper = (user) => {
  if (!user) return false;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  return d.includes('DEVELOPER') || d.includes('ENGINEER') || dept === 'DEVELOPER' || dept === 'DEV';
};

export const isTrainer = (user) => {
  if (!user) return false;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  return d.includes('TRAINER') || dept === 'TRAINER' || dept === 'TRAINERS';
};

export const isDigitalMarketing = (user) => {
  if (!user) return false;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  return d.includes('MARKETING') || dept === 'MARKETING' || dept === 'MKT';
};

/**
 * Limited Staff: Developer, Trainer, Digital Marketing
 * They are restricted to Information (Dashboard, Tasks), Email CRM, and Attendance.
 */
export const isLimitedStaff = (user) => {
  return isDeveloper(user) || isTrainer(user) || isDigitalMarketing(user);
};

/**
 * Email Blast & Broadcast Access Guard:
 * Strictly restricted to CTO, HR, and Managing Director (or CEO/Executive).
 * Developers, Trainers, and Digital Marketing are strictly excluded.
 */
export const canAccessEmailBlast = (user) => {
  if (!user) return false;
  if (isDeveloper(user) || isTrainer(user) || isDigitalMarketing(user)) return false;
  return isManagingDirector(user) || isCTO(user) || isHR(user) || isExecutive(user);
};

/**
 * Delete Action Guard:
 * - HR designation: Delete options are NOT showing (strictly false).
 * - CEO / Admin / Manager: Delete options are showing.
 */
export const canDelete = (user) => {
  if (!user) return false;
  if (isHR(user)) return false;
  return isCEO(user) || user?.role === 'admin' || user?.role === 'manager';
};

/**
 * Dashboard Access Guard:
 * - Only CEO and HR are allowed to view Dashboard.
 * - Remaining all (Developer, Trainer, Digital Marketing, etc.) have Dashboard removed and only view Task.
 */
export const canViewDashboard = (user) => {
  if (!user) return false;
  return isCEO(user) || isHR(user);
};

/**
 * Call Recordings Access Guard:
 * Strictly visible to HR and Admin (CEO, Managing Director, CTO, Admin role).
 * Remaining employees (Developer, Trainer, Digital Marketing, Caller, etc.) are strictly excluded.
 */
export const canViewCallRecordings = (user) => {
  if (!user) return false;
  return isHR(user) || isCEO(user) || user?.role === 'admin';
};

/**
 * Task Creation "Assigned To" allowed options per Designation:
 * - Admin (Admin role, CEO, Managing Director, CTO): All employees, Me.
 * - HR (HR designation): Me, Trainers, Digital Marketing.
 * - Developer (Developer designation): Me.
 * - Digital Marketing (Digital Marketing designation): Me.
 * - Trainers (Trainer/Trainers designation): Me.
 * 
 * Returns an array of user objects that the current user is allowed to assign tasks to.
 */
export const getTaskAssigneeOptions = (currentUser, users = [], selectedDepartment = '') => {
  const userList = Array.isArray(users) ? users : [];
  if (!currentUser) return [];

  const isAdmin = isExecutive(currentUser) || currentUser.role === 'admin' || currentUser.role === 'superadmin';

  // Determine user's own department
  const userDept = currentUser.department || (
    isDeveloper(currentUser) ? 'Developer' :
    isHR(currentUser) ? 'HR' :
    isTrainer(currentUser) ? 'Trainer' :
    isDigitalMarketing(currentUser) ? 'Marketing' : ''
  );

  // If non-admin user, restrict effective department strictly to userDept
  const targetDepartment = isAdmin ? selectedDepartment : userDept;

  // Filter user list by department
  let deptFilteredUsers = userList;
  if (targetDepartment && targetDepartment !== 'all' && targetDepartment !== 'All') {
    deptFilteredUsers = userList.filter(u => {
      const uDept = String(u.department || '').toLowerCase().trim();
      const target = String(targetDepartment).toLowerCase().trim();
      if (uDept === target) return true;
      if (target === 'developer' && (uDept.includes('dev') || isDeveloper(u))) return true;
      if (target === 'hr' && (uDept.includes('hr') || isHR(u))) return true;
      if ((target === 'trainer' || target === 'trainers') && (uDept.includes('trainer') || isTrainer(u))) return true;
      if ((target === 'marketing' || target === 'digital marketing') && (uDept.includes('market') || isDigitalMarketing(u))) return true;
      return false;
    });
  }

  // Helper to ensure current user is represented
  const meUser = userList.find(u => u._id === currentUser._id) || {
    _id: currentUser._id,
    name: currentUser.name || 'You',
    designation: currentUser.designation || 'Me',
    department: currentUser.department || userDept || '',
    isMe: true,
  };

  // 1. Admin (CEO, Managing Director, CTO, role: admin/superadmin): Full org options
  if (isAdmin) {
    const list = [];
    deptFilteredUsers.forEach(u => {
      if (!list.some(existing => existing._id === u._id)) {
        list.push(u);
      }
    });
    return list.length > 0 ? list : [meUser];
  }

  // 2. Non-Admin Employees (Developer, HR, Trainer, Marketing, Manager, Caller, etc.):
  // Strictly restricted to members of their own department
  const list = [];
  deptFilteredUsers.forEach(u => {
    if (!list.some(existing => existing._id === u._id)) {
      list.push(u);
    }
  });
  if (!list.some(existing => existing._id === meUser._id)) {
    list.push(meUser);
  }
  return list;
};

export const getTaskAssignorOptions = (currentUser, users = []) => {
  const userList = Array.isArray(users) ? users : [];
  if (!currentUser) return [];

  const meUser = userList.find(u => u._id === currentUser._id) || {
    _id: currentUser._id,
    name: currentUser.name || 'You',
    designation: currentUser.designation || 'Me',
    isMe: true,
  };

  // Find Admin / Executive / CEO / MD / CTO / superadmin users
  const adminUsers = userList.filter(u =>
    isExecutive(u) ||
    u.role === 'admin' ||
    u.role === 'superadmin' ||
    u.name?.toLowerCase().includes('ameen') ||
    u.name?.toLowerCase().includes('rabbani')
  );
  const primaryAdmin = adminUsers.length > 0 ? adminUsers : [
    { _id: 'admin_fallback', name: 'Admin', designation: 'Managing Director' }
  ];

  // Find Manager users
  const managerUsers = userList.filter(u => isManager(u) || u.role === 'manager');
  const primaryManagers = managerUsers.length > 0 ? managerUsers : [
    { _id: 'manager_fallback', name: 'Manager', designation: 'Manager' }
  ];

  // Find Developer users
  const devUsers = userList.filter(u => isDeveloper(u));

  // 1. Admin: Assigned by: me
  if (isExecutive(currentUser) || currentUser.role === 'admin' || currentUser.role === 'superadmin') {
    return [meUser];
  }

  // 2. HR: Assigned by: admin
  if (isHR(currentUser)) {
    return primaryAdmin;
  }

  // 3. Developer: Assigned by: admin, me, developer
  if (isDeveloper(currentUser)) {
    const list = [...primaryAdmin];
    if (!list.some(u => u._id === meUser._id)) {
      list.push(meUser);
    }
    devUsers.forEach(dev => {
      if (!list.some(u => u._id === dev._id)) {
        list.push(dev);
      }
    });
    return list;
  }

  // 4. Digital Marketing & 5. Trainers: Assigned by: admin, manager
  if (isDigitalMarketing(currentUser) || isTrainer(currentUser)) {
    const list = [...primaryAdmin];
    primaryManagers.forEach(mgr => {
      if (!list.some(u => u._id === mgr._id)) {
        list.push(mgr);
      }
    });
    return list;
  }

  // Fallback for any other designation: Admin + Me
  const list = [...primaryAdmin];
  if (!list.some(u => u._id === meUser._id)) {
    list.push(meUser);
  }
  return list;
};

/**
 * Filter team users for Todo / Task Team dropdown.
 * All employee designations are included so any team member can be selected or assigned.
 */
export const isTeamDropdownMember = (user) => {
  return !!user;
};

export const filterTeamDropdownUsers = (users = []) => {
  if (!Array.isArray(users)) return [];
  return users;
};

export const getTeamDropdownUsersWithFallback = (users = []) => {
  if (Array.isArray(users) && users.length > 0) return users;

  // Fallback defaults if no users found in current local database
  return [
    { _id: 'md_ameen', name: 'Ameen', designation: 'Managing Director' },
    { _id: 'cto_rabbani', name: 'Rabbani', designation: 'CTO' },
    { _id: 'hr_deenaz', name: 'Deenaz', designation: 'HR' },
    { _id: 'hr_bhavani', name: 'Bhavani', designation: 'HR' }
  ];
};

