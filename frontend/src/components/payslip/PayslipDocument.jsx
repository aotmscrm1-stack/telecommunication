import React, { forwardRef } from 'react';
import logoImg from '../../assets/aotms-global-logo.png';
import { numberToWords } from '../../utils/numberToWords';

export const PayslipDocument = forwardRef(({ payslip, isPreview = false }, ref) => {
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

  return (
    <div
      ref={ref}
      className="payslip-print-container"
      style={{
        width: '100%',
        minWidth: '650px',
        maxWidth: '740px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        lineHeight: 1.4,
        padding: isPreview ? '12px 10px' : '16px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Outer Border Box */}
      <div
        style={{
          border: '1.5px solid #000000',
          backgroundColor: '#ffffff',
        }}
      >
        {/* ── 1. Company Header ────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px 10px 16px',
            position: 'relative',
          }}
        >
          {/* Logo on top-left */}
          <div style={{ flexShrink: 0, width: '165px' }}>
            <img
              src={logoImg}
              alt="AOTMS Logo"
              style={{
                height: '46px',
                width: 'auto',
                maxWidth: '160px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          {/* Centered Company Name & Address */}
          <div style={{ flex: 1, textAlign: 'center', paddingRight: '25px' }}>
            <div
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: '17px',
                fontWeight: 'bold',
                letterSpacing: '0.2px',
                color: '#000000',
                marginBottom: '5px',
              }}
            >
              Academy Of Tech Masters
            </div>
            <div
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#111111',
                lineHeight: 1.4,
              }}
            >
              2nd Floor, Sri Pothuri Towers, MG Road, Near DV Manor,
              <br />
              Vijayawada – 520010
            </div>
          </div>
        </div>

        {/* ── 2. Payslip Month Subheader (Spacious vertical padding so text never touches lines) ─ */}
        <div
          style={{
            borderTop: '1.5px solid #000000',
            borderBottom: '1.5px solid #000000',
            textAlign: 'center',
            padding: '9px 10px',
            fontWeight: 'bold',
            fontSize: '12px',
            lineHeight: '1.2',
            letterSpacing: '0.2px',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          Payslip for the month of {payslip.payslip_month?.trim() || '__________'}
        </div>

        {/* ── 3. Employee & Bank Details Grid ─────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '52% 48%',
            fontSize: '10.5px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            lineHeight: 1.4,
          }}
        >
          {/* Left Column: Employee Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '135px 1fr',
              rowGap: '4px',
              padding: '8px 12px',
              borderRight: '1.5px solid #000000',
            }}
          >
            <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Name:</span>
            <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>{valOrBlank(payslip.employee_name)}</span>

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
              gridTemplateColumns: '125px 1fr',
              rowGap: '4px',
              padding: '8px 12px',
            }}
          >
            <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Employee No:</span>
            <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>{valOrBlank(payslip.employee_id)}</span>

            <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Bank Name:</span>
            <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.bank_name)}</span>

            <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>Bank Account No:</span>
            <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.bank_account_number)}</span>

            <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>PAN Number:</span>
            <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.pan_number)}</span>

            <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>PF No:</span>
            <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.pf_number)}</span>

            <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>PF UAN:</span>
            <span style={{ whiteSpace: 'nowrap' }}>{valOrBlank(payslip.uan_number)}</span>
          </div>
        </div>

        {/* ── 4. Earnings & Deductions Table ───────────────────────────── */}
        <div style={{ borderTop: '1.5px solid #000000' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '52% 48%' }}>
            {/* ── Left side: Earnings ────────────────── */}
            <div style={{ borderRight: '1.5px solid #000000' }}>
              {/* Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 56px 56px',
                  padding: '7px 10px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  lineHeight: '1.2',
                  borderBottom: '1.5px solid #000000',
                  textAlign: 'left',
                }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>Earnings</span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Full</span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actual</span>
              </div>

              {/* Rows (All labels forced single line with whiteSpace: nowrap) */}
              <div style={{ padding: '8px 10px 10px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '1px 0', alignItems: 'center' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>BASIC</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.basic_salary) : '__________'}</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.basic_salary) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '1px 0', alignItems: 'center' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>HRA</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.hra) : '__________'}</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.hra) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '1px 0', alignItems: 'center' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>CONVEYANCE</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.conveyance) : '__________'}</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.conveyance) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '1px 0', alignItems: 'center' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>MEDICAL ALLOWANCE</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.medical_allowance) : '__________'}</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.medical_allowance) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '1px 0', alignItems: 'center' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>SPECIAL ALLOWANCE</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.special_allowance) : '__________'}</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.special_allowance) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '1px 0', alignItems: 'center' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>INCENTIVE</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.incentive !== undefined && payslip.incentive !== '' ? payslip.incentive : 0) : '__________'}</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.incentive !== undefined && payslip.incentive !== '' ? payslip.incentive : 0) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '1px 0', alignItems: 'center' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>FOOD ALLOWANCE</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.food_allowance) : '__________'}</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.food_allowance) : '__________'}</span>
                </div>
              </div>
            </div>

            {/* ── Right side: Deductions ─────────────── */}
            <div>
              {/* Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 56px',
                  padding: '7px 10px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  lineHeight: '1.2',
                  borderBottom: '1.5px solid #000000',
                }}
              >
                <span style={{ paddingLeft: '15px', whiteSpace: 'nowrap' }}>Deductions</span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actual</span>
              </div>

              {/* Rows */}
              <div style={{ padding: '8px 10px 10px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Number(payslip.lop_deduction) > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px', padding: '1px 0', alignItems: 'center' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>LOP DEDUCTION</span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {hasGross ? fmt(payslip.lop_deduction) : '__________'}
                    </span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px', padding: '1px 0', alignItems: 'center' }}>
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
              gridTemplateColumns: '52% 48%',
              borderTop: '1.5px solid #000000',
              fontWeight: 'bold',
              fontSize: '11px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 56px 56px',
                padding: '7px 10px',
                lineHeight: '1.2',
                borderRight: '1.5px solid #000000',
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>Total Earnings:INR.</span>
              <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.total_earnings) : '__________'}</span>
              <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.total_earnings) : '__________'}</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 56px',
                padding: '7px 10px',
                lineHeight: '1.2',
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>Total Deductions:INR.</span>
              <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{hasGross ? fmt(payslip.total_deductions) : '__________'}</span>
            </div>
          </div>

          {/* ── Net Pay & Words Row ──────────────────── */}
          <div
            style={{
              borderTop: '1.5px solid #000000',
              padding: '8px 12px 10px 12px',
            }}
          >
            <div style={{ fontSize: '11px', marginBottom: '4px', lineHeight: '1.3' }}>
              <span style={{ fontWeight: 'normal' }}>Net Pay for the month ( Total Earnings - Total Deductions): </span>
              <span style={{ fontWeight: 'bold', fontSize: '12px', marginLeft: '12px' }}>
                {hasGross ? fmt(payslip.net_salary) : '__________'}
              </span>
            </div>
            <div style={{ fontStyle: 'italic', fontSize: '11px', color: '#000000', lineHeight: '1.3' }}>
              {hasGross && words ? `(${words})` : '(__________________________________________________)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PayslipDocument;

