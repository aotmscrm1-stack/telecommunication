import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canViewDashboard, isLimitedStaff, canAccessEmailBlast, canViewCallRecordings, isCEO, isHR, canAccessDigitalCalendar } from '../utils/permissions';
import { ProtectedRoute } from './guards';

// Layouts
import PublicLayout from '../layouts/PublicLayout/PublicLayout';
import AuthLayout from '../layouts/AuthLayout/AuthLayout';
import AdminLayout from '../layouts/AdminLayout/AdminLayout';
import ManagerLayout from '../layouts/ManagerLayout/ManagerLayout';
import EmployeeLayout from '../layouts/EmployeeLayout/EmployeeLayout';
import ShellLayout from '../components/Layout/Layout';

// Public & Landing
import Landing from '../pages/landing/Landing';
import Logo from '../pages/landing/Logo';

// Auth Pages
import Login from '../pages/auth/login/Login';
import SignUp from '../pages/auth/signup/SignUp';
import ForgotPassword from '../pages/auth/forgot-password/ForgotPassword';
import ResetPassword from '../pages/auth/reset-password/ResetPassword';
import VerifyAccount from '../pages/auth/verify-account/VerifyAccount';

// Dashboard & Tasks Modules
import Dashboard from '../modules/dashboard';
import Tasks from '../modules/tasks';

// Marketing Modules
import { AllLeads, AddLead, BulkImport } from '../modules/marketing/leads';
import { Campaigns, CampaignDetail } from '../modules/marketing/campaigns';
import { Contact as Contacts } from '../modules/marketing/contacts';
import { WhatsappBlast } from '../modules/marketing/whatsapp-blast';
import { WhatsApp } from '../modules/marketing/whatsapp';
import { Leaderboard, LeadProfile } from '../modules/marketing/leaderboard';
import { Reports } from '../modules/marketing/reports';
import { DigitalCalendar } from '../modules/marketing/digital-calendar';

// Finance Modules
import { OfferLetter } from '../modules/finance/offer-letters';
import { Payslip } from '../modules/finance/payslips';
import { Quotation } from '../modules/finance/quotations';
import { Invoice } from '../modules/finance/invoices';
import { FeeReceipt } from '../modules/finance/fee-receipts';

// Management Modules
import { Departments } from '../modules/management/departments';
import { AttendanceRecords } from '../modules/management/attendance';
import { LiveEmployeeTracking } from '../modules/management/live-tracking';

// Communication Modules
import { CallRecordings } from '../modules/communication/call-recordings';
import { EmailCRM, BulkEmailBlast } from '../modules/communication/email-crm';
import InstagramCRM from '../modules/communication/instagram';

// Developer Modules
import { Integrations, IntegrationSetup, IntegrationDetail } from '../modules/developer/integrations';
import { AccessTokens } from '../modules/developer/access-tokens';
import Webhooks from '../modules/developer/webhooks';
import ApiLogs from '../modules/developer/api-logs';
import SystemLogs from '../modules/developer/system-logs';

// Settings & Additional Pages
import Profile from '../pages/Profile';
import MyPreferences from '../pages/MyPreferences';
import WorkspacePreferences from '../pages/WorkspacePreferences';
import PermissionTemplates from '../pages/PermissionTemplates';
import Fields from '../pages/Fields';
import CustomActions from '../pages/CustomActions';
import Billing from '../pages/Billing';
import MapsDashboard from '../Maps';

// Error Pages
import Forbidden from '../pages/errors/403/Forbidden';
import NotFound from '../pages/errors/404/NotFound';
import ServerError from '../pages/errors/500/ServerError';

// Guard Wrappers
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return children;
  return <Navigate to={canViewDashboard(user) ? "/dashboard" : "/tasks"} replace />;
};

const DashboardRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return canViewDashboard(user) ? children : <Navigate to="/tasks" replace />;
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

const StaffRestrictedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!canViewDashboard(user) || isLimitedStaff(user)) {
    return <Navigate to="/tasks" replace />;
  }
  return children;
};

const BlastRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return canAccessEmailBlast(user) ? children : <Navigate to="/tasks" replace />;
};

const CallRecordingsRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return canViewCallRecordings(user) ? children : <Navigate to={canViewDashboard(user) ? "/dashboard" : "/tasks"} replace />;
};

const DigitalCalendarRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return canAccessDigitalCalendar(user) ? children : <Navigate to={canViewDashboard(user) ? "/dashboard" : "/tasks"} replace />;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={canViewDashboard(user) ? "/dashboard" : "/tasks"} replace />;
};

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Logo showLandingDirectly={true} />} />
      <Route path="/logo" element={<Logo autoRedirect={true} />} />
      <Route path="/landing" element={<Landing />} />

      {/* Auth Pages */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-account" element={<VerifyAccount />} />
      </Route>

      {/* Protected CRM Application Shell */}
      <Route element={<ProtectedRoute><ShellLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<DashboardRoute><Dashboard /></DashboardRoute>} />
        <Route path="billing" element={<AdminRoute><Billing /></AdminRoute>} />
        
        {/* Marketing Module Routes */}
        <Route path="digital-calendar" element={<DigitalCalendarRoute><DigitalCalendar /></DigitalCalendarRoute>} />
        <Route path="marketing/digital-calendar" element={<DigitalCalendarRoute><DigitalCalendar /></DigitalCalendarRoute>} />
        <Route path=":userId/digital-calendar" element={<DigitalCalendarRoute><DigitalCalendar /></DigitalCalendarRoute>} />
        <Route path="leads" element={<StaffRestrictedRoute><AllLeads /></StaffRestrictedRoute>} />
        <Route path="all-leads" element={<StaffRestrictedRoute><AllLeads /></StaffRestrictedRoute>} />
        <Route path="leads/new" element={<StaffRestrictedRoute><AddLead /></StaffRestrictedRoute>} />
        <Route path="leads/:id" element={<StaffRestrictedRoute><LeadProfile /></StaffRestrictedRoute>} />
        <Route path="leads/:id/edit" element={<StaffRestrictedRoute><AddLead /></StaffRestrictedRoute>} />
        <Route path="campaigns" element={<StaffRestrictedRoute><Campaigns /></StaffRestrictedRoute>} />
        <Route path="campaigns/:id" element={<StaffRestrictedRoute><CampaignDetail /></StaffRestrictedRoute>} />
        <Route path="leaderboard" element={<StaffRestrictedRoute><Leaderboard /></StaffRestrictedRoute>} />
        <Route path="reports" element={<StaffRestrictedRoute><Reports /></StaffRestrictedRoute>} />
        <Route path="contacts" element={<StaffRestrictedRoute><Contacts /></StaffRestrictedRoute>} />
        <Route path="contact" element={<Navigate to="/contacts" replace />} />
        <Route path="whatsapp-campaigns" element={<Navigate to="/contacts" replace />} />
        <Route path="whatsapp-campaign" element={<Navigate to="/contacts" replace />} />
        <Route path="whatsapp-blast" element={<StaffRestrictedRoute><WhatsappBlast /></StaffRestrictedRoute>} />
        <Route path="whatsapp" element={<StaffRestrictedRoute><WhatsApp /></StaffRestrictedRoute>} />
        <Route path="bulk-import" element={<StaffRestrictedRoute><BulkImport /></StaffRestrictedRoute>} />
        <Route path="add-lead" element={<StaffRestrictedRoute><AddLead /></StaffRestrictedRoute>} />

        {/* Tasks & Todo */}
        <Route path="tasks" element={<Tasks />} />
        <Route path="todo" element={<Tasks />} />
        <Route path="todos" element={<Tasks />} />
        <Route path="follow-ups" element={<Tasks />} />
        <Route path="followups" element={<Tasks />} />
        <Route path=":userId/tasks" element={<Tasks />} />
        <Route path=":userId/todo" element={<Tasks />} />
        <Route path=":userId/todos" element={<Tasks />} />
        <Route path=":userId/follow-ups" element={<Tasks />} />
        <Route path=":userId/followups" element={<Tasks />} />

        {/* Finance Module Routes */}
        <Route path="offer-letter" element={<AdminRoute><OfferLetter /></AdminRoute>} />
        <Route path="payslips" element={<AdminRoute><Payslip /></AdminRoute>} />
        <Route path="payslip" element={<Navigate to="/payslips" replace />} />
        <Route path="quotation" element={<AdminRoute><Quotation /></AdminRoute>} />
        <Route path="invoice" element={<AdminRoute><Invoice /></AdminRoute>} />
        <Route path="invoices" element={<Navigate to="/invoice" replace />} />
        <Route path="fee-receipt" element={<AdminRoute><FeeReceipt /></AdminRoute>} />
        <Route path="fee-receipts" element={<Navigate to="/fee-receipt" replace />} />
        <Route path="feereceipt" element={<Navigate to="/fee-receipt" replace />} />

        {/* Management Module Routes */}
        <Route path="admin/employee-tracking" element={<AdminOnlyRoute><LiveEmployeeTracking /></AdminOnlyRoute>} />
        <Route path="employee-tracking" element={<AdminOnlyRoute><LiveEmployeeTracking /></AdminOnlyRoute>} />
        <Route path="admin/departments" element={<AdminRoute><Departments /></AdminRoute>} />
        <Route path="departments" element={<Navigate to="/admin/departments" replace />} />
        <Route path="admin/attendance-records" element={<AttendanceRecords />} />
        <Route path="attendance-records" element={<AttendanceRecords />} />
        <Route path=":userId/attendance-records" element={<AttendanceRecords />} />

        {/* Communication Module Routes */}
        <Route path="email" element={<EmailCRM />} />
        <Route path=":userId/email" element={<EmailCRM />} />
        <Route path="email-blast" element={<BlastRoute><BulkEmailBlast /></BlastRoute>} />
        <Route path="recordings" element={<CallRecordingsRoute><CallRecordings /></CallRecordingsRoute>} />
        <Route path="call-recordings" element={<CallRecordingsRoute><CallRecordings /></CallRecordingsRoute>} />
        <Route path="instagram" element={<InstagramCRM />} />
        <Route path="maps" element={<MapsDashboard />} />

        {/* Developer Module Routes */}
        <Route path="integrations" element={<AdminRoute><Integrations /></AdminRoute>} />
        <Route path="integrations/setup/:type" element={<AdminRoute><IntegrationSetup /></AdminRoute>} />
        <Route path="integrations/:id" element={<AdminRoute><IntegrationDetail /></AdminRoute>} />
        <Route path="access-tokens" element={<AdminRoute><AccessTokens /></AdminRoute>} />
        <Route path="webhooks" element={<AdminRoute><Webhooks /></AdminRoute>} />
        <Route path="api-logs" element={<AdminRoute><ApiLogs /></AdminRoute>} />
        <Route path="system-logs" element={<AdminRoute><SystemLogs /></AdminRoute>} />

        {/* User & System Settings */}
        <Route path="profile" element={<Profile />} />
        <Route path="my-preferences" element={<MyPreferences />} />
        <Route path="fields" element={<AdminRoute><Fields /></AdminRoute>} />
        <Route path="custom-actions" element={<AdminRoute><CustomActions /></AdminRoute>} />
        <Route path="workspace-preferences" element={<AdminRoute><WorkspacePreferences /></AdminRoute>} />
        <Route path="permission-templates" element={<AdminRoute><PermissionTemplates /></AdminRoute>} />
      </Route>

      {/* Standalone Error Routes */}
      <Route path="/403" element={<Forbidden />} />
      <Route path="/500" element={<ServerError />} />

      {/* Fallback Catch-All */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default AppRoutes;
