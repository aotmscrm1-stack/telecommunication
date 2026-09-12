import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import AddLead from './pages/AddLead';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Leaderboard from './pages/Leaderboard';
import Reports from './pages/Reports';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import MessageTemplates from './pages/MessageTemplates';
import Blocklist from './pages/Blocklist';
import MyPreferences from './pages/MyPreferences';
import WhatsApp from './pages/WhatsApp';
import EmailCRM from './pages/EmailCRM';
import Users from './pages/Users';
import StaleLeads from './pages/StaleLeads';
import BulkImport from './pages/BulkImport';
import TeamOperations from './pages/TeamOperations';
import LeadProfile from './pages/LeadProfile';
import Integrations from './pages/Integrations';
import IntegrationSetup from './pages/IntegrationSetup';
import IntegrationDetail from './pages/IntegrationDetail';
import AccessTokens from './pages/AccessTokens';
import LeadStage from './pages/LeadStage';
import Fields from './pages/Fields';
import CustomActions from './pages/CustomActions';
import WorkspacePreferences from './pages/WorkspacePreferences';
import PermissionTemplates from './pages/PermissionTemplates';
import Billing from './pages/Billing';
import Payslip from './pages/Payslip';
import Invoice from './pages/Invoice';
import Landing from './pages/Landing';
import LiveEmployeeTracking from './pages/LiveEmployeeTracking';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 spinner-gradient" />
        <p className="text-gray-500 text-sm">Loading AOTMS...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="billing" element={<AdminRoute><Billing /></AdminRoute>} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/new" element={<AddLead />} />
            <Route path="leads/:id" element={<LeadProfile />} />
            <Route path="leads/:id/edit" element={<AddLead />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="campaigns/:id" element={<CampaignDetail />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="reports" element={<Reports />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="profile" element={<Profile />} />
            <Route path="message-templates" element={<MessageTemplates />} />
            <Route path="blocklist" element={<AdminRoute><Blocklist /></AdminRoute>} />
            <Route path="my-preferences" element={<MyPreferences />} />
            <Route path="whatsapp" element={<WhatsApp />} />
            <Route path="email" element={<EmailCRM />} />
            <Route path="payslips" element={<AdminRoute><Payslip /></AdminRoute>} />
            <Route path="payslip" element={<Navigate to="/payslips" replace />} />
            <Route path="invoice" element={<AdminRoute><Invoice /></AdminRoute>} />
            <Route path="invoices" element={<Navigate to="/invoice" replace />} />
            <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="stale-leads" element={<AdminRoute><StaleLeads /></AdminRoute>} />
            <Route path="bulk-import" element={<BulkImport />} />
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
            <Route path="admin/employee-tracking" element={<AdminRoute><LiveEmployeeTracking /></AdminRoute>} />
            <Route path="employee-tracking" element={<AdminRoute><LiveEmployeeTracking /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}