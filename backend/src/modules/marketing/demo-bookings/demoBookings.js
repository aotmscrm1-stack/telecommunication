const express = require('express');
const router = express.Router();
const DemoBooking = require('../../../database/models/DemoBooking');
const { protect, authorize } = require('../../../core/middleware/auth');

const MOBILE_RE = /^[6-9]\d{9}$/;
const STATUSES = ['new', 'contacted', 'scheduled', 'completed', 'cancelled'];

const asText = (value) => (typeof value === 'string' ? value.trim() : '');
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalizeMobile(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

function parseSchedule(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ─────────────────────────────────────────────────────────────
   POST /api/demo-bookings   (PUBLIC — landing page intake)
   All four fields are mandatory: name, mobile, scheduledAt, message.
   ───────────────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const name = asText(req.body?.name);
    const mobile = normalizeMobile(req.body?.mobile);
    const message = asText(req.body?.message);
    const scheduledAt = parseSchedule(req.body?.scheduledAt);

    const errors = {};
    if (name.length < 2) errors.name = 'Please enter your full name (at least 2 characters).';
    if (!MOBILE_RE.test(mobile)) errors.mobile = 'Enter a valid 10-digit mobile number starting with 6-9.';
    if (!scheduledAt) {
      errors.scheduledAt = 'Choose a preferred date and time for the demo.';
    } else if (scheduledAt.getTime() < Date.now() - 60 * 1000) {
      errors.scheduledAt = 'The demo slot cannot be in the past.';
    }
    if (message.length < 5) errors.message = 'Tell us what you would like to see (at least 5 characters).';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required. Please review the highlighted fields.',
        errors,
      });
    }

    // Graceful duplicate guard — ignore repeat submissions of the same slot.
    const duplicate = await DemoBooking.findOne({
      mobile,
      scheduledAt,
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
    }).lean();

    if (duplicate) {
      return res.status(200).json({
        success: true,
        message: 'This demo request was already received. Our team will call you shortly.',
        data: { id: duplicate._id, name: duplicate.name, scheduledAt: duplicate.scheduledAt },
      });
    }

    const booking = await DemoBooking.create({
      name,
      mobile,
      scheduledAt,
      message,
      source: asText(req.body?.source) || 'landing-page',
      ipAddress: req.ip || '',
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    });

    return res.status(201).json({
      success: true,
      message: 'Your free demo is booked. Our team will confirm on your mobile number.',
      data: {
        id: booking._id,
        name: booking.name,
        mobile: booking.mobile,
        scheduledAt: booking.scheduledAt,
      },
    });
  } catch (err) {
    console.error('Error creating demo booking:', err);
    if (err?.name === 'ValidationError') {
      const errors = {};
      Object.keys(err.errors || {}).forEach((key) => {
        errors[key] = err.errors[key].message;
      });
      return res.status(400).json({ success: false, message: 'Please check the submitted details.', errors });
    }
    return res.status(500).json({ success: false, message: 'Could not book the demo. Please try again.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/demo-bookings/stats   (ADMIN)
   ───────────────────────────────────────────────────────────── */
router.get('/stats', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const now = new Date();

    const [total, today, upcoming, grouped] = await Promise.all([
      DemoBooking.countDocuments({}),
      DemoBooking.countDocuments({ createdAt: { $gte: startOfToday } }),
      DemoBooking.countDocuments({ scheduledAt: { $gte: now }, status: { $in: ['new', 'contacted', 'scheduled'] } }),
      DemoBooking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const byStatus = STATUSES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
    grouped.forEach((row) => {
      if (row?._id) byStatus[row._id] = row.count;
    });

    res.json({
      success: true,
      stats: { total, today, upcoming, byStatus },
    });
  } catch (err) {
    console.error('Error fetching demo booking stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch demo booking stats.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/demo-bookings   (ADMIN — list, search, filter, paginate)
   ───────────────────────────────────────────────────────────── */
router.get('/', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = asText(req.query.status);
    const search = asText(req.query.search);
    const range = asText(req.query.range); // today | week | month | upcoming

    const filter = {};
    if (status && status !== 'all' && STATUSES.includes(status)) filter.status = status;

    if (range === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start };
    } else if (range === 'week') {
      filter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (range === 'month') {
      filter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (range === 'upcoming') {
      filter.scheduledAt = { $gte: new Date() };
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: rx }, { mobile: rx }, { message: rx }];
    }

    const [bookings, total] = await Promise.all([
      DemoBooking.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('handledBy', 'name email')
        .lean(),
      DemoBooking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error('Error fetching demo bookings:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch demo bookings.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/demo-bookings/:id/status   (ADMIN)
   ───────────────────────────────────────────────────────────── */
router.patch('/:id/status', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const status = asText(req.body?.status);
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}.` });
    }

    const booking = await DemoBooking.findByIdAndUpdate(
      req.params.id,
      { status, handledBy: req.user?._id || null, handledAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Demo booking not found.' });
    }

    res.json({ success: true, message: 'Booking status updated.', booking });
  } catch (err) {
    console.error('Error updating demo booking status:', err);
    res.status(500).json({ success: false, message: 'Failed to update booking status.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/demo-bookings/:id   (ADMIN — internal notes)
   ───────────────────────────────────────────────────────────── */
router.patch('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const notes = asText(req.body?.notes);
    const booking = await DemoBooking.findByIdAndUpdate(
      req.params.id,
      { notes, handledBy: req.user?._id || null, handledAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Demo booking not found.' });
    }

    res.json({ success: true, message: 'Booking notes saved.', booking });
  } catch (err) {
    console.error('Error updating demo booking:', err);
    res.status(500).json({ success: false, message: 'Failed to update demo booking.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   DELETE /api/demo-bookings/:id   (ADMIN)
   ───────────────────────────────────────────────────────────── */
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const deleted = await DemoBooking.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Demo booking not found.' });
    }
    res.json({ success: true, message: 'Demo booking deleted.' });
  } catch (err) {
    console.error('Error deleting demo booking:', err);
    res.status(500).json({ success: false, message: 'Failed to delete demo booking.' });
  }
});

module.exports = router;
