import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/login_pages/Login';
import SignUp from './pages/login_pages/sign-up';
import Dashboard from './components/dashboard/Dashboard';
import AllLeads from './Marketing/AllLeads/AllLeads';
import AddLead from './Marketing/AddLead';
import Campaigns from './Marketing/Campaign/Campaigns';
import CampaignDetail from './Marketing/Campaign/CampaignDetail';
import Leaderboard from './Marketing/Leaderboard/Leaderboard';
import Reports from './Marketing/Report/Reports';
import Tasks from './components/dashboard/Task/Task';
import Profile from './pages/Profile';
import Blocklist from './pages/Blocklist';
import MyPreferences from './pages/MyPreferences';
import WhatsApp from './Marketing/Whatsapp/WhatsApp';
import Contacts from './Marketing/WhatsappCampaign/Contact';
import WhatsappBlast from './Marketing/WhatsappCampaign/Whatsapp_Blast';
import EmailCRM from './Management/Email/EmailCRM';
import Users from './pages/Users';
import StaleLeads from './pages/StaleLeads';
import BulkImport from './Marketing/AllLeads/BulkImport';
import TeamOperations from './pages/TeamOperations';
import LeadProfile from './Marketing/Leaderboard/LeadProfile';
import Integrations from './pages/Integrations';
import IntegrationSetup from './pages/IntegrationSetup';
import IntegrationDetail from './pages/IntegrationDetail';
import AccessTokens from './pages/AccessTokens';
import LeadStage from './Marketing/Leaderboard/LeadStage';
import Fields from './pages/Fields';
import CustomActions from './pages/CustomActions';
import WorkspacePreferences from './pages/WorkspacePreferences';
import PermissionTemplates from './pages/PermissionTemplates';
import Billing from './pages/Billing';
import Payslip from './Finance/payslip/Payslip';
import Invoice from './Finance/invoice/Invoice';
import Quotation from './Finance/quotation/Quotation';
import OfferLetter from './Finance/offerletter/OfferLetter';
import Landing from './pages/landing_pages/Landing';
import LiveEmployeeTracking from './Management/Attedence/LiveEmployee/LiveEmployeeTracking';
import AttendanceRecords from './Management/Attedence/AttendanceRecords';
import Accept from './components/dashboard/accept';
import BulkEmailBlast from './Management/Email/BulkEmailBlast';
import MapsDashboard from './Maps';

import { isCEO, isHR, isLimitedStaff, canViewDashboard, canAccessEmailBlast } from './utils/permissions';

const ProtectedRoute = ({ children, allowPending = false }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 spinner-gradient" />
        <p className="text-gray-500 text-sm">Loading AOTMS...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (!allowPending && user.role !== 'admin' && (user.approvalStatus === 'pending' || user.approvalStatus === 'rejected')) {
    return <Navigate to="/accept" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return children;
  if (user.role !== 'admin' && (user.approvalStatus === 'pending' || user.approvalStatus === 'rejected')) {
    return <Navigate to="/accept" replace />;
  }
  return <Navigate to={canViewDashboard(user) ? "/dashboard" : "/tasks"} replace />;
};

// Route guard: Only CEO and HR are allowed to view Dashboard. Remaining staff are redirected to /tasks
const DashboardRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (canViewDashboard(user)) {
    return children;
  }
  return <Navigate to="/tasks" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || isCEO(user) || isHR(user);
  return isAdmin ? children : <Navigate to={canViewDashboard(user) ? "/dashboard" : "/tasks"} replace />;
};

const AdminOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isStrictAdmin = user?.role === 'admin' || isCEO(user) || isHR(user);
  return isStrictAdmin ? children : <Navigate to={canViewDashboard(user) ? "/dashboard" : "/tasks"} replace />;
};

// Route guard for Attendance — fully enabled for CEO, HR, Developer, Trainer, Digital Marketing, Admins & Managers
const AttendanceRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Route guard restricting Developer, Trainer, Digital Marketing from non-assigned modules
const StaffRestrictedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!canViewDashboard(user) || isLimitedStaff(user)) {
    return <Navigate to="/tasks" replace />;
  }
  return children;
};

// Route guard for Bulk Email Blast — strictly CTO, HR, and Managing Director (or CEO/Executive)
const BlastRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (canAccessEmailBlast(user)) {
    return children;
  }
  return <Navigate to="/tasks" replace />;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && (user.approvalStatus === 'pending' || user.approvalStatus === 'rejected')) {
    return <Navigate to="/accept" replace />;
  }
  return <Navigate to={canViewDashboard(user) ? "/dashboard" : "/tasks"} replace />;
};


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
          <Route path="/sign-up" element={<PublicRoute><SignUp /></PublicRoute>} />
          <Route path="/accept" element={<ProtectedRoute allowPending={true}><Accept /></ProtectedRoute>} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="accept" element={<AdminRoute><Accept /></AdminRoute>} />
            <Route path="dashboard" element={<DashboardRoute><Dashboard /></DashboardRoute>} />
            <Route path="billing" element={<AdminRoute><Billing /></AdminRoute>} />
            <Route path="leads" element={<StaffRestrictedRoute><AllLeads /></StaffRestrictedRoute>} />
            <Route path="all-leads" element={<StaffRestrictedRoute><AllLeads /></StaffRestrictedRoute>} />
            <Route path="leads/new" element={<StaffRestrictedRoute><AddLead /></StaffRestrictedRoute>} />
            <Route path="leads/:id" element={<StaffRestrictedRoute><LeadProfile /></StaffRestrictedRoute>} />
            <Route path="leads/:id/edit" element={<StaffRestrictedRoute><AddLead /></StaffRestrictedRoute>} />
            <Route path="campaigns" element={<StaffRestrictedRoute><Campaigns /></StaffRestrictedRoute>} />
            <Route path="campaigns/:id" element={<StaffRestrictedRoute><CampaignDetail /></StaffRestrictedRoute>} />
            <Route path="leaderboard" element={<StaffRestrictedRoute><Leaderboard /></StaffRestrictedRoute>} />
            <Route path="reports" element={<StaffRestrictedRoute><Reports /></StaffRestrictedRoute>} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="profile" element={<Profile />} />
            <Route path="contacts" element={<StaffRestrictedRoute><Contacts /></StaffRestrictedRoute>} />
            <Route path="contact" element={<Navigate to="/contacts" replace />} />
            <Route path="whatsapp-campaigns" element={<Navigate to="/contacts" replace />} />
            <Route path="whatsapp-campaign" element={<Navigate to="/contacts" replace />} />
            <Route path="whatsapp-blast" element={<StaffRestrictedRoute><WhatsappBlast /></StaffRestrictedRoute>} />
            <Route path="blocklist" element={<AdminRoute><Blocklist /></AdminRoute>} />
            <Route path="my-preferences" element={<MyPreferences />} />
            <Route path="whatsapp" element={<StaffRestrictedRoute><WhatsApp /></StaffRestrictedRoute>} />
            <Route path="email" element={<EmailCRM />} />
            <Route path="email-blast" element={<BlastRoute><BulkEmailBlast /></BlastRoute>} />
            <Route path="offer-letter" element={<AdminRoute><OfferLetter /></AdminRoute>} />
            <Route path="payslips" element={<AdminRoute><Payslip /></AdminRoute>} />
            <Route path="payslip" element={<Navigate to="/payslips" replace />} />
            <Route path="quotation" element={<AdminRoute><Quotation /></AdminRoute>} />
            <Route path="invoice" element={<AdminRoute><Invoice /></AdminRoute>} />
            <Route path="invoices" element={<Navigate to="/invoice" replace />} />
            <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="stale-leads" element={<AdminRoute><StaleLeads /></AdminRoute>} />
            <Route path="bulk-import" element={<StaffRestrictedRoute><BulkImport /></StaffRestrictedRoute>} />
            <Route path="team-operations" element={<AdminRoute><TeamOperations /></AdminRoute>} />
            <Route path="integrations" element={<AdminRoute><Integrations /></AdminRoute>} />
            <Route path="integrations/setup/:type" element={<AdminRoute><IntegrationSetup /></AdminRoute>} />
            <Route path="integrations/:id" element={<AdminRoute><IntegrationDetail /></AdminRoute>} />
            <Route path="access-tokens" element={<AdminRoute><AccessTokens /></AdminRoute>} />
            <Route path="lead-stage" element={<AdminRoute><LeadStage /></AdminRoute>} />
            <Route path="fields" element={<AdminRoute><Fields /></AdminRoute>} />
            <Route path="custom-actions" element={<AdminRoute><CustomActions /></AdminRoute>} />
            <Route path="workspace-preferences" element={<AdminRoute><WorkspacePreferences /></AdminRoute>} />
            <Route path="permission-templates" element={<AdminRoute><PermissionTemplates /></AdminRoute>} />
            <Route path="admin/employee-tracking" element={<AdminOnlyRoute><LiveEmployeeTracking /></AdminOnlyRoute>} />
            <Route path="employee-tracking" element={<AdminOnlyRoute><LiveEmployeeTracking /></AdminOnlyRoute>} />
            <Route path="admin/attendance-records" element={<AttendanceRoute><AttendanceRecords /></AttendanceRoute>} />
            <Route path="attendance-records" element={<AttendanceRoute><AttendanceRecords /></AttendanceRoute>} />
            <Route path="add-lead" element={<StaffRestrictedRoute><AddLead /></StaffRestrictedRoute>} />
            <Route path="maps" element={<MapsDashboard />} />
          </Route>
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}