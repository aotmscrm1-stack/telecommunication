const mongoose = require('mongoose');

/**
 * A single-document lease used to guarantee that only one background worker is
 * executing the interval schedulers at any moment.
 *
 * `key` is unique, so the collection holds at most one row per logical worker
 * pool. The row is upserted on first election and renewed on a heartbeat; if the
 * holder dies the lease simply expires and the next worker takes over.
 */
const schedulerLeaseSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    holder: { type: String, required: true },
    // Indexed once, below, as the TTL sweep field. Declaring index:true here as
    // well would create a duplicate index and a Mongoose warning.
    expiresAt: { type: Date, required: true },
    heartbeatAt: { type: Date, default: Date.now },
    acquiredAt: { type: Date, default: Date.now },
    // Purely diagnostic: how many times leadership changed hands.
    takeoverCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Housekeeping only: expired rows are purged by Mongo's TTL monitor. Correctness
// never depends on the purge — every read also compares expiresAt to now.
schedulerLeaseSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SchedulerLease', schedulerLeaseSchema);
