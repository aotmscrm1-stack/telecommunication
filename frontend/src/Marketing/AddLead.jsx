import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Check, User, Briefcase, Calendar, Users as UsersIcon, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsAPI, campaignsAPI, usersAPI, coursesAPI, leadStagesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ─────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────── */
const FALLBACK_STATUSES = [
    'Fresh', 'Connected', 'Not Answered', 'Call Back', 'Call Not Responding', 'Call Back Later',
    'Not interested', 'Demo Scheduled', 'Demo Done', 'Won', 'Lost', 'Blocked'
];
const SOURCES = ['Manual', 'Facebook', 'WhatsApp', 'Website', 'Excel', 'Instagram', 'Referral', 'Other'];

const COURSE_LIST = [
    'Full Stack', 'Java Full Stack', 'Python Full Stack', 'MEAN Stack', 'MERN Stack',
    'Data Analytics', 'Data Science', 'Data Engineering', 'AI & Machine Learning', 'Quantum Computing',
    'DevOps', 'Multi-Cloud Consultant',
    'Cyber Security', 'QA Automation',
    'Embedded Systems', 'UI/UX Design',
];

/* ─────────────────────────────────────────────────────────
   WHITE, BLUE & ORANGE THEME
   ───────────────────────────────────────────────────────── */
const T = {
    // Primary Blue Palette
    blue: '#2563eb',
    blueDark: '#1d4ed8',
    blueLight: '#eff6ff',
    blueBorder: '#bfdbfe',
    blueGradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',

    // Accent Orange Palette
    orange: '#f97316',
    orangeDark: '#ea580c',
    orangeLight: '#fff7ed',
    orangeBorder: '#ffedd5',
    orangeGradient: 'linear-gradient(135deg, #fb923c, #ea580c)',

    // Neutral White & Slate Palette
    white: '#ffffff',
    bg: '#f8fafc',
    bgCard: '#ffffff',
    bgSoft: '#f1f5f9',

    line: '#e2e8f0',
    lineSoft: '#f1f5f9',

    ink: '#0f172a',
    inkSoft: '#334155',
    muted: '#64748b',
    error: '#ef4444',
};

/* ─────────────────────────────────────────────────────────
   STEPS
   ───────────────────────────────────────────────────────── */
const STEPS = [
    { id: 1, label: 'Basic Info', icon: User, desc: 'Name, contact & location' },
    { id: 2, label: 'Lead Details', icon: Briefcase, desc: 'Source, course & budget' },
    { id: 3, label: 'Scheduling', icon: Calendar, desc: 'Follow-ups & demos (optional)' },
    { id: 4, label: 'Campaign & Review', icon: UsersIcon, desc: 'Campaign & summary' },
];

/* ─────────────────────────────────────────────────────────
   FIELD WRAPPER
   ───────────────────────────────────────────────────────── */
const Field = ({ label, children, required, optional, hint, error }) => (
    <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: T.inkSoft }}>
            {label}
            {required && <span className="ml-0.5" style={{ color: T.orange }}>*</span>}
            {optional && (
                <span className="ml-1.5 text-[9.5px] font-semibold normal-case tracking-normal"
                    style={{ color: T.muted }}>
                    (optional)
                </span>
            )}
        </label>
        {children}
        {error ? (
            <p className="text-[10.5px] mt-1 flex items-center gap-1 font-semibold" style={{ color: T.error }}>
                <AlertCircle className="w-3 h-3" /> {error}
            </p>
        ) : hint ? (
            <p className="text-[10.5px] mt-1" style={{ color: T.muted }}>{hint}</p>
        ) : null}
    </div>
);

const inputCls = 'w-full bg-white rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const inputStyle = (hasError) => ({
    border: `1px solid ${hasError ? T.error : T.line}`,
    color: T.ink,
});

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────── */
export default function AddLead() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState({});

    const [campaigns, setCampaigns] = useState([]);
    const [users, setUsers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [statuses, setStatuses] = useState(FALLBACK_STATUSES);

    const [form, setForm] = useState({
        name: '', phone: '', alternatePhone: '', email: '',
        status: 'Fresh', leadSource: 'Manual', leadSourceNote: '',
        courseInterest: '', mode: '',
        budget: '', location: '', lastQualification: '',
        nextFollowupDate: '', demoScheduledDate: '', demoDoneDate: '',
        assignedTo: '', campaign: '',
    });

    useEffect(() => {
        coursesAPI.getAll().then(cr => setCourses(cr.data.courses || [])).catch(console.error);
        campaignsAPI.getAll().then(c => setCampaigns(c.data.campaigns || [])).catch(() => { });
        leadStagesAPI.get().then(res => {
            const active = (res.data.config?.statuses || [])
                .filter(s => !s.archived).sort((a, b) => a.order - b.order).map(s => s.name);
            if (active.length) setStatuses(active);
        }).catch(() => { });
        if (user?.role === 'manager' || user?.role === 'admin') {
            usersAPI.getAll().then(u => setUsers(u.data.users || [])).catch(() => { });
        }
        if (isEdit) {
            setLoading(true);
            leadsAPI.getOne(id).then(res => {
                const l = res.data.lead;
                setForm({
                    name: l.name || '', phone: l.phone || '', alternatePhone: l.alternatePhone || '',
                    email: l.email || '', status: l.status || 'Fresh', leadSource: l.leadSource || 'Manual',
                    leadSourceNote: l.leadSourceNote || '',
                    budget: l.budget || '',
                    courseInterest: l.courseInterest?._id || l.courseInterest || '',
                    mode: l.mode || '', location: l.location || '', lastQualification: l.lastQualification || '',
                    nextFollowupDate: l.nextFollowupDate?.slice(0, 16) || '',
                    demoScheduledDate: l.demoScheduledDate?.slice(0, 16) || '',
                    demoDoneDate: l.demoDoneDate?.slice(0, 16) || '',
                    assignedTo: l.assignedTo?._id || '', campaign: l.campaign?._id || '',
                });
            }).finally(() => setLoading(false));
        }
    }, [id]);

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }));
        if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
    };

    const courseOptions = courses.length > 0
        ? courses.map(c => ({ value: c._id, label: c.name, cost: c.cost }))
        : COURSE_LIST.map(name => ({ value: name, label: name, cost: 0 }));

    /* ── VALIDATION ── */
    const validateStep = (s) => {
        const e = {};
        if (s === 1) {
            if (!form.name.trim()) e.name = 'Full name is required';
            if (!form.phone.trim()) e.phone = 'Phone number is required';
            if (!form.email.trim()) e.email = 'Email is required';
            if (!form.location.trim()) e.location = 'Location is required';
        }
        if (s === 2) {
            if (!form.status) e.status = 'Status is required';
            if (!form.leadSource) e.leadSource = 'Lead source is required';
            if (form.leadSource === 'Other' && !form.leadSourceNote.trim())
                e.leadSourceNote = 'Source note is required';
            if (!form.courseInterest) e.courseInterest = 'Interested course is required';
            if (!form.mode) e.mode = 'Study mode is required';
            if (!form.budget) e.budget = 'Budget is required';
            if (!form.lastQualification.trim()) e.lastQualification = 'Last qualification is required';
        }
        /* Step 3: Scheduling — all OPTIONAL */
        /* Step 4: Campaign & Review — all OPTIONAL */
        return e;
    };

    const nextStep = () => {
        const e = validateStep(step);
        if (Object.keys(e).length) { setErrors(e); return; }
        if (step < 4) setStep(step + 1);
    };
    const prevStep = () => step > 1 && setStep(step - 1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        let allErrors = {};
        [1, 2, 3, 4].forEach(s => { allErrors = { ...allErrors, ...validateStep(s) }; });
        if (Object.keys(allErrors).length) {
            setErrors(allErrors);
            const firstStep = [1, 2, 3, 4].find(s => Object.keys(validateStep(s)).length);
            if (firstStep) setStep(firstStep);
            return;
        }
        setSaving(true);
        try {
            const data = { ...form, budget: form.budget ? +form.budget : 0 };
            if (isEdit) await leadsAPI.update(id, data);
            else await leadsAPI.create(data);
            navigate('/leads');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save lead');
        } finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-48">
            <div className="w-8 h-8 rounded-full border-4 animate-spin"
                style={{ borderColor: T.line, borderTopColor: T.blue }} />
        </div>
    );

    const progress = (step / 4) * 100;
    const stepHasErrors = (s) => Object.keys(validateStep(s)).length > 0;

    return (
        <div className="min-h-screen py-8 px-4" style={{ background: T.bg }}>
            <div className="max-w-3xl mx-auto">

                {/* HEADER */}
                <div className="flex items-center gap-3 mb-6">
                    <motion.button
                        whileHover={{ x: -2, backgroundColor: T.blueLight }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/leads')}
                        className="w-9 h-9 rounded-xl bg-white flex items-center justify-center transition-all shadow-sm"
                        style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}
                    >
                        <ArrowLeft className="w-4 h-4 text-blue-600" />
                    </motion.button>
                    <div>
                        <h2 className="text-lg font-bold" style={{ color: T.ink }}>
                            {isEdit ? 'Edit Lead' : 'Add New Lead'}
                        </h2>
                        <p className="text-xs font-medium" style={{ color: T.muted }}>
                            Step {step} of 4 · <span style={{ color: T.blue }}>{STEPS[step - 1].desc}</span>
                        </p>
                    </div>
                </div>

                {/* STEPPER */}
                <div className="rounded-2xl p-5 mb-5 bg-white"
                    style={{ border: `1px solid ${T.line}`, boxShadow: '0 4px 20px rgba(37,99,235,0.06)' }}>
                    <div className="relative">
                        <div className="absolute top-5 left-[12%] right-[12%] h-[3px] rounded-full"
                            style={{ background: T.lineSoft }} />
                        <motion.div
                            className="absolute top-5 left-[12%] h-[3px] rounded-full"
                            style={{
                                background: `linear-gradient(90deg, ${T.blue}, ${T.orange})`,
                                boxShadow: `0 0 10px ${T.blue}60`,
                            }}
                            initial={false}
                            animate={{ width: `${(progress / 100) * 76}%` }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        />
                        <div className="relative flex justify-between">
                            {STEPS.map((s) => {
                                const StepIcon = s.icon;
                                const done = step > s.id;
                                const active = step === s.id;
                                const hasErr = done && stepHasErrors(s.id);
                                return (
                                    <motion.button
                                        key={s.id}
                                        type="button"
                                        onClick={() => step > s.id && setStep(s.id)}
                                        whileHover={step > s.id ? { scale: 1.06 } : {}}
                                        whileTap={step > s.id ? { scale: 0.94 } : {}}
                                        className="flex flex-col items-center"
                                        style={{ cursor: step > s.id ? 'pointer' : 'default', width: '22%' }}
                                    >
                                        <motion.div
                                            className="w-11 h-11 rounded-full flex items-center justify-center relative z-10"
                                            animate={{
                                                scale: active ? 1.08 : 1,
                                                boxShadow: active
                                                    ? `0 8px 22px ${T.orange}50, 0 0 0 4px ${T.orange}20`
                                                    : done
                                                        ? `0 4px 14px ${T.blue}40`
                                                        : '0 2px 6px rgba(0,0,0,.04)',
                                            }}
                                            transition={{ duration: 0.3 }}
                                            style={{
                                                background: done
                                                    ? (hasErr ? `linear-gradient(135deg, ${T.error}, #dc2626)` : T.blueGradient)
                                                    : active
                                                        ? T.orangeGradient
                                                        : T.white,
                                                border: `2px solid ${done || active ? 'transparent' : T.line}`,
                                                color: done || active ? T.white : T.muted,
                                            }}
                                        >
                                            {done ? <Check className="w-5 h-5" strokeWidth={3} /> : <StepIcon className="w-5 h-5" />}
                                            {active && (
                                                <motion.span
                                                    className="absolute inset-0 rounded-full pointer-events-none"
                                                    animate={{ scale: [1, 1.35, 1.35], opacity: [0.5, 0, 0] }}
                                                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                                                    style={{ border: `2px solid ${T.orange}` }}
                                                />
                                            )}
                                        </motion.div>
                                        <span className="text-[10.5px] font-bold mt-2 tracking-wide text-center"
                                            style={{ color: active ? T.orange : done ? T.blueDark : T.muted }}>
                                            {s.label}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit}>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm"
                        style={{ border: `1px solid ${T.line}` }}>
                        <AnimatePresence mode="wait">

                            {/* STEP 1 */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={{ duration: 0.22 }}
                                    className="p-6 space-y-5"
                                >
                                    <div className="flex items-center gap-3 pb-4" style={{ borderBottom: `1px solid ${T.line}` }}>
                                        <div className="w-9 h-9 rounded-xl grid place-items-center text-white shadow-sm"
                                            style={{ background: T.blueGradient }}>
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold" style={{ color: T.ink }}>Basic Information</h3>
                                            <p className="text-[11.5px]" style={{ color: T.muted }}>Personal & contact details</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Full Name" required error={errors.name}>
                                            <input className={inputCls} style={inputStyle(errors.name)}
                                                value={form.name} onChange={e => set('name', e.target.value)}
                                                placeholder="Enter full name" />
                                        </Field>
                                        <Field label="Email" required error={errors.email}>
                                            <input type="email" className={inputCls} style={inputStyle(errors.email)}
                                                value={form.email} onChange={e => set('email', e.target.value)}
                                                placeholder="abc@xyz.com" />
                                        </Field>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Phone" required error={errors.phone}>
                                            <div className="flex items-stretch rounded-xl overflow-hidden"
                                                style={{ border: `1px solid ${errors.phone ? T.error : T.line}` }}>
                                                <span className="inline-flex items-center px-3 text-sm font-bold"
                                                    style={{ background: T.blueLight, color: T.blueDark, borderRight: `1px solid ${T.line}` }}>
                                                    🇮🇳 +91
                                                </span>
                                                <input className="flex-1 bg-white px-3 py-2.5 text-sm outline-none min-w-0"
                                                    style={{ color: T.ink }}
                                                    value={form.phone}
                                                    onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                    placeholder="98765 43210" inputMode="numeric" />
                                            </div>
                                        </Field>
                                        <Field label="Alternate Phone" hint="Optional">
                                            <div className="flex items-stretch rounded-xl overflow-hidden"
                                                style={{ border: `1px solid ${T.line}` }}>
                                                <span className="inline-flex items-center px-3 text-sm font-bold"
                                                    style={{ background: T.blueLight, color: T.blueDark, borderRight: `1px solid ${T.line}` }}>
                                                    🇮🇳 +91
                                                </span>
                                                <input className="flex-1 bg-white px-3 py-2.5 text-sm outline-none min-w-0"
                                                    style={{ color: T.ink }}
                                                    value={form.alternatePhone}
                                                    onChange={e => set('alternatePhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                    placeholder="98765 43210" inputMode="numeric" />
                                            </div>
                                        </Field>
                                    </div>

                                    <Field label="Location" required error={errors.location}>
                                        <input className={inputCls} style={inputStyle(errors.location)}
                                            value={form.location} onChange={e => set('location', e.target.value)}
                                            placeholder="City, State" />
                                    </Field>
                                </motion.div>
                            )}

                            {/* STEP 2 */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={{ duration: 0.22 }}
                                    className="p-6 space-y-5"
                                >
                                    <div className="flex items-center gap-3 pb-4" style={{ borderBottom: `1px solid ${T.line}` }}>
                                        <div className="w-9 h-9 rounded-xl grid place-items-center text-white shadow-sm"
                                            style={{ background: T.orangeGradient }}>
                                            <Briefcase className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold" style={{ color: T.ink }}>Lead Details</h3>
                                            <p className="text-[11.5px]" style={{ color: T.muted }}>Source, course interest & budget</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Lead Source" required error={errors.leadSource}>
                                            <select className={inputCls} style={inputStyle(errors.leadSource)}
                                                value={form.leadSource}
                                                onChange={e => {
                                                    const v = e.target.value;
                                                    set('leadSource', v);
                                                    if (v !== 'Other') set('leadSourceNote', '');
                                                }}>
                                                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Status" required error={errors.status}>
                                            <select className={inputCls} style={inputStyle(errors.status)}
                                                value={form.status}
                                                onChange={e => set('status', e.target.value)}>
                                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </Field>
                                    </div>

                                    {form.leadSource === 'Other' && (
                                        <Field label="Lead Source Note" required error={errors.leadSourceNote}>
                                            <textarea className={`${inputCls} resize-none`} style={inputStyle(errors.leadSourceNote)}
                                                rows={2} value={form.leadSourceNote}
                                                onChange={e => set('leadSourceNote', e.target.value)}
                                                placeholder="Describe where this lead came from..." />
                                        </Field>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Interested Course" required error={errors.courseInterest}>
                                            <select
                                                className={inputCls}
                                                style={inputStyle(errors.courseInterest)}
                                                value={form.courseInterest}
                                                onChange={e => {
                                                    const selected = courseOptions.find(o => o.value === e.target.value);
                                                    set('courseInterest', e.target.value);
                                                    if (selected?.cost && !form.budget) set('budget', String(selected.cost));
                                                }}
                                            >
                                                <option value="">Select course</option>
                                                {courseOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>

                                        <Field label="Study Mode" required error={errors.mode}>
                                            <select className={inputCls} style={inputStyle(errors.mode)}
                                                value={form.mode}
                                                onChange={e => set('mode', e.target.value)}>
                                                <option value="">Select Mode</option>
                                                <option value="Online">Online</option>
                                                <option value="Offline">Offline</option>
                                                <option value="Hybrid">Hybrid</option>
                                            </select>
                                        </Field>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Budget" required error={errors.budget}>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold"
                                                    style={{ color: T.orange }}>₹</span>
                                                <input type="number" className={`${inputCls} pl-7`} style={inputStyle(errors.budget)}
                                                    value={form.budget} onChange={e => set('budget', e.target.value)}
                                                    placeholder="20,000" />
                                            </div>
                                        </Field>
                                        <Field label="Last Qualification" required error={errors.lastQualification}>
                                            <input className={inputCls} style={inputStyle(errors.lastQualification)}
                                                value={form.lastQualification}
                                                onChange={e => set('lastQualification', e.target.value)}
                                                placeholder="Qualification details..." />
                                        </Field>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3 */}
                            {step === 3 && (
                                <motion.div key="step3"
                                    initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}
                                    className="p-6 space-y-5">
                                    <div className="flex items-center gap-3 pb-4" style={{ borderBottom: `1px solid ${T.line}` }}>
                                        <div className="w-9 h-9 rounded-xl grid place-items-center text-white shadow-sm"
                                            style={{ background: T.blueGradient }}>
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: T.ink }}>
                                                Scheduling
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                                                    style={{ background: T.orangeLight, color: T.orangeDark, border: `1px solid ${T.orangeBorder}` }}>
                                                    Optional
                                                </span>
                                            </h3>
                                            <p className="text-[11.5px]" style={{ color: T.muted }}>
                                                Follow-up and demo dates — you can add these later
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Field label="Next Follow-up" optional>
                                            <input type="datetime-local" className={inputCls} style={inputStyle(false)}
                                                value={form.nextFollowupDate} onChange={e => set('nextFollowupDate', e.target.value)} />
                                        </Field>
                                        <Field label="Demo Scheduled" optional>
                                            <input type="datetime-local" className={inputCls} style={inputStyle(false)}
                                                value={form.demoScheduledDate} onChange={e => set('demoScheduledDate', e.target.value)} />
                                        </Field>
                                        <Field label="Demo Done" optional>
                                            <input type="datetime-local" className={inputCls} style={inputStyle(false)}
                                                value={form.demoDoneDate} onChange={e => set('demoDoneDate', e.target.value)} />
                                        </Field>
                                    </div>

                                    <div className="rounded-xl p-3.5 flex items-start gap-3"
                                        style={{ background: T.orangeLight, border: `1px solid ${T.orangeBorder}` }}>
                                        <span className="text-lg">💡</span>
                                        <p className="text-[11.5px] leading-relaxed font-semibold" style={{ color: T.orangeDark }}>
                                            These fields are optional. You can add or edit follow-up and demo dates any time from the lead detail page.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 4 — Campaign (Optional) & Summary */}
                            {step === 4 && (
                                <motion.div key="step4"
                                    initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}
                                    className="p-6 space-y-5">
                                    <div className="flex items-center gap-3 pb-4" style={{ borderBottom: `1px solid ${T.line}` }}>
                                        <div className="w-9 h-9 rounded-xl grid place-items-center text-white shadow-sm"
                                            style={{ background: T.orangeGradient }}>
                                            <UsersIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold" style={{ color: T.ink }}>Campaign & Review</h3>
                                            <p className="text-[11.5px]" style={{ color: T.muted }}>Optional campaign and lead summary</p>
                                        </div>
                                    </div>

                                    <div>
                                        {/* Campaign — optional */}
                                        <Field label="Campaign" optional hint="Leave empty if no campaign">
                                            <select className={inputCls} style={inputStyle(false)}
                                                value={form.campaign} onChange={e => set('campaign', e.target.value)}>
                                                <option value="">No Campaign</option>
                                                {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                            </select>
                                        </Field>
                                    </div>

                                    <div className="rounded-2xl p-4"
                                        style={{ background: T.blueLight, border: `1px solid ${T.blueBorder}` }}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <span className="text-[12.5px] font-bold" style={{ color: T.blueDark }}>Ready to save</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-2 text-[11.5px]">
                                            <div style={{ color: T.muted }}>Name</div>
                                            <div className="font-bold truncate" style={{ color: T.ink }}>{form.name || '—'}</div>
                                            <div style={{ color: T.muted }}>Phone</div>
                                            <div className="font-bold" style={{ color: T.ink }}>{form.phone ? `+91 ${form.phone}` : '—'}</div>
                                            <div style={{ color: T.muted }}>Email</div>
                                            <div className="font-bold truncate" style={{ color: T.ink }}>{form.email || '—'}</div>
                                            <div style={{ color: T.muted }}>Source</div>
                                            <div className="font-bold" style={{ color: T.ink }}>{form.leadSource}</div>
                                            <div style={{ color: T.muted }}>Status</div>
                                            <div className="font-bold" style={{ color: T.orangeDark }}>{form.status}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* NAVIGATION */}
                    <div className="flex items-center gap-3 mt-5">
                        {step > 1 && (
                            <motion.button type="button" onClick={prevStep}
                                whileHover={{ y: -2, backgroundColor: T.blueLight }} whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                                style={{ background: T.white, color: T.inkSoft, border: `1px solid ${T.line}` }}>
                                <ChevronLeft className="w-4 h-4 text-blue-600" /> Back
                            </motion.button>
                        )}
                        <div className="flex-1" />
                        {step < 4 ? (
                            <motion.button type="button" onClick={nextStep}
                                whileHover={{ y: -2, boxShadow: `0 12px 24px rgba(37,99,235,0.3)` }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm"
                                style={{ background: T.blueGradient }}>
                                Continue <ChevronRight className="w-4 h-4" />
                            </motion.button>
                        ) : (
                            <motion.button type="submit" disabled={saving}
                                whileHover={!saving ? { y: -2, boxShadow: `0 12px 24px rgba(249,115,22,0.4)` } : {}}
                                whileTap={!saving ? { scale: 0.97 } : {}}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-70 shadow-sm"
                                style={{ background: T.orangeGradient }}>
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEdit ? 'Update Lead' : 'Save Lead'}
                            </motion.button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}