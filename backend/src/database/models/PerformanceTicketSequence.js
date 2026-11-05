const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Format: "TKT-YYYYMMDD"
  seq: { type: Number, default: 0 }
});

const Sequence = mongoose.model('PerformanceTicketSequence', sequenceSchema);

/**
 * Atomically generates next ticket number formatted as TKT-YYYYMMDD-XXXX
 * @param {string} dateStr Format: "YYYY-MM-DD"
 */
async function getNextTicketNumber(dateStr) {
  const cleanDate = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const prefix = `TKT-${cleanDate}`;
  const record = await Sequence.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return `${prefix}-${String(record.seq).padStart(4, '0')}`;
}

module.exports = {
  PerformanceTicketSequence: Sequence,
  getNextTicketNumber
};

