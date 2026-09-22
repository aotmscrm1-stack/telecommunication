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
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.7',
    width: '210mm',
    minHeight: '296.5mm',
    height: '296.5mm',
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: '12mm 18mm 12mm 18mm',
    border: '1.5px solid #000000',
    borderRadius: '0px',
    marginBottom: isPreview ? '28px' : '0px',
    pageBreakAfter: 'always',
    pageBreakInside: 'avoid',
    breakAfter: 'page',
    position: 'relative',
    background: '#ffffff',
    boxShadow: isPreview ? '0 6px 20px rgba(0,0,0,0.08)' : 'none',
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
    <div ref={ref} className="pdf-4page-container" style={{ width: '210mm', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

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
      <div className="offer-letter-page" style={{ ...pageContainerStyle, pageBreakAfter: 'avoid', breakAfter: 'avoid' }}>
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
    <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>

      {/* ── Top Header Toolbar ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ padding: 8, borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', display: 'flex' }}>
              <Briefcase size={24} />
            </span>
            Offer Letter Generator
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Create custom salary offer letters, compensation plans, and download A4 5-page PDF documents.
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ background: '#e2e8f0', padding: 3, borderRadius: 8, display: 'flex', gap: 2 }}>
            <button
              onClick={() => setActiveTab('create')}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: activeTab === 'create' ? '#ffffff' : 'transparent',
                color: activeTab === 'create' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'create' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Form Builder
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: activeTab === 'history' ? '#ffffff' : 'transparent',
                color: activeTab === 'history' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Saved Records ({history.length})
            </button>
          </div>

          {activeTab === 'create' && (
            <>
              <button
                onClick={() => setForm(SAMPLE_OFFER_LETTER)}
                style={{
                  padding: '9px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
                title="Fill sample details from Jayaveer Offer Letter"
              >
                <Sparkles size={15} /> Sample Offer Letter
              </button>

              <button
                onClick={handleSaveInvoice}
                disabled={saving}
                style={{
                  padding: '9px 16px', background: '#0284c7', color: '#ffffff', border: 'none',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Save Record
              </button>

              <button
                onClick={() => handleDownloadPDF(printRef)}
                disabled={downloadingPdf}
                style={{
                  padding: '9px 18px', background: '#059669', color: '#ffffff', border: 'none',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                }}
              >
                {downloadingPdf ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
                Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#047857', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      {/* ── CREATE TAB: BUILDER & LIVE PREVIEW ──────────────────────────────── */}
      {activeTab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: previewMode === 'fullscreen' ? '1fr' : '440px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Left Form Controls */}
          {previewMode !== 'fullscreen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Card 1: Candidate / Recipient Details */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={18} style={{ color: '#0284c7' }} /> Candidate Details
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Candidate Name *</label>
                    <input
                      type="text"
                      value={form.client_name || ''}
                      onChange={e => setForm({ ...form, client_name: e.target.value })}
                      placeholder="e.g. Candidate Name"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Designation</label>
                      <input
                        type="text"
                        value={form.designation || ''}
                        onChange={e => setForm({ ...form, designation: e.target.value })}
                        placeholder="Developer"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Offer Date</label>
                      <input
                        type="text"
                        value={form.offer_date || ''}
                        onChange={e => setForm({ ...form, offer_date: e.target.value })}
                        placeholder="20th July 2026"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Email</label>
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="jayaveer@aotms.com"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Probation Period</label>
                      <input
                        type="text"
                        value={form.probation_period || '01 FEB 2026 To 01 MAY 2026'}
                        onChange={e => setForm({ ...form, probation_period: e.target.value })}
                        placeholder="01 FEB 2026 To 01 MAY 2026"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Standard Work Timings</label>
                      <input
                        type="text"
                        value={form.work_timings || '9:30am to 06:30pm'}
                        onChange={e => setForm({ ...form, work_timings: e.target.value })}
                        placeholder="9:30am to 06:30pm"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Annual CTC & Salary Calculations */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IndianRupee size={18} style={{ color: '#059669' }} /> Annual CTC & Financial Breakdown
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Total Annual CTC (₹) *</label>
                    <input
                      type="number"
                      value={form.annual_ctc || ''}
                      onChange={e => updateAnnualCtc(e.target.value)}
                      placeholder="e.g. 240000"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '2px solid #059669', fontSize: 15, fontWeight: 700, color: '#047857' }}
                    />
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Monthly CTC: ₹{Number(form.monthly_ctc || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Basic Salary (Monthly)</span>
                      <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.basic_salary || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>HRA (Monthly)</span>
                      <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.hra || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Medical Allowance</span>
                      <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.medical_allowance || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Conveyance</span>
                      <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.conveyance || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Food Transport</span>
                      <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.food_transport_allowance || 1350).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Incentive</span>
                      <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.incentive || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Dearness Allowance</span>
                      <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.dearness_allowance || 3450).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Custom Earnings & Deductions */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>Custom Earnings</span>
                  <button onClick={addCustomEarning} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    + Add Earning
                  </button>
                </div>

                {(form.custom_earnings || []).map((earn, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="text"
                      placeholder="Allowance Name"
                      value={earn.name}
                      onChange={e => {
                        const updated = [...form.custom_earnings];
                        updated[idx].name = e.target.value;
                        setForm({ ...form, custom_earnings: updated });
                      }}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
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
                      style={{ width: 90, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                    <button onClick={() => removeCustomEarning(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>Custom Deductions</span>
                  <button onClick={addCustomDeduction} style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    + Add Deduction
                  </button>
                </div>

                {(form.custom_deductions || []).map((ded, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="text"
                      placeholder="Deduction Name"
                      value={ded.name}
                      onChange={e => {
                        const updated = [...form.custom_deductions];
                        updated[idx].name = e.target.value;
                        setForm({ ...form, custom_deductions: updated });
                      }}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
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
                      style={{ width: 90, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                    <button onClick={() => removeCustomDeduction(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Right Live Interactive Preview */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#0f172a', padding: '12px 20px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={18} style={{ color: '#38bdf8' }} /> Live 4-Page A4 Preview
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPreviewMode(previewMode === 'split' ? 'fullscreen' : 'split')}
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                >
                  {previewMode === 'split' ? 'Full Width' : 'Split View'}
                </button>
              </div>
            </div>

            <div style={{ padding: 16, backgroundColor: '#f1f5f9', overflowX: 'auto' }}>
              <OfferLetterDocument ref={printRef} invoiceData={form} isPreview={true} />
            </div>
          </div>

        </div>
      )}

      {/* ── HISTORY TAB: SAVED OFFER LETTERS RECORDS ────────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16 }}>
            <div style={{ position: 'relative', width: 320 }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search candidate name or offer no..."
                style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          {loadingHistory && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading records...</div>}

          {!loadingHistory && history.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <FileText size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>No Saved Offer Letters Found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Generate and save an offer letter document from the Form Builder tab.</div>
            </div>
          )}

          {!loadingHistory && history.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>Offer No.</th>
                  <th style={{ padding: '12px 16px' }}>Candidate Name</th>
                  <th style={{ padding: '12px 16px' }}>Designation</th>
                  <th style={{ padding: '12px 16px' }}>Annual CTC</th>
                  <th style={{ padding: '12px 16px' }}>Offer Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((inv, idx) => (
                  <tr key={inv._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{inv.invoice_number}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{inv.client_name}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{inv.designation}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669' }}>₹{Number(inv.annual_ctc || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{inv.offer_date || new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => { setSelectedInvoice(inv); setShowPreviewModal(true); }}
                          style={{ padding: '6px 12px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Eye size={14} /> View
                        </button>
                        {canDelete(user) && (
                          <button
                            onClick={() => handleDeleteInvoice(inv._id)}
                            style={{ padding: '6px 10px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
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
          )}
        </div>
      )}

      {/* ── PREVIEW MODAL FOR HISTORICAL OFFER LETTERS ──────────────────────── */}
      {showPreviewModal && selectedInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 880, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#0f172a', padding: '16px 24px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                Offer Letter: {selectedInvoice.invoice_number} - {selectedInvoice.client_name}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={() => handleDownloadPDF(modalPrintRef, selectedInvoice.client_name)}
                  disabled={downloadingPdf}
                  style={{ padding: '7px 14px', background: '#059669', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', background: '#f1f5f9' }}>
              <OfferLetterDocument ref={modalPrintRef} invoiceData={selectedInvoice} isPreview={true} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
