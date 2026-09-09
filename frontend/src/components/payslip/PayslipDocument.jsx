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
        maxWidth: '740px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        lineHeight: 1.35,
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
            padding: '10px 14px 8px 14px',
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
                marginBottom: '4px',
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
                lineHeight: 1.35,
              }}
            >
              2nd Floor, Sri Pothuri Towers, MG Road, Near DV Manor,
              <br />
              Vijayawada – 520010
            </div>
          </div>
        </div>

        {/* ── 2. Payslip Month Subheader ───────────────────────────────── */}
        <div
          style={{
            borderTop: '1.5px solid #000000',
            borderBottom: '1.5px solid #000000',
            textAlign: 'center',
            padding: '5px 8px',
            fontWeight: 'bold',
            fontSize: '12px',
            letterSpacing: '0.2px',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          Payslip for the month of {payslip.payslip_month?.trim() || '__________'}
        </div>

        {/* ── 3. Employee & Bank Details Grid (50% / 50% split with aligned vertical divider) ─ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '50% 50%',
            fontSize: '10.5px',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          {/* Left Column: Employee Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '135px 1fr',
              rowGap: '2.5px',
              padding: '6px 12px 6px 12px',
              borderRight: '1.5px solid #000000',
            }}
          >
            <span style={{ fontWeight: 'normal' }}>Name:</span>
            <span style={{ fontWeight: '600' }}>{valOrBlank(payslip.employee_name)}</span>

            <span style={{ fontWeight: 'normal' }}>Joining Date:</span>
            <span>{valOrBlank(payslip.joining_date)}</span>

            <span style={{ fontWeight: 'normal' }}>Designation:</span>
            <span>{valOrBlank(payslip.designation)}</span>

            <span style={{ fontWeight: 'normal' }}>Department:</span>
            <span>{valOrBlank(payslip.department)}</span>

            <span style={{ fontWeight: 'normal' }}>Location:</span>
            <span>{valOrBlank(payslip.location)}</span>

            <span style={{ fontWeight: 'normal' }}>Effective Work Days:</span>
            <span>{valOrBlank(payslip.effective_work_days)}</span>

            <span style={{ fontWeight: 'normal' }}>LOP:</span>
            <span>{valOrBlank(payslip.lop)}</span>
          </div>

          {/* Right Column: Bank & Tax Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '125px 1fr',
              rowGap: '2.5px',
              padding: '6px 12px 6px 12px',
            }}
          >
            <span style={{ fontWeight: 'normal' }}>Employee No:</span>
            <span style={{ fontWeight: '600' }}>{valOrBlank(payslip.employee_id)}</span>

            <span style={{ fontWeight: 'normal' }}>Bank Name:</span>
            <span>{valOrBlank(payslip.bank_name)}</span>

            <span style={{ fontWeight: 'normal' }}>Bank Account No:</span>
            <span>{valOrBlank(payslip.bank_account_number)}</span>

            <span style={{ fontWeight: 'normal' }}>PAN Number:</span>
            <span>{valOrBlank(payslip.pan_number)}</span>

            <span style={{ fontWeight: 'normal' }}>PF No:</span>
            <span>{valOrBlank(payslip.pf_number)}</span>

            <span style={{ fontWeight: 'normal' }}>PF UAN:</span>
            <span>{valOrBlank(payslip.uan_number)}</span>
          </div>
        </div>

        {/* ── 4. Earnings & Deductions Table ───────────────────────────── */}
        <div style={{ borderTop: '1.5px solid #000000' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '50% 50%' }}>
            {/* ── Left side: Earnings ────────────────── */}
            <div style={{ borderRight: '1.5px solid #000000' }}>
              {/* Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 65px 65px',
                  padding: '4px 10px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  borderBottom: '1.5px solid #000000',
                  textAlign: 'left',
                }}
              >
                <span>Earnings</span>
                <span style={{ textAlign: 'right' }}>Full</span>
                <span style={{ textAlign: 'right' }}>Actual</span>
              </div>

              {/* Rows */}
              <div style={{ padding: '6px 10px 8px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px 65px' }}>
                  <span>BASIC</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.basic_salary) : '__________'}</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.basic_salary) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px 65px' }}>
                  <span>HRA</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.hra) : '__________'}</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.hra) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px 65px' }}>
                  <span>CONVEYANCE</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.conveyance) : '__________'}</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.conveyance) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px 65px' }}>
                  <span>MEDICAL ALLOWANCE</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.medical_allowance) : '__________'}</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.medical_allowance) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px 65px' }}>
                  <span>SPECIAL ALLOWANCE</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.special_allowance) : '__________'}</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.special_allowance) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px 65px' }}>
                  <span>INCENTIVE</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.incentive !== undefined && payslip.incentive !== '' ? payslip.incentive : 0) : '__________'}</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.incentive !== undefined && payslip.incentive !== '' ? payslip.incentive : 0) : '__________'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px 65px' }}>
                  <span>FOOD ALLOWANCE</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.food_allowance) : '__________'}</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.food_allowance) : '__________'}</span>
                </div>
              </div>
            </div>

            {/* ── Right side: Deductions ─────────────── */}
            <div>
              {/* Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 65px',
                  padding: '4px 10px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  borderBottom: '1.5px solid #000000',
                }}
              >
                <span style={{ paddingLeft: '20px' }}>Deductions</span>
                <span style={{ textAlign: 'right' }}>Actual</span>
              </div>

              {/* Rows */}
              <div style={{ padding: '6px 10px 8px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {Number(payslip.lop_deduction) > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px' }}>
                    <span>LOP DEDUCTION</span>
                    <span style={{ textAlign: 'right' }}>
                      {hasGross ? fmt(payslip.lop_deduction) : '__________'}
                    </span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px' }}>
                  <span>PROF TAX</span>
                  <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.tds !== undefined && payslip.tds !== '' ? payslip.tds : 200) : '__________'}</span>
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
              fontWeight: 'bold',
              fontSize: '11px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 65px 65px',
                padding: '4px 10px',
                borderRight: '1.5px solid #000000',
              }}
            >
              <span>Total Earnings:INR.</span>
              <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.total_earnings) : '__________'}</span>
              <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.total_earnings) : '__________'}</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 65px',
                padding: '4px 10px',
              }}
            >
              <span>Total Deductions:INR.</span>
              <span style={{ textAlign: 'right' }}>{hasGross ? fmt(payslip.total_deductions) : '__________'}</span>
            </div>
          </div>

          {/* ── Net Pay & Words Row ──────────────────── */}
          <div
            style={{
              borderTop: '1.5px solid #000000',
              padding: '6px 10px 8px 10px',
            }}
          >
            <div style={{ fontSize: '11px', marginBottom: '3px' }}>
              <span style={{ fontWeight: 'normal' }}>Net Pay for the month ( Total Earnings - Total Deductions): </span>
              <span style={{ fontWeight: 'bold', fontSize: '12px', marginLeft: '12px' }}>
                {hasGross ? fmt(payslip.net_salary) : '__________'}
              </span>
            </div>
            <div style={{ fontStyle: 'italic', fontSize: '11px', color: '#000000' }}>
              {hasGross && words ? `(${words})` : '(__________________________________________________)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PayslipDocument;

