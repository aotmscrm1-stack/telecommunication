import React, { forwardRef } from 'react';
import atmLogoImg from '../assets/atm-logo.jpeg';
import logoImg from '../assets/aotms-global-logo.png';
import paymentQrImg from '../assets/payment-qr.png';
import aotmsStampImg from '../assets/image-removebg-preview.png';
import { numberToWords } from '../utils/numberToWords';

export const InvoiceDocument = forwardRef(({ invoiceData, documentType = 'invoice', isPreview = false }, ref) => {
  if (!invoiceData) return null;

  const fmtCurrency = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const docType = invoiceData.doc_type || documentType || 'invoice';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. OFFICIAL AOTMS MIC QUOTATION FORMAT (Matching AOTMS_MIC_Quotation..docx.pdf)
  // ───────────────────────────────────────────────────────────────────────────
  if (docType === 'quotation') {
    const quotationNo = invoiceData.invoice_number || 'AOTMS-FEB-Q07';
    const quotationDate = invoiceData.invoice_date || '20/02/2026';
    const validTill = invoiceData.valid_till || '02/03/2026';

    const companyName = invoiceData.company_name || 'AOTMS Global Private Limited';
    const companyAddress = invoiceData.company_address || '2nd Floor, Pothuri Towers, MG Road, Near DV Manor, Vijayawada-10';
    const companyMobile = invoiceData.company_mobile || '+91 80199-52233';
    const companyEmail = invoiceData.company_email || 'Info@aotms.in';
    const companyGst = invoiceData.company_gst || 'GSAPS2603R1Z5';

    const clientName = invoiceData.client_name || 'MODERN ACADEMY';
    const clientAddress = invoiceData.client_address || '40-7-31,Moghalrajpuram, Vijayawada - 520010.';
    const clientMobile = invoiceData.client_mobile || invoiceData.phone || '+91 95020 93357';
    const clientEmail = invoiceData.client_email || invoiceData.email || 'info@modernacademy.in';

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

    const items = (invoiceData.items && invoiceData.items.length > 0) ? invoiceData.items : defaultItems;
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const paymentTerms1 = invoiceData.payment_terms_1 || '50% Advance on Day 1';
    const paymentTerms2 = invoiceData.payment_terms_2 || '50% after Workshop completion';
    const paymentNote = invoiceData.payment_note || '*Note: GST & TDS Applicable*';

    const bankHolder = invoiceData.bank_account_holder || 'AOTMS Global Private Limited';
    const bankName = invoiceData.bank_name || 'HDFC';
    const bankNo = invoiceData.bank_account_no || '50200113949476';
    const bankIfsc = invoiceData.bank_ifsc || 'HDFC0003975';
    const bankBranch = invoiceData.bank_branch || 'Enikepadu, Vijayawada-521108.';

    const signatoryName = invoiceData.signatory_name || 'Ameenuddin Sayyed';
    const signatoryRole = invoiceData.signatory_role || 'Founder & CEO';
    const signatoryCompany = invoiceData.signatory_company || 'AOTMS Global Private Limited';

    return (
      <div ref={ref} className="pdf-quotation-container" style={{ width: '100%', maxWidth: '820px', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
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
            <div>Quotation No: <span style={{ fontFamily: "'Segoe UI', monospace", fontSize: '13px' }}>{quotationNo}</span></div>
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
              Description & Pricing
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
                  <div style={{ fontWeight: '700' }}>A/c Number: <span style={{ fontFamily: 'monospace' }}>{bankNo}</span></div>
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
            <div>WWW.AOTMS.IN | 80199 52233</div>
            <div>2nd Floor, Pothuri Towers, MG Road, near DV Manor Hotel, VJA -10</div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. OFFICIAL TAX INVOICE FORMAT (Matching URCE sample.pdf)
  // ───────────────────────────────────────────────────────────────────────────
  if (docType === 'invoice' || docType === 'quotation') {
    const isQuotation = docType === 'quotation';
    const invoiceNo = invoiceData.invoice_number || (isQuotation ? 'AOTMS-QUO-2026-001' : 'AOTMS-AUGINV01');
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

    // Tax & Totals calculation
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const gstRate = invoiceData.gst_rate !== undefined && invoiceData.gst_rate !== '' ? Number(invoiceData.gst_rate) : 18;
    const gstAmount = Math.round(subtotal * (gstRate / 100));
    const totalAmount = subtotal + gstAmount;

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
            fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
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
                  {isQuotation ? 'Quotation' : 'Invoice'}
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
                    GSTIN : <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>37ABFCA0501M1ZV</span>
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
                          {isQuotation ? 'Quotation No:' : 'Invoice No:'}
                        </td>
                        <td style={{ padding: '4px 8px', fontWeight: '800', fontFamily: 'monospace', fontSize: '12.5px' }}>
                          {invoiceNo}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #000000' }}>
                        <td style={{ padding: '4px 8px', fontWeight: '700', borderRight: '1px solid #000000' }}>
                          {isQuotation ? 'Quotation Date :' : 'Invoice Date :'}
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

                      {/* GST Line Row */}
                      {gstAmount > 0 && (
                        <tr>
                          <td style={{ borderRight: '1px solid #000000' }}></td>
                          <td style={{ padding: '4px 10px', borderRight: '1px solid #000000', textAlign: 'right', fontWeight: '700' }}>
                            GST @ {gstRate}%
                          </td>
                          <td style={{ borderRight: '1px solid #000000' }}></td>
                          <td style={{ borderRight: '1px solid #000000' }}></td>
                          <td style={{ borderRight: '1px solid #000000' }}></td>
                          <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '700' }}>
                            {fmtCurrency(gstAmount)}
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
                          <td style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '12.5px' }}>
                            : {bankDetails.accountNo}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600' }}>HDFC / IFSC</td>
                          <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>: {bankDetails.ifsc}</td>
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
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. OFFICIAL OFFER LETTER FORMAT (5 Pages)
  // ───────────────────────────────────────────────────────────────────────────
  const clientName = invoiceData.client_name || 'Candidate Name';
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
  const incentiveMonthly = Number(invoiceData.incentive) || 0;
  const incentiveAnnual = incentiveMonthly * 12;
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
    <div ref={ref} className="pdf-5page-container" style={{ width: '210mm', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

      {/* ── PAGE 1 OF 5 ────────────────────────────────────────────────── */}
      <div className="offer-letter-page" style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Page 1 of 5</div>

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
          <div style={{ fontSize: 14, color: '#111' }}>To,</div>
          <div style={{ fontSize: 15.5, color: '#000', fontWeight: 600 }}>{clientName}</div>
        </div>

        <div style={{ marginBottom: 16, textAlign: 'justify', lineHeight: 1.72, fontSize: 14.2 }}>
          <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 600 }}>Dear {shortName},</div>
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
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', padding: '6px', borderBottom: '1px solid #000000', background: '#f3f4f6' }}>
            COMPENSATION PLAN
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', width: '40%', borderRight: '1px solid #000000' }}>Name</td>
                <td colSpan={2} style={{ padding: '7.5px 14px', fontWeight: 600 }}>{clientName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000' }}>Designation</td>
                <td colSpan={2} style={{ padding: '7.5px 14px', fontWeight: 600 }}>{designation}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000', background: '#e5e7eb', fontWeight: 600 }}>
                <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000' }}>Components Category</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000', width: '30%' }}>Monthly</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', width: '30%' }}>Annual</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000', fontWeight: 600 }}>Total Gross CTC</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000', fontWeight: 600 }}>{fmtCurrency(monthlyCtc)}</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(annualCtc)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000' }}>Basic Salary</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(basicMonthly)}</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right' }}>{fmtCurrency(basicAnnual)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Anchored Page Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
          <span>AOTMS Global Private Limited — Confidential</span>
          <span>Page 1 of 5</span>
        </div>
      </div>

      {/* ── PAGE 2 OF 5 ────────────────────────────────────────────────── */}
      <div className="offer-letter-page" style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Page 2 of 5</div>

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

        <div style={{ border: '1px solid #000000', marginBottom: 22 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', width: '40%', borderRight: '1px solid #000000' }}>HRA</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000', width: '30%' }}>{fmtCurrency(hraMonthly)}</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', width: '30%' }}>{fmtCurrency(hraAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000' }}>Medical</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(medicalMonthly)}</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right' }}>{fmtCurrency(medicalAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000' }}>Conveyance</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(conveyanceMonthly)}</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right' }}>{fmtCurrency(conveyanceAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000' }}>Food Transport Allowance</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(foodMonthly)}</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right' }}>{fmtCurrency(foodAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000' }}>Incentive</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(incentiveMonthly)}</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right' }}>{fmtCurrency(incentiveAnnual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000' }}>Dearness Allowance</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(daMonthly)}</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right' }}>{fmtCurrency(daAnnual)}</td>
              </tr>

              {/* Custom Earnings */}
              {customEarnings.map((earn, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                  <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000' }}>{earn.name}</td>
                  <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(earn.monthly)}</td>
                  <td style={{ padding: '7.5px 14px', textAlign: 'right' }}>{fmtCurrency(earn.annual || (earn.monthly * 12))}</td>
                </tr>
              ))}

              {/* Net Earnings */}
              <tr style={{ background: '#f3f4f6', fontWeight: 600 }}>
                <td style={{ padding: '8px 14px', borderRight: '1px solid #000000' }}>Net Earnings</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(netMonthly)}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right' }}>{fmtCurrency(netAnnual)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, textDecoration: 'underline' }}>Deductions Breakdown</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, border: '1px solid #000000' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '7.5px 14px', width: '40%', borderRight: '1px solid #000000' }}>Professional Tax (PT)</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000', width: '30%' }}>{fmtCurrency(ptMonthly)}</td>
                <td style={{ padding: '7.5px 14px', textAlign: 'right', width: '30%' }}>{fmtCurrency(ptAnnual)}</td>
              </tr>
              {customDeductions.map((ded, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                  <td style={{ padding: '7.5px 14px', borderRight: '1px solid #000000' }}>{ded.name}</td>
                  <td style={{ padding: '7.5px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(ded.monthly)}</td>
                  <td style={{ padding: '7.5px 14px', textAlign: 'right' }}>{fmtCurrency(ded.annual || (ded.monthly * 12))}</td>
                </tr>
              ))}
              <tr style={{ background: '#fee2e2', fontWeight: 600 }}>
                <td style={{ padding: '8px 14px', borderRight: '1px solid #000000' }}>Total Deductions</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', borderRight: '1px solid #000000' }}>{fmtCurrency(totalDeductionsMonthly)}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right' }}>{fmtCurrency(totalDeductionsAnnual)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Anchored Page Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
          <span>AOTMS Global Private Limited — Confidential</span>
          <span>Page 2 of 5</span>
        </div>
      </div>

      {/* ── PAGE 3 OF 5 ────────────────────────────────────────────────── */}
      <div className="offer-letter-page" style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Page 3 of 5</div>

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

        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, textDecoration: 'underline', marginBottom: 20 }}>
          TERMS & CONDITIONS OF EMPLOYMENT
        </div>

        <div style={{ lineHeight: 1.72, fontSize: 14, color: '#1f2937' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>1. Probation & Confirmation</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              Your probation period will be from {probationPeriod}. During this probation period, your performance, technical proficiency, attendance, and professional conduct will be continuously evaluated by management. Upon successful completion of probation, your employment with the company will be confirmed in writing. Management reserves the right to extend the probation period if deemed necessary.
            </p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>2. Work Timings & Hours</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              Your standard work timings will be {workTimings}, Monday through Saturday. You may be required to work additional hours or shifts depending on operational, client delivery, or project milestones.
            </p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>3. Leave Policy & Public Holidays</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              You will be entitled to paid leave and public holidays in accordance with the Company HR Leave Policy. Unauthorized absence exceeding 3 consecutive working days without prior approval will be considered abandonment of employment and subject to disciplinary action.
            </p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>4. Confidentiality & Non-Disclosure (NDA)</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              You shall maintain strict confidentiality regarding all company proprietary software, source codes, database schemas, client contracts, trade secrets, financial records, and operational strategies. You shall not disclose, duplicate, or transfer any company data or intellectual property to any third party during or after your employment.
            </p>
          </div>
        </div>

        {/* Anchored Page Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
          <span>AOTMS Global Private Limited — Confidential</span>
          <span>Page 3 of 5</span>
        </div>
      </div>

      {/* ── PAGE 4 OF 5 ────────────────────────────────────────────────── */}
      <div className="offer-letter-page" style={pageContainerStyle}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Page 4 of 5</div>

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

        <div style={{ lineHeight: 1.72, fontSize: 14, color: '#1f2937' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>5. Professional Conduct & Conflict of Interest</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              During your employment with AOTMS Global Private Limited, you shall devote your full business time, attention, and effort to company duties. You shall not engage in any secondary employment, freelancing, consulting, or business activities that conflict with the company's business interests.
            </p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>6. Termination & Notice Period</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              Post confirmation, either party may terminate employment by providing 30 days written notice or gross salary in lieu thereof. During probation, the notice period required by either party shall be 15 days. In case of gross misconduct, breach of confidentiality, fraud, or violation of company policies, the Company reserves the right to terminate employment immediately without notice or compensation.
            </p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>7. Return of Company Property</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              Upon termination of employment for any reason, you shall immediately surrender to the company all assigned laptops, access cards, documents, software credentials, customer databases, and physical/digital assets in your possession.
            </p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>8. Governing Law & Jurisdiction</div>
            <p style={{ margin: '0', textAlign: 'justify' }}>
              This offer letter and employment contract shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts situated at Vijayawada, Andhra Pradesh.
            </p>
          </div>
        </div>

        {/* Anchored Page Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
          <span>AOTMS Global Private Limited — Confidential</span>
          <span>Page 4 of 5</span>
        </div>
      </div>

      {/* ── PAGE 5 OF 5 ────────────────────────────────────────────────── */}
      <div className="offer-letter-page" style={{ ...pageContainerStyle, pageBreakAfter: 'avoid', breakAfter: 'avoid' }}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Page 5 of 5</div>

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

        <div style={{ fontWeight: 700, fontSize: 15, textDecoration: 'underline', marginBottom: 12 }}>
          JOINING FORMALITIES & DOCUMENT CHECKLIST
        </div>
        <p style={{ margin: '0 0 12px 0', fontSize: 14 }}>
          Please submit self-attested copies of the following documents on or before your joining date ({offerDate}):
        </p>
        <ul style={{ margin: '0 0 20px 20px', padding: 0, fontSize: 13.5, lineHeight: 1.8 }}>
          <li>Educational Certificates (SSC/10th, Intermediate/12th, Graduation Degree & Marksheets)</li>
          <li>Previous Employer Relieving Letter & Service Certificate (if applicable)</li>
          <li>Last 3 Months Salary Slips / Bank Statement (if applicable)</li>
          <li>Aadhaar Card, PAN Card, and Passport (if available)</li>
          <li>4 Recent Passport-size Photographs</li>
          <li>Cancelled Cheque or Bank Passbook copy for salary account setup</li>
        </ul>

        <div style={{ border: '1px solid #000000', padding: '16px 18px', background: '#f9fafb', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, textDecoration: 'underline', marginBottom: 8 }}>
            ACCEPTANCE OF OFFER & DECLARATION
          </div>
          <p style={{ margin: '0 0 14px 0', fontSize: 13.5, lineHeight: 1.65, textAlign: 'justify' }}>
            I, {clientName}, hereby accept the offer of employment as "{designation}" with AOTMS Global Private Limited on the terms and conditions outlined in this offer letter (Pages 1 to 5). I confirm that I will join duty on {offerDate} and agree to abide by all the rules, regulations, policies, and procedures of the company as amended from time to time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16, paddingTop: 14, borderTop: '1px solid #000000' }}>
            <div>
              <div style={{ fontSize: 13.5, color: '#4b5563', marginBottom: 24 }}>Candidate Signature: ______________________</div>
              <div style={{ fontSize: 14, color: '#000', fontWeight: 600 }}>Name: {clientName}</div>
              <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>Date: ________________________</div>
              <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>Place: ________________________</div>
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 13.5, color: '#000000', fontWeight: 600 }}>For AOTMS GLOBAL PRIVATE LIMITED</div>

              {/* Official AOTMS Stamp reflected Upper of Deenaz Shaik Name */}
              <div style={{ position: 'relative', margin: '4px 0 2px', width: 96, height: 96 }}>
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
                    fontSize: 23,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  Deenaz Shaik
                </div>
              </div>

              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600 }}>Deenaz Shaik</div>
              <div style={{ fontSize: 13, color: '#475569' }}>HR Manager</div>
            </div>
          </div>
        </div>

        {/* Anchored Page Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
          <span>AOTMS Global Private Limited — Confidential</span>
          <span>Page 5 of 5</span>
        </div>
      </div>

    </div>
  );
});

export default InvoiceDocument;
