import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser, FaPenToSquare, FaCheck, FaXmark, FaRotate, FaEnvelope, FaPhone,
  FaBuilding, FaLocationDot, FaDroplet, FaCalendarDays, FaIdBadge, FaShieldHalved,
  FaCircleCheck, FaCircleExclamation, FaClock, FaSliders, FaBell, FaServer,
  FaFloppyDisk, FaLock, FaMapLocationDot, FaCopy, FaBriefcase,
  FaPaperPlane, FaChevronRight, FaChevronLeft
} from 'react-icons/fa6';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const TABS = [
  { id: 'overview', label: 'Personal & Contact', shortLabel: 'Personal', icon: FaUser, step: 1 },
  { id: 'account', label: 'Account & Approval', shortLabel: 'Account', icon: FaShieldHalved, step: 2 },
  { id: 'preferences', label: 'Preferences & Alerts', shortLabel: 'Alerts', icon: FaBell, step: 3 },
  { id: 'smtp', label: 'Email SMTP Setup', shortLabel: 'SMTP', icon: FaServer, step: 4 },
];

export default function EmployeeProfileModal({
  employee,
  onClose,
  onUpdated,
  onOpenMap,
}) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'account' | 'preferences' | 'smtp'
  const [copiedField, setCopiedField] = useState(null);
  const [successToast, setSuccessToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Live profile data from MongoDB
  const [profileData, setProfileData] = useState(null);

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    employeeId: '',
    designation: '',
    department: '',
    officeLocation: '',
    bloodGroup: '',
    address: '',
    joiningDate: '',
    role: 'employee',
    isActive: true,
    approvalStatus: 'accepted',
    rejectionReason: '',
    avatar: '',
    password: '',
    preferences: {
      email: 'Send to Mobile',
      whatsapp: 'Send to Mobile',
      notifications: {
        paymentPending: true,
        paymentCompleted: true,
        paymentFailed: true,
        newLeadInCampaign: true,
        callReminder: true,
      },
    },
    smtpConfig: {
      host: '',
      port: 465,
      secure: true,
      user: '',
      fromEmail: '',
      provider: 'godaddy',
      isConfigured: false,
    },
  });

  // Fetch full details from MongoDB
  const fetchFullProfile = async (empId) => {
    if (!empId || String(empId).startsWith('tm-') || String(empId).startsWith('emp-')) {
      setProfileData(employee);
      populateForm(employee);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await usersAPI.getById(empId);
      if (res.data?.user) {
        const fullUser = {
          ...employee,
          ...res.data.user,
        };
        setProfileData(fullUser);
        populateForm(fullUser);
      } else {
        setProfileData(employee);
        populateForm(employee);
      }
    } catch (err) {
      console.warn('Failed to fetch user by ID from MongoDB, using passed data:', err);
      setProfileData(employee);
      populateForm(employee);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data) => {
    if (!data) return;
    setFormData({
      name: data.name || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      displayName: data.displayName || data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      employeeId: data.employeeId || '',
      designation: data.designation || data.role || '',
      department: data.department || '',
      officeLocation: data.officeLocation || '',
      bloodGroup: data.bloodGroup || '',
      address: data.address || '',
      joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString().split('T')[0] : '',
      role: data.role || 'employee',
      isActive: data.isActive !== undefined ? data.isActive : true,
      approvalStatus: data.approvalStatus || 'accepted',
      rejectionReason: data.rejectionReason || '',
      avatar: data.avatar || '',
      password: '',
      preferences: {
        email: data.preferences?.email || 'Send to Mobile',
        whatsapp: data.preferences?.whatsapp || 'Send to Mobile',
        notifications: {
          paymentPending: data.preferences?.notifications?.paymentPending !== false,
          paymentCompleted: data.preferences?.notifications?.paymentCompleted !== false,
          paymentFailed: data.preferences?.notifications?.paymentFailed !== false,
          newLeadInCampaign: data.preferences?.notifications?.newLeadInCampaign !== false,
          callReminder: data.preferences?.notifications?.callReminder !== false,
        },
      },
      smtpConfig: {
        host: data.smtpConfig?.host || '',
        port: data.smtpConfig?.port || 465,
        secure: data.smtpConfig?.secure !== false,
        user: data.smtpConfig?.user || '',
        fromEmail: data.smtpConfig?.fromEmail || '',
        provider: data.smtpConfig?.provider || 'godaddy',
        isConfigured: !!data.smtpConfig?.isConfigured,
      },
    });
  };

  // Hide Navbar when profile modal is open, restore when closed
  useEffect(() => {
    const navbar = document.querySelector('header');
    if (navbar) {
      const prevDisplay = navbar.style.display;
      navbar.style.display = 'none';
      return () => {
        navbar.style.display = prevDisplay || '';
      };
    }
  }, []);

  useEffect(() => {
    if (employee) {
      fetchFullProfile(employee._id);
    }
  }, [employee?._id]);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedPrefChange = (prefKey, value) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [prefKey]: value
      }
    }));
  };

  const handleNotificationToggle = (notifKey) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        notifications: {
          ...prev.preferences?.notifications,
          [notifKey]: !prev.preferences?.notifications?.[notifKey]
        }
      }
    }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!isAdmin) return;

    if (!formData.name.trim()) {
      setErrorMessage('Full name is required');
      setActiveTab('overview');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Email address is required');
      setActiveTab('overview');
      return;
    }

    const empId = profileData?._id || employee?._id;
    if (!empId || String(empId).startsWith('tm-') || String(empId).startsWith('emp-')) {
      const updatedMock = { ...profileData, ...formData };
      setProfileData(updatedMock);
      onUpdated?.(updatedMock);
      setIsEditing(false);
      setSuccessToast('Profile updated locally!');
      setTimeout(() => setSuccessToast(''), 3000);
      return;
    }

    setSaving(true);
    setErrorMessage('');
    try {
      const payload = { ...formData };
      if (!payload.password) {
        delete payload.password;
      }
      if (payload.joiningDate) {
        payload.joiningDate = new Date(payload.joiningDate);
      } else {
        payload.joiningDate = null;
      }

      const res = await usersAPI.update(empId, payload);
      const savedUser = res.data?.user || res.data;
      
      const mergedUser = {
        ...profileData,
        ...savedUser,
      };

      setProfileData(mergedUser);
      populateForm(mergedUser);
      setIsEditing(false);
      setSuccessToast('User profile updated successfully in MongoDB!');
      setTimeout(() => setSuccessToast(''), 3500);
      onUpdated?.(mergedUser);
    } catch (err) {
      console.error('Failed to update user profile:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to update user in MongoDB');
    } finally {
      setSaving(false);
    }
  };

  const current = profileData || employee || {};

  // Tab navigation helpers
  const currentTabIndex = TABS.findIndex(t => t.id === activeTab);
  const handleNextTab = () => {
    if (currentTabIndex < TABS.length - 1) {
      setActiveTab(TABS[currentTabIndex + 1].id);
    }
  };
  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(TABS[currentTabIndex - 1].id);
    }
  };

  // Formatted date helpers
  const formatDate = (dateVal) => {
    if (!dateVal) return 'Not Specified';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Not Specified';
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Not Specified';
    }
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/75 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.35)] border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER BANNER (FIXED TOP OF MODAL) ──────────────────── */}
        <div className="relative p-3.5 sm:p-4.5 bg-gradient-to-r from-slate-900 via-sky-950 to-orange-950 text-white overflow-hidden shrink-0">
          {/* Decorative Glows */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-52 h-52 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-36 h-36 rounded-full bg-sky-500/15 blur-2xl pointer-events-none" />

          {/* Top Actions Row: Title badge & Top-Right Edit Button */}
          <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-white/10 text-orange-300 border border-white/15 backdrop-blur-md">
                Team Member Profile
              </span>
              {loading && (
                <span className="flex items-center gap-1.5 text-[11px] text-sky-300 animate-pulse font-medium">
                  <FaRotate className="w-3 h-3 animate-spin" /> Fetching MongoDB...
                </span>
              )}
            </div>

            {/* ── TOP RIGHT CORNER: EDIT OPTION (ADMIN ONLY) & CLOSE ── */}
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setErrorMessage('');
                    setIsEditing(!isEditing);
                    if (!isEditing) populateForm(current);
                  }}
                  className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    isEditing
                      ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-500'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/30 border border-orange-400/40'
                  }`}
                  title={isEditing ? 'Cancel Edit' : 'Edit Profile (Admin Only)'}
                >
                  {isEditing ? (
                    <>
                      <FaXmark className="w-3.5 h-3.5" />
                      <span>Cancel Edit</span>
                    </>
                  ) : (
                    <>
                      <FaPenToSquare className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </>
                  )}
                </motion.button>
              )}

              {/* Close Modal Button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/80 hover:text-white cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <FaXmark className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Profile Identity Card (Avatar, Name, Badges) */}
          <div className="flex flex-row items-center gap-3 sm:gap-4.5 relative z-10">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl bg-gradient-to-tr from-orange-500 to-sky-500 shrink-0">
                {current.avatar ? (
                  <img
                    src={current.avatar}
                    alt={current.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center font-black text-xl sm:text-2xl text-white bg-slate-800">${current.name?.[0]?.toUpperCase() || 'U'}</div>`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-xl sm:text-2xl text-white bg-slate-800">
                    {current.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-md ${
                  current.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
                title={current.isActive !== false ? 'Active Account' : 'Inactive Account'}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>

            {/* Names & Designations */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white m-0 truncate" title={current.name}>
                  {current.name || 'Unnamed Employee'}
                </h2>
                {current.displayName && current.displayName !== current.name && (
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-white/10 text-orange-200 border border-white/10 truncate max-w-[140px] sm:max-w-none">
                    {current.displayName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap text-[11px] sm:text-xs text-slate-300 font-medium">
                <span className="text-orange-400 font-semibold">{current.designation || current.role || 'Staff'}</span>
                {current.department && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="truncate max-w-[120px] sm:max-w-none">{current.department}</span>
                  </>
                )}
                {current.employeeId && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono px-1.5 py-0.2 rounded bg-white/10 text-[10px] sm:text-[11px] text-sky-200">
                      {current.employeeId}
                    </span>
                  </>
                )}
              </div>

              {/* Status Badges Row */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold capitalize border ${
                  current.role === 'admin'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                    : current.role === 'manager'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                    : current.role === 'caller'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                }`}>
                  {current.role || 'Employee'}
                </span>

                <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold capitalize border flex items-center gap-1 ${
                  current.approvalStatus === 'accepted'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : current.approvalStatus === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                }`}>
                  {current.approvalStatus === 'accepted' ? (
                    <FaCheck className="w-2.5 h-2.5" />
                  ) : current.approvalStatus === 'pending' ? (
                    <FaClock className="w-2.5 h-2.5" />
                  ) : (
                    <FaXmark className="w-2.5 h-2.5" />
                  )}
                  {current.approvalStatus || 'Pending'}
                </span>

                {onOpenMap && (
                  <button
                    type="button"
                    onClick={() => onOpenMap(current)}
                    className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <FaMapLocationDot className="w-2.5 h-2.5" />
                    <span>Live GPS</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── TOAST NOTIFICATIONS & ERRORS ───────────────────────── */}
        {successToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-6 py-2 flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in shrink-0">
            <FaCircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-6 py-2 flex items-center gap-2 text-rose-800 text-xs font-bold animate-in fade-in shrink-0">
            <FaCircleExclamation className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── PAGE / TAB SELECTOR (RESPONSIVE HEADER TABS) ───────── */}
        <div className="flex items-center gap-1 px-3 sm:px-6 pt-2 border-b border-slate-100 bg-slate-50/80 overflow-x-auto scrollbar-none shrink-0">
          {TABS.map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'border-orange-500 text-orange-600 bg-white shadow-xs rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-t-xl'
                }`}
              >
                <t.icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.shortLabel}</span>
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-mono ${
                  isActive ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {t.step}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── SCROLLABLE MODAL BODY (RESPONSIVE) ──────────────────── */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1 min-h-0 text-slate-700 text-xs sm:text-[13px]">
          {isEditing ? (
            /* ═════════════════════════════════════════════════════════
               EDIT FORM (ADMIN ONLY - TAB / PAGE WISE)
               ═════════════════════════════════════════════════════════ */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <FaShieldHalved className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Editing Page {currentTabIndex + 1} of {TABS.length}: {TABS[currentTabIndex].label}</span>
                </div>
                <span className="text-[11px] font-mono text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                  ID: {current._id}
                </span>
              </div>

              {/* PAGE 1: Personal & Contact */}
              {activeTab === 'overview' && (
                <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FaUser className="w-3.5 h-3.5 text-orange-500" />
                    Personal & Contact Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g. Ramanadham Jayaveer"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="e.g. Ramanadham"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="e.g. Jayaveer"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Display Name</label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        placeholder="e.g. Senior Developer"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Designation</label>
                      <input
                        type="text"
                        value={formData.designation}
                        onChange={(e) => handleInputChange('designation', e.target.value)}
                        placeholder="e.g. Developer, Trainer, Marketing"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Employee ID</label>
                      <input
                        type="text"
                        value={formData.employeeId}
                        onChange={(e) => handleInputChange('employeeId', e.target.value)}
                        placeholder="e.g. AOTMS-20"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="e.g. jayaveer@aotms.com"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="e.g. 8121016848"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Blood Group</label>
                      <input
                        type="text"
                        value={formData.bloodGroup}
                        onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                        placeholder="e.g. O+, A+, B+"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Department</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        placeholder="e.g. Engineering, Sales, HR"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={formData.joiningDate}
                        onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Address / Location</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="e.g. Sai Nagar 1st Line, Mangalagiri"
                      rows={2}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Avatar Image URL</label>
                    <input
                      type="url"
                      value={formData.avatar}
                      onChange={(e) => handleInputChange('avatar', e.target.value)}
                      placeholder="https://res.cloudinary.com/..."
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* PAGE 2: Account & Approval */}
              {activeTab === 'account' && (
                <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FaShieldHalved className="w-3.5 h-3.5 text-sky-500" />
                    Role, Approval & Security
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">System Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-bold"
                      >
                        <option value="employee">Employee</option>
                        <option value="caller">Caller</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Approval Status</label>
                      <select
                        value={formData.approvalStatus}
                        onChange={(e) => handleInputChange('approvalStatus', e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-bold"
                      >
                        <option value="accepted">Accepted</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Account Active State</label>
                      <select
                        value={formData.isActive ? 'true' : 'false'}
                        onChange={(e) => handleInputChange('isActive', e.target.value === 'true')}
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-bold"
                      >
                        <option value="true">Active Account</option>
                        <option value="false">Inactive / Suspended</option>
                      </select>
                    </div>
                  </div>

                  {formData.approvalStatus === 'rejected' && (
                    <div>
                      <label className="block text-[11px] font-bold text-rose-600 uppercase mb-1">Rejection Reason</label>
                      <input
                        type="text"
                        value={formData.rejectionReason}
                        onChange={(e) => handleInputChange('rejectionReason', e.target.value)}
                        placeholder="Reason for rejecting or revoking access..."
                        className="w-full p-2.5 text-xs bg-rose-50/50 border border-rose-300 rounded-xl focus:border-rose-500 focus:outline-none shadow-2xs"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Set New Password (Optional)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Leave blank to keep current password"
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* PAGE 3: Preferences & Alerts */}
              {activeTab === 'preferences' && (
                <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FaBell className="w-3.5 h-3.5 text-amber-500" />
                    Routing & Notifications
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Delivery</label>
                      <select
                        value={formData.preferences?.email || 'Send to Mobile'}
                        onChange={(e) => handleNestedPrefChange('email', e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                      >
                        <option value="Send to Mobile">Send to Mobile</option>
                        <option value="Send to Web">Send to Web</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">WhatsApp Delivery</label>
                      <select
                        value={formData.preferences?.whatsapp || 'Send to Mobile'}
                        onChange={(e) => handleNestedPrefChange('whatsapp', e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                      >
                        <option value="Send to Mobile">Send to Mobile</option>
                        <option value="Send to Web">Send to Web</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <span className="block text-[11px] font-bold text-slate-600 uppercase">Alert Subscriptions:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { key: 'paymentPending', label: 'Payment Pending Alerts' },
                        { key: 'paymentCompleted', label: 'Payment Completed Alerts' },
                        { key: 'paymentFailed', label: 'Payment Failed Alerts' },
                        { key: 'newLeadInCampaign', label: 'New Lead In Campaign' },
                        { key: 'callReminder', label: 'Voice Call Reminders' },
                      ].map(n => (
                        <label key={n.key} className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200/80 cursor-pointer hover:border-orange-300 transition-all">
                          <input
                            type="checkbox"
                            checked={formData.preferences?.notifications?.[n.key] !== false}
                            onChange={() => handleNotificationToggle(n.key)}
                            className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-800">{n.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 4: SMTP Setup */}
              {activeTab === 'smtp' && (
                <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FaServer className="w-3.5 h-3.5 text-sky-600" />
                    Dedicated SMTP Mailer Setup
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mail Provider</label>
                      <input
                        type="text"
                        value={formData.smtpConfig?.provider || 'godaddy'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          smtpConfig: { ...prev.smtpConfig, provider: e.target.value }
                        }))}
                        placeholder="e.g. godaddy, titan, gmail"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={formData.smtpConfig?.host || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          smtpConfig: { ...prev.smtpConfig, host: e.target.value }
                        }))}
                        placeholder="e.g. smtpout.secureserver.net"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Port</label>
                      <input
                        type="number"
                        value={formData.smtpConfig?.port || 465}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          smtpConfig: { ...prev.smtpConfig, port: parseInt(e.target.value, 10) || 465 }
                        }))}
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">From Email Address</label>
                      <input
                        type="email"
                        value={formData.smtpConfig?.fromEmail || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          smtpConfig: { ...prev.smtpConfig, fromEmail: e.target.value }
                        }))}
                        placeholder="e.g. info@aotms.com"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* ═════════════════════════════════════════════════════════
               VIEW MODE (READ ONLY & FULLY RESPONSIVE)
               ═════════════════════════════════════════════════════════ */
            <div className="space-y-3.5">
              {/* PAGE 1: OVERVIEW / PERSONAL */}
              {activeTab === 'overview' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Full Name */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all">
                      <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <FaUser className="w-3 h-3 text-orange-500" /> Full Name
                      </div>
                      <div className="font-bold text-slate-900 text-sm truncate">{current.name || '—'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        First: {current.firstName || '—'} | Last: {current.lastName || '—'}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all">
                      <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><FaEnvelope className="w-3 h-3 text-sky-500" /> Email</span>
                        <button
                          onClick={() => handleCopy(current.email, 'email')}
                          className="text-[10.5px] text-slate-400 hover:text-sky-600 flex items-center gap-1 cursor-pointer"
                          title="Copy Email"
                        >
                          {copiedField === 'email' ? <FaCheck className="w-3 h-3 text-emerald-600" /> : <FaCopy className="w-3 h-3" />}
                          <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-bold text-slate-900 text-sm truncate" title={current.email}>
                        {current.email || '—'}
                      </div>
                      <a
                        href={`mailto:${current.email}`}
                        className="text-[11px] text-sky-600 font-semibold hover:underline inline-block mt-0.5"
                      >
                        Send Direct Email
                      </a>
                    </div>

                    {/* Phone */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all">
                      <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><FaPhone className="w-3 h-3 text-emerald-500" /> Phone</span>
                        <button
                          onClick={() => handleCopy(current.phone, 'phone')}
                          className="text-[10.5px] text-slate-400 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                          title="Copy Phone"
                        >
                          {copiedField === 'phone' ? <FaCheck className="w-3 h-3 text-emerald-600" /> : <FaCopy className="w-3 h-3" />}
                          <span>{copiedField === 'phone' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">{current.phone || '—'}</div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">Direct Mobile Line</span>
                    </div>

                    {/* Designation */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all">
                      <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><FaBriefcase className="w-3 h-3 text-amber-500" /> Designation</span>
                        {current.employeeId && (
                          <span className="font-mono font-bold text-[10.5px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs">
                            ID: {current.employeeId}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 text-sm">{current.designation || current.role || 'Staff'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Display: <strong className="text-slate-800">{current.displayName || current.name}</strong>
                      </div>
                    </div>

                    {/* Department & Office */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all">
                      <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <FaBuilding className="w-3 h-3 text-purple-500" /> Department & Office
                      </div>
                      <div className="font-bold text-slate-900 text-sm truncate">{current.department || 'Not Assigned'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Location: {current.officeLocation || 'Main Office'}
                      </div>
                    </div>

                    {/* Blood Group & Joining Date */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all">
                      <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <FaDroplet className="w-3 h-3 text-rose-500" /> Medical & Joining
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        Blood: <span className="text-rose-600 font-extrabold">{current.bloodGroup || 'Not Specified'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <FaCalendarDays className="w-3 h-3 text-slate-400" />
                        <span>Joined: {formatDate(current.joiningDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Address Banner */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FaLocationDot className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        Residential / Registered Address
                      </div>
                      <div className="font-medium text-slate-800 leading-relaxed text-xs sm:text-[13px]">
                        {current.address || 'No residential address registered on MongoDB.'}
                      </div>
                    </div>
                  </div>

                  {/* Attendance & Telemetry (if available) */}
                  {current.todayAttendance && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-sky-900 uppercase flex items-center gap-1.5">
                          <FaClock className="w-3.5 h-3.5 text-sky-600" />
                          Today's Attendance Telemetry
                        </div>
                        <span className="text-[11px] font-bold text-sky-700">
                          {current.todayAttendance.status || 'Active'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700">
                        <div>
                          <span className="text-[10px] sm:text-[10.5px] text-slate-500 block">Check In</span>
                          <strong className="text-slate-900">{current.todayAttendance.startTimeFormatted || 'Not Started'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] sm:text-[10.5px] text-slate-500 block">Check Out</span>
                          <strong className="text-slate-900">{current.todayAttendance.endTimeFormatted || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] sm:text-[10.5px] text-slate-500 block">Duration</span>
                          <strong className="text-slate-900">{current.todayAttendance.durationFormatted || '00:00:00'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] sm:text-[10.5px] text-slate-500 block">Actual Work</span>
                          <strong className="text-orange-600">{current.todayAttendance.formattedActualWork || '0m'}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAGE 2: ACCOUNT & APPROVAL */}
              {activeTab === 'account' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Account Status Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FaShieldHalved className="w-3.5 h-3.5 text-sky-500" /> Account Security & Role
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-600">Assigned System Role:</span>
                        <span className="font-bold text-slate-900 capitalize px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-xs">
                          {current.role || 'Employee'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Account Active State:</span>
                        <span className={`font-bold px-2.5 py-0.5 rounded-md text-[11px] ${
                          current.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {current.isActive !== false ? 'Active Account' : 'Suspended / Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Database ID (_id):</span>
                        <span className="font-mono text-[11px] text-slate-600 truncate max-w-[150px] sm:max-w-[200px]" title={current._id}>
                          {current._id || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Approval Information Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FaCircleCheck className="w-3.5 h-3.5 text-emerald-500" /> Registration Approval
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-600">Approval State:</span>
                        <span className={`font-bold capitalize px-2.5 py-0.5 rounded-md text-[11px] ${
                          current.approvalStatus === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : current.approvalStatus === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {current.approvalStatus || 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Approved Date:</span>
                        <span className="font-medium text-slate-800">{formatDateTime(current.approvedAt)}</span>
                      </div>
                      {current.approvedBy && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Approved By:</span>
                          <span className="font-bold text-slate-900 truncate max-w-[150px]">
                            {typeof current.approvedBy === 'object' ? current.approvedBy.name : String(current.approvedBy)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rejection Alert if Rejected */}
                  {current.approvalStatus === 'rejected' && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                      <FaCircleExclamation className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-rose-900">Registration Rejection Notice</div>
                        <div className="text-rose-700 text-xs mt-0.5">
                          {current.rejectionReason || 'No specific rejection reason recorded.'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Database Timestamps */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-slate-500 text-xs flex-wrap gap-2">
                    <div>Created on MongoDB: <strong className="text-slate-800">{formatDateTime(current.createdAt)}</strong></div>
                    <div>Last Profile Update: <strong className="text-slate-800">{formatDateTime(current.updatedAt)}</strong></div>
                  </div>
                </div>
              )}

              {/* PAGE 3: PREFERENCES & ALERTS */}
              {activeTab === 'preferences' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Delivery Channels */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FaPaperPlane className="w-3.5 h-3.5 text-orange-500" /> Dispatch Routing Channels
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                        <span className="font-medium text-slate-700">Email Routing:</span>
                        <span className="font-bold text-orange-600">{current.preferences?.email || 'Send to Mobile'}</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                        <span className="font-medium text-slate-700">WhatsApp Routing:</span>
                        <span className="font-bold text-emerald-600">{current.preferences?.whatsapp || 'Send to Mobile'}</span>
                      </div>
                    </div>

                    {/* Notification Subscriptions */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FaBell className="w-3.5 h-3.5 text-amber-500" /> Notification Alert Subscriptions
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { key: 'paymentPending', label: 'Payment Pending' },
                          { key: 'paymentCompleted', label: 'Payment Completed' },
                          { key: 'paymentFailed', label: 'Payment Failed' },
                          { key: 'newLeadInCampaign', label: 'New Lead In Campaign' },
                          { key: 'callReminder', label: 'Voice Call Reminders' },
                        ].map(n => {
                          const isEnabled = current.preferences?.notifications?.[n.key] !== false;
                          return (
                            <div key={n.key} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 text-xs">
                              <span className="text-slate-700">{n.label}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                                isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {isEnabled ? 'Enabled' : 'Muted'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 4: SMTP SETUP */}
              {activeTab === 'smtp' && (
                <div className="space-y-3.5">
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
                        <FaServer className="w-3.5 h-3.5 text-sky-600" />
                        Dedicated SMTP Mailer Gateway
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        current.smtpConfig?.isConfigured
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {current.smtpConfig?.isConfigured ? 'Configured & Active' : 'Not Configured'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10.5px] text-slate-500 uppercase block font-bold">Mail Provider</span>
                        <strong className="text-slate-900 capitalize text-xs sm:text-sm">{current.smtpConfig?.provider || 'godaddy'}</strong>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10.5px] text-slate-500 uppercase block font-bold">SMTP Host & Port</span>
                        <strong className="text-slate-900 font-mono text-xs">
                          {current.smtpConfig?.host || 'smtpout.secureserver.net'} : {current.smtpConfig?.port || 465}
                        </strong>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10.5px] text-slate-500 uppercase block font-bold">From / Sender Email</span>
                        <strong className="text-slate-900 text-xs truncate block">{current.smtpConfig?.fromEmail || current.email || '—'}</strong>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10.5px] text-slate-500 uppercase block font-bold">SMTP Auth User</span>
                        <strong className="text-slate-900 text-xs truncate block">{current.smtpConfig?.user || current.email || '—'}</strong>
                      </div>
                    </div>

                    {current.smtpConfig?.updatedAt && (
                      <div className="text-[11px] text-slate-500 pt-1">
                        Last SMTP sync: {formatDateTime(current.smtpConfig.updatedAt)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER BAR: PREVIOUS / NEXT NAVIGATION & ACTIONS ──────── */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-2.5 shrink-0 flex-wrap">
          {/* Step / Page indicator with clickable dots */}
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-bold text-slate-500 hidden sm:inline">
              Page {currentTabIndex + 1} of {TABS.length}:
            </span>
            <span className="text-[11.5px] font-bold text-slate-800">
              {TABS[currentTabIndex].label}
            </span>

            {/* Pagination Dots */}
            <div className="flex items-center gap-1.5 ml-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    activeTab === t.id
                      ? 'w-5 bg-orange-500'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  title={`Go to ${t.label}`}
                />
              ))}
            </div>
          </div>

          {/* Navigation & Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Previous Page Button */}
            {currentTabIndex > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handlePrevTab}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <FaChevronLeft className="w-2.5 h-2.5" />
                <span>Previous</span>
              </motion.button>
            )}

            {/* Next Page Button */}
            {currentTabIndex < TABS.length - 1 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleNextTab}
                className="px-3.5 sm:px-4.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-500/20"
              >
                <span>Next</span>
                <FaChevronRight className="w-2.5 h-2.5" />
              </motion.button>
            )}

            {/* In Edit Mode: Save Changes Button */}
            {isEditing && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <FaRotate className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaFloppyDisk className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </motion.button>
            )}

            {/* Close / Done Button */}
            {!isEditing && currentTabIndex === TABS.length - 1 && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
