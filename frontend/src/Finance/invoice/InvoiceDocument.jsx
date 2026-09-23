import React, { forwardRef } from 'react';
import atmLogoImg from '../../assets/atm-logo.jpeg';
import logoImg from '../../assets/aotms-global-logo.png';
import paymentQrImg from '../../assets/payment-qr.png';
import aotmsStampImg from '../../assets/image-removebg-preview.png';
import { numberToWords } from '../../utils/numberToWords';

export const InvoiceDocument = forwardRef(({ invoiceData, isPreview = false }, ref) => {
  if (!invoiceData) return null;

  const fmtCurrency = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const invoiceNo = invoiceData.invoice_number || 'AOTMS-AUGINV01';
  const invoiceDate = invoiceData.invoice_date || '5/8/2026';
  const dueDate = invoiceData.due_date || '10/8/2026';
  const paymentNote = invoiceData.payment_note || 'Terms Of Payment - 5Days';

  const clientName = invoiceData.client_name || 'Usharaama Educational Academy';
  const clientAddress = invoiceData.client_address || 'NH-5, Near Gannavaram, Telaprolu, Unguturu, Krishna, AP-521109';
  const clientMobile = invoiceData.client_mobile || invoiceData.phone || '';
  const clientEmail = invoiceData.client_email || invoiceData.email || 'anusid.1517@gmail.com';

  // Particulars / Line items
  const defaultItems = [
    {
      sno: 1,
      particulars: 'Workshop - Intelligent AI Development\nFrom Innovation to Deployment',
      sac: '999293',
      rate: 7000.00,
      per: '6Days',
      amount: 42000.00,
    },
  ];

  const items = (invoiceData.items && invoiceData.items.length > 0) ? invoiceData.items : defaultItems;

  // Tax & Totals calculation (CGST 9% + SGST 9%)
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const cgstRate = invoiceData.cgst_rate !== undefined && invoiceData.cgst_rate !== '' 
    ? Number(invoiceData.cgst_rate) 
    : (invoiceData.gst_rate !== undefined && invoiceData.gst_rate !== '' ? Number(invoiceData.gst_rate) / 2 : 9);
  const sgstRate = invoiceData.sgst_rate !== undefined && invoiceData.sgst_rate !== '' 
    ? Number(invoiceData.sgst_rate) 
    : (invoiceData.gst_rate !== undefined && invoiceData.gst_rate !== '' ? Number(invoiceData.gst_rate) / 2 : 9);

  const cgstAmount = Math.round(subtotal * (cgstRate / 100));
  const sgstAmount = Math.round(subtotal * (sgstRate / 100));
  const totalAmount = subtotal + cgstAmount + sgstAmount;

  const amountInWords = totalAmount > 0 ? `INR ${numberToWords(Math.round(totalAmount))} Only` : 'INR Zero Only';

  // Bank Details
  const bankDetails = {
    accountHolder: invoiceData.bank_account_holder || 'AOTMS GLOBAL PRIVATE LIMITED',
    bankName: invoiceData.bank_name || 'HDFC BANK',
    accountNo: invoiceData.bank_account_no || '50200120568031',
    ifsc: invoiceData.bank_ifsc || 'HDFC0009062',
    branch: invoiceData.bank_branch || 'Gurunanak Colony -520008',
  };

  return (
    <div ref={ref} className="pdf-invoice-container" style={{ width: '100%', maxWidth: '820px', margin: '0 auto' }}>
      <div
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: "'Inter', sans-serif",
          fontSize: '12.5px',
          lineHeight: '1.4',
          padding: isPreview ? '20px 24px' : '28px 32px',
          boxSizing: 'border-box',
          border: '2px solid #000000',
          background: '#fff',
          boxShadow: isPreview ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        {/* Main Outer Table Grid */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000' }}>
          <tbody>
            {/* Header Title Bar */}
            <tr>
              <td
                colSpan={2}
                style={{
                  textAlign: 'center',
                  fontWeight: '800',
                  fontSize: '18px',
                  padding: '8px',
                  borderBottom: '1.5px solid #000000',
                  letterSpacing: '0.5px',
                  textTransform: 'capitalize',
                }}
              >
                Tax Invoice
              </td>
            </tr>

            {/* Company Info (Left) & Logo + Metadata (Right) */}
            <tr>
              {/* Left Cell: Company Details */}
              <td
                style={{
                  width: '58%',
                  verticalAlign: 'top',
                  padding: '10px 12px',
                  borderRight: '1.5px solid #000000',
                  borderBottom: '1.5px solid #000000',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '14px', color: '#000000' }}>
                  AOTMS GLOBAL PVT.LTD
                </div>
                <div>40-1-140/2, SRI POTHURI TOWERS</div>
                <div>M.G ROAD, LABBIPET,VIJAYAWADA</div>
                <div style={{ fontWeight: '700', marginTop: '2px' }}>
                  GSTIN : <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px' }}>37ABFCA0501M1ZV</span>
                </div>
                <div>State Name : Andhra Pradesh, Code : 520010</div>
                <div>
                  E-Mail : <a href="mailto:info@aotms.in" style={{ color: '#000000', textDecoration: 'none' }}>info@aotms.in</a>
                </div>
                <div>
                  Phone : <a href="tel:8019952233" style={{ color: '#000000', textDecoration: 'none' }}>8019952233</a>
                </div>
              </td>

              {/* Right Cell: Logo + Invoice No/Date Grid */}
              <td
                style={{
                  width: '42%',
                  verticalAlign: 'top',
                  padding: '0',
                  borderBottom: '1.5px solid #000000',
                }}
              >
                {/* Logo Display */}
                <div
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1.5px solid #000000',
                    minHeight: '65px',
                    background: '#ffffff',
                  }}
                >
                  <img
                    src={logoImg}
                    alt="AOTMS Global Pvt Ltd Logo"
                    style={{ height: '54px', maxWidth: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.src = atmLogoImg; }}
                  />
                </div>

                {/* Metadata Key-Value Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #000000' }}>
                      <td style={{ padding: '4px 8px', fontWeight: '700', width: '40%', borderRight: '1px solid #000000' }}>
                        Invoice No:
                      </td>
                      <td style={{ padding: '4px 8px', fontWeight: '800', fontFamily: "'Inter', sans-serif", fontSize: '12.5px' }}>
                        {invoiceNo}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000000' }}>
                      <td style={{ padding: '4px 8px', fontWeight: '700', borderRight: '1px solid #000000' }}>
                        Invoice Date :
                      </td>
                      <td style={{ padding: '4px 8px' }}>{invoiceDate}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000000' }}>
                      <td style={{ padding: '4px 8px', fontWeight: '700', borderRight: '1px solid #000000' }}>
                        Due Date :
                      </td>
                      <td style={{ padding: '4px 8px' }}>{dueDate}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px', fontWeight: '700', borderRight: '1px solid #000000' }}>
                        Payment Note :
                      </td>
                      <td style={{ padding: '4px 8px', fontWeight: '700' }}>{paymentNote}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* Bill TO Section */}
            <tr>
              <td
                colSpan={2}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1.5px solid #000000',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '13px', textDecoration: 'underline', marginBottom: '2px' }}>
                  Bill TO:-
                </div>
                <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#000000' }}>
                  {clientName}
                </div>
                <div>{clientAddress}</div>
                {clientMobile && <div>Mobile: {clientMobile}</div>}
                {clientEmail && <div>Email:{clientEmail}</div>}
              </td>
            </tr>

            {/* Itemized Particulars Table */}
            <tr>
              <td colSpan={2} style={{ padding: '0', borderBottom: '1.5px solid #000000' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #000000', textAlign: 'center', background: '#f8fafc' }}>
                      <th style={{ padding: '6px', borderRight: '1px solid #000000', width: '6%', fontWeight: '700' }}>S.no</th>
                      <th style={{ padding: '6px 10px', borderRight: '1px solid #000000', width: '50%', textAlign: 'left', fontWeight: '700' }}>Particulars</th>
                      <th style={{ padding: '6px', borderRight: '1px solid #000000', width: '12%', fontWeight: '700' }}>SAC</th>
                      <th style={{ padding: '6px', borderRight: '1px solid #000000', width: '11%', fontWeight: '700' }}>Rate</th>
                      <th style={{ padding: '6px', borderRight: '1px solid #000000', width: '9%', fontWeight: '700' }}>PER</th>
                      <th style={{ padding: '6px 10px', width: '12%', textAlign: 'right', fontWeight: '700' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ verticalAlign: 'top' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1px solid #000000' }}>
                          {item.sno || idx + 1}
                        </td>
                        <td style={{ padding: '8px 10px', borderRight: '1px solid #000000', whiteSpace: 'pre-line' }}>
                          <div style={{ fontWeight: '600' }}>{item.particulars}</div>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1px solid #000000' }}>
                          {item.sac || '999293'}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', borderRight: '1px solid #000000' }}>
                          {fmtCurrency(item.rate)}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1px solid #000000' }}>
                          {item.per || '1Unit'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>
                          {fmtCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}

                    {/* CGST Line Row */}
                    {cgstAmount > 0 && (
                      <tr>
                        <td style={{ borderRight: '1px solid #000000' }}></td>
                        <td style={{ padding: '4px 10px', borderRight: '1px solid #000000', textAlign: 'right', fontWeight: '700' }}>
                          CGST @ {cgstRate}%
                        </td>
                        <td style={{ borderRight: '1px solid #000000' }}></td>
                        <td style={{ borderRight: '1px solid #000000' }}></td>
                        <td style={{ borderRight: '1px solid #000000' }}></td>
                        <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '700' }}>
                          {fmtCurrency(cgstAmount)}
                        </td>
                      </tr>
                    )}

                    {/* SGST Line Row */}
                    {sgstAmount > 0 && (
                      <tr>
                        <td style={{ borderRight: '1px solid #000000' }}></td>
                        <td style={{ padding: '4px 10px', borderRight: '1px solid #000000', textAlign: 'right', fontWeight: '700' }}>
                          SGST @ {sgstRate}%
                        </td>
                        <td style={{ borderRight: '1px solid #000000' }}></td>
                        <td style={{ borderRight: '1px solid #000000' }}></td>
                        <td style={{ borderRight: '1px solid #000000' }}></td>
                        <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '700' }}>
                          {fmtCurrency(sgstAmount)}
                        </td>
                      </tr>
                    )}

                    {/* Spacer rows for clean PDF layout matching sample */}
                    <tr style={{ height: '40px' }}>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td></td>
                    </tr>

                    {/* Total Row */}
                    <tr style={{ borderTop: '1.5px solid #000000', fontWeight: '800', background: '#f8fafc' }}>
                      <td colSpan={5} style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #000000', fontSize: '13px' }}>
                        Total
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: '13.5px' }}>
                        {fmtCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* Amount Chargeable in words */}
            <tr>
              <td
                colSpan={2}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1.5px solid #000000',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: '700' }}>Amount Chargeable (inwords )</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#000000', marginTop: '2px' }}>
                  {amountInWords}
                </div>
              </td>
            </tr>

            {/* Payment Details & Bank Details Row */}
            <tr>
              {/* Left: QR For Payment */}
              <td
                style={{
                  width: '45%',
                  verticalAlign: 'top',
                  padding: '10px 12px',
                  borderRight: '1.5px solid #000000',
                  borderBottom: '1.5px solid #000000',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '13px', textDecoration: 'underline', marginBottom: '8px' }}>
                  QR For Payment
                </div>
                {/* Payment QR Code Box */}
                <div
                  style={{
                    width: '130px',
                    height: '130px',
                    margin: '0 auto',
                    border: '1.5px solid #000000',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                  }}
                >
                  <img
                    src={paymentQrImg}
                    alt="QR For Payment"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>
                <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '6px', fontWeight: '600' }}>
                  UPI / Scan to Pay
                </div>
              </td>

              {/* Right: Bank Details & Authorised Signatory */}
              <td
                style={{
                  width: '55%',
                  verticalAlign: 'top',
                  padding: '0',
                  borderBottom: '1.5px solid #000000',
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #000000' }}>
                  <div style={{ fontWeight: '800', fontSize: '12.5px', marginBottom: '4px' }}>
                    Company's Bank Details
                  </div>
                  <table style={{ width: '100%', fontSize: '12px', lineHeight: '1.5' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '42%', fontWeight: '600' }}>A/C Holder's Name</td>
                        <td style={{ fontWeight: '700' }}>: {bankDetails.accountHolder}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: '600' }}>Bank Name</td>
                        <td style={{ fontWeight: '700' }}>: {bankDetails.bankName}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: '600' }}>A/c No.</td>
                        <td style={{ fontWeight: '700', fontFamily: "'Inter', sans-serif", fontSize: '12.5px' }}>
                          : {bankDetails.accountNo}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: '600' }}>HDFC / IFSC</td>
                        <td style={{ fontWeight: '700', fontFamily: "'Inter', sans-serif" }}>: {bankDetails.ifsc}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: '600' }}>Branch</td>
                        <td style={{ fontWeight: '700' }}>: {bankDetails.branch}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Authorised Signatory Box */}
                <div style={{ padding: '8px 12px', minHeight: '85px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: '700', fontSize: '12px', textAlign: 'right' }}>
                    Authorised Signatory
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '16px' }}>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: '#000000' }}>
                      Ameenuddin Sayyed
                    </div>
                    <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155' }}>
                      Managing Director
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#000000' }}>
                      AOTMS GLOBAL PVT LTD
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            {/* Bottom Declaration Cell */}
            <tr>
              <td
                colSpan={2}
                style={{
                  padding: '8px 12px',
                  fontSize: '11.5px',
                  lineHeight: '1.4',
                }}
              >
                <span style={{ fontWeight: '700' }}>Declaration : </span>
                We declare that invoice shows the actual price and that all particulars are true and correct .
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default InvoiceDocument;
