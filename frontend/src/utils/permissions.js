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

export const ADMIN_IDS = ['6ab9f622dab3a1da6ab7f9ca']; // Ameen Sayyed
export const MANAGER_IDS = [
  '6ab6449b62b25645faae28ed', // Dasari Durga Bhavani
  '6ab38a233312a90866e3c76c', // deenaz shaik
  '6ad8ba8cf32fe447c4783eda',  // Raja Sri
];
export const MARKETING_EXECUTIVE_IDS = [
  '6ab63ad762b25645faae244e', // Ashok Y
  '6abe21442605716ce3869045', // Chinthala Manasa
  '6abe233b2605716ce38691a2',  // Moeen Ahmad Mahammad
];
export const SOFTWARE_DEVELOPER_IDS = [
  '6ab25b5dc6d2062c7cd12eea', // Ramanadham Jayaveer
  '6ab386d83312a90866e3c6d5', // Saadiya Mohammad
];
export const TRAINER_IDS = [
  '6aba5c2fffdd149e031957ba', // Bhargav Possimsetty
  '6aba63a7ffdd149e03195cb7', // Adilakshmi Vemala
  '6ab7af419b0606da1d050728', // Venkat Sai
];

export const isExecutive = (user) => {
  if (!user) return false;
  const role = String(user?.role || '').trim().toLowerCase();
  const id = String(user?._id || user?.id || '');
  if (role === 'manager' || MANAGER_IDS.includes(id)) return false;
  if (ADMIN_IDS.includes(id)) return true;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  return isManagingDirector(user) || isCTO(user) || d === 'CEO' || role === 'admin' || dept === 'ADMIN';
};

export const isCEO = (user) => isExecutive(user);

export const isManager = (user) => {
  if (!user) return false;
  const id = String(user?._id || user?.id || '');
  if (ADMIN_IDS.includes(id) || user?.role === 'admin' || user?.role === 'superadmin') return false;
  if (MANAGER_IDS.includes(id)) return true;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  return d.includes('MANAGER') || user?.role === 'manager' || dept.includes('MANAGER') || dept.includes('MANAGEMENT');
};

export const isDeveloper = (user) => {
  if (!user) return false;
  const id = String(user?._id || user?.id || '');
  if (SOFTWARE_DEVELOPER_IDS.includes(id)) return true;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  return d.includes('DEVELOPER') || d.includes('ENGINEER') || dept === 'DEVELOPER' || dept === 'DEV';
};

export const isTrainer = (user) => {
  if (!user) return false;
  const id = String(user?._id || user?.id || '');
  if (TRAINER_IDS.includes(id)) return true;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  return d.includes('TRAINER') || dept === 'TRAINER' || dept === 'TRAINERS';
};

export const isCounsellor = (user) => {
  if (!user) return false;
  const id = String(user?._id || user?.id || '');
  if (MANAGER_IDS.includes(id)) return true; // Managers with counselling capacity

  const desig = String(user?.designation || '').trim().toLowerCase();
  const dName = String(user?.displayName || '').trim().toLowerCase();
  const dept = String(user?.department || '').trim().toLowerCase();
  const role = String(user?.role || '').trim().toLowerCase();
  return (
    (dept.includes('hr') || dept.includes('telecall') || dept.includes('caller')) &&
    (desig.includes('councellor') || desig.includes('counselor') || dName.includes('councellor') || dName.includes('counselor') || (dept.includes('hr') && role === 'employee'))
  );
};

export const isTelecaller = (user) => {
  if (!user) return false;
  if (user?.role === 'admin' || user?.role === 'superadmin' || isCEO(user) || isManager(user)) return false;

  const desig = String(user?.designation || '').trim().toLowerCase();
  const dName = String(user?.displayName || '').trim().toLowerCase();
  const dept = String(user?.department || '').trim().toLowerCase();
  const role = String(user?.role || '').trim().toLowerCase();
  return (
    role === 'caller' ||
    role === 'telecaller' ||
    role === 'councellor' ||
    role === 'counselor' ||
    desig.includes('telecall') || desig.includes('caller') || desig.includes('councellor') || desig.includes('counselor') ||
    dName.includes('telecall') || dName.includes('caller') || dName.includes('councellor') || dName.includes('counselor') ||
    dept.includes('telecall') || dept.includes('caller') ||
    (dept.includes('hr') && role === 'employee') ||
    isCounsellor(user)
  );
};

export const isHR = (user) => {
  if (!user) return false;
  const id = String(user?._id || user?.id || '');
  const role = String(user?.role || '').trim().toLowerCase();
  if (role === 'manager' || MANAGER_IDS.includes(id)) return false;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  const isHRStaff = d === 'HR' || d.includes('HR') || dept === 'HR';
  const isManagement = role === 'admin' || isExecutive(user) || d.includes('MANAGER') || d.includes('HEAD') || d.includes('SPECIALIST');
  return isHRStaff && isManagement;
};

export const isMarketingExecutive = (user) => {
  if (!user) return false;
  const id = String(user?._id || user?.id || '');
  if (MARKETING_EXECUTIVE_IDS.includes(id)) return true;
  const d = normalizeDesignation(user);
  const dept = String(user?.department || '').trim().toUpperCase();
  return d.includes('MARKETING') || d.includes('DIGITAL') || dept === 'MARKETING' || dept === 'MKT';
};

export const isDigitalMarketing = (user) => isMarketingExecutive(user);

/**
 * Limited Staff: Developer, Trainer, Digital Marketing
 * They are restricted to Information (Dashboard, Tasks), Email CRM, and Attendance.
 */
export const isLimitedStaff = (user) => {
  return isDeveloper(user) || isTrainer(user) || isDigitalMarketing(user);
};

/**
 * Digital Calendar Access Guard:
 * Marketing employees, CEO, HR, Admin, and Managers have full access.
 */
export const canAccessDigitalCalendar = (user) => {
  if (!user) return false;
  const role = String(user?.role || '').trim().toLowerCase();
  const id = String(user?._id || user?.id || '');
  if (role === 'manager' || MANAGER_IDS.includes(id) || isManager(user)) return false;
  return isDigitalMarketing(user) || isCEO(user) || isHR(user) || user?.role === 'admin' || user?.role === 'superadmin';
};

/**
 * Marketing & Meta Leads Access Guard:
 * Marketing Executives / Digital Marketing, Telecallers, Counsellors, CEO, HR, Admin, and Managers have access to their assigned campaigns/leads.
 * Developers and Trainers are strictly excluded.
 */
export const canAccessMarketingLeads = (user, metaLeadAssignment) => {
  if (!user) return false;
  // If user is designated as Department Head or has campaigns assigned by Admin, grant access
  if (user?.isHead || metaLeadAssignment?.hasAccess || (metaLeadAssignment?.assignedCount > 0)) {
    return true;
  }
  if (isCounsellor(user)) return true;
  if (isDeveloper(user) || isTrainer(user)) return false;
  return true;
};

/**
 * Email Blast & Broadcast Access Guard:
 * Strictly restricted to CTO, HR Managers, and Managing Director (or CEO/Executive).
 * Counsellors, Developers, Trainers, and Digital Marketing are strictly excluded.
 */
export const canAccessEmailBlast = (user) => {
  // Hidden for Admin and all roles - Don't show to anyone
  return false;
};

/**
 * Delete Action Guard:
 * - HR & Counsellor designation: Delete options are NOT showing (strictly false).
 * - CEO / Admin / Manager: Delete options are showing.
 */
export const canDelete = (user) => {
  if (!user) return false;
  if (isHR(user) || isCounsellor(user)) return false;
  return isCEO(user) || user?.role === 'admin' || user?.role === 'manager';
};

/**
 * Digital Calendar Delete Guard:
 * Marketing team members CANNOT have delete option under any circumstance.
 * Only Admin / CEO / Executive should have delete permissions.
 */
export const canDeleteDigitalCalendar = (user) => {
  if (!user) return false;
  if (isDigitalMarketing(user) && user?.role !== 'admin' && user?.role !== 'superadmin') return false;
  return isCEO(user) || user?.role === 'admin' || user?.role === 'superadmin';
};

/**
 * Digital Calendar Approve Guard:
 * Approve button ONLY for admin. Marketing team cannot have approve button.
 */
export const canApproveDigitalCalendar = (user) => {
  if (!user) return false;
  // Strictly admin only
  if (isDigitalMarketing(user) && user?.role !== 'admin' && user?.role !== 'superadmin') return false;
  return isCEO(user) || user?.role === 'admin' || user?.role === 'superadmin';
};

/**
 * Digital Calendar Complete Guard:
 * Completed button ONLY for marketing team. Admin cannot have completed button.
 */
export const canCompleteDigitalCalendar = (user) => {
  if (!user) return false;
  // Admin cannot have completed button
  const isAdmin = isCEO(user) || user?.role === 'admin' || user?.role === 'superadmin';
  if (isAdmin) return false;

  // Only marketing team members
  return isDigitalMarketing(user) || String(user?.department || '').trim().toUpperCase().includes('MARKETING');
};

/**
 * Dashboard Access Guard:
 * - Only CEO and HR Management are allowed to view Dashboard.
 * - Telecallers and remaining staff do not show Dashboard and use Daily Activity & Assigned Leads.
 */
export const canViewDashboard = (user) => {
  if (!user) return false;
  const role = String(user?.role || '').trim().toLowerCase();
  const id = String(user?._id || user?.id || '');
  if (role === 'manager' || MANAGER_IDS.includes(id) || isManager(user)) return false;
  if (isTelecaller(user)) return false;
  return isCEO(user) || isHR(user);
};

/**
 * Call Recordings Access Guard:
 * Strictly visible to HR Management and Admin (CEO, Managing Director, CTO, Admin role).
 * Counsellors and other employees are strictly excluded.
 */
export const canViewCallRecordings = (user) => {
  if (!user) return false;
  if (isCounsellor(user)) return false;
  return isHR(user) || isCEO(user) || user?.role === 'admin' || user?.role === 'manager' || isManager(user);
};

/**
 * Daily Activity Access Guard:
 * - Digital Department is already assigned Digital Calendar.
 * - Daily Activity is removed for Digital Marketing staff (unless Admin/Executive/Manager).
 */
export const canAccessDailyActivity = (user) => {
  if (!user) return false;
  if (isExecutive(user) || user?.role === 'admin' || user?.role === 'manager') return true;
  if (isDigitalMarketing(user)) return false;
  return true;
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
  const rawList = Array.isArray(users) ? users : [];
  if (!currentUser) return [];

  // Exclude Marketing department users permanently from TODO/Task assignment
  const userList = rawList.filter(u => {
    if (!u) return false;
    const uDept = String(u.department || '').toLowerCase().trim();
    const uDesig = String(u.designation || '').toLowerCase().trim();
    return !(uDept === 'marketing' || uDept.includes('market') || uDesig.includes('marketing') || isDigitalMarketing(u));
  });

  const isSameUser = (u1, u2) => {
    if (!u1 || !u2) return false;
    const id1 = String(u1._id || u1.id || '');
    const id2 = String(u2._id || u2.id || '');
    if (id1 && id2 && id1 === id2) return true;
    const email1 = String(u1.email || '').trim().toLowerCase();
    const email2 = String(u2.email || '').trim().toLowerCase();
    if (email1 && email2 && email1 === email2) return true;
    const name1 = String(u1.name || '').trim().toLowerCase();
    const name2 = String(u2.name || '').trim().toLowerCase();
    if (name1 && name2 && name1 === name2) return true;
    return false;
  };

  const isAdmin = isExecutive(currentUser) || currentUser.role === 'admin' || currentUser.role === 'superadmin';

  // Determine user's own department
  const userDept = currentUser.department || (
    isDeveloper(currentUser) ? 'Developer' :
    isHR(currentUser) ? 'HR' :
    isTrainer(currentUser) ? 'Trainer' : ''
  );

  // If non-admin user, restrict effective department strictly to userDept unless selectedDepartment matches
  const targetDepartment = selectedDepartment && selectedDepartment !== 'All' && selectedDepartment !== 'all'
    ? selectedDepartment
    : (isAdmin ? 'All' : userDept);

  // Filter user list by department
  let deptFilteredUsers = userList;
  if (targetDepartment && targetDepartment !== 'all' && targetDepartment !== 'All') {
    deptFilteredUsers = userList.filter(u => {
      const uDept = String(u.department || '').toLowerCase().trim();
      const uDesig = String(u.designation || '').toLowerCase().trim();
      const target = String(targetDepartment).toLowerCase().trim();

      if (uDept === target || uDesig.includes(target)) return true;
      if ((target === 'developer' || target === 'development') && (uDept.includes('dev') || uDesig.includes('dev') || isDeveloper(u))) return true;
      if (target === 'hr' && (uDept.includes('hr') || uDesig.includes('hr') || isHR(u))) return true;
      if ((target === 'trainer' || target === 'trainers') && (uDept.includes('trainer') || uDesig.includes('trainer') || isTrainer(u))) return true;
      if ((target === 'admin' || target === 'management') && (uDept.includes('admin') || uDept.includes('management') || isExecutive(u))) return true;
      return false;
    });
  }

  // Deduplicate and format dropdownLabel: "Name — Designation"
  const formattedList = [];
  deptFilteredUsers.forEach(u => {
    if (!u) return;
    if (!formattedList.some(existing => isSameUser(existing, u))) {
      const isMe = isSameUser(u, currentUser);
      const name = u.name || 'User';
      const desig = u.designation || (isMe ? currentUser.designation : '') || u.department || '';
      formattedList.push({
        ...u,
        designation: desig,
        dropdownLabel: `${name}${desig ? ` — ${desig}` : ''}${isMe ? ' (You)' : ''}`
      });
    }
  });

  // Ensure current user is in list if not present and target matching
  const isMeInList = formattedList.some(u => isSameUser(u, currentUser));
  if (!isMeInList) {
    const meName = currentUser.name || 'Account Holder';
    const meDesig = currentUser.designation || 'Account Holder';
    const meUser = {
      _id: currentUser._id || currentUser.id,
      name: meName,
      designation: meDesig,
      department: currentUser.department || userDept || '',
      isMe: true,
      dropdownLabel: `${meName}${meDesig ? ` — ${meDesig}` : ''} (You)`
    };

    if (!isAdmin || targetDepartment === 'All' || targetDepartment.toLowerCase() === String(userDept).toLowerCase()) {
      formattedList.unshift(meUser);
    }
  }

  if (formattedList.length === 0) {
    const meName = currentUser.name || 'Account Holder';
    const meDesig = currentUser.designation || 'Account Holder';
    return [{
      _id: currentUser._id || currentUser.id,
      name: meName,
      designation: meDesig,
      department: currentUser.department || userDept || '',
      isMe: true,
      dropdownLabel: `${meName}${meDesig ? ` — ${meDesig}` : ''} (You)`
    }];
  }

  return formattedList;
};

export const getTaskAssignorOptions = (currentUser, users = []) => {
  const userList = Array.isArray(users) ? users : [];
  if (!currentUser) return [];

  const isSameUser = (u1, u2) => {
    if (!u1 || !u2) return false;
    const id1 = String(u1._id || u1.id || '');
    const id2 = String(u2._id || u2.id || '');
    if (id1 && id2 && id1 === id2) return true;
    const email1 = String(u1.email || '').trim().toLowerCase();
    const email2 = String(u2.email || '').trim().toLowerCase();
    if (email1 && email2 && email1 === email2) return true;
    const name1 = String(u1.name || '').trim().toLowerCase();
    const name2 = String(u2.name || '').trim().toLowerCase();
    if (name1 && name2 && name1 === name2) return true;
    return false;
  };

  // Find logged-in user (Account Holder)
  const existingMe = userList.find(u => isSameUser(u, currentUser));
  const meName = existingMe?.name || currentUser.name || 'Account Holder';
  const meDesig = existingMe?.designation || currentUser.designation || 'Account Holder';
  const meUser = {
    ...(existingMe || {}),
    _id: currentUser._id || currentUser.id,
    name: meName,
    designation: meDesig,
    isMe: true,
    dropdownLabel: `${meName}${meDesig ? ` — ${meDesig}` : ''} (You)`
  };

  // 1. Current user is ALWAYS index 0 (default selected for Assigned By)
  const result = [meUser];
  const addedIds = new Set([String(meUser._id)]);

  // 2. Always include Admin / Executive / CEO / MD / CTO users in Assigned By options
  userList.forEach(u => {
    if (!u || addedIds.has(String(u._id))) return;
    if (isExecutive(u) || u.role === 'admin' || u.role === 'superadmin' || u.name?.toLowerCase().includes('admin')) {
      addedIds.add(String(u._id));
      const desig = u.designation || (u.role === 'admin' ? 'Admin' : 'Executive');
      result.push({
        ...u,
        dropdownLabel: `${u.name}${desig ? ` — ${desig}` : ''}`
      });
    }
  });

  // Fallback Admin option if no admin in DB userList
  if (!result.some(u => isExecutive(u) || u.role === 'admin' || u.name?.toLowerCase().includes('admin'))) {
    result.push({
      _id: 'admin_fallback',
      name: 'Admin',
      designation: 'Managing Director',
      dropdownLabel: 'Admin — Managing Director'
    });
  }

  // 3. Include HR, Managers, and Department peers
  userList.forEach(u => {
    if (!u || addedIds.has(String(u._id))) return;
    const uDept = String(u.department || '').toLowerCase().trim();
    const myDept = String(currentUser.department || '').toLowerCase().trim();
    if (isHR(u) || isManager(u) || (uDept && myDept && uDept === myDept)) {
      addedIds.add(String(u._id));
      const desig = u.designation || u.department || 'Team Member';
      result.push({
        ...u,
        dropdownLabel: `${u.name}${desig ? ` — ${desig}` : ''}`
      });
    }
  });

  return result;
};

export const isSameUser = (u1, u2) => {
  if (!u1 || !u2) return false;
  const id1 = String(u1._id || u1.id || '');
  const id2 = String(u2._id || u2.id || '');
  if (id1 && id2 && id1 === id2) return true;
  const email1 = String(u1.email || '').trim().toLowerCase();
  const email2 = String(u2.email || '').trim().toLowerCase();
  if (email1 && email2 && email1 === email2) return true;
  const name1 = String(u1.name || '').trim().toLowerCase();
  const name2 = String(u2.name || '').trim().toLowerCase();
  if (name1 && name2 && name1 === name2) return true;
  return false;
};

/**
 * Filter team users for Todo / Task Team dropdown.
 * - Admin / Executive: Full visibility across all employees
 * - Non-admin employees: Strictly restricted to their own department members from MongoDB
 */
export const isTeamDropdownMember = (user) => {
  return !!user;
};

export const filterTeamDropdownUsers = (users = [], currentUser = null) => {
  if (!Array.isArray(users)) return [];
  // Exclude Marketing department users permanently from Tasks / Todos
  const nonMarketingUsers = users.filter(u => {
    if (!u) return false;
    const uDept = String(u.department || '').toLowerCase().trim();
    const uDesig = String(u.designation || '').toLowerCase().trim();
    return !(uDept === 'marketing' || uDept.includes('market') || uDesig.includes('marketing') || isDigitalMarketing(u));
  });

  if (!currentUser || isExecutive(currentUser) || currentUser?.role === 'admin' || currentUser?.role === 'superadmin') {
    return nonMarketingUsers;
  }
  const myDept = String(currentUser.department || '').toLowerCase().trim();
  const myDesig = String(currentUser.designation || '').toLowerCase().trim();
  if (!myDept && !myDesig) return nonMarketingUsers;
  return nonMarketingUsers.filter(u => {
    const uDept = String(u.department || '').toLowerCase().trim();
    const uDesig = String(u.designation || '').toLowerCase().trim();
    const matchDept = myDept && (uDept === myDept || uDesig.includes(myDept));
    const matchDesig = myDesig && (
      uDesig === myDesig || 
      uDesig.includes(myDesig) || 
      (myDesig.includes('developer') && (uDesig.includes('developer') || uDept.includes('dev'))) || 
      (myDesig.includes('trainer') && (uDesig.includes('trainer') || uDept.includes('train'))) ||
      (myDept.includes('dev') && (uDept.includes('dev') || uDesig.includes('developer')))
    );
    return matchDept || matchDesig || isSameUser(u, currentUser);
  });
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

/**
 * Check if the user has permission to edit a task/todo.
 * - Admin / Superadmin / Executive: Full edit permissions across all tasks and departments.
 * - Non-admin employees: If an employee adds a todo, they have the edit option for their own task.
 */
export const canEditTask = (task, currentUser) => {
  if (!currentUser) return false;
  if (isExecutive(currentUser) || currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.isHead) {
    return true;
  }
  if (!task) return false;
  const currentId = String(currentUser?._id || currentUser?.id || '');
  if (!currentId) return false;

  const createdById = String(task.createdBy?._id || task.createdBy?.id || task.createdBy || '');
  const assignedById = String(task.assignedBy?._id || task.assignedBy?.id || task.assignedBy || '');
  const assignedToId = String(task.assignedTo?._id || task.assignedTo?.id || task.assignedTo || '');

  // Employee can edit if they created/added the todo or are the assignee/assignor
  return (createdById && createdById === currentId) ||
         (assignedById && assignedById === currentId) ||
         (assignedToId && assignedToId === currentId);
};

/**
 * Check if the user has permission to delete a task/todo.
 * - Strictly Admin / Superadmin / Executive only.
 * - Non-admin employees NEVER have delete permission.
 */
export const canDeleteTask = (task, currentUser) => {
  if (!currentUser) return false;
  return isExecutive(currentUser) || currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.isHead;
};

/**
 * Backwards compatibility helper for task permissions.
 */
export const canEditOrDeleteTask = (task, currentUser) => {
  return canDeleteTask(task, currentUser);
};

/**
 * Check if the user has permission to confirm / Mark Complete on Todo, Task, or Follow-up.
 * - Strictly restricted to Admin / Superadmin / Executive.
 * - All other departments (non-admin employees) have this action hidden/removed.
 */
export const canMarkCompleteTask = (currentUser) => {
  if (!currentUser) return false;
  return isExecutive(currentUser) || currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.isHead;
};

/**
 * Call Follow-ups Visibility Guard:
 * Strictly visible ONLY to Admin and Manager.
 * Hidden for all other departments (Developers, Trainers, Marketing, HR, etc.).
 */
export const canViewAllDailyActivitySchedules = (user) => {
  if (!user) return false;
  return isExecutive(user) || isManager(user) || user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager' || isHR(user);
};

export const canEditDailyActivitySchedule = (user) => {
  if (!user) return false;
  return isExecutive(user) || isManager(user) || user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager' || isHR(user);
};

export const canManageDailyActivitySchedule = (user) => {
  return canEditDailyActivitySchedule(user);
};

export const canDeleteDailyActivitySchedule = (user) => {
  if (!user) return false;
  return isExecutive(user) || user?.role === 'admin' || user?.role === 'superadmin';
};

export const canViewOwnDailyActivitySchedule = (user) => {
  return Boolean(user);
};

export const canEditOwnDailyActivitySchedule = (user) => {
  return Boolean(user);
};

export const canViewCallFollowups = (user) => {
  if (!user) return false;
  return isExecutive(user) || isManager(user) || user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager';
};




