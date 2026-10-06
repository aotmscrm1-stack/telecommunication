import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSitemap, FaBuilding, FaUsers, FaPlus, FaUserPlus, FaUserGear,
  FaChevronRight, FaPen, FaTrash, FaXmark, FaCheck,
  FaEnvelope, FaPhone, FaShieldHalved, FaUserTie,
  FaCode, FaBookOpen, FaBullhorn, FaBriefcase, FaRotate, FaUserCheck,
  FaCrown, FaCircle, FaAddressCard, FaLayerGroup, FaEye, FaEyeSlash,
  FaImage, FaLock, FaUser
} from 'react-icons/fa6';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../services/api';

const THEME = {
  bg: '#f8fafc',
  cardBg: '#ffffff',
  blue: '#0284c7',
  blueLight: '#38bdf8',
  blueGlow: 'rgba(2, 132, 199, 0.15)',
  orange: '#f97316',
  orangeLight: '#fb923c',
  orangeGlow: 'rgba(249, 115, 22, 0.15)',
  green: '#10b981',
  greenLight: '#34d399',
  greenGlow: 'rgba(16, 185, 129, 0.15)',
  pink: '#ec4899',
  pinkLight: '#f472b6',
  pinkGlow: 'rgba(236, 72, 153, 0.15)',
  text: '#000000',
  textSoft: '#000000',
  border: '#e2e8f0'
};

// Role-based Designation mapping for Register Form
const ROLE_DESIGNATIONS = {
  admin: ['CTO', 'Managing Director'],
  manager: ['HR Specialist', 'Sr. HR Specialist', 'Marketing Manager', 'Engineering Manager'],
  employee: ['Developer', 'Software Developer', 'Trainer', 'Corporate Trainer', 'Digital Marketing', 'Jr. Executive']
};

/* ── Profile Avatar with fallback initials ── */
function UserAvatar({ user, size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const name = user?.name || user?.displayName || 'User';
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarUrl = user?.avatar;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-2xl object-cover border-2 border-white shadow-md ${className}`}
      />
    );
  }

  const bgGradients = [
    'from-sky-400 to-blue-500',
    'from-pink-400 to-rose-500',
    'from-orange-400 to-amber-500',
    'from-emerald-400 to-teal-500',
    'from-violet-400 to-purple-500'
  ];
  const charCode = name.charCodeAt(0) || 0;
  const gradient = bgGradients[charCode % bgGradients.length];

  return (
    <div
      className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md border-2 border-white tracking-wider shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}

export default function Departments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form States - New Department
  const [deptForm, setDeptForm] = useState({
    name: '', code: '', description: '', color: '#0284c7', icon: 'building'
  });

  // Form States - Employee Register Form
  const [empForm, setEmpForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    designation: '',
    department: '',
    role: 'employee',
    phone: '',
    avatar: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await API.get('/departments');
      if (res.data?.ok) {
        setAdminUser(res.data.admin);
        const depts = res.data.departments || [];
        setDepartments(depts);

        if (!selectedDept && depts.length > 0) {
          setSelectedDept(depts[0]);
        } else if (selectedDept) {
          const updated = depts.find(d => d._id === selectedDept._id || d.name.toLowerCase() === selectedDept.name.toLowerCase());
          if (updated) setSelectedDept(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const handleAddDept = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!deptForm.name.trim()) { setErrorMsg('Department Name is required'); return; }
    setSubmitting(true);
    try {
      let res;
      if (editingDept) res = await API.put(`/departments/${editingDept._id}`, deptForm);
      else res = await API.post('/departments', deptForm);

      if (res.data?.ok) {
        setSuccessMsg(editingDept ? 'Department updated!' : 'Department added!');
        setDeptForm({ name: '', code: '', description: '', color: '#0284c7', icon: 'building' });
        setEditingDept(null);
        setShowAddDeptModal(false);
        await fetchDepartments();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Register Employee Submit Handler
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!empForm.name.trim() || !empForm.email.trim()) {
      setErrorMsg('Full Name and Email are required.');
      return;
    }

    if (!empForm.password) {
      setErrorMsg('Password is required.');
      return;
    }

    if (empForm.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (empForm.password !== empForm.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const deptTarget = empForm.department || (selectedDept ? selectedDept.name : '');
    if (!deptTarget) {
      setErrorMsg('Please select a department.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post('/departments/employee', {
        name: empForm.name.trim(),
        email: empForm.email.toLowerCase().trim(),
        password: empForm.password,
        role: empForm.role,
        designation: empForm.designation || 'Team Member',
        department: deptTarget,
        phone: empForm.phone || '',
        avatar: empForm.avatar || ''
      });

      if (res.data?.ok) {
        setSuccessMsg(`Employee ${empForm.name} registered successfully to ${deptTarget}!`);
        setEmpForm({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          designation: '',
          department: selectedDept ? selectedDept.name : '',
          role: 'employee',
          phone: '',
          avatar: ''
        });
        setShowAddEmpModal(false);
        await fetchDepartments();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please check details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDept = async (deptId, deptName) => {
    if (!window.confirm(`Delete department '${deptName}'?`)) return;
    try {
      const res = await API.delete(`/departments/${deptId}`);
      if (res.data?.ok) {
        if (selectedDept && selectedDept._id === deptId) setSelectedDept(null);
        await fetchDepartments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const getDeptIcon = (iconName) => {
    switch (iconName?.toLowerCase()) {
      case 'users': return <FaUsers />;
      case 'code': return <FaCode />;
      case 'book': return <FaBookOpen />;
      case 'trending-up': return <FaBullhorn />;
      case 'briefcase': return <FaBriefcase />;
      default: return <FaBuilding />;
    }
  };

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Natural calm palette for departments
  const naturalColors = [
    { color: '#ec4899', light: '#fce7f3' }, // Pink
    { color: '#0284c7', light: '#e0f2fe' }, // Blue
    { color: '#f97316', light: '#fff7ed' }, // Orange
    { color: '#10b981', light: '#ecfdf5' }, // Green
  ];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-8 max-w-7xl mx-auto" style={{ color: THEME.text }}>

      {/* ══════════════════════════════════════════════
          HEADER BANNER
          ══════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-white p-8 rounded-3xl border border-slate-200 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 text-xs uppercase tracking-widest text-black mb-2">
            <span className="p-1.5 rounded-lg bg-sky-100 text-sky-600 shadow-sm"><FaSitemap className="w-4 h-4" /></span>
            <span>Admin Dynamic Organization Control</span>
          </div>
          <h1 className="text-3xl sm:text-4xl text-black tracking-tight flex items-center gap-3">
            <span>Organization</span> <FaChevronRight className="w-5 h-5 text-orange-500" /> <span>Departments</span>
          </h1>
          <p className="text-sm text-black mt-2 max-w-2xl">
            Live sync of administrative hierarchy, active department structures, and employee profiles.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={fetchDepartments}
            className="p-3.5 rounded-2xl border border-slate-200 text-black hover:text-sky-600 hover:border-sky-400 hover:bg-sky-50 transition-all shadow-sm bg-slate-50"
            title="Sync with MongoDB"
          >
            <FaRotate className={`w-5 h-5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingDept(null);
              setDeptForm({ name: '', code: '', description: '', color: '#0284c7', icon: 'building' });
              setShowAddDeptModal(true);
            }}
            className="px-6 py-3.5 rounded-2xl text-sm text-white shadow-xl transition-all flex items-center gap-2.5 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${THEME.orange}, #ea580c)`,
              boxShadow: `0 10px 25px ${THEME.orangeGlow}`
            }}
          >
            <FaPlus className="w-4 h-4" /> <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* ── SUCCESS ALERT ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-black text-sm flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow">✓</span>
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-black hover:text-slate-900 p-1">
              <FaXmark className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          ORGANIZATION TREE HIERARCHY
          ══════════════════════════════════════════════ */}
      <div className="mb-14 bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-slate-100 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-black mb-1">
              <FaCrown className="w-4 h-4" /> <span>Organization Tree Hierarchy</span>
            </div>
            <h2 className="text-2xl text-black">Live Structural Hierarchy</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-2xl text-xs bg-sky-50 text-black border border-sky-200 shadow-sm flex items-center gap-2">
              <FaCircle className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
              <span>{departments.reduce((acc, d) => acc + (d.employeeCount || 0), 0)} Active</span>
            </span>
          </div>
        </div>

        {/* Tree Canvas */}
        <div className="flex flex-col items-center py-6 relative z-10 min-h-[560px] justify-between">

          {/* ROOT NODE: Admin */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="w-full max-w-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border-2 border-orange-500/80 relative"
            style={{ boxShadow: `0 20px 50px rgba(15, 23, 42, 0.3), 0 0 25px ${THEME.orangeGlow}` }}
          >
            <div className="absolute top-3.5 right-4 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest bg-orange-500 text-white shadow-md flex items-center gap-1.5">
              <FaCrown className="w-3 h-3" /> <span>TOP ADMIN</span>
            </div>

            <div className="flex items-center gap-4">
              <UserAvatar user={adminUser} size="lg" className="ring-4 ring-orange-500/40" />
              <div>
                <div className="text-xs uppercase tracking-wider text-orange-400">ADMINISTRATOR</div>
                <h3 className="text-xl tracking-wide text-white">{adminUser?.name || 'Ameen Sayyed'}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{adminUser?.designation || 'Managing Director & Admin'}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                  <span className="flex items-center gap-1"><FaEnvelope className="text-orange-400" /> {adminUser?.email || 'ameen@crm.com'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Connectors */}
          <div className="w-full flex flex-col items-center my-6">
            <div className="w-1 h-14 bg-gradient-to-b from-orange-500 via-sky-500 to-sky-600 rounded-full shadow-md" />

            {departments.length > 0 && (
              <div className="w-[88%] h-1 bg-gradient-to-r from-sky-400 via-orange-400 to-sky-400 rounded-full shadow-sm relative">
                <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow-md absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════
              DEPARTMENT CARDS — CLEAN, NO TOP COLOR BAND
              ══════════════════════════════════════════════ */}
          <div className="w-full pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {departments.map((dept, index) => {
                const isSelected = selectedDept?.name?.toLowerCase() === dept.name?.toLowerCase();
                const palette = naturalColors[index % naturalColors.length];
                const deptColor = palette.color;

                return (
                  <div key={dept._id || dept.name} className="flex flex-col items-center">
                    <div className="w-0.5 h-8 bg-sky-400 mb-2" />

                    <motion.div
                      whileHover={{ y: -6, scale: 1.02 }}
                      onClick={() => setSelectedDept(dept)}
                      className="w-full rounded-3xl cursor-pointer relative overflow-hidden bg-white shadow-lg transition-all"
                      style={{
                        border: `2px solid ${isSelected ? deptColor : '#e2e8f0'}`,
                        boxShadow: isSelected
                          ? `0 20px 40px ${deptColor}30, 0 0 0 4px ${deptColor}15`
                          : '0 8px 20px rgba(15, 23, 42, 0.06)'
                      }}
                    >
                      {/* CARD BODY */}
                      <div className="p-6">

                        {/* Icon + staff count row */}
                        <div className="flex items-start justify-between mb-5">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md"
                            style={{
                              background: `${deptColor}12`,
                              color: deptColor,
                              border: `1.5px solid ${deptColor}30`
                            }}
                          >
                            {getDeptIcon(dept.icon)}
                          </div>

                          <div
                            className="px-3 py-1.5 rounded-full text-[11px] flex items-center gap-1.5"
                            style={{
                              background: '#0f172a',
                              color: '#ffffff'
                            }}
                          >
                            <FaUsers className="w-3 h-3" style={{ color: deptColor }} />
                            <span>{dept.employeeCount || 0}</span>
                          </div>
                        </div>

                        {/* Department name + code */}
                        <div className="mb-2">
                          <h4 className="text-black text-lg leading-tight">
                            {dept.name}
                          </h4>
                          {dept.code && (
                            <span
                              className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] tracking-widest uppercase"
                              style={{
                                background: `${deptColor}15`,
                                color: deptColor
                              }}
                            >
                              <span>{dept.code}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-black line-clamp-2 leading-relaxed mb-4 min-h-[2.5rem]">
                          {dept.description || 'Department Management'}
                        </p>

                        {/* Staff preview */}
                        <div
                          className="pt-4 space-y-2"
                          style={{ borderTop: '1px solid #f1f5f9' }}
                        >
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                            <span className="text-black">Team</span>
                            <span style={{ color: deptColor }}>
                              {dept.employees?.length || 0} Active
                            </span>
                          </div>

                          {(dept.employees || []).slice(0, 2).map((emp, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-xl bg-slate-50 flex items-center gap-2.5 hover:bg-white hover:shadow-sm transition-all"
                            >
                              <UserAvatar user={emp} size="sm" />
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] text-black truncate">{emp.name}</div>
                                <div className="text-[9.5px] truncate" style={{ color: deptColor }}>
                                  {emp.designation || 'Team Member'}
                                </div>
                              </div>
                            </div>
                          ))}

                          {(!dept.employees || dept.employees.length === 0) && (
                            <div className="p-2.5 text-center rounded-xl bg-slate-50 text-[10px] text-black italic">
                              No staff yet
                            </div>
                          )}

                          {dept.employees && dept.employees.length > 2 && (
                            <div
                              className="text-[10px] text-center pt-1"
                              style={{ color: deptColor }}
                            >
                              +{dept.employees.length - 2} more members
                            </div>
                          )}
                        </div>

                        {/* Open indicator */}
                        <div
                          className="mt-4 pt-3 flex items-center justify-between text-[10.5px] uppercase tracking-wider"
                          style={{ borderTop: '1px solid #f1f5f9' }}
                        >
                          <span
                            className="px-2.5 py-1 rounded-lg"
                            style={{
                              background: isSelected ? deptColor : `${deptColor}12`,
                              color: isSelected ? '#ffffff' : deptColor
                            }}
                          >
                            {isSelected ? 'Opened' : 'View Team'}
                          </span>
                          <FaChevronRight
                            className="w-3 h-3"
                            style={{ color: deptColor }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MAIN DASHBOARD SPLIT VIEW
          ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT: Departments List */}
        <div className={`space-y-5 ${selectedDept ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl text-black flex items-center gap-2">
                <span>Departments</span> <span className="px-3 py-1 rounded-full text-xs bg-orange-100 text-black">{departments.length}</span>
              </h3>
              <p className="text-xs text-black">Click a card to open the HR panel</p>
            </div>

            <input
              type="text"
              placeholder="Search department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 shadow-sm"
            />
          </div>

          {loading ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-md">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-black">Connecting to MongoDB...</p>
            </div>
          ) : filteredDepts.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-md">
              <FaBuilding className="w-14 h-14 text-slate-300 mx-auto mb-3" />
              <p className="text-black text-base">No departments found</p>
              <button
                onClick={() => setShowAddDeptModal(true)}
                className="mt-4 px-5 py-2.5 rounded-2xl bg-orange-500 text-white text-xs shadow-md"
              >
                + Create First Department
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredDepts.map((dept, index) => {
                const isSelected = selectedDept?._id === dept._id || selectedDept?.name?.toLowerCase() === dept.name?.toLowerCase();
                const palette = naturalColors[index % naturalColors.length];
                const deptColor = palette.color;

                return (
                  <motion.div
                    key={dept._id || dept.name}
                    whileHover={{ scale: 1.01, x: 4 }}
                    onClick={() => setSelectedDept(dept)}
                    className="rounded-3xl bg-white overflow-hidden cursor-pointer shadow-md transition-all"
                    style={{
                      border: `2px solid ${isSelected ? deptColor : '#e2e8f0'}`,
                      boxShadow: isSelected
                        ? `0 20px 40px ${deptColor}25, 0 0 0 4px ${deptColor}12`
                        : '0 4px 12px rgba(15, 23, 42, 0.05)'
                    }}
                  >
                    <div className="p-6 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm shrink-0"
                          style={{
                            background: `${deptColor}12`,
                            color: deptColor,
                            border: `1.5px solid ${deptColor}30`
                          }}
                        >
                          {getDeptIcon(dept.icon)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-black text-lg truncate">{dept.name}</h4>
                            {dept.code && (
                              <span
                                className="text-[10px] tracking-wider px-2 py-0.5 rounded-md uppercase"
                                style={{ background: `${deptColor}15`, color: deptColor }}
                              >
                                <span>{dept.code}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-black line-clamp-1 mt-0.5">
                            {dept.description || 'Department Management'}
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className="text-[10px] px-2 py-1 rounded-lg flex items-center gap-1"
                              style={{ background: '#0f172a', color: '#ffffff' }}
                            >
                              <FaUsers className="w-3 h-3" style={{ color: deptColor }} />
                              <span>{dept.employeeCount || 0} Staff</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDept(dept);
                            setDeptForm({
                              name: dept.name,
                              code: dept.code || '',
                              description: dept.description || '',
                              color: dept.color || '#0284c7',
                              icon: dept.icon || 'building'
                            });
                            setShowAddDeptModal(true);
                          }}
                          className="p-2.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
                          title="Edit"
                        >
                          <FaPen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDept(dept._id, dept.name);
                          }}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Selected Department Detail */}
        {selectedDept && (() => {
          const deptIndex = departments.findIndex(d => d._id === selectedDept._id || d.name === selectedDept.name);
          const palette = naturalColors[deptIndex >= 0 ? deptIndex % naturalColors.length : 0];
          const selColor = palette.color;
          return (
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col justify-between relative">
              <div className="p-8 sm:p-10">
                {/* Header */}
                <div className="flex items-center justify-between pb-8 mb-8 border-b border-slate-100 flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md"
                      style={{
                        background: `${selColor}12`,
                        color: selColor,
                        border: `2px solid ${selColor}40`
                      }}
                    >
                      {getDeptIcon(selectedDept.icon)}
                    </div>
                    <div>
                      <div
                        className="text-xs uppercase tracking-widest"
                        style={{ color: selColor }}
                      >
                        <span>Admin HR Open</span>
                      </div>
                      <h2 className="text-3xl text-black">{selectedDept.name} Department</h2>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/signup')}
                    className="px-5 py-3 rounded-2xl text-xs text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg hover:scale-[1.02]"
                  >
                    <FaUserPlus className="w-4 h-4" style={{ color: selColor }} /> <span>+ Add Employee</span>
                  </button>
                </div>

                {/* Employees Header */}
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl text-black flex items-center gap-3">
                    <span>Employees</span>
                    <span
                      className="px-3 py-1 rounded-full text-xs text-white"
                      style={{ background: selColor }}
                    >
                      {selectedDept.employees?.length || 0}
                    </span>
                  </h3>
                </div>

                {/* Employee Cards */}
                {(!selectedDept.employees || selectedDept.employees.length === 0) ? (
                  <div className="p-12 text-center rounded-3xl bg-slate-50 border border-slate-200">
                    <FaUsers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-black text-base">No employees assigned yet.</p>
                    <button
                      onClick={() => navigate('/signup')}
                      className="mt-4 px-5 py-2.5 rounded-2xl text-white text-xs shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ background: selColor }}
                    >
                      + Register Employee
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDept.employees.map((emp, idx) => (
                      <motion.div
                        key={emp._id || idx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white hover:border-sky-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <UserAvatar user={emp} size="lg" />
                          <div>
                            <div className="text-black text-base flex items-center gap-2">
                              {emp.name}
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-sm" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span
                                className="px-2.5 py-0.5 rounded-lg text-[11px]"
                                style={{ background: `${selColor}15`, color: selColor }}
                              >
                                {emp.designation || 'Team Member'}
                              </span>
                              <span className="text-xs text-black flex items-center gap-1.5">
                                <FaEnvelope className="w-3 h-3 text-slate-400" /> {emp.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {emp.phone && (
                            <span className="text-xs text-black bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                              <FaPhone className="w-3 h-3" style={{ color: selColor }} /> {emp.phone}
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-xl text-xs uppercase tracking-wider ${
                            emp.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            emp.role === 'manager' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {emp.role || 'employee'}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 sm:px-10 py-5 border-t border-slate-100 flex items-center justify-between text-xs text-black bg-slate-50">
                <span className="flex items-center gap-1.5">
                  <FaAddressCard className="w-4 h-4" style={{ color: selColor }} />
                  <span>Department:</span>
                  <code className="bg-white px-2 py-1 rounded text-black border border-slate-200">
                    {selectedDept.name}
                  </code>
                </span>
                <button
                  onClick={() => {
                    setEmpForm(prev => ({
                      ...prev,
                      department: selectedDept.name,
                      name: '',
                      email: '',
                      password: '',
                      confirmPassword: '',
                      phone: '',
                      avatar: '',
                      role: 'employee',
                      designation: ''
                    }));
                    setShowAddEmpModal(true);
                  }}
                  className="hover:underline flex items-center gap-1.5 font-bold"
                  style={{ color: selColor }}
                >
                  <FaUserPlus /> <span>Open Register Form</span>
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ══════════════════════════════════════════════
          MODAL: ADD / EDIT DEPARTMENT
          ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddDeptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                  <h3 className="text-2xl text-black flex items-center gap-3">
                    <span
                      className="p-2 rounded-xl"
                      style={{ background: `${deptForm.color}15`, color: deptForm.color }}
                    >
                      <FaBuilding />
                    </span>
                    <span>{editingDept ? 'Edit Department' : 'Add New Department'}</span>
                  </h3>
                  <button
                    onClick={() => setShowAddDeptModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
                  >
                    <FaXmark className="w-5 h-5" />
                  </button>
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-black text-xs">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleAddDept} className="space-y-5">
                  <div>
                    <label className="text-xs text-black uppercase tracking-wider mb-1 block">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HR, Developer, Trainer, Marketing"
                      value={deptForm.name}
                      onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                      className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-black uppercase tracking-wider mb-1 block">
                        Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HR, DEV"
                        value={deptForm.code}
                        onChange={e => setDeptForm({ ...deptForm, code: e.target.value })}
                        className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-black uppercase tracking-wider mb-1 block">
                        Theme Color
                      </label>
                      <input
                        type="color"
                        value={deptForm.color}
                        onChange={e => setDeptForm({ ...deptForm, color: e.target.value })}
                        className="w-full h-12 p-1 rounded-2xl border border-slate-200 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-black uppercase tracking-wider mb-1 block">
                      Description
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Brief department responsibilities..."
                      value={deptForm.description}
                      onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                      className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddDeptModal(false)}
                      className="flex-1 py-3.5 rounded-2xl text-sm text-black bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3.5 rounded-2xl text-sm text-white transition-all shadow-xl"
                      style={{ background: deptForm.color }}
                    >
                      {submitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



    </div>
  );
}