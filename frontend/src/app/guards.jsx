import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isCEO, isManager } from '../utils/permissions';
import { ROLES } from '../permissions/roles';

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const activeToken = token || localStorage.getItem('aotms_token');
  const activeUser = user || (() => {
    try {
      const saved = localStorage.getItem('aotms_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  if (!activeToken || !activeUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = activeUser.role || (isCEO(activeUser) ? ROLES.ADMIN : isManager(activeUser) ? ROLES.MANAGER : ROLES.EMPLOYEE);
    const hasRole = allowedRoles.includes(userRole) || userRole === ROLES.ADMIN || isCEO(activeUser);

    if (!hasRole) {
      return <Navigate to="/403" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
