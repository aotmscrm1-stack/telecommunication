const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');
const { numberToWords } = require('../utils/numberToWords');

// ── GET /api/invoices (List all saved invoices) ─────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { client_name: regex },
        { invoice_number: regex },
        { designation: regex },
        { email: regex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      ok: true,
      invoices,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── POST /api/invoices (Create new invoice) ──────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const body = req.body || {};
    
    // Auto-generate invoice number if missing
    if (!body.invoice_number) {
      const count = await Invoice.countDocuments();
      body.invoice_number = `AOTMS-INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    }

    // Number to words calculation
    if (body.net_earnings_annual && !body.net_earnings_in_words) {
      body.net_earnings_in_words = numberToWords(body.net_earnings_annual);
    }

    const invoice = new Invoice({
      ...body,
      createdBy: req.user?._id,
    });

    await invoice.save();
    res.status(201).json({ ok: true, invoice, message: 'Invoice saved successfully' });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// ── GET /api/invoices/:id (Fetch single invoice) ─────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ ok: false, message: 'Invoice not found' });
    res.json({ ok: true, invoice });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── DELETE /api/invoices/:id (Delete invoice) ────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ ok: false, message: 'Invoice not found' });
    res.json({ ok: true, message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
