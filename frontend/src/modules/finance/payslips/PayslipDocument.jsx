import React, { forwardRef } from 'react';
import logoImg from '../../../assets/aotms-global-logo.png';
import { numberToWords } from '../../../utils/numberToWords';
import { A4Container, A4Page } from '../../../components/Finance/A4TemplateWrapper';

const MONTH_NAMES_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatDisplayMonth(monthVal) {
  if (!monthVal || String(monthVal).trim() === '') return '__________';
  let str = String(monthVal).trim();
  if (str.includes('T') || str.includes('GMT') || /^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const m = MONTH_NAMES_LIST[parsed.getMonth()] || MONTH_NAMES_LIST[parsed.getUTCMonth()];
      const y = parsed.getFullYear() || parsed.getUTCFullYear();
      return `${m} ${y}`;
    }
  }
  // Strip any accidental time pattern like " 10:00:00" or " 12:00 AM"
  str = str.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*[ap]m)?/i, '').trim();
  return str || '__________';
}

function PayslipDocumentComponent({ payslip }, ref) {
  if (!payslip) return null;

  const fmt = (v) => {
    if (v === undefined || v === null || v === '' || isNaN(Number(v))) {
      return '__________';
    }
    return String(Math.round(Number(v)));
  };

  const hasGross = Number(payslip.gross_salary) > 0;
  const words = payslip.net_salary_in_words || (hasGross ? numberToWords(payslip.net_salary || 0) : '');

  const valOrBlank = (v) => {
    if (v === undefined || v === null || v === '' || String(v).trim() === '') {
      return '__________';
    }
    return v;
  };

  const FONT_FAMILY = "'Inter', sans-serif";
  const UNIFORM_FONT_SIZE = '12px';

  return (
    <A4Container ref={ref} className="payslip-print-container">
      <A4Page className="a4-unit">
        <div
          style={{
            border: '2px solid #000000',
            backgroundColor: '#ffffff',
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: FONT_FAMILY,
            color: '#000000',
            fontSize: UNIFORM_FONT_SIZE,
            lineHeight: 1.45,
          }}
        >
          {/* ── 1. Company Header ────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 16px 12px 16px',
              textAlign: 'center',
            }}
          >
            {/* Centered Logo */}
            <div style={{ marginBottom: '6px' }}>
              <img
                src={logoImg}
                alt="AOTMS Logo"
                style={{
                  height: '46px',
                  width: 'auto',
                  maxWidth: '220px',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
            </div>

            {/* Centered Address */}
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: UNIFORM_FONT_SIZE,
                fontWeight: '700',
                color: '#000000',
                lineHeight: 1.45,
                textAlign: 'center',
              }}
            >
              2nd Floor, Sri Pothuri Towers, MG Road, Near DV Manor,
              <br />
              Vijayawada – 520010
            </div>
          </div>

          {/* ── 2. Payslip Month Subheader ───────────────────────────────── */}
          <div
            style={{
              borderTop: '1.5px solid #000000',
              borderBottom: '1.5px solid #000000',
              textAlign: 'center',
              padding: '8px 12px',
              fontWeight: '700',
              fontSize: UNIFORM_FONT_SIZE,
              lineHeight: 1.3,
              letterSpacing: '0.2px',
              fontFamily: FONT_FAMILY,
            }}
          >
            Payslip for the month of {formatDisplayMonth(payslip.payslip_month)}
          </div>

          {/* ── 3. Employee & Bank Details Grid ─────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '50% 50%',
              fontSize: UNIFORM_FONT_SIZE,
              fontFamily: FONT_FAMILY,
              lineHeight: 1.45,
            }}
          >
            {/* Left Column: Employee Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '165px 1fr',
                columnGap: '8px',
                rowGap: '6px',
                padding: '10px 14px',
                borderRight: '1.5px solid #000000',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Name:</span>
              <span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>
                {valOrBlank(payslip.employee_name)}
              </span>

              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Joining Date:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.joining_date)}</span>

              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Designation:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.designation)}</span>

              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Department:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.department)}</span>

              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Location:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.location)}</span>

              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Effective Work Days:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.effective_work_days)}</span>

              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>LOP:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.lop)}</span>
            </div>

            {/* Right Column: Bank & Tax Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '155px 1fr',
                columnGap: '8px',
                rowGap: '6px',
                padding: '10px 14px',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Employee No:</span>
              <span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>{valOrBlank(payslip.employee_id)}</span>

              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Bank Name:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.bank_name)}</span>

              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Bank Account No:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.bank_account_number)}</span>

              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>PAN Number:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.pan_number)}</span>

              <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>PF No:</span>
              <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.pf_number)}</span>
            </div>
          </div>

          {/* ── 4. Earnings & Deductions Table ───────────────────────────── */}
          <div style={{ borderTop: '1.5px solid #000000' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '50% 50%' }}>
              {/* ── Left side: Earnings ────────────────── */}
              <div style={{ borderRight: '1.5px solid #000000', boxSizing: 'border-box' }}>
                {/* Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 75px 75px',
                    padding: '7px 12px',
                    fontWeight: '700',
                    fontSize: UNIFORM_FONT_SIZE,
                    lineHeight: 1.3,
                    borderBottom: '1.5px solid #000000',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>Earnings</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Full</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actual</span>
                </div>

                {/* Rows */}
                <div style={{ padding: '8px 12px 10px 12px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: UNIFORM_FONT_SIZE }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 75px', alignItems: 'center' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>BASIC</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.basic_salary) : '__________'}</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.basic_salary) : '__________'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 75px', alignItems: 'center' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>HRA</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.hra) : '__________'}</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.hra) : '__________'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 75px', alignItems: 'center' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>CONVEYANCE</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.conveyance) : '__________'}</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.conveyance) : '__________'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 75px', alignItems: 'center' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>MEDICAL ALLOWANCE</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.medical_allowance) : '__________'}</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.medical_allowance) : '__________'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 75px', alignItems: 'center' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>SPECIAL ALLOWANCE</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.special_allowance) : '__________'}</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.special_allowance) : '__________'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 75px', alignItems: 'center' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>INCENTIVE</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.incentive !== undefined && payslip.incentive !== '' ? payslip.incentive : 0) : '__________'}</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.incentive !== undefined && payslip.incentive !== '' ? payslip.incentive : 0) : '__________'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 75px', alignItems: 'center' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>FOOD ALLOWANCE</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.food_allowance) : '__________'}</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.food_allowance) : '__________'}</span>
                  </div>
                </div>
              </div>

              {/* ── Right side: Deductions ─────────────── */}
              <div style={{ boxSizing: 'border-box' }}>
                {/* Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 75px',
                    padding: '7px 12px',
                    fontWeight: '700',
                    fontSize: UNIFORM_FONT_SIZE,
                    lineHeight: 1.3,
                    borderBottom: '1.5px solid #000000',
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>Deductions</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actual</span>
                </div>

                {/* Rows */}
                <div style={{ padding: '8px 12px 10px 12px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: UNIFORM_FONT_SIZE }}>
                  {Number(payslip.lop_deduction) > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px', alignItems: 'center' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>LOP DEDUCTION</span>
                      <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {hasGross ? fmt(payslip.lop_deduction) : '__________'}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px', alignItems: 'center' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>PROF TAX</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.tds !== undefined && payslip.tds !== '' ? payslip.tds : 200) : '__________'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Total Row ────────────────────────────── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '50% 50%',
                borderTop: '1.5px solid #000000',
                fontWeight: '700',
                fontSize: UNIFORM_FONT_SIZE,
                lineHeight: 1.3,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 75px 75px',
                  padding: '7px 12px',
                  borderRight: '1.5px solid #000000',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>Total Earnings: INR</span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.total_earnings) : '__________'}</span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.total_earnings) : '__________'}</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 75px',
                  padding: '7px 12px',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>Total Deductions: INR</span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.total_deductions) : '__________'}</span>
              </div>
            </div>

            {/* ── Net Pay & Words Row ──────────────────── */}
            <div
              style={{
                borderTop: '1.5px solid #000000',
                padding: '10px 14px 12px 14px',
                fontSize: UNIFORM_FONT_SIZE,
                lineHeight: 1.45,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 'normal' }}>Net Pay for the month ( Total Earnings - Total Deductions): </span>
                <span style={{ fontWeight: '700', marginLeft: '6px' }}>
                  INR {hasGross ? fmt(payslip.net_salary) : '__________'}
                </span>
              </div>
              <div style={{ fontStyle: 'italic', color: '#000000' }}>
                {hasGross && words ? `(${words})` : '(__________________________________________________)'}
              </div>
            </div>

            {/* ── 5. System Generated Note ───────────────────────────────── */}
            <div
              style={{
                borderTop: '1.5px solid #000000',
                padding: '8px 12px',
                textAlign: 'center',
                fontSize: UNIFORM_FONT_SIZE,
                color: '#333333',
                fontStyle: 'italic',
                letterSpacing: '0.2px',
                fontFamily: FONT_FAMILY,
                backgroundColor: '#fafafa',
              }}
            >
              * Note: This is a system-generated payslip and does not require a signature.
            </div>
          </div>
        </div>
      </A4Page>
    </A4Container>
  );
}

export const PayslipDocument = forwardRef(PayslipDocumentComponent);
export default PayslipDocument;
