const express = require('express');
const Blocklist = require('../../../database/models/Blocklist');
const Lead = require('../../../database/models/Lead');
const MetaLead = require('../../../database/models/MetaLead');
const { protect } = require('../../../core/middleware/auth');
const router = express.Router();

const getPhoneVariants = (rawPhone) => {
  const cleanPhone = String(rawPhone || '').replace(/\D/g, '');
  if (!cleanPhone) return [];
  const last10 = cleanPhone.slice(-10);
  const variants = new Set([cleanPhone]);
  if (last10.length === 10) {
    variants.add(last10);
    variants.add(`91${last10}`);
    variants.add(`+91${last10}`);
  }
  return Array.from(variants);
};

const restoreLeadStatus = async (phone) => {
  try {
    const variants = getPhoneVariants(phone);
    if (variants.length === 0) return;

    const leads = await Lead.find({ phone: { $in: variants } });
    for (const lead of leads) {
      if (lead.status === 'Blocked') {
        const previousStatus = lead.status;
        lead.status = 'Fresh';
        lead.activities.unshift({
          type: 'status_change',
          description: `Status changed from ${previousStatus} to Fresh after unblocking`,
          performedBy: null,
        });
        await lead.save();
      }
    }

    // Also restore MetaLead status if it was set to 'Blocked'
    await MetaLead.updateMany(
      {
        $or: [
          { phone: { $in: variants } },
          { normalizedPhone: { $in: variants } }
        ],
        status: 'Blocked'
      },
      { $set: { status: 'New' } }
    );
  } catch (err) {
    console.error('Failed to restore lead status after unblocking:', err);
  }
};

// GET /api/blocklist
router.get('/', protect, async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { phone: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    const list = await Blocklist.find(query)
      .populate('blockedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ blocklist: list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/blocklist
router.post('/', protect, async (req, res) => {
  try {
    const { phone, name, reason } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) return res.status(400).json({ message: 'Invalid phone number' });

    const variants = getPhoneVariants(cleanPhone);
    const existing = await Blocklist.findOne({ phone: { $in: variants } });
    if (existing) return res.status(400).json({ message: 'This number is already blocked', entry: existing });

    const entry = await Blocklist.create({
      phone: cleanPhone,
      name: name || 'Anonymous',
      reason: reason || 'Spam Lead',
      blockedBy: req.user._id,
    });
    await entry.populate('blockedBy', 'name');

    // Sync MetaLead status to 'Blocked' when phone is added to blocklist
    if (variants.length > 0) {
      await MetaLead.updateMany(
        {
          $or: [
            { phone: { $in: variants } },
            { normalizedPhone: { $in: variants } }
          ]
        },
        { $set: { status: 'Blocked' } }
      ).catch(() => {});
    }

    res.status(201).json({ entry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/blocklist/:id  (by MongoDB _id)
router.delete('/:id', protect, async (req, res) => {
  try {
    const entry = await Blocklist.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Blocklist entry not found' });

    const variants = getPhoneVariants(entry.phone);
    await Blocklist.deleteMany({
      $or: [
        { _id: req.params.id },
        ...(variants.length > 0 ? [{ phone: { $in: variants } }] : [])
      ]
    });
    await restoreLeadStatus(entry.phone);

    res.json({ message: 'Unblocked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/blocklist/phone/:phone  (by phone number — used from lead view)
router.delete('/phone/:phone', protect, async (req, res) => {
  try {
    const variants = getPhoneVariants(req.params.phone);
    if (variants.length === 0) return res.status(400).json({ message: 'Invalid phone number' });

    const result = await Blocklist.deleteMany({ phone: { $in: variants } });
    await restoreLeadStatus(req.params.phone);

    res.json({ message: 'Unblocked successfully', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/blocklist/check/:phone — check if a phone is blocked
router.get('/check/:phone', protect, async (req, res) => {
  try {
    const variants = getPhoneVariants(req.params.phone);
    if (variants.length === 0) return res.json({ blocked: false, entry: null });
    const entry = await Blocklist.findOne({ phone: { $in: variants } });
    res.json({ blocked: !!entry, entry: entry || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
