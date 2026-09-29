import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FaUser, FaPenToSquare, FaCheck, FaXmark, FaRotate, FaEnvelope, FaPhone,
  FaDroplet, FaCalendarDays, FaBriefcase,
  FaLocationDot, FaCopy, FaFloppyDisk, FaShieldHalved, FaMapLocationDot,
  FaCircleCheck, FaCircleExclamation, FaCamera, FaTrashCan
} from 'react-icons/fa6';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const ROLE_DESIGNATIONS = {
  employee: [
    'Team Member', 'Customer Support', 'Sales Representative', 'Field Executive',
    'Associate', 'Intern', 'Frontend Developer', 'Backend Developer',
    'Full Stack Developer', 'UI/UX Designer', 'Marketing Executive'
  ],
  manager: [
    'Team Lead', 'Operations Manager', 'Sales Manager', 'HR Manager',
    'Project Manager', 'Branch Manager'
  ],
  admin: [
    'System Administrator', 'Managing Director', 'CEO / Founder',
    'Director', 'General Manager'
  ],
  caller: [
    'Telecaller', 'Voice Support Agent', 'Outbound Caller', 'Inbound Specialist'
  ]
};

// Helper to clean 10-digit phone number without prefix doubling
const cleanPhoneNumber = (val) => {
  if (!val) return '';
  let str = String(val).replace(/\D/g, '');
  if (str.length === 12 && str.startsWith('91')) {
    str = str.slice(2);
  }
  return str.slice(0, 10);
};

export default function EmployeeProfileModal({
  employee,
  onClose,
  onUpdated,
  onOpenMap,
}) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [successToast, setSuccessToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Live profile data from MongoDB
  const [profileData, setProfileData] = useState(null);

  // Edit form state — Only basic registration fields with proper fallbacks
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    employeeId: '',
    designation: '',
    bloodGroup: '',
    address: '',
    joiningDate: '',
    role: 'employee',
    avatar: '',
  });

  // Extract all fields properly with robust fallbacks
  const populateForm = (data) => {
    if (!data) return;

    let fn = (data.firstName || '').trim();
    let ln = (data.lastName || '').trim();
    const rawName = (data.name || '').trim();

    // If firstName or lastName is missing in DB, split rawName
    if (!fn && !ln && rawName) {
      const parts = rawName.split(/\s+/);
      fn = parts[0] || '';
      ln = parts.slice(1).join(' ') || '';
    }

    const computedName = rawName || (fn || ln ? `${fn} ${ln}`.trim() : '');
    const cleanPhone = cleanPhoneNumber(data.phone || data.mobile || data.contactNumber || '');
    const cleanBloodGroup = (data.bloodGroup || '').trim().toUpperCase();

    let formattedJoiningDate = '';
    if (data.joiningDate) {
      try {
        formattedJoiningDate = new Date(data.joiningDate).toISOString().split('T')[0];
      } catch {
        formattedJoiningDate = '';
      }
    } else if (data.createdAt) {
      try {
        formattedJoiningDate = new Date(data.createdAt).toISOString().split('T')[0];
      } catch {
        formattedJoiningDate = '';
      }
    }

    setFormData({
      name: computedName,
      firstName: fn,
      lastName: ln,
      displayName: data.displayName || computedName || '',
      email: data.email || data.officialEmail || '',
      phone: cleanPhone,
      employeeId: data.employeeId || data.staffId || data.empId || '',
      designation: data.designation || data.role || '',
      bloodGroup: cleanBloodGroup,
      address: data.address || data.location || data.residentialAddress || '',
      joiningDate: formattedJoiningDate,
      role: (data.role || 'employee').toLowerCase(),
      avatar: data.avatar || data.image || '',
    });
  };

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
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'firstName' || field === 'lastName') {
        const fn = field === 'firstName' ? value : prev.firstName;
        const ln = field === 'lastName' ? value : prev.lastName;
        updated.name = `${fn} ${ln}`.trim() || prev.name;
      }
      return updated;
    });
  };

  const handlePhoneChange = (e) => {
    const rawVal = cleanPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: rawVal }));
  };

  // Admin photo upload handler with auto-scaling
  const handleAvatarFileSelect = (e) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size should be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        setFormData(prev => ({ ...prev, avatar: optimizedDataUrl }));
        setErrorMessage('');
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!isAdmin) return;

    const fn = formData.firstName?.trim();
    const ln = formData.lastName?.trim();
    const fullName = formData.name?.trim() || `${fn} ${ln}`.trim();

    if (!fullName && !fn) {
      setErrorMessage('First Name or Full Name is required');
      return;
    }
    if (!formData.email?.trim()) {
      setErrorMessage('Official email address is required');
      return;
    }

    const empId = profileData?._id || employee?._id;
    if (!empId || String(empId).startsWith('tm-') || String(empId).startsWith('emp-')) {
      const updatedMock = {
        ...profileData,
        ...formData,
        name: fullName,
      };
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
      const payload = {
        name: fullName,
        firstName: fn,
        lastName: ln,
        displayName: formData.displayName?.trim() || fullName,
        email: formData.email?.trim(),
        phone: formData.phone?.trim(),
        employeeId: formData.employeeId?.trim(),
        designation: formData.designation?.trim(),
        bloodGroup: formData.bloodGroup?.trim(),
        address: formData.address?.trim(),
        role: formData.role,
        avatar: formData.avatar,
      };

      if (formData.joiningDate) {
        payload.joiningDate = new Date(formData.joiningDate);
      }

      const res = await usersAPI.update(empId, payload);
      const savedUser = res.data?.user || res.data;
      
      const mergedUser = {
        ...profileData,
        ...savedUser,
        ...payload,
      };

      setProfileData(mergedUser);
      populateForm(mergedUser);
      setIsEditing(false);
      setSuccessToast('Registration profile updated successfully!');
      setTimeout(() => setSuccessToast(''), 3500);
      onUpdated?.(mergedUser);
    } catch (err) {
      console.error('Failed to update registration profile:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to update user profile in database');
    } finally {
      setSaving(false);
    }
  };

  const current = profileData || employee || {};

  // Formatted display helpers
  const currentFirstName = current.firstName || (current.name ? current.name.split(/\s+/)[0] : '') || '—';
  const currentLastName = current.lastName || (current.name ? current.name.split(/\s+/).slice(1).join(' ') : '') || '—';
  const currentFullName = current.name || `${current.firstName || ''} ${current.lastName || ''}`.trim() || 'Unnamed Member';
  const currentEmployeeId = current.employeeId || current.staffId || current.empId || '';
  const currentPhone = cleanPhoneNumber(current.phone || current.mobile || current.contactNumber || '');
  const currentEmail = current.email || current.officialEmail || '';
  const currentAddress = current.address || current.location || '';
  const currentBloodGroup = (current.bloodGroup || '').trim().toUpperCase();
  const currentAvatarSrc = isEditing ? formData.avatar : (current.avatar || current.image);

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

  const availableDesignations = ROLE_DESIGNATIONS[formData.role] || ROLE_DESIGNATIONS.employee;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/75 backdrop-blur-md overflow-hidden">
      {/* Hidden File Input for Admin Photo Selection */}
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileSelect}
        />
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.35)] border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER BANNER ────────────────────────────────────────── */}
        <div className="relative p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-sky-950 to-orange-950 text-white overflow-hidden shrink-0">
          {/* Decorative Ambient Glows */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-52 h-52 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-36 h-36 rounded-full bg-sky-500/15 blur-2xl pointer-events-none" />

          {/* Top Actions Row: Title badge & Edit Button / Close */}
          <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-white/10 text-orange-300 border border-white/15 backdrop-blur-md">
                Registration Profile Details
              </span>
              {loading && (
                <span className="flex items-center gap-1.5 text-[11px] text-sky-300 animate-pulse font-medium">
                  <FaRotate className="w-3 h-3 animate-spin" /> Loading...
                </span>
              )}
            </div>

            {/* Top-Right: Edit Button (ONLY FOR ADMIN) & Close Button */}
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setErrorMessage('');
                    setIsEditing(!isEditing);
                    if (!isEditing) populateForm(profileData || employee);
                  }}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    isEditing
                      ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-500'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/30 border border-orange-400/40'
                  }`}
                  title={isEditing ? 'Cancel Edit' : 'Edit Profile (Admin Only)'}
                >
                  {isEditing ? (
                    <>
                      <FaXmark className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <FaPenToSquare className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
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

          {/* Profile Identity Card (Avatar with Edit Overlay for Admin, Name, Badges) */}
          <div className="flex flex-row items-center gap-3 sm:gap-4 relative z-10">
            {/* Avatar Container */}
            <div className="relative shrink-0 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl bg-gradient-to-tr from-orange-500 to-sky-500 shrink-0 relative">
                {currentAvatarSrc ? (
                  <img
                    src={currentAvatarSrc}
                    alt={currentFullName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center font-black text-xl sm:text-2xl text-white bg-slate-800">${currentFullName[0]?.toUpperCase() || 'U'}</div>`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-xl sm:text-2xl text-white bg-slate-800">
                    {currentFullName[0]?.toUpperCase() || 'U'}
                  </div>
                )}

                {/* Camera Overlay when Editing (Admin only) */}
                {isAdmin && isEditing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-950/70 hover:bg-slate-950/85 flex flex-col items-center justify-center text-white transition-all cursor-pointer p-1 text-center"
                    title="Click to Change Photo"
                  >
                    <FaCamera className="w-4 h-4 text-orange-400 mb-0.5 animate-bounce" />
                    <span className="text-[9px] font-bold tracking-tight text-white leading-tight">Change</span>
                  </button>
                )}
              </div>

              <div
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-md bg-emerald-500"
                title="Active Member"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>

            {/* Names & Designations */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white m-0 truncate" title={currentFullName}>
                  {currentFullName}
                </h2>
                {current.displayName && current.displayName !== currentFullName && (
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-white/10 text-orange-200 border border-white/10 truncate max-w-[140px] sm:max-w-none">
                    {current.displayName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap text-[11px] sm:text-xs text-slate-300 font-medium">
                <span className="text-orange-400 font-semibold">{current.designation || current.role || 'Staff Member'}</span>
                {currentEmployeeId && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono px-1.5 py-0.2 rounded bg-white/10 text-[10px] sm:text-[11px] text-sky-200">
                      ID: {currentEmployeeId}
                    </span>
                  </>
                )}
              </div>

              {/* Badges Row */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold capitalize border ${
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

                {currentBloodGroup && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1">
                    <FaDroplet className="w-2.5 h-2.5 text-rose-400" />
                    <span>{currentBloodGroup}</span>
                  </span>
                )}

                {onOpenMap && (
                  <button
                    type="button"
                    onClick={() => onOpenMap(current)}
                    className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30 transition-all flex items-center gap-1 cursor-pointer"
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
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-6 py-2.5 flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in shrink-0">
            <FaCircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-6 py-2.5 flex items-center gap-2 text-rose-800 text-xs font-bold animate-in fade-in shrink-0">
            <FaCircleExclamation className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── SCROLLABLE MODAL BODY ───────────────────────────────── */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1 min-h-0 text-slate-700 text-xs sm:text-[13px]">
          {isEditing && isAdmin ? (
            /* ═════════════════════════════════════════════════════════
               EDIT FORM (ADMIN ONLY - ALL REGISTRATION FIELD NAMES PROPERLY POPULATED)
               ═════════════════════════════════════════════════════════ */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <FaShieldHalved className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Edit Registration Details &amp; Profile Photo (Admin Only)</span>
                </div>
                {formData.employeeId && (
                  <span className="text-[11px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold">
                    Staff ID: {formData.employeeId}
                  </span>
                )}
              </div>

              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                {/* ── PHOTO / AVATAR UPLOAD SECTION ── */}
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-2">
                    Profile Photo / Avatar
                  </label>
                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-orange-400/50 shadow-md bg-slate-100 shrink-0 relative">
                      {formData.avatar ? (
                        <img
                          src={formData.avatar}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-xl text-slate-400 bg-slate-100">
                          <FaUser className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <FaCamera className="w-3.5 h-3.5" />
                          <span>{formData.avatar ? 'Change Photo' : 'Upload Photo'}</span>
                        </button>

                        {formData.avatar && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Remove Photo"
                          >
                            <FaTrashCan className="w-3 h-3 text-rose-500" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 m-0">
                        Supports PNG, JPG, JPEG, or WEBP (up to 5MB). Photo is automatically optimized.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1. Names Row: First Name, Last Name, Display Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="e.g. Ameen"
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="e.g. Rahman"
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      placeholder="e.g. Junior Developer"
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-semibold"
                    />
                  </div>
                </div>

                {/* 2. Blood Group & Staff ID & System Role */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Blood Group <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-bold"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                      {formData.bloodGroup && !BLOOD_GROUPS.includes(formData.bloodGroup) && (
                        <option value={formData.bloodGroup}>{formData.bloodGroup}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Staff ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={(e) => handleInputChange('employeeId', e.target.value)}
                      placeholder="e.g. AOTMS-007"
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        const desigs = ROLE_DESIGNATIONS[newRole] || [];
                        setFormData(prev => ({
                          ...prev,
                          role: newRole,
                          designation: desigs[0] || prev.designation
                        }));
                      }}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-bold capitalize"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                      <option value="caller">Caller</option>
                    </select>
                  </div>
                </div>

                {/* 3. Designation with autocomplete suggestions */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    list="designation-suggestions"
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    placeholder="e.g. Frontend Developer, HR Manager, Sales Lead"
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-semibold"
                  />
                  <datalist id="designation-suggestions">
                    {availableDesignations.map(d => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                {/* 4. Contact Details: Official Email & Contact Number (10 Digits) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Official Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="e.g. employee@aotms.com"
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Contact Number (10 Digits) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-slate-500 select-none pointer-events-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="9876543210"
                        maxLength={10}
                        className="w-full pl-11 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-semibold font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Address & Joining / Registration Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Residential / Registered Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Door No, Street, City, State - PIN code"
                      rows={2}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Joining / Registration Date
                    </label>
                    <input
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none shadow-2xs font-medium"
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* ═════════════════════════════════════════════════════════
               VIEW MODE (READ ONLY REGISTRATION DETAILS)
               ═════════════════════════════════════════════════════════ */
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ── CARD 1: PERSONAL INFORMATION ── */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                    <FaUser className="w-3.5 h-3.5 text-orange-500" />
                    <span>Personal Information</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10.5px] text-slate-500 uppercase font-bold block">Full Name</span>
                      <strong className="text-slate-900 text-sm font-bold block">
                        {currentFullName}
                      </strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10.5px] text-slate-500 uppercase font-bold block">First Name</span>
                        <span className="text-slate-800 font-semibold">{currentFirstName}</span>
                      </div>
                      <div>
                        <span className="text-[10.5px] text-slate-500 uppercase font-bold block">Last Name</span>
                        <span className="text-slate-800 font-semibold">{currentLastName}</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10.5px] text-slate-500 uppercase font-bold block">Blood Group</span>
                      <div className="mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-xs">
                        <FaDroplet className="w-3 h-3 text-rose-500" />
                        <span>{currentBloodGroup || 'Not Specified'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── CARD 2: WORK & ORGANIZATION ── */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                    <FaBriefcase className="w-3.5 h-3.5 text-amber-500" />
                    <span>Work & Organization</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10.5px] text-slate-500 uppercase font-bold block">Staff ID</span>
                        <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/80 inline-block mt-0.5">
                          {currentEmployeeId || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10.5px] text-slate-500 uppercase font-bold block">Role</span>
                        <span className="font-bold text-slate-800 capitalize px-2.5 py-0.5 rounded-md bg-white border border-slate-200 inline-block mt-0.5 text-[11px]">
                          {current.role || 'Employee'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10.5px] text-slate-500 uppercase font-bold block">Designation</span>
                      <strong className="text-slate-900 text-sm font-bold block mt-0.5">
                        {current.designation || current.role || 'Staff Member'}
                      </strong>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10.5px] text-slate-500 uppercase font-bold block">Display Name</span>
                      <span className="text-slate-800 font-medium">
                        {current.displayName || currentFullName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── CARD 3: CONTACT INFORMATION ── */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                    <FaEnvelope className="w-3.5 h-3.5 text-sky-500" />
                    <span>Contact Information</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {/* Official Email */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] text-slate-500 uppercase font-bold">Official Email</span>
                        <button
                          onClick={() => handleCopy(currentEmail, 'email')}
                          className="text-[10.5px] text-slate-400 hover:text-sky-600 flex items-center gap-1 cursor-pointer"
                          title="Copy Email"
                        >
                          {copiedField === 'email' ? <FaCheck className="w-3 h-3 text-emerald-600" /> : <FaCopy className="w-3 h-3" />}
                          <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate mt-0.5" title={currentEmail}>
                        {currentEmail || '—'}
                      </div>
                      {currentEmail && (
                        <a
                          href={`mailto:${currentEmail}`}
                          className="text-[11px] text-sky-600 font-semibold hover:underline inline-block mt-0.5"
                        >
                          Send Direct Email →
                        </a>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="pt-1 border-t border-slate-200/50">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] text-slate-500 uppercase font-bold">Contact Number</span>
                        <button
                          onClick={() => handleCopy(currentPhone, 'phone')}
                          className="text-[10.5px] text-slate-400 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                          title="Copy Phone"
                        >
                          {copiedField === 'phone' ? <FaCheck className="w-3 h-3 text-emerald-600" /> : <FaCopy className="w-3 h-3" />}
                          <span>{copiedField === 'phone' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5 font-mono">
                        <span className="text-slate-400 font-normal">+91</span>
                        <span>{currentPhone || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── CARD 4: LOCATION & REGISTRATION ── */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                    <FaLocationDot className="w-3.5 h-3.5 text-rose-500" />
                    <span>Location & Registration</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10.5px] text-slate-500 uppercase font-bold block">Registered Address</span>
                      <p className="text-slate-800 font-medium leading-relaxed mt-0.5 text-xs line-clamp-3">
                        {currentAddress || 'No residential address provided during registration.'}
                      </p>
                    </div>

                    <div className="pt-1 border-t border-slate-200/50 flex items-center justify-between">
                      <div>
                        <span className="text-[10.5px] text-slate-500 uppercase font-bold block">Registration Date</span>
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold mt-0.5">
                          <FaCalendarDays className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(current.joiningDate || current.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ──────────────────────────────────────── */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            {isEditing && isAdmin ? (
              <span className="text-amber-700 font-semibold">Editing member registration fields &amp; photo</span>
            ) : (
              <span>Basic Registration Information</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing && isAdmin ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setErrorMessage('');
                    populateForm(profileData || employee);
                  }}
                  className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                >
                  Cancel
                </motion.button>

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
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer shadow-sm"
              >
                Close
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
