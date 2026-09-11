import React, { forwardRef } from 'react';
import logoImg from '../../assets/aotms-global-logo.png';
import { numberToWords } from '../../utils/numberToWords';

export const InvoiceDocument = forwardRef(({ invoiceData, isPreview = false }, ref) => {
  if (!invoiceData) return null;

  const fmtCurrency = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const clientName = invoiceData.client_name || 'R. Jayaveer';
  const firstName = clientName.split(' ')[0] || clientName;
  const designation = invoiceData.designation || 'Developer';
  const offerDate = invoiceData.offer_date || '20th July 2026';
  const annualCtc = Number(invoiceData.annual_ctc) || 240000;
  const monthlyCtc = Number(invoiceData.monthly_ctc) || (annualCtc / 12);

  const annualWords = invoiceData.net_earnings_in_words || numberToWords(annualCtc);

  const basicMonthly = Number(invoiceData.basic_salary) || (monthlyCtc * 0.4);
  const basicAnnual = basicMonthly * 12;

  const hraMonthly = Number(invoiceData.hra) || (basicMonthly * 0.4);
  const hraAnnual = hraMonthly * 12;

  const medicalMonthly = Number(invoiceData.medical_allowance) || 1500;
  const medicalAnnual = medicalMonthly * 12;

  const conveyanceMonthly = Number(invoiceData.conveyance) || 2500;
  const conveyanceAnnual = conveyanceMonthly * 12;

  const foodMonthly = Number(invoiceData.food_transport_allowance) || 1350;
  const foodAnnual = foodMonthly * 12;

  const daMonthly = Number(invoiceData.dearness_allowance) || 3450;
  const daAnnual = daMonthly * 12;

  const customEarnings = invoiceData.custom_earnings || [];
  const customDeductions = invoiceData.custom_deductions || [];

  const ptMonthly = Number(invoiceData.professional_tax) ?? 200;
  const ptAnnual = ptMonthly * 12;

  const tdsMonthly = Number(invoiceData.tds) || 0;
  const tdsAnnual = tdsMonthly * 12;

  const esiEmpMonthly = Number(invoiceData.esi_employee) || 0;
  const esiEmpAnnual = esiEmpMonthly * 12;

  const pfEmpMonthly = Number(invoiceData.pf_employee) || 0;
  const pfEmpAnnual = pfEmpMonthly * 12;

  let totalDeductionsMonthly = ptMonthly + tdsMonthly + esiEmpMonthly + pfEmpMonthly;
  customDeductions.forEach(d => { totalDeductionsMonthly += (Number(d.monthly) || 0); });
  const totalDeductionsAnnual = totalDeductionsMonthly * 12;

  const netMonthly = monthlyCtc - totalDeductionsMonthly;
  const netAnnual = annualCtc - totalDeductionsAnnual;

  return (
    <div
      ref={ref}
      className="invoice-print-container"
      style={{
        width: '100%',
        maxWidth: isPreview ? '100%' : '800px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#111827',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        fontSize: '12px',
        lineHeight: 1.5,
        padding: isPreview ? '16px 20px' : '24px 28px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Page 1: Header + Letter + Compensation Table ─────────────────── */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '24px', backgroundColor: '#fff', marginBottom: 24, boxShadow: isPreview ? 'none' : '0 4px 12px rgba(0,0,0,0.05)' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ea580c', paddingBottom: 12, marginBottom: 20 }}>
          <img src={logoImg} alt="AOTMS Logo" style={{ height: 48, objectFit: 'contain' }} />
          <div style={{ textAlign: 'right', fontSize: 12, color: '#374151' }}>
            <div><strong>Phone:</strong> +91 80199-42233</div>
            <div><strong>Email:</strong> hr@aotms.com</div>
          </div>
        </div>

        {/* Salutation & Offer Summary */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 600, color: '#4b5563' }}>To,</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{clientName}</div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: '#1f2937' }}>Dear {firstName},</div>
          <p style={{ margin: '0 0 10px 0', textIndent: 0, color: '#374151' }}>
            We are pleased to offer you the position of <strong>"{designation}"</strong> from <strong>{offerDate}</strong> on the following terms and conditions. Subject to the terms and conditions hereinafter provided, <strong>Academy Of Tech Masters</strong> hereby hires you for the purpose of rendering Professional Services to the company. Your salary will commence as of the first day you begin actual work at the Company.
          </p>
          <p style={{ margin: '0 0 10px 0', color: '#374151' }}>
            This offer of employment is made based upon your representations of proficiency and technical skills and your ability to handle an assignment/ job independently.
          </p>
          <p style={{ margin: 0, color: '#374151' }}>
            Your gross compensation (C2C) shall be <strong>Rs {fmtCurrency(annualCtc)} ({annualWords})</strong> per Annum. Annual Gross Compensation includes employer's contribution to Provident Fund and any other benefits, as applicable. All compensation will be paid to you after deduction of tax at source, in accordance with applicable law.
          </p>
        </div>

        {/* ── Compensation Plan Table ─────────────────────────────────────── */}
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.5px', background: '#1e293b', color: '#ffffff', padding: '8px', borderRadius: '6px 6px 0 0' }}>
            COMPENSATION PLAN
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: 12 }}>
            <tbody>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, width: '40%', borderRight: '1px solid #cbd5e1' }}>Name</td>
                <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700 }}>{clientName}</td>
              </tr>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>Designation</td>
                <td colSpan={2} style={{ padding: '8px 12px' }}>{designation}</td>
              </tr>
              <tr style={{ background: '#0f172a', color: '#ffffff', fontWeight: 700, borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px 12px', borderRight: '1px solid #334155' }}>Components Category</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid #334155', width: '30%' }}>Monthly (₹)</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', width: '30%' }}>Annual (₹)</td>
              </tr>

              {/* Total Gross CTC Row */}
              <tr style={{ background: '#f1f5f9', fontWeight: 800, borderBottom: '2px solid #94a3b8' }}>
                <td style={{ padding: '8px 12px', borderRight: '1px solid #cbd5e1' }}>Total Gross CTC</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(monthlyCtc)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtCurrency(annualCtc)}</td>
              </tr>

              {/* Earnings Breakdown */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>Basic Salary</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(basicMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(basicAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>HRA</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(hraMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(hraAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>Medical Allowance</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(medicalMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(medicalAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>Conveyance</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(conveyanceMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(conveyanceAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>Food Transport Allowance</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(foodMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(foodAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>Dearness Allowance</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(daMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(daAnnual)}</td>
              </tr>

              {/* Custom Earnings */}
              {customEarnings.map((earn, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: '#f0fdf4' }}>
                  <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>{earn.name}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(earn.monthly)}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(earn.annual || earn.monthly * 12)}</td>
                </tr>
              ))}

              {/* Deductions Sub-header */}
              <tr style={{ background: '#fef2f2', fontWeight: 700, borderBottom: '1px solid #fca5a5' }}>
                <td colSpan={3} style={{ padding: '6px 12px', color: '#991b1b' }}>Deductions</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>ESI (Employee's Contribution)</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(esiEmpMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(esiEmpAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>Provident Fund (Employee's Contribution)</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(pfEmpMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(pfEmpAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>Professional Tax</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(ptMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(ptAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>TDS</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(tdsMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(tdsAnnual)}</td>
              </tr>

              {/* Custom Deductions */}
              {customDeductions.map((ded, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: '#fff1f2' }}>
                  <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>{ded.name}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(ded.monthly)}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(ded.annual || ded.monthly * 12)}</td>
                </tr>
              ))}

              <tr style={{ background: '#fef2f2', fontWeight: 800, borderBottom: '2px solid #f87171' }}>
                <td style={{ padding: '7px 12px', borderRight: '1px solid #cbd5e1', color: '#991b1b' }}>Total Deductions</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1', color: '#991b1b' }}>{fmtCurrency(totalDeductionsMonthly)}</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', color: '#991b1b' }}>{fmtCurrency(totalDeductionsAnnual)}</td>
              </tr>

              {/* Employer Benefits */}
              <tr style={{ background: '#f0f9ff', fontWeight: 700, borderBottom: '1px solid #7dd3fc' }}>
                <td colSpan={3} style={{ padding: '6px 12px', color: '#0369a1' }}>Benefits (Employer Contribution)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>ESI (Employer's Contribution)</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(invoiceData.esi_employer || 0)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency((invoiceData.esi_employer || 0) * 12)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }}>Provident Fund (Employer's Contribution)</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>{fmtCurrency(invoiceData.pf_employer || 0)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency((invoiceData.pf_employer || 0) * 12)}</td>
              </tr>

              {/* Net Earnings Row */}
              <tr style={{ background: '#ecfdf5', fontWeight: 800, fontSize: 13, borderTop: '2px solid #059669' }}>
                <td style={{ padding: '10px 12px', borderRight: '1px solid #cbd5e1', color: '#047857' }}>Net Earnings</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', borderRight: '1px solid #cbd5e1', color: '#047857' }}>{fmtCurrency(netMonthly)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#047857' }}>{fmtCurrency(netAnnual)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Terms & Clauses (Exact text from PDF) ─────────────────────────── */}
        <div style={{ marginTop: 24, fontSize: 11.5, color: '#374151', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#111827', marginBottom: 8, borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>
            TERMS & CONDITIONS OF EMPLOYMENT
          </div>

          <ol style={{ paddingLeft: 18, margin: 0 }}>
            <li style={{ marginBottom: 6 }}>
              Mentioned to you during your interview, you are assigned to <strong>Academy Of Tech Masters Groups</strong>. This offer shall be effective from the date you join the organization and fulfill the joining formalities.
            </li>
            <li style={{ marginBottom: 6 }}>
              The company expects you to work with a high standard of initiative, efficiency and economy.
            </li>
            <li style={{ marginBottom: 6 }}>
              During the employment with the company, you may be liable to be transferred or deputed to any of the office/ divisions/ departments/ units of the company/ associates/ subsidiary group of companies.
            </li>
            <li style={{ marginBottom: 6 }}>
              During your employment with the company, you will be governed by the service rules and regulations of the company in force or as introduced or amended from time to time.
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>TERMINATION OF EMPLOYMENT:</strong> During Probation period either the Company or you may at any time terminate your employment with 2 (two) months notice. In the event you choose to leave the Company before completion of 24 months, an amount equivalent to THREE (3) months gross pay will be construed as debt due and payable.
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>Probation Period:</strong> From 01 FEB 2026 To 01 MAY 2026 (3 months). Your Standard Timings Will be 9:30am to 06:30pm.
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>Non-Compete & Non-Solicitation:</strong> You shall not during the term of your employment and for 12 months post termination engage in non-compete or non-solicitation activities.
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>Confidential Information:</strong> The employee shall keep all company information, source code, client information, credentials, and internal documents strictly confidential.
            </li>
          </ol>

          {/* List of Documents Required Before Joining */}
          <div style={{ marginTop: 14, background: '#f8fafc', padding: '12px 16px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>List of Documents Required Before Joining:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11 }}>
              <li>Two passport size copies of recent photograph</li>
              <li>Original 10th standard or degree certificates</li>
              <li>Relieving or Experience Letter from previous employer</li>
              <li>Address Proof (Driver License / Passport / Aadhar Card)</li>
              <li>Copy of PAN card & Aadhaar Card</li>
              <li>Last 3 months Pay Stubs & Bank Statement</li>
            </ul>
          </div>
        </div>

        {/* ── Official Signature & CEO Stamp Block ───────────────────────────── */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Congratulations, we look forward to you joining our team.</div>
            <div style={{ marginTop: 16, fontSize: 12, color: '#4b5563' }}>Sincerely,</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>For Academy Of Tech Masters,</div>
            
            {/* CEO Stamp Graphic */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%', border: '2px dashed #0369a1',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: '#0369a1', fontSize: 8, fontWeight: 800, textAlign: 'center', padding: 4,
                background: '#f0f9ff'
              }}>
                <span>AOTMS</span>
                <span style={{ fontSize: 7, color: '#0284c7' }}>★ GLOBAL ★</span>
                <span>APPROVED</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', fontFamily: 'serif', fontStyle: 'italic' }}>Ameenuddin Sayyed</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>CEO, Academy Of Tech Masters</div>
              </div>
            </div>
          </div>

          {/* Acceptance Box */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '12px 16px', width: 260, fontSize: 11, background: '#f8fafc' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>Candidate Acceptance</div>
            <div style={{ marginBottom: 6 }}>Signature: ______________________</div>
            <div style={{ marginBottom: 6 }}>Name: {clientName}</div>
            <div style={{ marginBottom: 6 }}>Place: _________________________</div>
            <div>Date: __________________________</div>
          </div>
        </div>

      </div>
    </div>
  );
});

export default InvoiceDocument;
