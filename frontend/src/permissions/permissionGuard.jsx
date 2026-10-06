import React from 'react';
import { useAuth } from '../context/AuthContext';
import { canDelete, canViewDashboard, canAccessEmailBlast, canViewCallRecordings } from './permissions';

export function PermissionGuard({ children, action, fallback = null }) {
  const { user } = useAuth();

  if (!user) return fallback;

  let hasPermission = true;

  switch (action) {
    case 'delete':
      hasPermission = canDelete(user);
      break;
    case 'dashboard':
      hasPermission = canViewDashboard(user);
      break;
    case 'email_blast':
      hasPermission = canAccessEmailBlast(user);
      break;
    case 'call_recordings':
      hasPermission = canViewCallRecordings(user);
      break;
    default:
      hasPermission = true;
  }

  return hasPermission ? <>{children}</> : fallback;
}

export default PermissionGuard;
