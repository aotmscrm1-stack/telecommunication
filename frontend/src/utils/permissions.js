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
 * 1. Developer: Only Ameen (CEO/MD) and You.
 * 2. Digital Marketing: CEO, CTO, HR, You, All.
 * 3. Trainers: CEO, HR, You, All.
 * 4. Others (Executive / Admin / Manager): All individual users + All.
 */
export const getTaskAssignorOptions = (currentUser, users = []) => {
  const ameen = users.find(u =>
    u.name?.toLowerCase().trim() === 'ameen' ||
    u.email?.toLowerCase().includes('ameen@') ||
    normalizeDesignation(u) === 'CEO' ||
    normalizeDesignation(u) === 'MANAGING DIRECTOR'
  ) || { _id: 'ameen_fallback', name: 'Ameen', designation: 'Managing Director' };

  const cto = users.find(u =>
    u.name?.toLowerCase().trim() === 'rabbani' ||
    normalizeDesignation(u) === 'CTO'
  );

  const hrList = users.filter(u => normalizeDesignation(u) === 'HR');

  const allOption = { _id: 'all', name: 'All' };

  // 1. Developer: Only Ameen and You
  if (isDeveloper(currentUser)) {
    const list = [ameen];
    if (currentUser && currentUser._id !== ameen._id) {
      list.push(currentUser);
    }
    return list;
  }

  // 2. Digital Marketing: CEO, CTO, HR, You, All
  if (isDigitalMarketing(currentUser)) {
    const list = [ameen];
    if (cto && cto._id !== ameen._id) list.push(cto);
    hrList.forEach(hr => {
      if (!list.some(u => u._id === hr._id)) list.push(hr);
    });
    if (currentUser && !list.some(u => u._id === currentUser._id)) {
      list.push(currentUser);
    }
    list.push(allOption);
    return list;
  }

  // 3. Trainers: CEO, HR, You, All
  if (isTrainer(currentUser)) {
    const list = [ameen];
    hrList.forEach(hr => {
      if (!list.some(u => u._id === hr._id)) list.push(hr);
    });
    if (currentUser && !list.some(u => u._id === currentUser._id)) {
      list.push(currentUser);
    }
    list.push(allOption);
    return list;
  }

  // 4. All others: All individual users + All option
  const list = [...users];
  if (!list.some(u => u._id === 'all')) {
    list.push(allOption);
  }
  return list;
};

/**
 * Filter team users for Todo / Task Team dropdown.
 * Only users who are HR, CTO, or Managing Director (or CEO) are allowed.
 * All other designations (Developers, Trainers, Digital Marketing, Callers, etc.) are strictly removed.
 */
export const isTeamDropdownMember = (user) => {
  if (!user) return false;
  const d = normalizeDesignation(user);
  const name = String(user.name || '').trim().toLowerCase();

  // 1. Managing Director / MD / CEO
  if (d === 'MANAGING DIRECTOR' || d === 'MD' || d === 'CEO') return true;
  if (name === 'ameen' || name.includes('ameen')) return true;

  // 2. CTO
  if (d === 'CTO' || d === 'CHIEF TECHNOLOGY OFFICER') return true;
  if (name === 'rabbani' || name.includes('rabbani')) return true;

  // 3. HR
  if (d === 'HR' || d === 'HUMAN RESOURCES' || d.startsWith('HR ') || d.endsWith(' HR')) return true;
  if (name === 'deenaz' || name === 'bhavani') return true;

  return false;
};

export const filterTeamDropdownUsers = (users = []) => {
  if (!Array.isArray(users)) return [];
  return users.filter(isTeamDropdownMember);
};

export const getTeamDropdownUsersWithFallback = (users = []) => {
  const filtered = filterTeamDropdownUsers(users);
  if (filtered.length > 0) return filtered;

  // Fallback defaults if no users found in current local database
  return [
    { _id: 'md_ameen', name: 'Ameen', designation: 'Managing Director' },
    { _id: 'cto_rabbani', name: 'Rabbani', designation: 'CTO' },
    { _id: 'hr_deenaz', name: 'Deenaz', designation: 'HR' },
    { _id: 'hr_bhavani', name: 'Bhavani', designation: 'HR' }
  ];
};

