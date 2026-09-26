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
  const d = normalizeDesignation(user);
  return isManagingDirector(user) || isCTO(user) || d === 'CEO' || user?.role === 'admin';
};

export const isCEO = (user) => isExecutive(user);

export const isHR = (user) => {
  const d = normalizeDesignation(user);
  return d === 'HR';
};

export const isDeveloper = (user) => {
  const d = normalizeDesignation(user);
  return d === 'DEVELOPER';
};

export const isTrainer = (user) => {
  const d = normalizeDesignation(user);
  return d === 'TRAINER' || d === 'TRAINERS';
};

export const isDigitalMarketing = (user) => {
  const d = normalizeDesignation(user);
  return d === 'DIGITAL MARKETING' || d === 'DEGITAL MARKETING';
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
 * Task Creation "Assigned By" allowed options per Designation:
 * 1. Developer: Only Admin (CEO/MD/Manager) and You.
 * 2. Trainers: HR, Admin, You.
 * 3. Digital Marketing: HR, Admin, You.
 * 4. Others (Admin / HR / CEO / MD / Manager): All users + All option.
 */
export const getTaskAssignorOptions = (currentUser, users = []) => {
  const userList = Array.isArray(users) ? users : [];

  // Find Admin / Executive / CEO / MD / Manager users
  const adminUsers = userList.filter(u =>
    isExecutive(u) ||
    u.role === 'admin' ||
    u.role === 'manager' ||
    u.name?.toLowerCase().includes('ameen') ||
    u.name?.toLowerCase().includes('rabbani')
  );

  const primaryAdmin = adminUsers.length > 0 ? adminUsers : [
    { _id: 'admin_fallback', name: 'Admin', designation: 'Managing Director' }
  ];

  // Find HR users
  const hrUsers = userList.filter(u => isHR(u));

  const allOption = { _id: 'all', name: 'All' };

  // 1. Developer: All + Admin + You
  if (isDeveloper(currentUser)) {
    const list = [allOption, ...primaryAdmin];
    if (currentUser && !list.some(u => u._id === currentUser._id)) {
      list.push(currentUser);
    }
    return list;
  }

  // 2. Trainers & 3. Digital Marketing: All + HR + Admin + You
  if (isTrainer(currentUser) || isDigitalMarketing(currentUser)) {
    const list = [allOption];

    // HR users
    hrUsers.forEach(hr => {
      if (!list.some(u => u._id === hr._id)) list.push(hr);
    });

    // Admin users
    primaryAdmin.forEach(adm => {
      if (!list.some(u => u._id === adm._id)) list.push(adm);
    });

    // Current User (You)
    if (currentUser && !list.some(u => u._id === currentUser._id)) {
      list.push(currentUser);
    }

    return list;
  }

  // 4. All others: All option + all individual users
  const list = [allOption];
  userList.forEach(u => {
    if (!list.some(existing => existing._id === u._id)) {
      list.push(u);
    }
  });
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

