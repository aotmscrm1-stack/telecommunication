import { useAuth } from '../context/AuthContext';
import {
  isCEO,
  isHR,
  isManager,
  isDeveloper,
  isTrainer,
  isDigitalMarketing,
  canDelete,
  canViewDashboard,
  canAccessEmailBlast,
  canViewCallRecordings,
} from '../permissions/permissions';

export function usePermissions() {
  const { user } = useAuth();

  return {
    user,
    isCEO: isCEO(user),
    isHR: isHR(user),
    isManager: isManager(user),
    isDeveloper: isDeveloper(user),
    isTrainer: isTrainer(user),
    isDigitalMarketing: isDigitalMarketing(user),
    canDelete: canDelete(user),
    canViewDashboard: canViewDashboard(user),
    canAccessEmailBlast: canAccessEmailBlast(user),
    canViewCallRecordings: canViewCallRecordings(user),
  };
}

export default usePermissions;
