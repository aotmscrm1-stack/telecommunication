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

export const isCEO = (user) => {
  const d = normalizeDesignation(user);
  return d === 'CEO' || user?.role === 'admin';
};

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
 * Delete Action Guard:
 * - HR designation: Delete options are NOT showing (strictly false).
 * - CEO / Admin / Manager: Delete options are showing.
 */
export const canDelete = (user) => {
  if (!user) return false;
  if (isHR(user)) return false;
  return isCEO(user) || user?.role === 'admin' || user?.role === 'manager';
};
