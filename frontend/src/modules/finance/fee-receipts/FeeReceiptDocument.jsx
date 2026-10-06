import React, { forwardRef } from 'react';
import logoImg from '../../../assets/aotms-global-logo.png';
import atmLogoImg from '../../../assets/atm-logo.jpeg';
import { A4Container, A4Page } from '../../../components/Finance/A4TemplateWrapper';
import { numberToWords } from '../../../utils/numberToWords';

export const FeeReceiptDocument = forwardRef(({ receiptData, isPreview = false }, ref) => {
  if (!receiptData) return null;

  const invoiceNo = receiptData.invoice_number !== undefined ? receiptData.invoice_number : (receiptData.receipt_number !== undefined ? receiptData.receipt_number : '');
  const receiptDate = receiptData.invoice_date !== undefined ? receiptData.invoice_date : (receiptData.date !== undefined ? receiptData.date : '');
  const place = receiptData.place !== undefined ? receiptData.place : '';

  const companyPhone = receiptData.company_phone !== undefined ? receiptData.company_phone : '+91 80199-42233';
  const companyEmail = receiptData.company_email !== undefined ? receiptData.company_email : 'hr@aotms.com';

  const studentName = receiptData.student_name !== undefined ? receiptData.student_name : (receiptData.client_name !== undefined ? receiptData.client_name : '');
  const mobileNumber = receiptData.mobile_number !== undefined ? receiptData.mobile_number : (receiptData.phone !== undefined ? receiptData.phone : '');
  const email = receiptData.email !== undefined ? receiptData.email : '';
  const address = receiptData.address !== undefined ? receiptData.address : '';

  const defaultItems = [
    {
      sno: 1,
      course_name: 'AI&ML Full Course',
      qty: 1,
      amount: 24600,
    }
  ];

  const items = (receiptData.items && receiptData.items.length > 0) ? receiptData.items : defaultItems;
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const cgstRate = receiptData.cgst_rate !== undefined && receiptData.cgst_rate !== ''
    ? Number(receiptData.cgst_rate)
    : 9;
  const sgstRate = receiptData.sgst_rate !== undefined && receiptData.sgst_rate !== ''
    ? Number(receiptData.sgst_rate)
    : 9;

  const totalAmount = receiptData.total_amount !== undefined && receiptData.total_amount !== null && !isNaN(Number(receiptData.total_amount))
    ? Number(receiptData.total_amount)
    : (subtotal > 0 && (cgstRate + sgstRate) < 100
        ? Math.round(subtotal / (1 - (cgstRate + sgstRate) / 100))
        : subtotal);

  const cgstAmount = receiptData.cgst_amount !== undefined && receiptData.cgst_amount !== null && !isNaN(Number(receiptData.cgst_amount))
    ? Number(receiptData.cgst_amount)
    : Math.round(totalAmount * (cgstRate / 100));

  const sgstAmount = receiptData.sgst_amount !== undefined && receiptData.sgst_amount !== null && !isNaN(Number(receiptData.sgst_amount))
    ? Number(receiptData.sgst_amount)
    : Math.round(totalAmount * (sgstRate / 100));

  // Convert to words matching reference format "( Thirty thousand rupees only )"
  const getFormattedWords = () => {
    if (receiptData.amount_in_words) {
      return receiptData.amount_in_words;
    }
    const raw = numberToWords(Math.round(totalAmount));
    // e.g. "Rupees Thirty Thousand Only" -> "Thirty thousand rupees only"
    const cleaned = raw.replace(/^Rupees\s+/i, '').replace(/\s+Only$/i, '').trim();
    if (!cleaned || cleaned.toLowerCase() === 'zero') return 'Zero rupees only';
    return `${cleaned} rupees only`;
  };

  const wordsText = getFormattedWords();

  const defaultTerms = [
    'A 50% of advance fee is required to confirm enrollment in the selected course.',
    'The remaining 50% fee must be paid with in 20days from the date of admission or before commencement of the second module ,whichever is earlier.',
    'The advance fee is non – refundable under any circumstance .',
    'Course transfers or batch changes are subject to institute approval and may involve additional charges.',
  ];

  const terms = (receiptData.terms && receiptData.terms.length > 0) ? receiptData.terms : defaultTerms;

  const companyName = receiptData.company_name || 'AOTMS GLOBAL PVT, LTD.';
  const companyAddressFooter = receiptData.company_address_footer || 'POTHURI TOWERS, 2ND FLOOR, Near DV MANOR, MG ROAD, VJA - 520010';

  const outerPageStyle = {
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: "'Inter', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.4',
    width: '794px',
    minHeight: '1123px',
    boxSizing: 'border-box',
    padding: '36px 68px 30px 68px',
    marginBottom: isPreview ? '20px' : '0px',
    position: 'relative',
    background: '#ffffff',
    boxShadow: isPreview ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };

  return (
    <A4Container ref={ref} className="pdf-feereceipt-container">
      <A4Page className="fee-receipt-page">
        <div>
          {/* ── TOP HEADER: Logo & Contact Info ────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <img
              src={logoImg}
              alt="AOTMS GLOBAL PVT. LTD"
              style={{
                width: '490px',
                maxWidth: '100%',
                height: 'auto',
                maxHeight: '150px',
                objectFit: 'contain',
                margin: '0 auto',
                display: 'block'
              }}
              onError={(e) => { e.target.src = atmLogoImg; }}
            />
          </div>

          {/* Contact details line */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            fontWeight: '600',
            color: '#000000',
            marginBottom: '10px',
          }}>
            <div>
              <span style={{ fontWeight: '700' }}>Phone: </span>
              <span style={{ fontWeight: '700' }}>{companyPhone}</span>
            </div>
            <div>
              <span style={{ fontWeight: '700' }}>Email: </span>
              <span style={{ textDecoration: 'underline', color: '#000000', fontWeight: '700' }}>{companyEmail}</span>
            </div>
          </div>

          {/* Divider Line with gap below contact info */}
          <div style={{ height: '2px', backgroundColor: '#000000', width: '100%', marginBottom: '24px' }} />

          {/* ── DOCUMENT TITLE: FEE RECEIPT ───────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <span style={{
              fontSize: '18px',
              fontWeight: '800',
              textDecoration: 'underline',
              color: '#000000',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
            }}>
              FEE RECEIPT
            </span>
          </div>

          {/* ── METADATA (Right-aligned: Date, Place, Invoice) ──────────── */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '22px',
          }}>
            <div style={{
              textAlign: 'right',
              fontSize: '13.5px',
              lineHeight: '1.65',
              fontWeight: '700',
              color: '#000000',
            }}>
              <div>Date : {receiptDate}</div>
              <div>Place : {place}</div>
              <div>Invoice : {invoiceNo}</div>
            </div>
          </div>

          {/* ── STUDENT DETAILS (Left side) ───────────────────────────── */}
          <div style={{
            marginBottom: '26px',
            fontSize: '13.5px',
            lineHeight: '1.75',
            color: '#000000',
          }}>
            <div>
              <span style={{ fontWeight: '700' }}>Name of the student : </span>
              <span style={{ fontWeight: '700' }}>{studentName}</span>
            </div>
            <div>
              <span style={{ fontWeight: '700' }}>Mobile number : </span>
              <span style={{ fontWeight: '700' }}>{mobileNumber}</span>
            </div>
            <div>
              <span style={{ fontWeight: '700' }}>Email : </span>
              <span style={{ fontWeight: '700' }}>{email}</span>
            </div>
            <div>
              <span style={{ fontWeight: '700' }}>Address : </span>
              <span style={{ fontWeight: '700' }}>{address}</span>
            </div>
          </div>

          {/* ── COURSE & TAX TABLE ────────────────────────────────────── */}
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1.5px solid #000000',
            marginBottom: '28px',
            fontSize: '13px',
          }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #000000', fontWeight: '800', textAlign: 'center', background: '#ffffff' }}>
                <th style={{ width: '48%', padding: '7px 10px', borderRight: '1.5px solid #000000', textAlign: 'center' }}>
                  Course Name
                </th>
                <th style={{ width: '13%', padding: '7px 6px', borderRight: '1.5px solid #000000', textAlign: 'center' }}>
                  S.no
                </th>
                <th style={{ width: '13%', padding: '7px 6px', borderRight: '1.5px solid #000000', textAlign: 'center' }}>
                  Qty
                </th>
                <th style={{ width: '26%', padding: '7px 10px', textAlign: 'center' }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Course line items */}
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1.5px solid #000000' }}>
                  <td style={{ padding: '7px 12px', borderRight: '1.5px solid #000000', fontWeight: '700', textAlign: 'center' }}>
                    {item.course_name || item.particulars || 'Course Name'}
                  </td>
                  <td style={{ padding: '7px 6px', borderRight: '1.5px solid #000000', textAlign: 'center', fontWeight: '600' }}>
                    {item.sno !== undefined ? item.sno : idx + 1}
                  </td>
                  <td style={{ padding: '7px 6px', borderRight: '1.5px solid #000000', textAlign: 'center', fontWeight: '600' }}>
                    {item.qty !== undefined ? item.qty : 1}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: '700' }}>
                    {Number(item.amount || 0).toLocaleString('en-IN')}/-
                  </td>
                </tr>
              ))}

              {/* CGST Row */}
              <tr style={{ borderBottom: '1.5px solid #000000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1.5px solid #000000', fontWeight: '700', textAlign: 'center' }}>
                  CGST {cgstRate}%
                </td>
                <td style={{ padding: '6px 6px', borderRight: '1.5px solid #000000', textAlign: 'center' }}></td>
                <td style={{ padding: '6px 6px', borderRight: '1.5px solid #000000', textAlign: 'center' }}></td>
                <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: '600' }}>
                  {cgstAmount.toLocaleString('en-IN')}/-
                </td>
              </tr>

              {/* SGST Row */}
              <tr style={{ borderBottom: '1.5px solid #000000' }}>
                <td style={{ padding: '6px 12px', borderRight: '1.5px solid #000000', fontWeight: '700', textAlign: 'center' }}>
                  SGST {sgstRate}%
                </td>
                <td style={{ padding: '6px 6px', borderRight: '1.5px solid #000000', textAlign: 'center' }}></td>
                <td style={{ padding: '6px 6px', borderRight: '1.5px solid #000000', textAlign: 'center' }}></td>
                <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: '600' }}>
                  {sgstAmount.toLocaleString('en-IN')}/-
                </td>
              </tr>

              {/* Total Row */}
              <tr style={{ borderBottom: '1.5px solid #000000', fontWeight: '800' }}>
                <td style={{ padding: '7px 12px', borderRight: '1.5px solid #000000' }}></td>
                <td colSpan={2} style={{ padding: '7px 6px', borderRight: '1.5px solid #000000', textAlign: 'center', fontSize: '13.5px' }}>
                  Total
                </td>
                <td style={{ padding: '7px 12px', textAlign: 'center', fontSize: '13.5px' }}>
                  {totalAmount.toLocaleString('en-IN')}/-
                </td>
              </tr>

              {/* Rupees in Words Row */}
              <tr>
                <td colSpan={4} style={{ padding: '8px 14px', textAlign: 'center', fontWeight: '700', fontSize: '13px' }}>
                  Rupees in words : ( {wordsText} )
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── TERMS & CONDITIONS ────────────────────────────────────── */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontWeight: '800', fontSize: '13.5px', marginBottom: '10px', color: '#000000' }}>
              Terms &amp; Conditions :
            </div>
            <div style={{ paddingLeft: '14px' }}>
              {terms.map((t, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                  lineHeight: '1.55',
                  fontSize: '12.5px',
                  color: '#000000',
                  fontWeight: '500',
                }}>
                  <span style={{ marginRight: '8px', fontSize: '16px', lineHeight: '1' }}>•</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FOOTER: Company Name & Address (Anchored at Bottom) ───── */}
        <div style={{
          textAlign: 'center',
          color: '#000000',
          fontWeight: '800',
          lineHeight: '1.5',
          fontSize: '12.5px',
          letterSpacing: '0.2px',
          paddingTop: '20px',
        }}>
          <div>{companyName}</div>
          <div style={{ fontSize: '11.5px', marginTop: '2px' }}>
            {companyAddressFooter}
          </div>
        </div>
      </A4Page>
    </A4Container>
  );
});

export default FeeReceiptDocument;
