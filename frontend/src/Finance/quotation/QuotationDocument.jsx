import React, { forwardRef } from 'react';
import atmLogoImg from '../../assets/atm-logo.jpeg';
import logoImg from '../../assets/aotms-global-logo.png';
import { numberToWords } from '../../utils/numberToWords';

export const QuotationDocument = forwardRef(({ quotationData, isPreview = false }, ref) => {
  if (!quotationData) return null;

  const fmtCurrency = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const quotationNo = quotationData.invoice_number || 'AOTMS-FEB-Q07';
  const quotationDate = quotationData.invoice_date || '20/02/2026';
  const validTill = quotationData.valid_till || '02/03/2026';

  const companyName = quotationData.company_name || 'AOTMS Global Private Limited';
  const companyAddress = quotationData.company_address || '2nd Floor, Pothuri Towers, MG Road, Near DV Manor, Vijayawada-10';
  const companyMobile = quotationData.company_mobile || '+91 80199-52233';
  const companyEmail = quotationData.company_email || 'Info@aotms.in';
  const companyGst = quotationData.company_gst || 'GSAPS2603R1Z5';

  const clientName = quotationData.client_name || 'MODERN ACADEMY';
  const clientAddress = quotationData.client_address || '40-7-31,Moghalrajpuram, Vijayawada - 520010.';
  const clientMobile = quotationData.client_mobile || quotationData.phone || '+91 95020 93357';
  const clientEmail = quotationData.client_email || quotationData.email || 'info@modernacademy.in';

  const defaultItems = [
    {
      sno: 1,
      particulars: 'Tally Workshop',
      to_target: 'B.com',
      days: '45 Days',
      price_per_day: 2000,
      amount: 90000.00,
    }
  ];

  const items = (quotationData.items && quotationData.items.length > 0) ? quotationData.items : defaultItems;
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const paymentTerms1 = quotationData.payment_terms_1 || '50% Advance on Day 1';
  const paymentTerms2 = quotationData.payment_terms_2 || '50% after Workshop completion';
  const paymentNote = quotationData.payment_note || '*Note: GST & TDS Applicable*';

  const bankHolder = quotationData.bank_account_holder || 'AOTMS Global Private Limited';
  const bankName = quotationData.bank_name || 'HDFC';
  const bankNo = quotationData.bank_account_no || '50200113949476';
  const bankIfsc = quotationData.bank_ifsc || 'HDFC0003975';
  const bankBranch = quotationData.bank_branch || 'Enikepadu, Vijayawada-521108.';

  const signatoryName = quotationData.signatory_name || 'Ameenuddin Sayyed';
  const signatoryRole = quotationData.signatory_role || 'Founder & CEO';
  const signatoryCompany = quotationData.signatory_company || 'AOTMS Global Private Limited';

  return (
    <div ref={ref} className="pdf-quotation-container" style={{ width: '100%', maxWidth: '820px', margin: '0 auto' }}>
      <div
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: "'Inter', sans-serif",
          fontSize: '12.5px',
          lineHeight: '1.45',
          padding: isPreview ? '20px 24px' : '28px 32px',
          boxSizing: 'border-box',
          border: '2px solid #000000',
          background: '#ffffff',
          boxShadow: isPreview ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
          position: 'relative',
        }}
      >
        {/* Top Branding Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', position: 'relative' }}>
          <div style={{ width: '130px' }} />
          <div style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
            <img
              src={logoImg}
              alt="AOTMS Global Logo"
              style={{ height: '62px', objectFit: 'contain' }}
              onError={(e) => { e.target.src = atmLogoImg; }}
            />
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#000000', fontWeight: '700', width: '130px' }}>
            <div>📞 +91 80199 42233</div>
            <div>📞 +91 80199 52233</div>
          </div>
        </div>

        {/* Header Accent Bar / Dividing Border */}
        <div style={{ height: '2px', background: '#000000', width: '100%', marginBottom: '16px' }} />

        {/* Title: Quotation */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px', fontWeight: '800', textDecoration: 'underline', color: '#000000', letterSpacing: '0.5px' }}>
            Quotation
          </span>
        </div>

        {/* Quotation Meta */}
        <div style={{ marginBottom: '16px', lineHeight: '1.6', fontSize: '12.5px', fontWeight: '700' }}>
          <div>Quotation No: <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px' }}>{quotationNo}</span></div>
          <div>Date: {quotationDate}</div>
          <div>Valid Till : {validTill}</div>
        </div>

        {/* Quotation From & Quotation To Grid Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #000000' }}>
              <th style={{ width: '50%', padding: '8px 12px', textAlign: 'left', fontWeight: '800', fontSize: '13px', borderRight: '1.5px solid #000000' }}>
                Quotation From
              </th>
              <th style={{ width: '50%', padding: '8px 12px', textAlign: 'left', fontWeight: '800', fontSize: '13px' }}>
                Quotation To
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* Quotation From Cell */}
              <td style={{ padding: '10px 12px', verticalAlign: 'top', borderRight: '1.5px solid #000000', lineHeight: '1.5' }}>
                <div style={{ fontWeight: '800', fontSize: '13px' }}>{companyName}</div>
                <div>{companyAddress}</div>
                <div>Mobile: {companyMobile}</div>
                <div>Email : {companyEmail}</div>
                <div style={{ fontWeight: '700' }}>GST: {companyGst}</div>
              </td>

              {/* Quotation To Cell */}
              <td style={{ padding: '10px 12px', verticalAlign: 'top', lineHeight: '1.5' }}>
                <div style={{ fontWeight: '800', fontSize: '13px' }}>{clientName}</div>
                <div>{clientAddress}</div>
                <div>Mobile: {clientMobile}</div>
                <div>Email:{clientEmail}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section Heading: Description & Pricing */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '15px', fontWeight: '800', textDecoration: 'underline', color: '#000000' }}>
            Description &amp; Pricing
          </span>
        </div>

        {/* Description & Pricing Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', marginBottom: '24px', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #000000', background: '#f8fafc', textAlign: 'center', fontWeight: '800' }}>
              <th style={{ padding: '8px 6px', borderRight: '1.5px solid #000000', width: '7%' }}>S.No</th>
              <th style={{ padding: '8px 10px', borderRight: '1.5px solid #000000', width: '38%', textAlign: 'left' }}>Particulars</th>
              <th style={{ padding: '8px 6px', borderRight: '1.5px solid #000000', width: '13%' }}>To</th>
              <th style={{ padding: '8px 6px', borderRight: '1.5px solid #000000', width: '13%' }}>Days</th>
              <th style={{ padding: '8px 8px', borderRight: '1.5px solid #000000', width: '14%', textAlign: 'right' }}>Price Per Day</th>
              <th style={{ padding: '8px 10px', width: '15%', textAlign: 'right' }}>Final Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ verticalAlign: 'top' }}>
                <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1.5px solid #000000', fontWeight: '700' }}>
                  {item.sno || idx + 1}
                </td>
                <td style={{ padding: '8px 10px', borderRight: '1.5px solid #000000', fontWeight: '700' }}>
                  {item.particulars}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1.5px solid #000000' }}>
                  {item.to_target || item.to || 'B.com'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1.5px solid #000000' }}>
                  {item.days || '45 Days'}
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right', borderRight: '1.5px solid #000000' }}>
                  {fmtCurrency(item.price_per_day || item.rate || 2000)}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>
                  {fmtCurrency(item.amount)}
                </td>
              </tr>
            ))}

            {/* Empty Spacer Row for clean vertical layout */}
            <tr style={{ height: '35px' }}>
              <td style={{ borderRight: '1.5px solid #000000' }}></td>
              <td style={{ borderRight: '1.5px solid #000000' }}></td>
              <td style={{ borderRight: '1.5px solid #000000' }}></td>
              <td style={{ borderRight: '1.5px solid #000000' }}></td>
              <td style={{ borderRight: '1.5px solid #000000' }}></td>
              <td></td>
            </tr>

            {/* Total Row */}
            <tr style={{ borderTop: '1.5px solid #000000', fontWeight: '800', background: '#f8fafc' }}>
              <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1.5px solid #000000', fontSize: '13px' }}>
                Total
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13.5px' }}>
                {fmtCurrency(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Payment Terms Section */}
        <div style={{ marginBottom: '20px', lineHeight: '1.6' }}>
          <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px' }}>
            Payment Terms :
          </div>
          <ul style={{ margin: '0 0 4px 20px', padding: 0, fontSize: '12.5px', fontWeight: '700' }}>
            <li>{paymentTerms1}</li>
            <li>{paymentTerms2}</li>
          </ul>
          <div style={{ fontWeight: '700', fontSize: '12px', color: '#1e293b', fontStyle: 'italic', marginLeft: '4px' }}>
            {paymentNote}
          </div>
        </div>

        {/* ACCOUNT DETAILS & Authorized Signatory Block Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', marginBottom: '24px' }}>
          <tbody>
            <tr>
              {/* Account Details */}
              <td style={{ width: '55%', padding: '10px 12px', verticalAlign: 'top', borderRight: '1.5px solid #000000', lineHeight: '1.5' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', textDecoration: 'underline', marginBottom: '6px' }}>
                  ACCOUNT DETAILS
                </div>
                <div style={{ fontWeight: '700' }}>Name: {bankHolder}</div>
                <div style={{ fontWeight: '700' }}>Bank: {bankName}</div>
                <div style={{ fontWeight: '700' }}>A/c Number: <span style={{ fontFamily: "'Inter', sans-serif" }}>{bankNo}</span></div>
                <div style={{ fontWeight: '700' }}>IFSC :{bankIfsc}</div>
                <div style={{ fontWeight: '700' }}>{bankBranch}</div>
              </td>

              {/* Authorized Signatory */}
              <td style={{ width: '45%', padding: '10px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                <div style={{ fontWeight: '800', fontSize: '12.5px', marginBottom: '8px' }}>
                  Authorized Signatory
                </div>

                <div style={{ fontFamily: "'Brush Script MT', 'cursive', cursive", fontSize: '24px', color: '#0f172a', fontWeight: 'bold', margin: '6px 0', transform: 'rotate(-4deg)' }}>
                  SD. Ameenuddin
                </div>

                <div style={{ fontWeight: '800', fontSize: '13px', color: '#000000' }}>
                  {signatoryName}
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155' }}>
                  {signatoryRole}
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#000000' }}>
                  {signatoryCompany}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Footer Border & Text */}
        <div style={{ borderTop: '1.5px solid #000000', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: '#000000' }}>
          <div>www.academyoftechmasters.com | 80199 52233</div>
          <div>2nd Floor, Pothuri Towers, MG Road, near DV Manor Hotel, VJA -10</div>
        </div>
      </div>
    </div>
  );
});

export default QuotationDocument;
