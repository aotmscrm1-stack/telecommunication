import React, { forwardRef } from 'react';
import logoImg from '../../assets/aotms-global-logo.png';
import { numberToWords } from '../../utils/numberToWords';

export const InvoiceDocument = forwardRef(({ invoiceData, isPreview = false }, ref) => {
  if (!invoiceData) return null;

  const fmtCurrency = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const clientName = invoiceData.client_name || 'Ramanadham jayaveer';
  const shortName = invoiceData.short_name || clientName.split(' ').pop() || clientName;
  const designation = invoiceData.designation || 'Developer';
  const offerDate = invoiceData.offer_date || '20th July 2026';
  const annualCtc = Number(invoiceData.annual_ctc) || 240000;
  const monthlyCtc = Number(invoiceData.monthly_ctc) || (annualCtc / 12);
  const probationPeriod = invoiceData.probation_period || '01 FEB 2026 To 01 MAY 2026';
  const workTimings = invoiceData.work_timings || '9:30am to 06:30pm';

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

  const pageContainerStyle = {
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: "'Calibri', Arial, Helvetica, sans-serif",
    fontSize: '13px',
    lineHeight: '1.45',
    padding: isPreview ? '24px 28px' : '36px 40px',
    boxSizing: 'border-box',
    border: '1px solid #d1d5db',
    borderRadius: isPreview ? '8px' : '0',
    marginBottom: '28px',
    pageBreakAfter: 'always',
    position: 'relative',
    background: '#fff',
    boxShadow: isPreview ? '0 4px 14px rgba(0,0,0,0.06)' : 'none',
  };

  const headerStyle = {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    borderBottom: '1.5px solid #d1d5db',
    paddingBottom: '10px',
    marginBottom: '20px',
  };

  return (
    <div ref={ref} className="pdf-5page-container" style={{ width: '100%', maxWidth: '820px', margin: '0 auto' }}>
      
      {/* =================================================================== */}
      {/* ── PAGE 1 OF 5 ────────────────────────────────────────────────── */}
      {/* =================================================================== */}
      <div style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Page 1 of 5</div>
        
        {/* Header Logo & Contact */}
        <div style={headerStyle}>
          <img src={logoImg} alt="AOTMS Logo" style={{ height: 48, objectFit: 'contain' }} />
          <div style={{ textAlign: 'right', fontSize: 13, color: '#111827' }}>
            <div><strong>Phone:</strong> +91 80199-42233</div>
            <div><strong>Email:</strong> <a href="mailto:hr@aotms.com" style={{ color: '#2563eb', textDecoration: 'underline' }}>hr@aotms.com</a></div>
          </div>
        </div>

        {/* Candidate Offer Details */}
        <div style={{ marginBottom: 18, marginTop: 10 }}>
          <div style={{ fontSize: 13, color: '#111' }}>To,</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{clientName}</div>
        </div>

        <div style={{ marginBottom: 20, textAlign: 'justify' }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Dear {shortName},</div>
          <p style={{ margin: '0 0 12px 0' }}>
            We are pleased to offer you the position of <strong>"{designation}"</strong> From <strong>{offerDate}</strong> on the following terms and conditions. Subject to the terms and conditions hereinafter provided, <strong>Academy Of Tech Masters</strong> hereby hires you for the purpose of rendering Professional Services to the company. Your salary will commence as of the first day you begin actual work at the Company, which will be considered the first day of employment with the Company.
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            This offer of employment is made based upon your representations of proficiency and technical skills and your ability to handle an assignment/ job independently.
          </p>
          <p style={{ margin: '0 0 16px 0' }}>
            Your gross compensation (C2C) shall be <strong>Rs {fmtCurrency(annualCtc)} ({annualWords})</strong> per Annum. Annual Gross Compensation includes employer's contribution to Provident Fund and any other benefits, as applicable. All compensation will be paid to you after deduction of tax at source, in accordance with applicable law. You will be solely liable for your personal tax liabilities, as per applicable law, both in India and abroad.
          </p>
        </div>

        {/* COMPENSATION PLAN Table - Part 1 */}
        <div style={{ border: '1px solid #000', marginTop: 10 }}>
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 13.5, textTransform: 'uppercase', padding: '6px', borderBottom: '1px solid #000', background: '#f3f4f6' }}>
            COMPENSATION PLAN
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '7px 12px', fontWeight: 700, width: '40%', borderRight: '1px solid #000' }}>Name</td>
                <td colSpan={2} style={{ padding: '7px 12px', fontWeight: 700 }}>{clientName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '7px 12px', fontWeight: 700, borderRight: '1px solid #000' }}>Designation</td>
                <td colSpan={2} style={{ padding: '7px 12px' }}>{designation}</td>
              </tr>
              <tr style={{ fontWeight: 700, borderBottom: '1px solid #000', background: '#e5e7eb' }}>
                <td style={{ padding: '7px 12px', borderRight: '1px solid #000' }}>Components Category</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', borderRight: '1px solid #000', width: '30%' }}>Monthly</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', width: '30%' }}>Annual</td>
              </tr>
              <tr style={{ fontWeight: 700, borderBottom: '1px solid #000' }}>
                <td style={{ padding: '7px 12px', borderRight: '1px solid #000' }}>Total Gross CTC</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(monthlyCtc)}</td>
                <td style={{ padding: '7px 12px', textAlign: 'right' }}>{fmtCurrency(annualCtc)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>Basic Salary</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(basicMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(basicAnnual)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ── PAGE 2 OF 5 ────────────────────────────────────────────────── */}
      {/* =================================================================== */}
      <div style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Page 2 of 5</div>
        
        <div style={{ border: '1px solid #000', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', width: '40%', borderRight: '1px solid #000' }}>HRA</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000', width: '30%' }}>{fmtCurrency(hraMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', width: '30%' }}>{fmtCurrency(hraAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>Medical</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(medicalMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(medicalAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>Conveyance</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(conveyanceMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(conveyanceAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>Food Transport Allowance</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(foodMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(foodAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>Dearness Allowance</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(daMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(daAnnual)}</td>
              </tr>

              {/* Custom Earnings */}
              {customEarnings.map((earn, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                  <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>{earn.name}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(earn.monthly)}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(earn.annual || earn.monthly * 12)}</td>
                </tr>
              ))}

              {/* Deductions Header */}
              <tr style={{ fontWeight: 700, borderBottom: '1px solid #000', background: '#f3f4f6' }}>
                <td colSpan={3} style={{ padding: '6px 12px' }}>Deductions</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>ESI (Employee's Contribution)</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(esiEmpMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(esiEmpAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>Provident Fund (Employee's Contribution)</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(pfEmpMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(pfEmpAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>Professional tax</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(ptMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(ptAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>TDS</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(tdsMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(tdsAnnual)}</td>
              </tr>

              {/* Custom Deductions */}
              {customDeductions.map((ded, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                  <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>{ded.name}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(ded.monthly)}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(ded.annual || ded.monthly * 12)}</td>
                </tr>
              ))}

              <tr style={{ fontWeight: 700, borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>Total Deductions</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(totalDeductionsMonthly)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency(totalDeductionsAnnual)}</td>
              </tr>

              {/* Benefits Header */}
              <tr style={{ fontWeight: 700, borderBottom: '1px solid #000', background: '#f3f4f6' }}>
                <td colSpan={3} style={{ padding: '6px 12px' }}>Benefits</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>ESI (Employer's Contribution)</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(invoiceData.esi_employer || 0)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency((invoiceData.esi_employer || 0) * 12)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>Provident Fund (Employer's Contribution)</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(invoiceData.pf_employer || 0)}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmtCurrency((invoiceData.pf_employer || 0) * 12)}</td>
              </tr>

              {/* Net Earnings */}
              <tr style={{ fontWeight: 800 }}>
                <td style={{ padding: '8px 12px', borderRight: '1px solid #000' }}>Net Earnings</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid #000' }}>{fmtCurrency(netMonthly)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtCurrency(netAnnual)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Clauses 1 to 4 */}
        <div style={{ textAlign: 'justify', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>As</div>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 10 }}>
              Mentioned to you during your interview, you are assigned to <strong>Academy Of Tech Masters Groups</strong>. This offer shall be effective from the date you join the organization and fulfill the joining formalities.
            </li>
            <li style={{ marginBottom: 10 }}>
              The company expects you to work with a high standard of initiative, efficiency and economy.
            </li>
            <li style={{ marginBottom: 10 }}>
              During the employment with the company, you may be liable to be transferred or deputed to any of the office/ divisions/ departments/ units of the company/ associates/ subsidiary group of companies whether existing or to be setup, whether in the same town/ city or to any other town/ city where in India or abroad on the same or similar terms and conditions of the employment.
            </li>
            <li style={{ marginBottom: 10 }}>
              During your employment with the company, you will be governed by the service rules and regulations of the company in force or as introduced or amended from time to time. You will also be governed by the company's policies and rules regarding leave, indiscipline, misconduct or/ and any other matters.
            </li>
          </ol>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ── PAGE 3 OF 5 ────────────────────────────────────────────────── */}
      {/* =================================================================== */}
      <div style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Page 3 of 5</div>
        
        <div style={{ textAlign: 'justify', lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>5) TERMINATION OF EMPLOYMENT</div>
          
          <p style={{ margin: '0 0 10px 0' }}>
            During Probation period either the Company or you may at any time terminate your employment with the Company, without cause, by giving in writing to the other party, 2 (two) months notice or in lieu thereof a sum equal to the amount or prorated amount of salary which would have accrued to you during the period or remaining period of notice, except for when you are working for the company. In such cases you are required to follow the notice period of the company. You shall not be entitled to any notice pay if your employment is terminated in accordance with condition set forth in Section 5.6 below.
          </p>

          <p style={{ margin: '0 0 10px 0' }}>
            After completion of the Probation period, either the Company or you may at any time terminate your employment with the Company, without cause, by giving in writing to the other party, notice of 2 months or in lieu thereof a sum equal to the amount or prorated amount of salary which would have accrued to you during the period or remaining period of notice.
          </p>

          <p style={{ margin: '0 0 10px 0' }}>
            After notice of termination, you shall co-operate with the Company, as reasonably requested by the Company, to effect a transition of your responsibilities and ensure that the Company is aware of all matters being handled by you.
          </p>

          <p style={{ margin: '0 0 10px 0' }}>
            Upon termination of your employment with the Company for any reason, you shall promptly return to the Company any keys, credit cards, Laptop, Mobile phones, SIM cards, passes, confidential documents or material, or other property belonging to the Company, and return all writings, files, records, correspondence, notebooks, notes and other documents and things (including any copies thereof) containing Confidential Information or relating to the business or proposed business of the Company or its subsidiaries or affiliates. The Company reserves the right not to relieve you of your employment or pay you the previous month's salary in the event that all the Company's documents/ property / Confidential Information/belongings in your custody have not been properly handed over by you to an authorized representative of the Company.
          </p>

          <p style={{ margin: '0 0 10px 0' }}>
            The Company reserves the right during any period of notice to exclude you from the premises of the Company, carry out no duties, and to instruct you not to communicate with clients, employees, agents or representatives of the Company.
          </p>

          <p style={{ margin: '0 0 8px 0' }}>
            In addition to all the rights of the Company provided for in this agreement or in any other policies/regulations of the Company or under law,
          </p>

          <div style={{ fontWeight: 600, marginBottom: 6 }}>The Company may terminate your employment forthwith in any of the following circumstances:</div>
          <ol type="i" style={{ paddingLeft: 24, margin: '0 0 10px 0' }}>
            <li>Breach by you of any of the terms of this letter of appointment ; Breach of any clauses of the Company's regulations/policies.</li>
            <li>Unauthorized absence beyond a period of three consecutive days;</li>
            <li>Inability to perform your duties beyond a period of fifteen (15) days, whether on medical grounds or on any other grounds;</li>
            <li>Physical or mental incapacitation to perform your duties;</li>
            <li>Any misrepresentation by you to the Company, whether made orally or in writing and whether expressly or by conduct, and whether at the time of appointment or prior or subsequent thereto;</li>
            <li>Commission of any act detrimental to the interests of the Company;</li>
            <li>Commission of any act of moral turpitude;</li>
            <li>Misconduct;</li>
            <li>Commission of an act of insolvency;</li>
            <li>Conviction in any court of law for the commission of any crime; or</li>
            <li>Your performance is continuously measured as below expectation:</li>
          </ol>

          <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>
            In the event you choose to leave the Company, before the completion of 24 months from the date of joining the Company, an amount equivalent to THREE (3) months gross pay- will be construed as debt due and payable by you to the Company. This clause will not be applicable in cases where the Company may, in its sole discretion, elect to terminate your employment.
          </p>

          <div style={{ marginTop: 10 }}>
            <strong>6)</strong> If you are assigned to work at Company's client or Academy Of Tech Masters affiliate companies, you are required to follow the rules and regulations of the company till
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ── PAGE 4 OF 5 ────────────────────────────────────────────────── */}
      {/* =================================================================== */}
      <div style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Page 4 of 5</div>
        
        <div style={{ textAlign: 'justify', lineHeight: 1.55 }}>
          <p style={{ margin: '0 0 12px 0' }}>
            your assignment ends. While you work at the company's place, you are required to maintain absolute professionalism and conduct.
          </p>

          <p style={{ margin: '0 0 12px 0' }}>
            <strong>7)</strong> You are required to strictly maintain the secrecy of the Company and not to divulge or communicate in any matter, any information regarding the company, your remuneration/ terms of employment to any outsider or another employee of the company except your superior. Any such disclosure is a serious case of in-discipline and would attract serious disciplinary action.
          </p>

          <p style={{ margin: '0 0 12px 0' }}>
            <strong>8)</strong> You are required to deal with the company's money, material and documents with utmost honesty and professional ethics. If you were found guilty at any point of time of moral turpitude or of dishonesty in dealing with the company's money or material or documents, or of theft, or of misappropriation, regardless of the value involved, your services would attract serious disciplinary and appropriate legal action.
          </p>

          <p style={{ margin: '0 0 12px 0' }}>
            <strong>9)</strong> You are required not to engage yourself in any other gainful or commercial employment or business, part time or full time directly or indirectly, simultaneously as long as you are employed with Company or engage yourself directly or indirectly in any other profitable business connected with the dealings or activities of the company in any way. Any action to the contrary would render your services liable for termination.
          </p>

          <p style={{ margin: '0 0 12px 0' }}>
            <strong>10)</strong> Any work carried out by you during your period of employment at Company either party or whole of a project shall be the property of the Company. Similarly any new business developed directly or indirectly through you during your tenure with the company will be considered as the company's property.
          </p>

          <p style={{ margin: '0 0 12px 0' }}>
            <strong>11) Under probation period:</strong> from <strong>{probationPeriod}</strong> (3 months) after successfully completing your probation period your services will be regularized and you are entitled to avail yourself of the benefits provided by the company. Your Standard Timings Will be <strong>{workTimings}</strong>.
          </p>

          <p style={{ margin: '0 0 12px 0' }}>
            <strong>12) Non-Compete & Non Solicitation:</strong> You shall not during the term of your employment and for a period of twelve (12) months immediately following any termination of such employment either voluntary or involuntary, directly or indirectly, individually or on behalf of any person, firm, corporation or entity (a) interfere with company's continuing relationships with its other employees, customers, suppliers or clients, (b) influence existing or potential employees to leave employment with the company, (c) disparage the company with other employees, outsiders or firms.
          </p>

          <p style={{ margin: '0 0 12px 0' }}>
            <strong>13)</strong> You agree to indemnify and defend Academy Of Tech Masters, its Affiliates, and their respective officers, directors, employees, agents and customers from and against all damages arising out of a third-party claim resulting from or alleged to have resulted from any of your acts during or after the work hours. You agree not to involve Academy Of Tech Masters, its Affiliates, and their respective officers, directors, employees, agents and customers in any problems arising due to your personal acts at all times. Any violation of the above terms will result in immediate termination of your employment with no notice.
          </p>

          <div style={{ margin: '0 0 12px 0' }}>
            <strong>14) List of Documents Required Before Joining:</strong>
            <ul style={{ paddingLeft: 20, margin: '6px 0 0 0', listStyleType: 'disc' }}>
              <li>Two passport size copies of your recent photograph</li>
              <li>Original X standard or degree certificates.</li>
              <li>Relieving or Experience Letter from previous employer(Not required for Freshers)</li>
              <li>Appointment letter from Previous employer(Not required for Freshers)</li>
              <li>Address Proof (Driver License/Passport Copy etc)</li>
              <li>Copy of PAN card</li>
              <li>Copy of Aadhaar Card</li>
              <li>Last 3 months Pay Stubs & Bank Statement with previous company(Not required for Freshers)</li>
            </ul>
          </div>

          <p style={{ margin: '0 0 12px 0' }}>
            <strong>15)</strong> In the event a government body/authority exercising its jurisdiction and statutory power/authority seeks information pertaining to any aspect of your employment, the Company shall provide such information to the government body/authority without any notification to you. The foregoing shall be applicable to information pertaining to your employment being shared in pursuance of statutory requirements/compliance. You may belong to this category and your details will be disclosed to these authorities.
          </p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ── PAGE 5 OF 5 ────────────────────────────────────────────────── */}
      {/* =================================================================== */}
      <div style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Page 5 of 5</div>
        
        <div style={{ textAlign: 'justify', lineHeight: 1.55 }}>
          <p style={{ margin: '0 0 12px 0' }}>
            <strong>16)</strong> You are required to carefully read and understand these Terms of Employment as a part of accepting this offer. As further detailed in the Terms of Employment, this offer and your employment with Academy Of Tech Masters is subject to satisfactory completion of verification and/or background or reference checks, which may occur at any time prior to or after your effective start date.
          </p>

          <p style={{ margin: '0 0 12px 0' }}>
            <strong>17)</strong> This <strong>"Letter of Appointment"</strong> is valid ONLY upon you signing it and providing all the documents mentioned above. The terms of this letter and this offer are valid for <strong>THREE (3) days</strong> from the date of this letter. This letter supersedes any previous communication, including but not limited to written or verbal communications, by Company or its representatives.
          </p>

          <div style={{ margin: '0 0 20px 0' }}>
            <strong>18) Confidential Information</strong>
            <p style={{ margin: '6px 0 0 0' }}>
              The employee shall keep all company information, including source code, client information, projectdetails, business strategies, financial data, credentials, and internal documents, strictly confidential during and after employment. Any software, code, applications, documents, designs, databases, or other work created during employment shall be the exclusive property of the company. Source code, repositories, APIs, credentials, and project files must not be copied, shared, or uploaded to personal devices or public platforms without authorization.
            </p>
          </div>

          <div style={{ marginBottom: 24, fontSize: 13 }}>
            Congratulations, we look forward to you joining our team.
          </div>

          <div style={{ marginBottom: 30 }}>
            <div>Sincerely,</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>For Academy Of Tech Masters,</div>
            
            {/* CEO Stamp Seal & Signature Block */}
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', border: '2px dashed #0369a1',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: '#0369a1', fontSize: 8.5, fontWeight: 800, textAlign: 'center', padding: 4,
                background: '#f0f9ff'
              }}>
                <span>AOTMS</span>
                <span style={{ fontSize: 7, color: '#0284c7' }}>★ GLOBAL ★</span>
                <span>APPROVED</span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', fontFamily: 'serif', fontStyle: 'italic' }}>Ameenuddin Sayyed</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Ameenuddin Sayyed</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>CEO</div>
              </div>
            </div>
          </div>

          {/* Candidate Acceptance Section */}
          <div style={{ borderTop: '1px solid #000', paddingTop: 16, marginTop: 40 }}>
            <p style={{ margin: '0 0 16px 0' }}>
              I have read and understood the terms and conditions of my letter. I hereby accept this offer with the terms and conditions mentioned in it.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
              <div><strong>Signature:</strong> ___________________________</div>
              <div><strong>Name:</strong> {clientName}</div>
              <div><strong>Place:</strong> ___________________________</div>
              <div><strong>Date:</strong> ___________________________</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
});

export default InvoiceDocument;
