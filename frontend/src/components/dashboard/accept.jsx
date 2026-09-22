// src/components/dashboard/accept.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { usersAPI, authAPI } from '../../services/api';
import { isExecutive, isHR, canDelete, canViewDashboard } from '../../utils/permissions';
import logoImg from '../../assets/aotms-global-logo.png';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  LogOut,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Trash2
} from 'lucide-react';

// ReactBits Style Animated Accept Button (Zero Green: White, Orange, Smart Blue)
const ReactBitsAcceptButton = ({ onClick, loading = false, disabled = false, label = 'Accept', size = 'md' }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #ea580c 85%, #f97316 100%)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        borderRadius: size === 'sm' ? '10px' : '12px',
        padding: size === 'sm' ? '6px 14px' : '10px 20px',
        fontSize: size === 'sm' ? '12px' : '13.5px',
        fontWeight: 800,
        cursor: disabled || loading ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        boxShadow: '0 4px 14px -2px rgba(2, 132, 199, 0.4), 0 2px 6px -1px rgba(249, 115, 22, 0.3)',
        transition: 'all 0.2s ease',
        outline: 'none',
        opacity: disabled ? 0.6 : 1
      }}
      title="Accept User Profile"
    >
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '60%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
          transform: 'skewX(-20deg)',
          transition: 'left 0.6s ease',
          pointerEvents: 'none'
        }}
      />
      {loading ? (
        <RefreshCw size={size === 'sm' ? 12 : 14} className="animate-spin" />
      ) : (
        <CheckCircle2 size={size === 'sm' ? 13 : 15} />
      )}
      <span>{label}</span>
    </motion.button>
  );
};

export default function Accept() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Admin approval management state
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [filterTab, setFilterTab] = useState('pending'); // 'pending' | 'accepted' | 'rejected' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Selected user for details modal
  const [selectedUserModal, setSelectedUserModal] = useState(null);

  // Reject modal state
  const [rejectPromptUser, setRejectPromptUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Delete modal state (permanent removal)
  const [deletePromptUser, setDeletePromptUser] = useState(null);

  // Check if current logged-in user is an administrator / executive / manager
  const isAdminOrManager = isExecutive(user) || user?.role === 'admin' || user?.role === 'manager' || isHR(user);
  const isSelfPending = user && !isAdminOrManager && (user.approvalStatus === 'pending' || !user.approvalStatus);
  const isSelfRejected = user && !isAdminOrManager && user.approvalStatus === 'rejected';

  // If regular user has already been accepted, never keep them on /accept viewing 0 registrations!
  // Immediately redirect to user dashboard or tasks
  useEffect(() => {
    if (user && user.approvalStatus === 'accepted' && !isAdminOrManager) {
      const destination = canViewDashboard(user) ? '/dashboard' : '/tasks';
      navigate(destination, { replace: true });
    }
  }, [user, isAdminOrManager, navigate]);

  // Fetch approvals list for admin/manager
  const fetchApprovals = async () => {
    if (!isAdminOrManager) return;
    try {
      setLoading(true);
      let list = [];
      try {
        const res = await usersAPI.getApprovals();
        if (res.data?.ok && Array.isArray(res.data.users) && res.data.users.length > 0) {
          list = res.data.users;
        }
      } catch (err) {
        console.warn('getApprovals endpoint error, attempting fallback:', err);
      }

      if (list.length === 0) {
        const fallback = await usersAPI.getAll();
        list = fallback.data?.users || fallback.data || [];
      }
      setUsersList(list);
    } catch (err) {
      console.error('[Approvals Fetch Error]:', err);
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to fetch user approvals' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrManager) {
      fetchApprovals();
    } else {
      setLoading(false);
    }
  }, [isAdminOrManager]);

  // Refresh personal status for pending user
  const [refreshingSelf, setRefreshingSelf] = useState(false);
  const handleRefreshMyStatus = async () => {
    try {
      setRefreshingSelf(true);
      setFeedbackMsg(null);
      const res = await authAPI.me();
      if (res.data?.user) {
        updateUser(res.data.user);
        if (res.data.user.approvalStatus === 'accepted') {
          setFeedbackMsg({ type: 'success', text: 'Congratulations! Your account has been accepted by the administrator. Redirecting to workspace...' });
          setTimeout(() => {
            navigate(canViewDashboard(res.data.user) ? '/dashboard' : '/tasks');
          }, 1000);
        } else if (res.data.user.approvalStatus === 'rejected') {
          setFeedbackMsg({ type: 'error', text: 'Your registration was rejected by the administrator.' });
        } else {
          setFeedbackMsg({ type: 'info', text: 'Your profile is still pending administrator review. Please check back shortly.' });
        }
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Could not refresh account status. Please try again.' });
    } finally {
      setRefreshingSelf(false);
    }
  };

  // Admin action: Accept user
  const handleAcceptUser = async (targetUser) => {
    try {
      setActionLoadingId(targetUser._id);
      setFeedbackMsg(null);
      const res = await usersAPI.updateApprovalStatus(targetUser._id, { status: 'accepted' });
      if (res.data?.ok) {
        setFeedbackMsg({ type: 'success', text: `✓ User ${targetUser.name} has been successfully accepted! Their portal access is now active.` });
        setUsersList(prev => prev.map(u => u._id === targetUser._id ? { ...u, approvalStatus: 'accepted' } : u));
        if (selectedUserModal?._id === targetUser._id) {
          setSelectedUserModal(prev => ({ ...prev, approvalStatus: 'accepted' }));
        }
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to accept user' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin action: Reject user
  const handleConfirmReject = async () => {
    if (!rejectPromptUser) return;
    try {
      setActionLoadingId(rejectPromptUser._id);
      setFeedbackMsg(null);
      const res = await usersAPI.updateApprovalStatus(rejectPromptUser._id, {
        status: 'rejected',
        reason: rejectReason.trim() || 'Profile details did not meet verification criteria.'
      });
      if (res.data?.ok) {
        setFeedbackMsg({ type: 'info', text: `User ${rejectPromptUser.name} has been marked as rejected.` });
        setUsersList(prev => prev.map(u => u._id === rejectPromptUser._id ? { ...u, approvalStatus: 'rejected', rejectionReason: rejectReason } : u));
        setRejectPromptUser(null);
        setRejectReason('');
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to reject user' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin action: Delete user profile permanently from database
  const handleConfirmDelete = async () => {
    if (!deletePromptUser) return;
    try {
      setActionLoadingId(deletePromptUser._id);
      setFeedbackMsg(null);
      await usersAPI.delete(deletePromptUser._id);
      setFeedbackMsg({
        type: 'success',
        text: `✓ User profile for ${deletePromptUser.name} (${deletePromptUser.email}) has been permanently deleted from the database.`
      });
      setUsersList(prev => prev.filter(u => u._id !== deletePromptUser._id));
      if (selectedUserModal?._id === deletePromptUser._id) {
        setSelectedUserModal(null);
      }
      setDeletePromptUser(null);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to permanently delete user' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered users for admin list
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      // Tab filter
      if (filterTab === 'pending' && u.approvalStatus !== 'pending') return false;
      if (filterTab === 'accepted' && u.approvalStatus !== 'accepted') return false;
      if (filterTab === 'rejected' && u.approvalStatus !== 'rejected') return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
        (u.designation && u.designation.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q))
      );
    });
  }, [usersList, filterTab, searchQuery]);

  // Counts
  const pendingCount = usersList.filter(u => u.approvalStatus === 'pending').length;
  const acceptedCount = usersList.filter(u => u.approvalStatus === 'accepted').length;
  const rejectedCount = usersList.filter(u => u.approvalStatus === 'rejected').length;

  // ══════════════════════════════════════════════════════════════════
  // VIEW 0: ACCEPTED REGULAR USER (AUTO-REDIRECT TO USER WORKSPACE)
  // ══════════════════════════════════════════════════════════════════
  if (user && user.approvalStatus === 'accepted' && !isAdminOrManager) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 30%, #1e293b 0%, #0f172a 70%, #080d1a 100%)',
        color: '#ffffff',
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          border: '3px solid #f97316',
          borderTopColor: 'transparent',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px', color: '#ffffff' }}>
          Profile Verified &amp; Accepted!
        </h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 20px', maxWidth: '420px' }}>
          Welcome back, {user.name}! Your account has been approved by the administration. Redirecting to your workspace...
        </p>
        <button
          onClick={() => navigate(canViewDashboard(user) ? '/dashboard' : '/tasks')}
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #ea580c 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(249, 115, 22, 0.35)'
          }}
        >
          Enter Workspace Now →
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // VIEW 1: USER-SIDE PENDING / REJECTED SCREEN
  // ══════════════════════════════════════════════════════════════════
  if (isSelfPending || isSelfRejected) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 30%, #1e293b 0%, #0f172a 70%, #080d1a 100%)',
        color: '#ffffff',
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient background decorative glow lights */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: isSelfRejected
            ? 'radial-gradient(ellipse, rgba(239, 68, 68, 0.18) 0%, transparent 70%)'
            : 'radial-gradient(ellipse, rgba(249, 115, 22, 0.22) 0%, rgba(59, 130, 246, 0.12) 50%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />

        {/* Central Glassmorphic Card */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: isSelfRejected ? '1.5px solid rgba(239, 68, 68, 0.35)' : '1.5px solid rgba(249, 115, 22, 0.35)',
          boxShadow: isSelfRejected
            ? '0 25px 60px -15px rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(255,255,255,0.06)'
            : '0 25px 60px -15px rgba(249, 115, 22, 0.22), 0 0 0 1px rgba(255,255,255,0.06)',
          overflow: 'hidden',
          padding: '36px 32px',
          textAlign: 'center'
        }}>
          {/* Top orange/blue accent stripe */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: isSelfRejected
              ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(90deg, #f97316 0%, #fb923c 45%, #38bdf8 100%)'
          }} />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <img src={logoImg} alt="AOTMS Logo" style={{ height: '44px', objectFit: 'contain', backgroundColor: 'white', borderRadius: '4px', width: '206px', padding: '4px' }} />
          </div>

          {/* Cloudinary Profile Avatar Showcase */}
          <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 16px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: isSelfRejected ? '3px solid #ef4444' : '3px solid #f97316',
              boxShadow: isSelfRejected ? '0 0 24px rgba(239, 68, 68, 0.35)' : '0 0 24px rgba(249, 115, 22, 0.45)',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'User Profile'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#f97316' }}>
                  {user?.name?.slice(0, 2).toUpperCase() || 'U'}
                </span>
              )}
            </div>

            {/* Pulsing Status Badge on Avatar */}
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: isSelfRejected ? '#ef4444' : '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(0,0,0,0.5)',
              border: '2px solid #0f172a'
            }}>
              {isSelfRejected ? <XCircle size={14} color="#ffffff" /> : <Clock size={13} color="#ffffff" />}
            </div>
          </div>

          {/* User Name & Display Name */}
          <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {user?.name || 'New Member'}
          </h2>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f97316', marginBottom: '18px' }}>
            {user?.displayName || user?.designation || 'Staff'} • {user?.role ? user.role.toUpperCase() : 'EMPLOYEE'}
          </div>

          {/* Prominent Required Advisory Banner */}
          <div style={{
            background: isSelfRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.14)',
            border: isSelfRejected ? '1.5px solid rgba(239, 68, 68, 0.4)' : '1.5px solid rgba(249, 115, 22, 0.45)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '22px',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: isSelfRejected ? '#fca5a5' : '#fed7aa',
              marginBottom: '6px'
            }}>
              {isSelfRejected ? <XCircle size={13} /> : <Clock size={13} />}
              {isSelfRejected ? 'Application Rejected' : 'Account Status: Pending Approval'}
            </div>

            <div style={{
              fontSize: '15px',
              fontWeight: 800,
              color: isSelfRejected ? '#fecaca' : '#ffffff',
              lineHeight: 1.4,
              letterSpacing: '-0.01em'
            }}>
              {isSelfRejected
                ? 'Your registration request could not be accepted at this time.'
                : 'Please check your profile 24 hours after acceptance by the administrator.'}
            </div>

            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              {isSelfRejected
                ? (user?.rejectionReason || 'Please get in touch with our administrative office for clarification.')
                : 'All your registration details have been securely recorded. Once the administrator approves your profile, the entire CRM website will unlock automatically.'}
            </p>
          </div>

          {/* Profile Overview Grid */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '14px',
            padding: '14px 18px',
            marginBottom: '22px',
            textAlign: 'left',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Official Email</div>
              <div style={{ fontSize: '12.5px', color: '#e2e8f0', fontWeight: 600, marginTop: '2px', wordBreak: 'break-all' }}>
                {user?.email || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Staff ID</div>
              <div style={{ fontSize: '12.5px', color: '#e2e8f0', fontWeight: 600, marginTop: '2px' }}>
                {user?.employeeId || 'AOTMS-PENDING'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Designation</div>
              <div style={{ fontSize: '12.5px', color: '#e2e8f0', fontWeight: 600, marginTop: '2px' }}>
                {user?.designation || 'Staff'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Contact Number</div>
              <div style={{ fontSize: '12.5px', color: '#e2e8f0', fontWeight: 600, marginTop: '2px' }}>
                {user?.phone ? `+91 ${user.phone}` : '—'}
              </div>
            </div>

            {user?.bloodGroup && (
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Blood Group</div>
                <div style={{ fontSize: '12.5px', color: '#e2e8f0', fontWeight: 600, marginTop: '2px' }}>
                  {user.bloodGroup}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Cloudinary CDN Avatar</div>
              <div style={{ fontSize: '11px', color: user?.avatar ? '#22c55e' : '#f97316', fontWeight: 700, marginTop: '2px' }}>
                {user?.avatar ? '✓ Stored & Verified' : 'Standard'}
              </div>
            </div>
          </div>

          {/* Feedback message banner if triggered */}
          {feedbackMsg && (
            <div style={{
              background: feedbackMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : feedbackMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              border: `1px solid ${feedbackMsg.type === 'success' ? '#22c55e' : feedbackMsg.type === 'error' ? '#ef4444' : '#3b82f6'}`,
              color: '#ffffff',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: '18px'
            }}>
              {feedbackMsg.text}
            </div>
          )}

          {/* Actions: Refresh Status & Logout */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleRefreshMyStatus}
              disabled={refreshingSelf}
              style={{
                flex: 2,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '13px 20px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: refreshingSelf ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(249, 115, 22, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <RefreshCw size={15} className={refreshingSelf ? 'animate-spin' : ''} />
              {refreshingSelf ? 'Checking Status...' : 'Check Approval Status'}
            </button>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              style={{
                flex: 1,
                background: 'rgba(30, 41, 59, 0.8)',
                color: '#cbd5e1',
                border: '1px solid #475569',
                borderRadius: '12px',
                padding: '13px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // VIEW 2: ADMIN USER APPROVALS & DIRECTORY PORTAL
  // ══════════════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      color: '#0f172a',
      paddingBottom: '80px'
    }}>
      {/* Top Banner & Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        padding: '34px 32px 28px',
        borderBottom: '1px solid #334155',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle orange / blue light accents */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: '10%',
          width: '350px',
          height: '250px',
          background: 'radial-gradient(ellipse, rgba(249, 115, 22, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                <ShieldCheck size={13} /> Administration Portal
              </div>
              <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                User Registration Approvals
              </h1>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8' }}>
                Review incoming profile registrations, verify Cloudinary user images, and accept or reject portal access.
              </p>
            </div>

            {/* Quick Refresh & Return buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={fetchApprovals}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s'
                }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)'
                }}
              >
                Back to Dashboard →
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginTop: '26px'
          }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Users</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>{usersList.length}</div>
            </div>

            <div style={{
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1.5px solid rgba(249, 115, 22, 0.4)',
              borderRadius: '14px',
              padding: '14px 18px',
              boxShadow: pendingCount > 0 ? '0 0 20px rgba(249, 115, 22, 0.2)' : 'none'
            }}>
              <div style={{ fontSize: '11px', color: '#fdba74', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} /> Pending Approvals
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#fb923c', marginTop: '4px' }}>
                {pendingCount}
              </div>
            </div>

            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '14px', padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', color: '#86efac', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={13} /> Accepted Staff
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#22c55e', marginTop: '4px' }}>{acceptedCount}</div>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '14px', padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={13} /> Rejected
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#ef4444', marginTop: '4px' }}>{rejectedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1280px', margin: '24px auto 0', padding: '0 20px' }}>
        {/* Feedback Alert */}
        {feedbackMsg && (
          <div style={{
            background: feedbackMsg.type === 'success' ? '#eff6ff' : feedbackMsg.type === 'error' ? '#fff1f2' : '#f8fafc',
            border: `1.5px solid ${feedbackMsg.type === 'success' ? '#bfdbfe' : feedbackMsg.type === 'error' ? '#fecdd3' : '#cbd5e1'}`,
            color: feedbackMsg.type === 'success' ? '#1d4ed8' : feedbackMsg.type === 'error' ? '#e11d48' : '#334155',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '20px',
            fontSize: '13.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>✕</button>
          </div>
        )}

        {/* Filter Toolbar & Search */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          marginBottom: '20px'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterTab('pending')}
              style={{
                background: filterTab === 'pending' ? '#ea580c' : '#f1f5f9',
                color: filterTab === 'pending' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Pending</span>
              {pendingCount > 0 && (
                <span style={{
                  background: filterTab === 'pending' ? '#ffffff' : '#ea580c',
                  color: filterTab === 'pending' ? '#ea580c' : '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '12px',
                  padding: '1px 7px'
                }}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab('accepted')}
              style={{
                background: filterTab === 'accepted' ? '#16a34a' : '#f1f5f9',
                color: filterTab === 'accepted' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Accepted ({acceptedCount})
            </button>

            <button
              onClick={() => setFilterTab('rejected')}
              style={{
                background: filterTab === 'rejected' ? '#dc2626' : '#f1f5f9',
                color: filterTab === 'rejected' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Rejected ({rejectedCount})
            </button>

            <button
              onClick={() => setFilterTab('all')}
              style={{
                background: filterTab === 'all' ? '#0f172a' : '#f1f5f9',
                color: filterTab === 'all' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All ({usersList.length})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by name, email, ID, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '13px',
                outline: 'none',
                background: '#f8fafc'
              }}
            />
          </div>
        </div>

        {/* Users List Table Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <UserCheck size={42} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#334155' }}>
                No registrations found
              </h4>
              <p style={{ margin: 0, fontSize: '13px' }}>
                {filterTab === 'pending'
                  ? 'All user sign-ups have been verified and processed!'
                  : 'Try selecting a different filter tab or search term.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <th style={{ padding: '14px 20px' }}>User / Profile</th>
                    <th style={{ padding: '14px 16px' }}>Staff ID</th>
                    <th style={{ padding: '14px 16px' }}>Designation / Display</th>
                    <th style={{ padding: '14px 16px' }}>Role</th>
                    <th style={{ padding: '14px 16px' }}>Contact</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isPending = u.approvalStatus === 'pending' || !u.approvalStatus;
                    const isAccepted = u.approvalStatus === 'accepted';
                    const isRejected = u.approvalStatus === 'rejected';

                    return (
                      <tr
                        key={u._id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                          background: isPending ? 'rgba(255, 247, 237, 0.4)' : '#ffffff'
                        }}
                      >
                        {/* Avatar & Name */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              background: '#0f172a',
                              border: isPending ? '2px solid #fb923c' : '1px solid #cbd5e1',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '14px'
                            }}>
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                u.name ? u.name.slice(0, 2).toUpperCase() : 'U'
                              )}
                            </div>

                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>
                                {u.name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Staff ID */}
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#334155' }}>
                          {u.employeeId || '—'}
                        </td>

                        {/* Designation / Display Name */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {u.displayName || u.designation || 'Staff'}
                          </div>
                          {u.displayName && u.designation && u.displayName !== u.designation && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              System: {u.designation}
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            background: u.role === 'admin' ? '#f3e8ff' : u.role === 'manager' ? '#e0f2fe' : '#f1f5f9',
                            color: u.role === 'admin' ? '#7e22ce' : u.role === 'manager' ? '#0369a1' : '#475569',
                            border: `1px solid ${u.role === 'admin' ? '#d8b4fe' : u.role === 'manager' ? '#bae6fd' : '#cbd5e1'}`,
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: '20px',
                            textTransform: 'uppercase'
                          }}>
                            {u.role}
                          </span>
                        </td>

                        {/* Contact */}
                        <td style={{ padding: '14px 16px', color: '#475569' }}>
                          <div>{u.phone ? `+91 ${u.phone}` : '—'}</div>
                          {u.bloodGroup && (
                            <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 700 }}>
                              Blood: {u.bloodGroup}
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '14px 16px' }}>
                          {isPending && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: '20px'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ea580c' }} />
                              Pending
                            </span>
                          )}
                          {isAccepted && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#f0f9ff',
                              color: '#0284c7',
                              border: '1px solid #bae6fd',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: '20px'
                            }}>
                              <CheckCircle2 size={12} color="#0284c7" />
                              Accepted
                            </span>
                          )}
                          {isRejected && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: '20px'
                            }}>
                              <XCircle size={12} color="#dc2626" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {/* View Full Profile */}
                            <motion.button
                              whileHover={{ scale: 1.05, y: -1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedUserModal(u)}
                              title="View Full Profile Details"
                              style={{
                                background: '#ffffff',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '6px 11px',
                                color: '#0284c7',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                outline: 'none',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Eye size={13} color="#0284c7" /> View
                            </motion.button>

                            {/* ReactBits Accept Button (Zero Green, White/Orange/Blue) */}
                            {(!isAccepted || isRejected) && (
                              <ReactBitsAcceptButton
                                onClick={() => handleAcceptUser(u)}
                                loading={actionLoadingId === u._id}
                                disabled={actionLoadingId === u._id}
                                size="sm"
                                label="Accept"
                              />
                            )}

                            {/* Reject Button */}
                            {(!isRejected || isAccepted) && u.role !== 'admin' && (
                              <motion.button
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setRejectPromptUser(u)}
                                disabled={actionLoadingId === u._id}
                                style={{
                                  background: '#ffffff',
                                  border: '1.5px solid #fed7aa',
                                  borderRadius: '10px',
                                  padding: '6px 11px',
                                  color: '#ea580c',
                                  cursor: actionLoadingId === u._id ? 'wait' : 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                  outline: 'none',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <XCircle size={13} color="#ea580c" /> Reject
                              </motion.button>
                            )}

                            {/* Delete Permanently Button (Admins/Executives only) */}
                            {canDelete(user) && u.role !== 'admin' && (
                              <motion.button
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDeletePromptUser(u)}
                                disabled={actionLoadingId === u._id}
                                title="Delete User Profile Permanently"
                                style={{
                                  background: '#ffffff',
                                  border: '1.5px solid #fecdd3',
                                  borderRadius: '10px',
                                  padding: '6px 11px',
                                  color: '#dc2626',
                                  cursor: actionLoadingId === u._id ? 'wait' : 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 1px 3px rgba(220,38,38,0.06)',
                                  outline: 'none',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Trash2 size={13} color="#dc2626" /> Delete
                              </motion.button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ──── Full User Details Modal ──── */}
      {selectedUserModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setSelectedUserModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '22px',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ height: '5px', background: 'linear-gradient(90deg, #f97316, #38bdf8)' }} />

            <div style={{ padding: '24px 26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#0f172a',
                  border: '2px solid #f97316',
                  flexShrink: 0
                }}>
                  {selectedUserModal.avatar ? (
                    <img src={selectedUserModal.avatar} alt={selectedUserModal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800, fontSize: '18px' }}>
                      {selectedUserModal.name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {selectedUserModal.name}
                  </h3>
                  <div style={{ fontSize: '12.5px', color: '#ea580c', fontWeight: 700 }}>
                    {selectedUserModal.displayName || selectedUserModal.designation} • {selectedUserModal.role}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Staff ID: {selectedUserModal.employeeId || '—'}
                  </div>
                </div>

                <button onClick={() => setSelectedUserModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              </div>

              {/* Detail fields */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Email:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedUserModal.email}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Phone:</span>
                  <strong style={{ color: '#0f172a' }}>+91 {selectedUserModal.phone || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Designation:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedUserModal.designation}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Display Name:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedUserModal.displayName || selectedUserModal.designation}</strong>
                </div>
                {selectedUserModal.bloodGroup && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Blood Group:</span>
                    <strong style={{ color: '#ea580c' }}>{selectedUserModal.bloodGroup}</strong>
                  </div>
                )}
                {selectedUserModal.address && (
                  <div>
                    <div style={{ color: '#64748b', marginBottom: '2px' }}>Address:</div>
                    <div style={{ color: '#0f172a', fontWeight: 600, background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {selectedUserModal.address}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                  <span style={{ color: '#64748b' }}>Registered Date:</span>
                  <span style={{ color: '#475569', fontWeight: 600 }}>
                    {new Date(selectedUserModal.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Approval Status:</span>
                  <span style={{
                    color: selectedUserModal.approvalStatus === 'accepted' ? '#0284c7' : selectedUserModal.approvalStatus === 'rejected' ? '#dc2626' : '#ea580c',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}>
                    {selectedUserModal.approvalStatus || 'pending'}
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <div style={{ flex: 1, display: 'flex' }}>
                  <ReactBitsAcceptButton
                    onClick={() => {
                      handleAcceptUser(selectedUserModal);
                      setSelectedUserModal(null);
                    }}
                    loading={actionLoadingId === selectedUserModal._id}
                    size="lg"
                    label="Accept User"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setRejectPromptUser(selectedUserModal);
                    setSelectedUserModal(null);
                  }}
                  style={{
                    flex: 1,
                    background: '#ffffff',
                    color: '#ea580c',
                    border: '1.5px solid #fed7aa',
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: 800,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.1)',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <XCircle size={15} color="#ea580c" />
                  <span>Reject User</span>
                </motion.button>

                {/* Delete Permanently Button in Modal */}
                {canDelete(user) && selectedUserModal.role !== 'admin' && (
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setDeletePromptUser(selectedUserModal);
                      setSelectedUserModal(null);
                    }}
                    style={{
                      background: '#fff1f2',
                      color: '#dc2626',
                      border: '1.5px solid #fecdd3',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      fontWeight: 800,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.1)',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    title="Delete User Permanently"
                  >
                    <Trash2 size={15} color="#dc2626" />
                    <span>Delete</span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──── Reject Confirmation Modal with Reason Prompt ──── */}
      {rejectPromptUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setRejectPromptUser(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px 26px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} color="#dc2626" />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Reject Registration?
              </h3>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to reject <strong>{rejectPromptUser.name}</strong> ({rejectPromptUser.email})? They will see the pending/rejected status and will not have access to portal modules.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Optional Rejection Note / Reason:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Invalid employee credentials or contact details..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setRejectPromptUser(null)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmReject}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── Delete Permanently Confirmation Modal ──── */}
      {deletePromptUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setDeletePromptUser(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '26px 28px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              border: '1.5px solid #fecdd3'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={22} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#991b1b' }}>
                  Delete Profile Permanently?
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Irreversible database operation</span>
              </div>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete the profile for <strong>{deletePromptUser.name}</strong> ({deletePromptUser.email})?
            </p>

            <div style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#9f1239',
              lineHeight: 1.5
            }}>
              <strong>Notice:</strong> This action will completely erase their profile record from MongoDB. Their authentication credentials, approval record, and profile picture association will be removed permanently. They can register again fresh if needed.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeletePromptUser(null)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '11px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={actionLoadingId === deletePromptUser._id}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '11px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: actionLoadingId === deletePromptUser._id ? 'wait' : 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {actionLoadingId === deletePromptUser._id ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
