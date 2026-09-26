import React, { useState, useEffect, useRef } from 'react';
import { 
  BookUser, 
  Plus, 
  Search, 
  RotateCw, 
  Trash2, 
  Phone, 
  Mail, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  FileSpreadsheet, 
  Send,
  User,
  Check,
  Activity,
  Filter,
  Tag,
  Shield,
  Download,
  ChevronLeft,
  ChevronRight,
  Pencil
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { IoLogoWhatsapp as WhatsApp } from 'react-icons/io5';

import ConfirmModal from '../../components/ui/ConfirmModal';


export default function Contacts({ onOpenBlast }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdentity, setSelectedIdentity] = useState('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadExcelModal, setShowUploadExcelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // In-App Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    confirmText: 'OK, Delete',
    cancelText: 'Cancel',
    onConfirm: null
  });

  // Form State (All Required Fields)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    identity: 'SAP FICO'
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    identity: 'SAP FICO',
    segment: 'New'
  });

  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleOpenEditModal = (contact) => {
    setEditingContact(contact);
    setEditFormData({
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      identity: (contact.identity && contact.identity !== 'General') ? contact.identity : 'SAP FICO',
      segment: contact.segment || 'New'
    });
    setPhoneError('');
    setEmailError('');
    setShowEditModal(true);
  };

  const handleUpdateContactSubmit = async (e) => {
    e.preventDefault();
    if (!editingContact) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('aotms_token');
      const res = await fetch(`${getApiBase()}/api/contacts/${editingContact._id || editingContact.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          phone: editFormData.phone.trim(),
          email: editFormData.email.trim(),
          identity: editFormData.identity.trim(),
          segment: editFormData.segment
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToastMsg(`Contact '${editFormData.name}' updated successfully!`, "success");
        setShowEditModal(false);
        setEditingContact(null);
        await fetchContacts();
      } else {
        throw new Error(result.message || "Failed to update contact.");
      }
    } catch (err) {
      showToastMsg(err.message || "Error updating contact.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Excel Upload State
  const [excelPreviewData, setExcelPreviewData] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [importingExcel, setImportingExcel] = useState(false);

  const fileInputRef = useRef(null);

  const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
    }
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:5000';
    }
    return 'https://crm-1-62pl.onrender.com';
  };

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchContacts = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('aotms_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${getApiBase()}/api/contacts`, { headers });
      const data = await res.json();
      if (res.ok && data && data.success && Array.isArray(data.contacts)) {
        const mapped = data.contacts.map((c, index) => ({
          ...c,
          id: String(c._id || c.id || c.phone || `contact_${index}`)
        }));
        setContacts(mapped);
      } else {
        setContacts([]);
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // ---------------------------------------------------------------------------
  // STRICT 10-DIGIT MOBILE & EMAIL VALIDATION
  // ---------------------------------------------------------------------------
  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    // Strip all non-digit characters
    let digits = raw.replace(/\D/g, '');
    
    // If starting with country code 91 and > 10 digits, strip leading 91
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.slice(2);
    }

    // STRICT MAX 10 DIGITS — Reject any 11th digit from even being entered or displayed!
    const clean10 = digits.slice(0, 10);

    setFormData(prev => ({ ...prev, phone: clean10 }));

    if (!clean10) {
      setPhoneError('Mobile number is required (10 digits).');
    } else if (clean10.length !== 10) {
      setPhoneError(`Exactly 10 digits required (${clean10.length}/10 entered).`);
    } else if (!['6', '7', '8', '9'].includes(clean10[0])) {
      setPhoneError('Indian mobile numbers must start with 6, 7, 8, or 9.');
    } else {
      setPhoneError('');
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, email: val }));

    if (!val || !val.trim()) {
      setEmailError('Email address is required.');
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(val.trim())) {
        setEmailError('Enter a valid email address (e.g., name@domain.com).');
      } else {
        setEmailError('');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // EXCEL / CSV TEMPLATE DOWNLOAD & PARSER
  // ---------------------------------------------------------------------------
  const handleDownloadTemplate = () => {
    const csvContent = "First name,Phone,Email,Identity\n" +
      "Dr. Srinivas Rao,9876543210,srinivas.rao@hospital.org,VIP Client\n" +
      "Kavita Menon,9812345678,kavita.m@techcorp.in,Vendor\n" +
      "Sneha Agarwal,9988776655,sneha.a@gmail.com,Lead";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'contacts_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg("Downloaded contact sheet template (First name, Phone, Email, Identity)!", "success");
  };

  const handleExcelFileUploaded = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result;
      if (buffer) {
        parseExcelOrCSVBuffer(buffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseExcelOrCSVBuffer = (buffer, fileName = '') => {
    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        showToastMsg("No worksheet found in the uploaded file.", "error");
        return;
      }
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rawRows || rawRows.length === 0) {
        showToastMsg("The uploaded file is empty or has no data.", "error");
        return;
      }

      // Find the header row (first row containing recognized column names or text)
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(10, rawRows.length); i++) {
        const rowStr = rawRows[i].map(c => String(c)).join(' ').toLowerCase();
        if (rowStr.includes('name') || rowStr.includes('party') || rowStr.includes('phone') || rowStr.includes('mobile') || rowStr.includes('ledger') || rowStr.includes('contact')) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = rawRows[headerRowIdx].map(h => String(h).trim());
      const headerLower = headers.map(h => h.toLowerCase());

      // Flexibly detect column indices for Name, Phone, Email, Identity
      let nameIdx = headerLower.findIndex(h => h.includes('name') || h.includes('party') || h.includes('ledger') || h.includes('customer') || h.includes('client') || h.includes('contact'));
      let phoneIdx = headerLower.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact no') || h.includes('whatsapp') || h.includes('cell') || h.includes('num') || h.includes('number'));
      let emailIdx = headerLower.findIndex(h => h.includes('email') || h.includes('mail'));
      let identityIdx = headerLower.findIndex(h => h.includes('identity') || h.includes('group') || h.includes('category') || h.includes('type') || h.includes('role') || h.includes('status'));

      // Smart Fallbacks if headers were not explicitly matched by string search
      if (nameIdx === -1) nameIdx = 0;
      if (phoneIdx === -1) phoneIdx = headers.length > 1 ? 1 : 0;
      if (emailIdx === -1) emailIdx = headers.length > 2 ? 2 : -1;
      if (identityIdx === -1) identityIdx = headers.length > 3 ? 3 : -1;

      const parsed = [];
      for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const rawName = String(row[nameIdx] !== undefined ? row[nameIdx] : '').trim();
        const rawPhone = String(row[phoneIdx] !== undefined ? row[phoneIdx] : '').trim();
        const rawEmail = emailIdx !== -1 && row[emailIdx] !== undefined ? String(row[emailIdx]).trim() : '';
        const rawIdentity = identityIdx !== -1 && row[identityIdx] !== undefined ? String(row[identityIdx]).trim() : 'Client';

        if (!rawName && !rawPhone) continue; // Skip completely blank rows

        let digits = rawPhone.replace(/\D/g, '');
        if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2);
        const clean10 = digits.slice(0, 10);
        const formattedPhone = clean10 ? `+91 ${clean10}` : rawPhone;

        parsed.push({
          name: rawName || `Contact ${i}`,
          phone: formattedPhone,
          email: rawEmail || '',
          identity: rawIdentity || 'Client'
        });
      }

      if (parsed.length === 0) {
        showToastMsg("No valid contact rows could be parsed from the file.", "error");
        return;
      }

      setExcelPreviewData(parsed);
      showToastMsg(`Parsed ${parsed.length} contacts successfully from ${fileName || 'file'}!`, "success");
    } catch (err) {
      console.error('Excel parse error:', err);
      showToastMsg("Failed to parse file. Please upload a valid .xlsx, .xls, or .csv file.", "error");
    }
  };

  const handleBulkImportSubmit = async () => {
    if (excelPreviewData.length === 0) {
      showToastMsg("No valid contacts found in the preview data.", "error");
      return;
    }

    setImportingExcel(true);
    try {
      const token = localStorage.getItem('aotms_token');
      const res = await fetch(`${getApiBase()}/api/contacts/save`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ contacts: excelPreviewData, source: 'excel' })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToastMsg(result.message || `Imported contacts successfully!`, "success");
        setShowUploadExcelModal(false);
        setExcelPreviewData([]);
        setExcelFileName('');
        await fetchContacts();
      } else {
        throw new Error(result.detail || "Failed to import contacts from Excel.");
      }
    } catch (err) {
      showToastMsg(err.message || "Error importing contacts.", "error");
    } finally {
      setImportingExcel(false);
    }
  };

  // ---------------------------------------------------------------------------
  // CREATE CONTACT SUBMIT
  // ---------------------------------------------------------------------------
  const handleSubmitContact = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone || !formData.email.trim() || !formData.identity.trim()) {
      showToastMsg("All fields marked with * are required.", "error");
      return;
    }

    if (phoneError || emailError) {
      showToastMsg("Please fix validation errors before saving.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('aotms_token');
      const res = await fetch(`${getApiBase()}/api/contacts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone,
          email: formData.email.trim(),
          identity: formData.identity.trim(),
          source: 'manual'
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToastMsg(result.message || `Contact '${formData.name}' created in MongoDB!`, "success");
        setShowAddModal(false);
        setFormData({ name: '', phone: '', email: '', identity: 'Client' });
        await fetchContacts();
      } else {
        throw new Error(result.message || "Failed to create contact.");
      }
    } catch (err) {
      showToastMsg(err.message || "Error creating contact in database.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = (contactId, contactName) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Contact",
      message: `Are you sure you want to delete contact '${contactName}'?`,
      type: "danger",
      confirmText: "OK, Delete",
      cancelText: "Cancel",
      onConfirm: () => executeDeleteContact(contactId, contactName)
    });
  };

  const executeDeleteContact = async (contactId, contactName) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    try {
      const token = localStorage.getItem('aotms_token');
      const res = await fetch(`${getApiBase()}/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToastMsg(`Contact '${contactName}' deleted successfully.`, "success");
        await fetchContacts();
      }
    } catch (err) {
      showToastMsg(err.message || "Error deleting contact.", "error");
    }
  };

  // Extract unique identities dynamically with strict case-insensitive deduplication
  const availableIdentities = (() => {
    const defaultList = ['ALL', 'SAP FICO', 'Client', 'VIP', 'Lead', 'Vendor'];
    const seenLower = new Set(defaultList.map(item => item.toLowerCase().replace(/_/g, ' ')));
    const dynamicList = [];

    contacts.forEach(c => {
      const tag = (c.identity || '').trim();
      const norm = tag.toLowerCase().replace(/_/g, ' ');
      if (tag && tag !== 'General' && !seenLower.has(norm)) {
        seenLower.add(norm);
        dynamicList.push(tag);
      }
    });

    return [...defaultList, ...dynamicList];
  })();

  // Filter contacts by Search Query & Identity
  const filteredContacts = contacts.filter(c => {
    const contactIdentity = (c.identity && c.identity !== 'General') ? c.identity : 'SAP FICO';
    const matchesIdentity = selectedIdentity === 'ALL' || contactIdentity.toLowerCase() === selectedIdentity.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (c.name || '').toLowerCase().includes(query) ||
      (c.phone || '').toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query) ||
      contactIdentity.toLowerCase().includes(query);

    return matchesIdentity && matchesSearch;
  });

  // Pagination State: 12 contacts per page (4-column grid)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedIdentity]);

  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE) || 1;
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4 w-full animate-in fade-in duration-150">
      
      {/* Toast Alert Banner */}
      {toast && (
        <div className={`p-3 rounded-xl border text-xs font-normal flex items-center justify-between shadow-2xs transition-all animate-in fade-in ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
            <BookUser className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-800 tracking-tight">
                WhatsApp Meta Account Contacts
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-sky-50 text-sky-700 border border-sky-200 font-mono">
                {filteredContacts.length} Contacts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Manage audience contacts with custom Identities, strict 10-digit mobile validation, and Excel bulk upload.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Download Template Button */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-normal text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            title="Download sample CSV format (First name, Phone, Email, Identity)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Template</span>
          </button>

          {/* Upload Excel Sheet Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowUploadExcelModal(true)}
            className="px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-normal text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Upload Excel</span>
          </button>

          {/* Normal Form Fill Add Contact */}
          <button
            type="button"
            onClick={() => {
              setFormData({ name: '', phone: '', email: '', identity: 'Client' });
              setPhoneError('');
              setEmailError('');
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Search & Identity Filter Toolbar */}
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, email, identity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-7 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 font-normal placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Identity Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-normal text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
            <Tag className="w-3 h-3 text-slate-400" /> Identity:
          </span>
          {availableIdentities.map((identity) => (
            <button
              key={identity}
              onClick={() => setSelectedIdentity(identity)}
              className={`px-2.5 py-1 rounded-lg text-xs font-normal transition-colors cursor-pointer shrink-0 ${
                selectedIdentity === identity
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {identity === 'ALL' ? 'All Identities' : identity}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchContacts}
          disabled={refreshing}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 font-normal text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 shrink-0"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* CONTACTS CARDS GRID */}
      {loading ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
          <RotateCw className="w-5 h-5 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-normal">Loading Meta contacts from database...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <BookUser className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No Meta Contacts found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-normal">
            {searchQuery || selectedIdentity !== 'ALL'
              ? 'Try clearing your search or identity filter.'
              : 'Add your first contact via form fill or upload an Excel sheet.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setShowUploadExcelModal(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-normal text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Excel</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-normal text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {paginatedContacts.map((contact) => {
              const cleanPhone = (contact.phone || '').replace(/[^0-9]/g, '');
              const initials = contact.name ? contact.name.charAt(0).toUpperCase() : 'C';

              return (
                <div
                  key={contact._id || contact.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-sky-300 transition-all duration-150 flex flex-col justify-between space-y-3 group relative overflow-hidden"
                >
                  <div className="space-y-2.5">
                    
                    {/* Initials Avatar, Identity Tag */}
                    <div className="flex items-start justify-between">
                      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 p-[1.5px] shadow-2xs group-hover:scale-105 transition-transform">
                        <div className="w-full h-full rounded-[10px] bg-white flex items-center justify-center text-sm font-semibold text-slate-800">
                          {initials}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500" />
                      </div>

                      <span className="px-2 py-0.5 rounded-md font-normal text-[10px] font-mono border bg-sky-50 text-sky-700 border-sky-200">
                        🏷️ {(contact.identity && contact.identity !== 'General') ? contact.identity : 'SAP FICO'}
                      </span>
                    </div>

                    {/* Contact Name */}
                    <div>
                      <h3 className="text-sm font-medium text-slate-800 group-hover:text-sky-600 transition-colors truncate">
                        {contact.name}
                      </h3>
                    </div>

                    {/* Phone & Email Details */}
                    <div className="space-y-1 text-xs pt-0.5">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-normal font-mono">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>+91 {contact.phone}</span>
                      </div>

                      {contact.email && (
                        <div className="flex items-center gap-1.5 text-slate-500 font-normal truncate font-mono">
                          <Mail className="w-3 h-3 text-sky-600 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Read Rate / Segment Badge */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-normal uppercase font-mono">Segment</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-normal font-mono flex items-center gap-1 uppercase">
                      <Activity className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{contact.segment || 'New'}</span>
                    </span>
                  </div>

                  {/* Action Buttons: Edit, Direct Chat, Call, Delete */}
                  <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(contact)}
                      className="py-1 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-normal text-xs flex items-center justify-center gap-1 border border-sky-200 transition-colors cursor-pointer flex-1"
                      title="Edit Contact details"
                    >
                      <Pencil className="w-3 h-3 text-sky-600" />
                      <span>Edit</span>
                    </button>

                    {/* Direct Chat */}
                    <a
                      href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                      title="Chat on WhatsApp"
                    >
                      <WhatsApp className="w-3 h-3 text-emerald-600" />
                    </a>

                    {/* Phone Call */}
                    <a
                      href={`tel:${contact.phone}`}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                      title="Direct Call"
                    >
                      <Phone className="w-3 h-3" />
                    </a>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteContact(contact._id || contact.id, contact.name)}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Pagination Footer Controls */}
          {filteredContacts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs gap-3">
              <div className="text-xs font-normal text-slate-500">
                Showing <span className="text-slate-800 font-medium">{paginatedContacts.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="text-slate-800 font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)}</span> of <span className="text-slate-800 font-medium">{filteredContacts.length}</span> contacts
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-normal text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="px-2.5 py-1 text-xs font-normal text-slate-700 bg-slate-100 rounded-md font-mono">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-normal text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD CONTACT FORM */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 space-y-4 my-auto text-slate-900">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <BookUser className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Add New Contact Profile
                  </h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    All fields marked with <span className="text-rose-500">*</span> are required.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitContact} id="contact-form" className="space-y-3.5 text-xs">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-normal text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-normal text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
                  />
                </div>
              </div>

              {/* WhatsApp Mobile Number */}
              <div>
                <label className="block text-xs font-normal text-slate-700 mb-1">
                  WhatsApp Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-slate-500 font-mono font-normal pointer-events-none text-xs">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+91</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="9876543210 (10 digits)"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={`w-full pl-14 pr-3.5 py-2 rounded-lg bg-white border text-slate-900 font-mono font-normal text-xs placeholder-slate-400 focus:outline-none transition-all ${
                      phoneError ? 'border-rose-500 focus:ring-1 focus:ring-rose-500/20' : 'border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20'
                    }`}
                  />
                </div>
                {phoneError ? (
                  <p className="text-[11px] text-rose-600 font-normal mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{phoneError}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 font-normal mt-1 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Formatted as +91 {formData.phone || 'XXXXXXXXXX'}</span>
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-normal text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="ramesh@company.com"
                    value={formData.email}
                    onChange={handleEmailChange}
                    className={`w-full pl-9 pr-3.5 py-2 rounded-lg bg-white border text-slate-900 font-mono font-normal text-xs placeholder-slate-400 focus:outline-none transition-all ${
                      emailError ? 'border-rose-500 focus:ring-1 focus:ring-rose-500/20' : 'border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20'
                    }`}
                  />
                </div>
                {emailError && <p className="text-[11px] text-rose-600 font-normal mt-1">{emailError}</p>}
              </div>

              {/* Identity Field */}
              <div>
                <label className="block text-xs font-normal text-slate-700 mb-1">
                  Identity (Category Tag) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP, Client, Lead, Vendor..."
                    value={formData.identity}
                    onChange={(e) => setFormData({ ...formData, identity: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-normal text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
                  />
                </div>

                {/* Identity Quick Click Suggestions */}
                <div className="flex items-center gap-1 flex-wrap pt-1.5">
                  <span className="text-[10px] text-slate-400 font-normal uppercase">Quick:</span>
                  {['Client', 'SAP FICO', 'VIP', 'Lead', 'Vendor', 'Doctor', 'Partner'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormData({ ...formData, identity: tag })}
                      className={`px-2 py-0.5 rounded text-[10px] font-normal border transition-colors cursor-pointer ${
                        formData.identity === tag
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

            </form>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-600 font-normal text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="contact-form"
                disabled={submitting || !!phoneError || !!emailError}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{submitting ? 'Saving...' : 'Save Contact'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT CONTACT FORM PROFILE */}
      {/* ========================================================================= */}
      {showEditModal && editingContact && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 space-y-4 my-auto text-slate-900">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Edit Contact Profile
                  </h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Update profile for <span className="font-medium text-slate-800">{editingContact.name}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setShowEditModal(false); setEditingContact(null); }}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleUpdateContactSubmit} className="space-y-3.5 text-xs">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-normal text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-normal text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* 10-Digit Mobile */}
              <div>
                <label className="block text-xs font-normal text-slate-700 mb-1">
                  10-Digit Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-normal text-slate-400">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editFormData.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditFormData({ ...editFormData, phone: digits });
                    }}
                    className="w-full pl-11 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-normal font-mono text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-normal text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-normal text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Identity */}
              <div>
                <label className="block text-xs font-normal text-slate-700 mb-1">Contact Identity</label>
                <input
                  type="text"
                  value={editFormData.identity}
                  onChange={(e) => setEditFormData({ ...editFormData, identity: e.target.value })}
                  placeholder="e.g. SAP FICO, VIP Client, Vendor"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-normal text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Segment */}
              <div>
                <label className="block text-xs font-normal text-slate-700 mb-1">Segment</label>
                <select
                  value={editFormData.segment}
                  onChange={(e) => setEditFormData({ ...editFormData, segment: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-normal text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500"
                >
                  <option value="New">New</option>
                  <option value="Active">Active</option>
                  <option value="Engaged">Engaged</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingContact(null); }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-normal text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPLOAD EXCEL SHEET */}
      {/* ========================================================================= */}
      {showUploadExcelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden my-auto p-5 sm:p-6 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Upload Excel Contact Sheet</h3>
                  <p className="text-[11px] text-slate-500 font-normal">Import multiple WhatsApp contacts from CSV / Excel file.</p>
                </div>
              </div>
              <button onClick={() => setShowUploadExcelModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Download Template Notice Banner */}
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div>
                <div className="font-medium text-emerald-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Column Format</span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-0.5 font-normal">
                  Columns: <span className="font-mono text-emerald-900">First name, Phone, Email, Identity</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-900 font-normal text-xs flex items-center gap-1 border border-emerald-300 shadow-2xs cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Template</span>
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.xlsx,.xls"
                onChange={handleExcelFileUploaded}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 text-center space-y-2 cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-emerald-600 mx-auto" />
                <div>
                  <span className="text-xs font-medium text-slate-700">
                    {excelFileName ? excelFileName : 'Click to select CSV or Excel contact sheet file'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-normal">Columns: Name, Phone, Email, Identity</p>
                </div>
              </div>

              {excelPreviewData.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Preview ({excelPreviewData.length} Contacts Found)</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-normal text-[11px] sticky top-0">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Phone</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Identity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-xs">
                        {excelPreviewData.slice(0, 10).map((row, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-sans font-normal text-slate-800">{row.name}</td>
                            <td className="p-2 text-emerald-700 font-normal">{row.phone}</td>
                            <td className="p-2 font-normal text-slate-600">{row.email}</td>
                            <td className="p-2 font-normal text-slate-600">{row.identity || 'Client'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowUploadExcelModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-normal text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImportSubmit}
                disabled={importingExcel || excelPreviewData.length === 0}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {importingExcel ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{importingExcel ? 'Importing...' : 'Confirm Bulk Import'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* In-App Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
