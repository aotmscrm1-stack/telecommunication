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
import Landing from './pages/Landing';

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="billing" element={<Billing />} />
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
            <Route path="blocklist" element={<Blocklist />} />
            <Route path="my-preferences" element={<MyPreferences />} />
            <Route path="whatsapp" element={<WhatsApp />} />
            <Route path="email" element={<EmailCRM />} />
            <Route path="payslips" element={<Payslip />} />
            <Route path="payslip" element={<Navigate to="/payslips" replace />} />
            <Route path="users" element={<Users />} />
            <Route path="stale-leads" element={<StaleLeads />} />
            <Route path="bulk-import" element={<BulkImport />} />
            <Route path="team-operations" element={<TeamOperations />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="integrations/setup/:type" element={<IntegrationSetup />} />
            <Route path="integrations/:id" element={<IntegrationDetail />} />
            <Route path="access-tokens" element={<AccessTokens />} />
            <Route path="lead-stage" element={<LeadStage />} />
            <Route path="fields" element={<Fields />} />
            <Route path="custom-actions" element={<CustomActions />} />
            <Route path="workspace-preferences" element={<WorkspacePreferences />} />
            <Route path="permission-templates" element={<PermissionTemplates />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}