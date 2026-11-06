/**
 * System Role Definitions
 * Strictly 5 Allowed System Roles:
 * 1. Admin
 * 2. Manager
 * 3. Marketing Executive
 * 4. Software Developer
 * 5. Trainers
 */
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MARKETING_EXECUTIVE: 'marketing_executive',
  SOFTWARE_DEVELOPER: 'software_developer',
  TRAINER: 'trainer',
  EMPLOYEE: 'employee',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.MARKETING_EXECUTIVE]: 'Marketing Executive',
  [ROLES.SOFTWARE_DEVELOPER]: 'Software Developer',
  [ROLES.TRAINER]: 'Trainers',
  [ROLES.EMPLOYEE]: 'Employee',
};

// Explicit User ID Mapping to System Roles
export const SYSTEM_ROLE_USERS = {
  admin: [
    '6ab9f622dab3a1da6ab7f9ca' // Ameen Sayyed
  ],
  manager: [
    '6ab6449b62b25645faae28ed', // Dasari Durga Bhavani
    '6ab38a233312a90866e3c76c', // deenaz shaik
    '6ad8ba8cf32fe447c4783eda'  // Raja Sri
  ],
  marketing_executive: [
    '6ab63ad762b25645faae244e', // Ashok Y
    '6abe21442605716ce3869045', // Chinthala Manasa
    '6abe233b2605716ce38691a2'  // Moeen Ahmad Mahammad
  ],
  software_developer: [
    '6ab25b5dc6d2062c7cd12eea', // Ramanadham Jayaveer
    '6ab386d83312a90866e3c6d5'  // Saadiya Mohammad
  ],
  trainer: [
    '6aba5c2fffdd149e031957ba', // Bhargav Possimsetty
    '6aba63a7ffdd149e03195cb7', // Adilakshmi Vemala
    '6ab7af419b0606da1d050728'  // Venkat Sai
  ]
};
