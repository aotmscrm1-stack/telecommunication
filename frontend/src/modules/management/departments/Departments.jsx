import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSitemap, FaBuilding, FaUsers, FaPlus, FaUserPlus,
  FaChevronRight, FaPen, FaTrash, FaXmark, FaCheck,
  FaEnvelope, FaPhone, FaShieldHalved,
  FaCode, FaBookOpen, FaBullhorn, FaBriefcase, FaRotate,
  FaCrown, FaCircle, FaAddressCard, FaGraduationCap,
  FaUserTie, FaLock, FaUser
} from 'react-icons/fa6';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../services/api';
import AotmsSpinner from '../../../components/common/AotmsSpinner';

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
  text: '#0f172a',
  textSoft: '#334155',
  border: '#e2e8f0'
};

// Fallback high-quality professional avatars
const FALLBACK_AVATARS = {
  rajasree: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  raja: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  venkat: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  venkatasai: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  moeen: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  female: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  male: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80'
};

function getFallbackPhoto(user) {
  const n = String(user?.name || user?.displayName || '').toLowerCase();
  const e = String(user?.email || '').toLowerCase();
  if (n.includes('raja') || n.includes('rajasree') || e.includes('rajasree')) return FALLBACK_AVATARS.rajasree;
  if (n.includes('venkat') || e.includes('venkat')) return FALLBACK_AVATARS.venkat;
  if (n.includes('moeen') || e.includes('moeen')) return FALLBACK_AVATARS.moeen;
  if (n.includes('manasa') || n.includes('bhavani') || n.includes('deenaz') || n.includes('saadiya') || n.includes('adilakshmi')) {
    return FALLBACK_AVATARS.female;
  }
  return FALLBACK_AVATARS.male;
}

/* ── Profile Avatar Component — Always displays a photo for every employee ── */
function UserAvatar({ user, size = 'md', className = '' }) {
  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const name = user?.name || user?.displayName || 'User';
  const avatarUrl = user?.avatar || user?.profileImage || user?.photo || getFallbackPhoto(user);

  return (
    <img
      src={avatarUrl}
      alt={name}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = getFallbackPhoto(user);
      }}
      className={`${sizeClasses[size] || sizeClasses.md} rounded-2xl object-cover border-2 border-white shadow-md shrink-0 ${className}`}
    />
  );
}

// 4 Canonical Departments definition matching the organization requirements
const CANONICAL_DEPARTMENTS_CONFIG = [
  {
    key: 'hr',
    name: 'HR Department',
    code: 'HR',
    description: 'Human Resources & Talent Management',
    color: '#ec4899',
    light: '#fce7f3',
    icon: 'users',
    headName: 'Deenaz Shaik',
    headTitle: 'Sr. HR Specialist',
    headRole: 'Head of HR',
    teamLabels: 'Team Members'
  },
  {
    key: 'development',
    name: 'Development Department',
    code: 'DEV',
    description: 'Software Engineering & IT Systems',
    color: '#0284c7',
    light: '#e0f2fe',
    icon: 'code',
    headName: 'Ramanadham Jayaveer',
    headTitle: 'Lead Software Developer',
    headRole: 'Tech Lead',
    teamLabels: 'Team Members'
  },
  {
    key: 'marketing',
    name: 'Digital Marketing Department',
    code: 'MKT',
    description: 'Growth, SEO, Ads & Social Marketing',
    color: '#f97316',
    light: '#fff7ed',
    icon: 'trending-up',
    headName: 'Ashok Y',
    headTitle: 'Sr. Marketing Lead',
    headRole: 'Marketing Lead',
    teamLabels: 'Team Members'
  },
  {
    key: 'trainers',
    name: 'Trainers',
    code: 'TRN',
    description: 'Technical & Skill Training Faculty',
    color: '#10b981',
    light: '#ecfdf5',
    icon: 'book',
    headName: null,
    headTitle: null,
    headRole: null,
    teamLabels: 'Faculty Trainers'
  }
];

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
        setSuccessMsg(editingDept ? 'Department updated successfully!' : 'Department added successfully!');
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

    const deptTarget = empForm.department || (selectedDept ? selectedDept.name : 'HR Department');

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

  // Safe departments list strictly mapped to the 4 canonical departments
  const displayDepartments = CANONICAL_DEPARTMENTS_CONFIG.map(cfg => {
    const live = departments.find(d => 
      d.name?.toLowerCase().includes(cfg.key) ||
      d.name?.toLowerCase() === cfg.name.toLowerCase() ||
      d.code?.toLowerCase() === cfg.code.toLowerCase()
    );
    return {
      ...cfg,
      ...(live || {}),
      color: cfg.color,
      light: cfg.light,
      head: live?.head || null,
      team: live?.team || [],
      employees: live?.employees || live?.allMembers || [],
      employeeCount: live?.employeeCount || live?.employees?.length || 0
    };
  });

  const filteredDepts = displayDepartments.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalActiveStaff = displayDepartments.reduce((acc, d) => acc + (d.employeeCount || 0), 0);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-8 max-w-7xl mx-auto" style={{ color: THEME.text }}>

      {/* ══════════════════════════════════════════════
          HEADER BANNER
          ══════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-white p-8 rounded-3xl border border-slate-200 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">
            <span className="p-1.5 rounded-lg bg-sky-100 text-sky-600 shadow-sm"><FaSitemap className="w-4 h-4" /></span>
            <span>AOTMS Organization Control & Departments</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Organization</span> <FaChevronRight className="w-5 h-5 text-orange-500" /> <span>Departments</span>
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl font-medium">
            Live administrative hierarchy, department leadership, faculty trainers & employee team profiles.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={fetchDepartments}
            disabled={loading}
            className="p-3.5 rounded-2xl border border-slate-200 text-slate-700 hover:text-sky-600 hover:border-sky-400 hover:bg-sky-50 transition-all shadow-sm bg-slate-50 cursor-pointer disabled:opacity-50"
            title="Sync with MongoDB"
          >
            {loading ? <AotmsSpinner size={18} /> : <FaRotate className="w-5 h-5 text-orange-500" />}
          </button>

          <button
            onClick={() => {
              setEmpForm({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                designation: '',
                department: selectedDept ? selectedDept.name : 'HR Department',
                role: 'employee',
                phone: '',
                avatar: ''
              });
              setShowAddEmpModal(true);
            }}
            className="px-6 py-3.5 rounded-2xl text-sm font-bold text-white shadow-xl transition-all flex items-center gap-2.5 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${THEME.orange}, #ea580c)`,
              boxShadow: `0 10px 25px ${THEME.orangeGlow}`
            }}
          >
            <FaUserPlus className="w-4 h-4" /> <span>+ Register Staff</span>
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
            className="mb-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-3 font-semibold">
              <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow">✓</span>
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer">
              <FaXmark className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          ORGANIZATION TREE HIERARCHY
          ══════════════════════════════════════════════ */}
      <div className="mb-14 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">
              <FaCrown className="w-4 h-4 text-amber-500" /> <span>Department Structure & Leadership</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Live Organizational Hierarchy</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-2xl text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 shadow-sm flex items-center gap-2">
              <FaCircle className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
              <span>{totalActiveStaff} Active Staff Members</span>
            </span>
            <span className="px-4 py-2 rounded-2xl text-xs font-bold bg-slate-900 text-white shadow-sm">
              4 Core Departments
            </span>
          </div>
        </div>

        {/* Tree Canvas */}
        <div className="flex flex-col items-center py-4 relative z-10">

          {/* ROOT NODE: Top Administrator */}
          <motion.div
            whileHover={{ scale: 1.015 }}
            className="w-full max-w-md bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border-2 border-orange-500/90 relative"
            style={{ boxShadow: `0 20px 45px rgba(15, 23, 42, 0.25), 0 0 25px ${THEME.orangeGlow}` }}
          >
            <div className="absolute top-3.5 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-500 text-white shadow-md flex items-center gap-1.5">
              <FaCrown className="w-3 h-3" /> <span>TOP ADMIN</span>
            </div>

            <div className="flex items-center gap-4">
              <UserAvatar user={adminUser} size="lg" className="ring-4 ring-orange-500/50" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-orange-400">ADMINISTRATOR</div>
                <h3 className="text-xl font-black tracking-wide text-white">{adminUser?.name || 'Ameen Sayyed'}</h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">{adminUser?.designation || 'Managing Director & Admin'}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 font-mono">
                  <span className="flex items-center gap-1.5"><FaEnvelope className="text-orange-400" /> {adminUser?.email || 'ameen@aotms.in'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════
              CONNECTING LINES: ROBUST HORIZONTAL & VERTICAL TREE SYSTEM
              ══════════════════════════════════════════════ */}

          {/* Central Vertical Trunk from Admin Card to Bus Bar */}
          <div className="flex flex-col items-center relative z-20">
            <div className="w-[3px] h-8 bg-sky-500 relative">
              {/* Top anchor circle touching Admin Card */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-orange-500 border border-white shadow-xs" />

              {/* Central Master Junction Node where vertical trunk meets horizontal bus */}
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-orange-500 border-2 border-white shadow-md ring-2 ring-orange-200 z-30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
              </div>
            </div>
          </div>

          {/* Desktop 4-Column Bus Bar & Drop Grid (lg and above) */}
          <div className="w-full hidden lg:grid grid-cols-4 gap-6 relative" style={{ height: 38 }}>
            {displayDepartments.map((dept, index) => {
              const isFirst = index === 0;
              const isLast = index === displayDepartments.length - 1;
              return (
                <div key={dept.key || index} className="relative h-full flex flex-col items-center">
                  {/* Continuous Horizontal Bus Bar spanning seamlessly between columns */}
                  <div
                    className="absolute top-0 h-[3px] bg-sky-500 z-10"
                    style={{
                      left: isFirst ? '50%' : '-13px',
                      right: isLast ? '50%' : '-13px'
                    }}
                  />

                  {/* Department Turn Junction Node */}
                  <div
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-20"
                    style={{ backgroundColor: dept.color }}
                  />

                  {/* Solid Vertical Drop Line directly into department card */}
                  <div
                    className="w-[3px] h-full z-10"
                    style={{ backgroundColor: dept.color }}
                  />

                  {/* Bottom Terminal Node touching top edge of card */}
                  <div
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-xs z-20"
                    style={{ backgroundColor: dept.color }}
                  />
                </div>
              );
            })}
          </div>

          {/* Tablet (2-Column) Bus Bar Connector (md only) */}
          <div className="w-full hidden md:grid lg:hidden grid-cols-2 gap-6 relative" style={{ height: 36 }}>
            {/* Col 1 */}
            <div className="relative h-full flex flex-col items-center">
              <div className="absolute top-0 left-1/2 right-[-13px] h-[3px] bg-sky-500 z-10" />
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#ec4899] border-2 border-white shadow-sm z-20" />
              <div className="w-[3px] h-full bg-[#ec4899]" />
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#ec4899] border-2 border-white shadow-xs z-20" />
            </div>
            {/* Col 2 */}
            <div className="relative h-full flex flex-col items-center">
              <div className="absolute top-0 left-[-13px] right-1/2 h-[3px] bg-sky-500 z-10" />
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#0284c7] border-2 border-white shadow-sm z-20" />
              <div className="w-[3px] h-full bg-[#0284c7]" />
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#0284c7] border-2 border-white shadow-xs z-20" />
            </div>
          </div>

          {/* Mobile (Single Column) Connector */}
          <div className="w-full flex flex-col items-center my-1 md:hidden">
            <div className="w-[3px] h-6 bg-gradient-to-b from-orange-500 to-sky-500 rounded-full" />
            <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-xs my-0.5" />
            <div className="w-[3px] h-4 bg-sky-500 rounded-full" />
          </div>

          {/* ══════════════════════════════════════════════
              EXACT 4 DEPARTMENT CARDS — FULL PHOTOS & HEADS
              ══════════════════════════════════════════════ */}
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayDepartments.map((dept) => {
                const isSelected = selectedDept?.key === dept.key || selectedDept?.name?.toLowerCase() === dept.name?.toLowerCase();
                const deptColor = dept.color;

                return (
                  <div key={dept.key} className="flex flex-col items-center">
                    <motion.div
                      whileHover={{ y: -5, scale: 1.015 }}
                      onClick={() => setSelectedDept(dept)}
                      className="w-full rounded-3xl cursor-pointer relative overflow-hidden bg-white shadow-lg transition-all flex flex-col justify-between"
                      style={{
                        border: `2.5px solid ${isSelected ? deptColor : '#e2e8f0'}`,
                        boxShadow: isSelected
                          ? `0 20px 40px ${deptColor}25, 0 0 0 3px ${deptColor}20`
                          : '0 8px 24px rgba(15, 23, 42, 0.05)'
                      }}
                    >
                      {/* CARD CONTENT */}
                      <div className="p-5 flex flex-col justify-between h-full">

                        {/* Top: Icon + Code + Staff Count */}
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <div
                              className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                              style={{
                                background: `${deptColor}12`,
                                color: deptColor,
                                border: `1.5px solid ${deptColor}30`
                              }}
                            >
                              {getDeptIcon(dept.icon)}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span
                                className="px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-widest uppercase"
                                style={{
                                  background: `${deptColor}15`,
                                  color: deptColor,
                                  border: `1px solid ${deptColor}30`
                                }}
                              >
                                {dept.code}
                              </span>
                              <div className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-slate-900 text-white shadow-xs">
                                <FaUsers className="w-3 h-3" style={{ color: deptColor }} />
                                <span>{dept.employeeCount || 0}</span>
                              </div>
                            </div>
                          </div>

                          {/* Department Title & Description */}
                          <div className="mb-4">
                            <h4 className="text-slate-900 text-lg font-black leading-tight">
                              {dept.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                              {dept.description}
                            </p>
                          </div>

                          {/* ── DEPARTMENT HEAD SECTION (IF PRESENT) ── */}
                          {dept.head && (
                            <div className="mb-4 p-3 rounded-2xl border" style={{ background: `${deptColor}08`, borderColor: `${deptColor}30` }}>
                              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: deptColor }}>
                                <FaCrown className="w-3 h-3 text-amber-500" />
                                <span>Department Head</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <UserAvatar user={dept.head} size="md" className="ring-2" style={{ ringColor: deptColor }} />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-black text-slate-900 truncate">
                                    {dept.head.name}
                                  </div>
                                  <div className="text-[10.5px] font-bold truncate mt-0.5" style={{ color: deptColor }}>
                                    {dept.head.designation || dept.headTitle}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── TEAM MEMBERS / FACULTY SECTION — ALL PHOTOS SHOWN ── */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                              <span>{dept.teamLabels} ({dept.team?.length || (dept.head ? dept.employeeCount - 1 : dept.employeeCount)})</span>
                              <span style={{ color: deptColor }}>Active</span>
                            </div>

                            {/* Show EVERY team member with photo and name */}
                            {(dept.team || []).map((emp, idx) => (
                              <div
                                key={emp._id || idx}
                                className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all"
                              >
                                <UserAvatar user={emp} size="sm" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-800 truncate">
                                    {emp.name}
                                  </div>
                                  <div className="text-[10px] font-semibold truncate text-slate-500">
                                    {emp.designation || 'Team Member'}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Fallback if team is empty */}
                            {(!dept.team || dept.team.length === 0) && !dept.head && (
                              <div className="p-3 text-center rounded-xl bg-slate-50 text-xs text-slate-400 italic">
                                No staff assigned yet
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Open indicator button */}
                        <div
                          className="mt-5 pt-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider border-t border-slate-100"
                        >
                          <span
                            className="px-3 py-1.5 rounded-xl transition-all"
                            style={{
                              background: isSelected ? deptColor : `${deptColor}12`,
                              color: isSelected ? '#ffffff' : deptColor
                            }}
                          >
                            {isSelected ? 'Opened' : 'View Team & Details'}
                          </span>
                          <FaChevronRight
                            className="w-3.5 h-3.5"
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

        {/* LEFT: 4 Departments Overview Cards */}
        <div className={`space-y-4 ${selectedDept ? 'lg:col-span-4' : 'lg:col-span-12'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <span>Departments</span> <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">4</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Select a department to view detailed profiles</p>
            </div>

            <input
              type="text"
              placeholder="Filter..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500 shadow-sm w-28"
            />
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {filteredDepts.map((dept) => {
              const isSelected = selectedDept?.key === dept.key || selectedDept?.name?.toLowerCase() === dept.name?.toLowerCase();
              const deptColor = dept.color;

              return (
                <motion.div
                  key={dept.key}
                  whileHover={{ scale: 1.01, x: 3 }}
                  onClick={() => setSelectedDept(dept)}
                  className="rounded-2xl bg-white overflow-hidden cursor-pointer shadow-sm transition-all"
                  style={{
                    border: `2px solid ${isSelected ? deptColor : '#e2e8f0'}`,
                    boxShadow: isSelected
                      ? `0 12px 28px ${deptColor}20, 0 0 0 3px ${deptColor}15`
                      : '0 2px 8px rgba(15, 23, 42, 0.04)'
                  }}
                >
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-xs shrink-0"
                        style={{
                          background: `${deptColor}12`,
                          color: deptColor,
                          border: `1.5px solid ${deptColor}30`
                        }}
                      >
                        {getDeptIcon(dept.icon)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-slate-900 text-sm font-extrabold truncate">{dept.name}</h4>
                          <span
                            className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-md uppercase"
                            style={{ background: `${deptColor}15`, color: deptColor }}
                          >
                            {dept.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {dept.head ? `Head: ${dept.head.name}` : dept.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-900 text-white">
                        {dept.employeeCount || 0} Staff
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Selected Department Detailed Panel */}
        {selectedDept && (() => {
          const deptMatch = displayDepartments.find(d => d.key === selectedDept.key || d.name === selectedDept.name) || selectedDept;
          const selColor = deptMatch.color || '#0284c7';
          const headUser = deptMatch.head;
          const teamList = deptMatch.team || [];
          const allMembers = deptMatch.employees || deptMatch.allMembers || [];

          return (
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col justify-between">
              <div className="p-8">
                {/* Department Header */}
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100 flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md shrink-0"
                      style={{
                        background: `${selColor}12`,
                        color: selColor,
                        border: `2px solid ${selColor}40`
                      }}
                    >
                      {getDeptIcon(deptMatch.icon)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-md" style={{ background: `${selColor}15`, color: selColor }}>
                          {deptMatch.code}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">• {allMembers.length} Members</span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 mt-1">{deptMatch.name}</h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{deptMatch.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEmpForm({
                        name: '',
                        email: '',
                        password: '',
                        confirmPassword: '',
                        designation: '',
                        department: deptMatch.name,
                        role: 'employee',
                        phone: '',
                        avatar: ''
                      });
                      setShowAddEmpModal(true);
                    }}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md hover:scale-[1.02] cursor-pointer"
                  >
                    <FaUserPlus className="w-3.5 h-3.5" style={{ color: selColor }} /> <span>+ Add Employee</span>
                  </button>
                </div>

                {/* ── DEPARTMENT HEAD SPOTLIGHT IN DETAIL PANEL ── */}
                {headUser && (
                  <div className="mb-6 p-5 rounded-2xl border-2" style={{ background: `${selColor}08`, borderColor: `${selColor}35` }}>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider mb-3" style={{ color: selColor }}>
                      <FaCrown className="w-4 h-4 text-amber-500" />
                      <span>Department Head & Leadership</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <UserAvatar user={headUser} size="lg" className="ring-4" style={{ ringColor: `${selColor}50` }} />
                        <div>
                          <div className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                            {headUser.name}
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" title="Active" />
                          </div>
                          <div className="text-xs font-bold mt-0.5" style={{ color: selColor }}>
                            {headUser.designation || deptMatch.headTitle}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1"><FaEnvelope className="text-slate-400" /> {headUser.email}</span>
                            {headUser.phone && (
                              <span className="flex items-center gap-1"><FaPhone className="text-slate-400" /> {headUser.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
                        ★ HEAD
                      </span>
                    </div>
                  </div>
                )}

                {/* ── ALL EMPLOYEES GRID WITH PHOTOS AND NAMES ── */}
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>{headUser ? 'Team Members' : 'Faculty Trainers'}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: selColor }}>
                      {headUser ? teamList.length : allMembers.length}
                    </span>
                  </h3>
                </div>

                <div className="space-y-3">
                  {(headUser ? teamList : allMembers).map((emp, idx) => (
                    <motion.div
                      key={emp._id || idx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <UserAvatar user={emp} size="lg" />
                        <div>
                          <div className="text-slate-900 font-extrabold text-sm flex items-center gap-2">
                            {emp.name}
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-xs" />
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span
                              className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold"
                              style={{ background: `${selColor}15`, color: selColor }}
                            >
                              {emp.designation || 'Team Member'}
                            </span>
                            <span className="text-xs text-slate-600 flex items-center gap-1.5 font-mono">
                              <FaEnvelope className="w-3 h-3 text-slate-400" /> {emp.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {emp.phone && (
                          <span className="text-xs text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 font-mono">
                            <FaPhone className="w-3 h-3" style={{ color: selColor }} /> {emp.phone}
                          </span>
                        )}
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
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
              </div>

              {/* Panel Footer */}
              <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50">
                <span className="flex items-center gap-2 font-medium">
                  <FaAddressCard className="w-4 h-4" style={{ color: selColor }} />
                  <span>Canonical Department:</span>
                  <code className="bg-white px-2.5 py-1 rounded-lg text-slate-800 font-bold border border-slate-200">
                    {deptMatch.name}
                  </code>
                </span>
                <span className="font-bold text-slate-500">
                  {allMembers.length} {allMembers.length === 1 ? 'member' : 'members'} enrolled
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ══════════════════════════════════════════════
          MODAL: REGISTER EMPLOYEE TO DEPARTMENT
          ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddEmpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
                      <FaUserPlus />
                    </span>
                    <span>Register Staff Member</span>
                  </h3>
                  <button
                    onClick={() => setShowAddEmpModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    <FaXmark className="w-5 h-5" />
                  </button>
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={empForm.name}
                      onChange={e => setEmpForm({ ...empForm, name: e.target.value })}
                      className="w-full p-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="john@aotms.in"
                        value={empForm.email}
                        onChange={e => setEmpForm({ ...empForm, email: e.target.value })}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                        Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={empForm.phone}
                        onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                        Department *
                      </label>
                      <select
                        value={empForm.department}
                        onChange={e => setEmpForm({ ...empForm, department: e.target.value })}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 font-bold bg-white"
                      >
                        {CANONICAL_DEPARTMENTS_CONFIG.map(d => (
                          <option key={d.key} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                        Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Developer, Specialist"
                        value={empForm.designation}
                        onChange={e => setEmpForm({ ...empForm, designation: e.target.value })}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Min 6 characters"
                        value={empForm.password}
                        onChange={e => setEmpForm({ ...empForm, password: e.target.value })}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Confirm password"
                        value={empForm.confirmPassword}
                        onChange={e => setEmpForm({ ...empForm, confirmPassword: e.target.value })}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                      Profile Photo URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={empForm.avatar}
                      onChange={e => setEmpForm({ ...empForm, avatar: e.target.value })}
                      className="w-full p-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-orange-500 font-medium"
                    />
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddEmpModal(false)}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all shadow-lg cursor-pointer"
                    >
                      {submitting ? 'Registering...' : 'Register Staff'}
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
