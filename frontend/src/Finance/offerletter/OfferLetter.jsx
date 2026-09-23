import React, { useState, useEffect, useRef, forwardRef } from 'react';
import {
  FileText,
  Search,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  User,
  Sparkles,
  RefreshCw,
  X,
  Briefcase,
  Plus,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { invoicesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/permissions';
import { numberToWords } from '../../utils/numberToWords';

import atmLogoImg from '../../assets/atm-logo.jpeg';
import logoImg from '../../assets/aotms-global-logo.png';
import aotmsStampImg from '../../assets/image-removebg-preview.png';

const SAMPLE_OFFER_LETTER = {
  doc_type: 'offer',
  invoice_number: 'AOTMS-OFF-2026-001',
  invoice_date: new Date().toISOString().split('T')[0],
  client_name: 'Candidate Name',
  designation: 'Developer',
  email: 'jayaveer@aotms.com',
  phone: '+91 80199-42233',
  offer_date: '20th July 2026',
  joining_date: '20th July 2026',
  probation_period: '01 FEB 2026 To 01 MAY 2026',
  work_timings: '9:30am to 06:30pm',
  annual_ctc: 240000,
  monthly_ctc: 20000,
  basic_salary: 8000,
  hra: 3200,
  medical_allowance: 1500,
  conveyance: 2500,
  food_transport_allowance: 1350,
  incentive: 0,
  dearness_allowance: 3450,
  special_allowance: 0,
  custom_earnings: [],
  esi_employee: 0,
  pf_employee: 0,
  professional_tax: 200,
  tds: 0,
  custom_deductions: [],
  esi_employer: 0,
  pf_employer: 0,
  notes: 'Sample offer & compensation plan generated for candidate',
};

// ── Offer Letter 5-Page Document Component ──────────────────────────────────
export const OfferLetterDocument = forwardRef(({ invoiceData = {}, isPreview = false }, ref) => {
  const clientName = invoiceData.client_name || 'Candidate Name';
  const shortName = clientName.split(' ')[0];
  const designation = invoiceData.designation || 'Developer';
  const offerDate = invoiceData.offer_date || invoiceData.invoice_date || '20th July 2026';
  const probationPeriod = invoiceData.probation_period || '01 FEB 2026 To 01 MAY 2026';
  const workTimings = invoiceData.work_timings || '9:30am to 06:30pm';

  const annualCtc = Number(invoiceData.annual_ctc) || 240000;
  const monthlyCtc = Number(invoiceData.monthly_ctc) || Math.round(annualCtc / 12);

  const basicMonthly = Number(invoiceData.basic_salary) || Math.round(monthlyCtc * 0.4);
  const basicAnnual = basicMonthly * 12;

  const hraMonthly = Number(invoiceData.hra) || Math.round(basicMonthly * 0.4);
  const hraAnnual = hraMonthly * 12;

  const medicalMonthly = Number(invoiceData.medical_allowance) || 1500;
  const medicalAnnual = medicalMonthly * 12;

  const conveyanceMonthly = Number(invoiceData.conveyance) || 2500;
  const conveyanceAnnual = conveyanceMonthly * 12;

  const foodMonthly = Number(invoiceData.food_transport_allowance) || 1350;
  const foodAnnual = foodMonthly * 12;

  const incentiveMonthly = Number(invoiceData.incentive) || 0;
  const incentiveAnnual = incentiveMonthly * 12;

  const daMonthly = Number(invoiceData.dearness_allowance) || 3450;
  const daAnnual = daMonthly * 12;

  const customEarnings = invoiceData.custom_earnings || [];
  const customDeductions = invoiceData.custom_deductions || [];

  const ptMonthly = Number(invoiceData.professional_tax) || 200;
  const ptAnnual = ptMonthly * 12;

  const tdsMonthly = Number(invoiceData.tds) || 0;
  const esiEmpMonthly = Number(invoiceData.esi_employee) || 0;
  const pfEmpMonthly = Number(invoiceData.pf_employee) || 0;

  let totalDeductionsMonthly = ptMonthly + tdsMonthly + esiEmpMonthly + pfEmpMonthly;
  customDeductions.forEach(d => { totalDeductionsMonthly += (Number(d.monthly) || 0); });
  const totalDeductionsAnnual = totalDeductionsMonthly * 12;

  const netMonthly = monthlyCtc - totalDeductionsMonthly;
  const netAnnual = annualCtc - totalDeductionsAnnual;

  const fmtCurrency = (val) => Number(val || 0).toLocaleString('en-IN');
  const annualWords = numberToWords(annualCtc);

  const pageContainerStyle = {
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: "'Inter', sans-serif",
    fontSize: isPreview ? '13px' : '14px',
    lineHeight: '1.65',
    width: '100%',
    maxWidth: '820px',
    minHeight: isPreview ? 'auto' : '296.5mm',
    boxSizing: 'border-box',
    padding: isPreview ? '22px 26px' : '12mm 18mm',
    border: '1.5px solid #000000',
    borderRadius: '0px',
    marginBottom: isPreview ? '24px' : '0px',
    pageBreakAfter: 'always',
    pageBreakInside: 'avoid',
    breakAfter: 'page',
    position: 'relative',
    background: '#ffffff',
    boxShadow: isPreview ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  };

  const headerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1.5px solid #000000',
    paddingBottom: '12px',
    marginBottom: '16px',
    textAlign: 'center',
  };

  return (
    <div ref={ref} className="pdf-4page-container" style={{ width: '100%', maxWidth: '820px', margin: '0 auto', boxSizing: 'border-box' }}>

      {/* ── PAGE 1 OF 4: OFFER LETTER & GROSS CTC ───────────────────────── */}
      <div className="offer-letter-page" style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Page 1 of 4</div>

        <div style={headerStyle}>
          <img
            src={logoImg}
            alt="AOTMS Global Logo"
            style={{ height: 50, objectFit: 'contain', marginBottom: 6, display: 'block' }}
            onError={(e) => { e.target.src = atmLogoImg; }}
          />
          <div style={{ textAlign: 'center', fontSize: 13, color: '#111827' }}>
            <span>Phone: +91 80199-42233</span>
            <span style={{ margin: '0 10px', color: '#9ca3af' }}>|</span>
            <span>Email: <a href="mailto:hr@aotms.com" style={{ color: '#2563eb', textDecoration: 'none' }}>hr@aotms.com</a></span>
          </div>
        </div>

        {/* Title: OFFER LETTER */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, textDecoration: 'underline', color: '#000000', letterSpacing: '0.8px' }}>
            OFFER LETTER
          </span>
        </div>

        <div style={{ marginBottom: 14, marginTop: 4 }}>
          <div style={{ fontSize: 14.5, color: '#111' }}>To,</div>
          <div style={{ fontSize: 16, color: '#000', fontWeight: 600 }}>{clientName}</div>
        </div>

        <div style={{ marginBottom: 16, textAlign: 'justify', lineHeight: 1.74, fontSize: 14.8 }}>
          <div style={{ marginBottom: 8, fontSize: 15.5, fontWeight: 600 }}>Dear {shortName},</div>
          <p style={{ margin: '0 0 12px 0' }}>
            We are pleased to offer you the position of "{designation}" from {offerDate} on the following terms and conditions. Subject to the terms and conditions hereinafter provided, AOTMS Global Private Limited hereby hires you for the purpose of rendering Professional Services to the company. Your salary will commence as of the first day you begin actual work at the Company, which will be considered the first day of employment with the Company.
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            This offer of employment is made based upon your representations of proficiency and technical skills and your ability to handle an assignment/ job independently.
          </p>
          <p style={{ margin: '0 0 16px 0' }}>
            Your gross compensation (C2C) shall be Rs {fmtCurrency(annualCtc)} ({annualWords}) per Annum. Annual Gross Compensation includes employer's contribution to Provident Fund and any other benefits, as applicable. All compensation will be paid to you after deduction of tax at source, in accordance with applicable law. You will be solely liable for your personal tax liabilities, as per applicable law, both in India and abroad.
          </p>
        </div>

        {/* COMPENSATION PLAN Table */}
        <div style={{ border: '1px solid #000000', marginTop: 4 }}>
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14.5, textTransform: 'uppercase', padding: '7px', borderBottom: '1px solid #000000', background: '#f3f4f6' }}>
            COMPENSATION PLAN
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '8px 14px', width: '40%', borderRight: '1px solid #000000' }}>Name</td>
                <td colSpan={2} style={{ padding: '8px 14px', fontWeight: 600 }}>{clientName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '8px 14px', borderRight: '1px solid #000000' }}>Designation</td>
                <td colSpan={2} style={{ padding: '8px 14px', fontWeight: 600 }}>{designation}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000', background: '#e5e7eb', fontWeight: 600 }}>
                <td style={{ padding: '8px 14px', borderRight: '1px solid #000000' }}>Components Category</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', borderRight: '1px solid #000000', width: '30%' }}>Monthly</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', width: '30%' }}>Annual</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '8px 14px', borderRight: '1px solid #000000', fontWeight: 600 }}>Total Gross CTC</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', borderRight: '1px solid #000000', fontWeight: 600 }}>{fmtCurrency(monthlyCtc)}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(annualCtc)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '8px 14px', borderRight: '1px solid #000000' }}>Basic Salary</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(basicMonthly)}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right' }}>{fmtCurrency(basicAnnual)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Anchored Page Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
          <span>AOTMS Global Private Limited — Confidential</span>
          <span>Page 1 of 4</span>
        </div>
      </div>

      {/* ── PAGE 2 OF 4: ALLOWANCES & DEDUCTIONS BREAKDOWN ─────────────── */}
      <div className="offer-letter-page" style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Page 2 of 4</div>

        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 17.5, textDecoration: 'underline', marginBottom: 18, marginTop: 4, letterSpacing: '0.5px' }}>
          COMPENSATION BREAKDOWN & ALLOWANCES
        </div>

        <div style={{ border: '1px solid #000000', marginBottom: 18 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5 }}>
            <thead>
              <tr style={{ background: '#e5e7eb', borderBottom: '1px solid #000000', fontWeight: 600 }}>
                <th style={{ padding: '9px 14px', textAlign: 'left', width: '40%', borderRight: '1px solid #000000' }}>Allowance / Earning Component</th>
                <th style={{ padding: '9px 14px', textAlign: 'right', borderRight: '1px solid #000000', width: '30%' }}>Monthly (₹)</th>
                <th style={{ padding: '9px 14px', textAlign: 'right', width: '30%' }}>Annual (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '9px 14px', borderRight: '1px solid #000000' }}>House Rent Allowance (HRA)</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(hraMonthly)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right' }}>{fmtCurrency(hraAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '9px 14px', borderRight: '1px solid #000000' }}>Medical Allowance</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(medicalMonthly)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right' }}>{fmtCurrency(medicalAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '9px 14px', borderRight: '1px solid #000000' }}>Conveyance Allowance</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(conveyanceMonthly)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right' }}>{fmtCurrency(conveyanceAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '9px 14px', borderRight: '1px solid #000000' }}>Food & Transport Allowance</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(foodMonthly)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right' }}>{fmtCurrency(foodAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '9px 14px', borderRight: '1px solid #000000' }}>Performance Incentive</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(incentiveMonthly)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right' }}>{fmtCurrency(incentiveAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '9px 14px', borderRight: '1px solid #000000' }}>Dearness Allowance (DA)</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(daMonthly)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right' }}>{fmtCurrency(daAnnual)}</td>
              </tr>

              {/* Custom Earnings */}
              {customEarnings.map((earn, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                  <td style={{ padding: '9px 14px', borderRight: '1px solid #000000' }}>{earn.name}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(earn.monthly)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right' }}>{fmtCurrency(earn.annual || (earn.monthly * 12))}</td>
                </tr>
              ))}

              {/* Gross Earnings */}
              <tr style={{ background: '#f3f4f6', fontWeight: 700 }}>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #000000' }}>Total Gross Earnings</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(monthlyCtc)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>{fmtCurrency(annualCtc)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions Breakdown */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 8, textDecoration: 'underline' }}>Deductions Breakdown</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5, border: '1px solid #000000' }}>
            <thead>
              <tr style={{ background: '#e5e7eb', borderBottom: '1px solid #000000', fontWeight: 600 }}>
                <th style={{ padding: '8.5px 14px', textAlign: 'left', width: '40%', borderRight: '1px solid #000000' }}>Deduction Component</th>
                <th style={{ padding: '8.5px 14px', textAlign: 'right', borderRight: '1px solid #000000', width: '30%' }}>Monthly (₹)</th>
                <th style={{ padding: '8.5px 14px', textAlign: 'right', width: '30%' }}>Annual (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '9px 14px', borderRight: '1px solid #000000' }}>Professional Tax (PT)</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(ptMonthly)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right' }}>{fmtCurrency(ptAnnual)}</td>
              </tr>
              {customDeductions.map((ded, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                  <td style={{ padding: '9px 14px', borderRight: '1px solid #000000' }}>{ded.name}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(ded.monthly)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right' }}>{fmtCurrency(ded.annual || (ded.monthly * 12))}</td>
                </tr>
              ))}
              <tr style={{ background: '#fee2e2', fontWeight: 700 }}>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #000000' }}>Total Deductions</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(totalDeductionsMonthly)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>{fmtCurrency(totalDeductionsAnnual)}</td>
              </tr>
              <tr style={{ background: '#ecfdf5', fontWeight: 700, color: '#065f46' }}>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #000000' }}>Net Take-Home Salary (In Hand)</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(netMonthly)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>{fmtCurrency(netAnnual)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Compensation Guidelines & Payroll Terms */}
        <div style={{ border: '1px solid #000000', padding: '14px 16px', background: '#f9fafb', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, textDecoration: 'underline', marginBottom: 8 }}>
            NOTES ON COMPENSATION & SALARY DISBURSEMENT
          </div>
          <div style={{ fontSize: 13.8, lineHeight: 1.72, color: '#1f2937' }}>
            <p style={{ margin: '0 0 7px 0', textAlign: 'justify' }}>
              <strong>1. Salary Disbursal Cycle:</strong> The monthly payroll cycle runs from the 1st day of each calendar month to the last working day. Salary shall be directly credited to your designated corporate bank account within the first week of every succeeding month.
            </p>
            <p style={{ margin: '0 0 7px 0', textAlign: 'justify' }}>
              <strong>2. Statutory Withholding & Tax Deductions:</strong> All compensation and perquisites are subject to applicable deductions towards Professional Tax (PT), Provident Fund (PF), and Income Tax (TDS) as per statutory laws of the Government of India.
            </p>
            <p style={{ margin: '0 0 7px 0', textAlign: 'justify' }}>
              <strong>3. Annual Performance Appraisals:</strong> Increments and performance incentives are subject to management evaluation, key performance indicators (KPIs), company profitability, and individual deliverables at the end of the annual review cycle.
            </p>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              <strong>4. Confidentiality of Compensation:</strong> Remuneration package details are strictly confidential between you and AOTMS Global Private Limited. Any unauthorized disclosure to peers or third parties constitutes a violation of employment policy.
            </p>
          </div>
        </div>

        {/* Anchored Page Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
          <span>AOTMS Global Private Limited — Confidential</span>
          <span>Page 2 of 4</span>
        </div>
      </div>

      {/* ── PAGE 3 OF 4: TERMS & CONDITIONS (PART 1) ───────────────────── */}
      <div className="offer-letter-page" style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Page 3 of 4</div>

        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 19, textDecoration: 'underline', marginBottom: 26, marginTop: 4, letterSpacing: '0.5px' }}>
          TERMS & CONDITIONS OF EMPLOYMENT
        </div>

        <div style={{ lineHeight: 1.85, fontSize: 15.8, color: '#1f2937' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 16.8, fontWeight: 700, marginBottom: 6 }}>1. Probation & Confirmation</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              Your probation period will be from {probationPeriod}. During this probation period, your performance, technical proficiency, attendance, and professional conduct will be continuously evaluated by management. Upon successful completion of probation, your employment with the company will be confirmed in writing. Management reserves the right to extend the probation period if deemed necessary.
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 16.8, fontWeight: 700, marginBottom: 6 }}>2. Work Timings & Hours</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              Your standard work timings will be {workTimings}, Monday through Saturday. You may be required to work additional hours or shifts depending on operational, client delivery, or project milestones.
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 16.8, fontWeight: 700, marginBottom: 6 }}>3. Leave Policy & Public Holidays</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              You will be entitled to paid leave and public holidays in accordance with the Company HR Leave Policy. Unauthorized absence exceeding 3 consecutive working days without prior approval will be considered abandonment of employment and subject to disciplinary action.
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 16.8, fontWeight: 700, marginBottom: 6 }}>4. Confidentiality & Non-Disclosure (NDA)</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              You shall maintain strict confidentiality regarding all company proprietary software, source codes, database schemas, client contracts, trade secrets, financial records, and operational strategies. You shall not disclose, duplicate, or transfer any company data or intellectual property to any third party during or after your employment.
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 16.8, fontWeight: 700, marginBottom: 6 }}>5. Professional Conduct & Conflict of Interest</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              During your employment with AOTMS Global Private Limited, you shall devote your full business time, attention, and effort to company duties. You shall not engage in any secondary employment, freelancing, consulting, or business activities that conflict with the company's business interests.
            </p>
          </div>
        </div>

        {/* Anchored Page Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
          <span>AOTMS Global Private Limited — Confidential</span>
          <span>Page 3 of 4</span>
        </div>
      </div>

      {/* ── PAGE 4 OF 4: TERMS (PART 2), CHECKLIST & DECLARATION ────────── */}
      <div className="offer-letter-page" style={{ ...pageContainerStyle, pageBreakAfter: 'avoid', breakAfter: 'avoid', marginBottom: '0px' }}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Page 4 of 4</div>

        <div style={{ lineHeight: 1.72, fontSize: 14, color: '#1f2937', marginTop: 4 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>6. Termination & Notice Period</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              Post confirmation, either party may terminate employment by providing 30 days written notice or gross salary in lieu thereof. During probation, the notice period required by either party shall be 15 days. In case of gross misconduct, breach of confidentiality, fraud, or violation of company policies, the Company reserves the right to terminate employment immediately without notice or compensation.
            </p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>7. Return of Company Property</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              Upon termination of employment for any reason, you shall immediately surrender to the company all assigned laptops, access cards, documents, software credentials, customer databases, and physical/digital assets in your possession.
            </p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>8. Governing Law & Jurisdiction</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              This offer letter and employment contract shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts situated at Vijayawada, Andhra Pradesh.
            </p>
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 15, textDecoration: 'underline', marginTop: 12, marginBottom: 8 }}>
          JOINING FORMALITIES & DOCUMENT CHECKLIST
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: 13.5 }}>
          Please submit self-attested copies of the following documents on or before your joining date ({offerDate}):
        </p>
        <ul style={{ margin: '0 0 14px 20px', padding: 0, fontSize: 13, lineHeight: 1.75 }}>
          <li>Educational Certificates (SSC/10th, Intermediate/12th, Graduation Degree & Marksheets)</li>
          <li>Previous Employer Relieving Letter & Service Certificate (if applicable)</li>
          <li>Last 3 Months Salary Slips / Bank Statement (if applicable)</li>
          <li>Aadhaar Card, PAN Card, and Passport (if available)</li>
          <li>4 Recent Passport-size Photographs</li>
          <li>Cancelled Cheque or Bank Passbook copy for salary account setup</li>
        </ul>

        <div style={{ border: '1px solid #000000', padding: '14px 16px', background: '#f9fafb', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, textDecoration: 'underline', marginBottom: 6 }}>
            ACCEPTANCE OF OFFER & DECLARATION
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: 13, lineHeight: 1.6, textAlign: 'justify' }}>
            I, {clientName}, hereby accept the offer of employment as "{designation}" with AOTMS Global Private Limited on the terms and conditions outlined in this offer letter (Pages 1 to 4). I confirm that I will join duty on {offerDate} and agree to abide by all the rules, regulations, policies, and procedures of the company as amended from time to time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 12, paddingTop: 10, borderTop: '1px solid #000000' }}>
            <div>
              <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 20 }}>Candidate Signature: ______________________</div>
              <div style={{ fontSize: 13.5, color: '#000', fontWeight: 600 }}>Name: {clientName}</div>
              <div style={{ fontSize: 12.5, color: '#4b5563', marginTop: 3 }}>Date: ________________________</div>
              <div style={{ fontSize: 12.5, color: '#4b5563', marginTop: 3 }}>Place: ________________________</div>
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 13, color: '#000000', fontWeight: 600 }}>For AOTMS GLOBAL PRIVATE LIMITED</div>

              {/* Official AOTMS Stamp reflected Upper of Deenaz Shaik Name */}
              <div style={{ position: 'relative', margin: '4px 0 2px', width: 92, height: 92 }}>
                <img
                  src={aotmsStampImg}
                  alt="AOTMS Stamp"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '52%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-7deg)',
                    fontFamily: "'Brush Script MT', cursive",
                    fontSize: 22,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  Deenaz Shaik
                </div>
              </div>

              <div style={{ fontSize: 13.5, color: '#1e293b', fontWeight: 600 }}>Deenaz Shaik</div>
              <div style={{ fontSize: 12.5, color: '#475569' }}>HR Manager</div>
            </div>
          </div>
        </div>

        {/* Anchored Page Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
          <span>AOTMS Global Private Limited — Confidential</span>
          <span>Page 4 of 4</span>
        </div>
      </div>

    </div>
  );
});

// ── Offer Letter Generator Main Component ───────────────────────────────────
export default function OfferLetter() {
  const { user } = useAuth();
  const [form, setForm] = useState(SAMPLE_OFFER_LETTER);
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'
  const [previewMode, setPreviewMode] = useState('split'); // 'split' | 'fullscreen'
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const printRef = useRef(null);
  const modalPrintRef = useRef(null);

  // ── Auto Calculate Financial Components ─────────────────────────────────────
  const updateAnnualCtc = (ctcValue) => {
    const annual = Number(ctcValue) || 0;
    const monthly = Math.round(annual / 12);

    const basicM = Math.round(monthly * 0.40);
    const hraM = Math.round(basicM * 0.40);
    const medM = 1500;
    const convM = 2500;
    const foodM = 1350;
    const incM = 0;
    const daM = 3450;

    const fixedSum = basicM + hraM + medM + convM + foodM + incM + daM;
    const specM = monthly > fixedSum ? monthly - fixedSum : 0;

    setForm(prev => ({
      ...prev,
      annual_ctc: annual,
      monthly_ctc: monthly,
      basic_salary: basicM,
      hra: hraM,
      medical_allowance: medM,
      conveyance: convM,
      food_transport_allowance: foodM,
      incentive: incM,
      dearness_allowance: daM,
      special_allowance: specM,
      net_earnings_annual: annual - ((prev.professional_tax || 200) * 12 + (prev.tds || 0) * 12),
      net_earnings_monthly: monthly - ((prev.professional_tax || 200) + (prev.tds || 0)),
      net_earnings_in_words: numberToWords(annual),
    }));
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await invoicesAPI.getAll({ search });
      const allInvoices = res.data.invoices || [];
      // Filter strictly for Offer Letters
      const offerOnly = allInvoices.filter(inv => inv.doc_type === 'offer');
      setHistory(offerOnly);
    } catch (err) {
      console.error('Failed to load offer letters history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, search]);

  // Dynamic Custom Earnings & Deductions Handlers
  const addCustomEarning = () => {
    setForm(prev => ({
      ...prev,
      custom_earnings: [...(prev.custom_earnings || []), { name: 'Performance Bonus', monthly: 1000, annual: 12000 }]
    }));
  };

  const removeCustomEarning = (idx) => {
    setForm(prev => ({
      ...prev,
      custom_earnings: (prev.custom_earnings || []).filter((_, i) => i !== idx)
    }));
  };

  const addCustomDeduction = () => {
    setForm(prev => ({
      ...prev,
      custom_deductions: [...(prev.custom_deductions || []), { name: 'Loan Recovery', monthly: 500, annual: 6000 }]
    }));
  };

  const removeCustomDeduction = (idx) => {
    setForm(prev => ({
      ...prev,
      custom_deductions: (prev.custom_deductions || []).filter((_, i) => i !== idx)
    }));
  };

  // ── Bulletproof PDF Download Handler (Exact 5 Pages, Zero Blank Pages) ───────
  const handleDownloadPDF = async (targetRef = printRef, clientName = form.client_name) => {
    if (!targetRef.current) return;
    setDownloadingPdf(true);

    try {
      const element = targetRef.current;
      const cleanName = (clientName || 'Candidate').replace(/[^a-zA-Z0-9]+/g, '_');
      const filename = `AOTMS_Offer_Letter_${cleanName}.pdf`;

      const offerPages = element.querySelectorAll('.offer-letter-page');

      if (offerPages && offerPages.length > 0) {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });

        // Temporarily remove preview card shadows during capture
        const originalShadows = [];
        offerPages.forEach((p, idx) => {
          originalShadows[idx] = p.style.boxShadow;
          p.style.boxShadow = 'none';
        });

        try {
          for (let i = 0; i < offerPages.length; i++) {
            const pageEl = offerPages[i];
            const canvas = await html2canvas(pageEl, {
              scale: 2,
              useCORS: true,
              logging: false,
              scrollY: 0,
              scrollX: 0,
              backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            if (i > 0) {
              pdf.addPage('a4', 'portrait');
            }
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
          }

          pdf.save(filename);
        } finally {
          // Restore shadows
          offerPages.forEach((p, idx) => {
            p.style.boxShadow = originalShadows[idx];
          });
        }
      }

      setSuccessMessage(`PDF downloaded successfully: ${filename}`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('PDF Generation error:', err);
      setErrorMessage('Failed to generate PDF document');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Save Record Handler
  const handleSaveInvoice = async () => {
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await invoicesAPI.create({ ...form, doc_type: 'offer' });
      setSuccessMessage('Offer Letter saved successfully to records!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save offer letter');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Delete Record Handler
  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this offer letter record?')) return;
    try {
      await invoicesAPI.delete(id);
      loadHistory();
    } catch (err) {
      alert('Failed to delete offer letter record');
    }
  };

  return (
    <div className="space-y-6 pb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top Header & Tab Navigation ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span style={{ padding: 8, borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', display: 'flex' }}>
              <Briefcase size={24} />
            </span>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Offer Letter Generator
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create custom salary offer letters, compensation plans, and download A4 4-page PDF documents.
          </p>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Form Builder
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved Records ({history.length})
            </button>
          </div>

          {activeTab === 'create' && (
            <button
              type="button"
              onClick={() => setForm(SAMPLE_OFFER_LETTER)}
              className="px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 transition-all"
              title="Fill sample details from Jayaveer Offer Letter"
            >
              <Sparkles size={15} /> Sample Offer Letter
            </button>
          )}
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Tab 1: CREATE / EDIT OFFER LETTER ──────────────────────────────── */}
      {activeTab === 'create' && (
        <div className={`grid gap-6 ${previewMode === 'split' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
          {/* Left Form Controls (6 cols in split) */}
          <div className={previewMode === 'split' ? 'lg:col-span-6 space-y-5' : 'space-y-5'}>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveInvoice(); }} className="space-y-5">
              
              {/* Card 1: Candidate / Recipient Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <User size={18} className="text-blue-600" /> Candidate Details
                  </h2>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Candidate Name *</label>
                    <input
                      type="text"
                      value={form.client_name || ''}
                      onChange={e => setForm({ ...form, client_name: e.target.value })}
                      placeholder="e.g. Candidate Name"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Designation</label>
                      <input
                        type="text"
                        value={form.designation || ''}
                        onChange={e => setForm({ ...form, designation: e.target.value })}
                        placeholder="Developer"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Offer Date</label>
                      <input
                        type="text"
                        value={form.offer_date || ''}
                        onChange={e => setForm({ ...form, offer_date: e.target.value })}
                        placeholder="20th July 2026"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="jayaveer@aotms.com"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Probation Period</label>
                      <input
                        type="text"
                        value={form.probation_period || '01 FEB 2026 To 01 MAY 2026'}
                        onChange={e => setForm({ ...form, probation_period: e.target.value })}
                        placeholder="01 FEB 2026 To 01 MAY 2026"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Standard Work Timings</label>
                      <input
                        type="text"
                        value={form.work_timings || '9:30am to 06:30pm'}
                        onChange={e => setForm({ ...form, work_timings: e.target.value })}
                        placeholder="9:30am to 06:30pm"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Annual CTC & Salary Calculations */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <IndianRupee size={18} className="text-emerald-600" /> Annual CTC &amp; Financial Breakdown
                  </h2>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Total Annual CTC (₹) *</label>
                    <input
                      type="number"
                      value={form.annual_ctc || ''}
                      onChange={e => updateAnnualCtc(e.target.value)}
                      placeholder="e.g. 240000"
                      className="w-full px-3 py-2.5 text-base border-2 border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                      required
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      Monthly CTC: ₹{Number(form.monthly_ctc || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Basic Salary</span>
                      <strong className="text-xs text-slate-800">₹{Number(form.basic_salary || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">HRA</span>
                      <strong className="text-xs text-slate-800">₹{Number(form.hra || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Medical</span>
                      <strong className="text-xs text-slate-800">₹{Number(form.medical_allowance || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Conveyance</span>
                      <strong className="text-xs text-slate-800">₹{Number(form.conveyance || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Food Transport</span>
                      <strong className="text-xs text-slate-800">₹{Number(form.food_transport_allowance || 1350).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Incentive</span>
                      <strong className="text-xs text-slate-800">₹{Number(form.incentive || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Dearness (DA)</span>
                      <strong className="text-xs text-slate-800">₹{Number(form.dearness_allowance || 3450).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Prof. Tax (PT)</span>
                      <strong className="text-xs text-rose-700">₹{Number(form.professional_tax || 200).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Custom Earnings & Deductions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" /> Custom Allowances &amp; Deductions
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-emerald-700">Custom Earnings</span>
                      <button
                        type="button"
                        onClick={addCustomEarning}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Plus size={13} /> Add Earning
                      </button>
                    </div>

                    {(form.custom_earnings || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No custom earnings added</p>
                    ) : (
                      <div className="space-y-2">
                        {(form.custom_earnings || []).map((earn, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder="Allowance Name"
                              value={earn.name}
                              onChange={e => {
                                const updated = [...form.custom_earnings];
                                updated[idx].name = e.target.value;
                                setForm({ ...form, custom_earnings: updated });
                              }}
                              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              placeholder="Monthly ₹"
                              value={earn.monthly}
                              onChange={e => {
                                const updated = [...form.custom_earnings];
                                const m = Number(e.target.value) || 0;
                                updated[idx].monthly = m;
                                updated[idx].annual = m * 12;
                                setForm({ ...form, custom_earnings: updated });
                              }}
                              className="w-24 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeCustomEarning(idx)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-rose-700">Custom Deductions</span>
                      <button
                        type="button"
                        onClick={addCustomDeduction}
                        className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Plus size={13} /> Add Deduction
                      </button>
                    </div>

                    {(form.custom_deductions || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No custom deductions added</p>
                    ) : (
                      <div className="space-y-2">
                        {(form.custom_deductions || []).map((ded, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder="Deduction Name"
                              value={ded.name}
                              onChange={e => {
                                const updated = [...form.custom_deductions];
                                updated[idx].name = e.target.value;
                                setForm({ ...form, custom_deductions: updated });
                              }}
                              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              placeholder="Monthly ₹"
                              value={ded.monthly}
                              onChange={e => {
                                const updated = [...form.custom_deductions];
                                const m = Number(e.target.value) || 0;
                                updated[idx].monthly = m;
                                updated[idx].annual = m * 12;
                                setForm({ ...form, custom_deductions: updated });
                              }}
                              className="w-24 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeCustomDeduction(idx)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Save Offer Letter Record
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPDF(printRef)}
                  disabled={downloadingPdf}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {downloadingPdf ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                  Download 4-Page PDF
                </button>
              </div>
            </form>
          </div>

          {/* Right Preview Pane (6 cols in split) */}
          <div className="lg:col-span-6">
            <div className="sticky top-6 space-y-3">
              <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Offer Letter Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(previewMode === 'split' ? 'fullscreen' : 'split')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                  >
                    {previewMode === 'split' ? 'Full Width' : 'Split View'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(printRef)}
                    disabled={downloadingPdf}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm"
                  >
                    <Download size={12} /> PDF
                  </button>
                </div>
              </div>

              {/* Printable Live Offer Letter Preview Container without excess grey side spacing */}
              <div className="p-2 sm:p-4 bg-slate-100/70 border border-slate-200 rounded-2xl shadow-inner">
                <OfferLetterDocument ref={printRef} invoiceData={form} isPreview={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: SAVED OFFER LETTERS RECORDS ────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search candidate name or offer no..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadHistory}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-2 transition-all self-start sm:self-auto"
            >
              <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} /> Refresh Records
            </button>
          </div>

          {loadingHistory && (
            <div className="text-center py-12 text-slate-400 flex items-center justify-center gap-2 text-sm">
              <RefreshCw className="animate-spin" size={18} /> Loading records...
            </div>
          )}

          {!loadingHistory && history.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <FileText size={48} className="mx-auto text-slate-300 mb-3" />
              <div className="text-base font-semibold text-slate-700">No Saved Offer Letters Found</div>
              <div className="text-xs text-slate-400 mt-1">Generate and save an offer letter document from the Form Builder tab.</div>
            </div>
          )}

          {!loadingHistory && history.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Offer No.</th>
                    <th className="px-4 py-3">Candidate Name</th>
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-4 py-3">Annual CTC</th>
                    <th className="px-4 py-3">Offer Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((inv, idx) => (
                    <tr key={inv._id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">{inv.client_name}</td>
                      <td className="px-4 py-3.5 text-slate-600">{inv.designation}</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600">₹{Number(inv.annual_ctc || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{inv.offer_date || new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setSelectedInvoice(inv); setShowPreviewModal(true); }}
                            className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
                          >
                            <Eye size={13} /> View
                          </button>
                          {canDelete(user) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(inv._id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-all"
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW MODAL FOR HISTORICAL OFFER LETTERS ──────────────────────── */}
      {showPreviewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">
                  Offer Letter: <span className="text-blue-700">{selectedInvoice.invoice_number}</span> — {selectedInvoice.client_name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(modalPrintRef, selectedInvoice.client_name)}
                  disabled={downloadingPdf}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download size={13} /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/70">
              <OfferLetterDocument ref={modalPrintRef} invoiceData={selectedInvoice} isPreview={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
