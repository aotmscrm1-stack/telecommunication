const mongoose = require('mongoose');
const dns = require('dns');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Fix for "querySrv ECONNREFUSED" on Windows — default OS DNS resolver
// often fails to resolve mongodb+srv SRV records. Force Google DNS.
dns.setServers(['8.8.8.8', '8.8.4.4']);

let memoryServer;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    const allowMemoryFallback = process.env.ALLOW_MEMORY_DB_FALLBACK === 'true';

    if (uri) {
      try {
        const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
      } catch (primaryErr) {
        if (!allowMemoryFallback) {
          throw new Error(`Primary MongoDB connection failed: ${primaryErr.message}`);
        }
        console.warn(`Primary MongoDB connection failed: ${primaryErr.message}. Falling back to local MongoDB memory server because ALLOW_MEMORY_DB_FALLBACK=true.`);
        await connectToMemoryServer();
      }
    } else {
      if (!allowMemoryFallback) {
        throw new Error('MONGODB_URI or MONGO_URI is required. Set ALLOW_MEMORY_DB_FALLBACK=true only for local development.');
      }
      await connectToMemoryServer();
    }

    await syncBlockedLeads();
    await syncWhatsAppIntegration();
    return mongoose.connection;
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

async function connectToMemoryServer() {
  if (memoryServer) {
    const conn = await mongoose.connect(memoryServer.getUri(), { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB Connected (memory): ${conn.connection.host}`);
    return;
  }

  memoryServer = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
    instance: { dbName: process.env.DB_NAME || 'aotms' },
  });

  const conn = await mongoose.connect(memoryServer.getUri(), { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB Connected (memory): ${conn.connection.host}`);
}

async function syncBlockedLeads() {
  try {
    const Lead = require('../models/Lead');
    const Blocklist = require('../models/Blocklist');

    const blockedLeads = await Lead.find({ status: 'Blocked' });
    if (blockedLeads.length > 0) {
      console.log(`[DB SYNC] Found ${blockedLeads.length} leads with Blocked status. Verifying blocklist...`);
      for (const lead of blockedLeads) {
        const cleanPhone = String(lead.phone || '').replace(/\D/g, '');
        const isBlocked = await Blocklist.findOne({ phone: cleanPhone });
        if (!isBlocked) {
          console.log(`[DB SYNC] Lead "${lead.name}" (${lead.phone}) is not in blocklist. Restoring to Fresh...`);
          lead.status = 'Fresh';
          lead.activities.unshift({
            type: 'status_change',
            description: 'Status changed from Blocked to Fresh after database synchronization',
            performedBy: null,
          });
          await lead.save();
        }
      }
    }
  } catch (syncErr) {
    console.error('[DB SYNC] Sync error:', syncErr.message);
  }
}

async function syncWhatsAppIntegration() {
  try {
    const Integration = require('../models/Integration');
    const token = process.env.META_WA_ACCESS_TOKEN;
    const phoneId = process.env.META_WA_PHONE_NUMBER_ID;
    const verifyToken = process.env.META_WA_VERIFY_TOKEN;

    if (token && phoneId) {
      await Integration.findOneAndUpdate(
        { type: 'whatsapp_cloud' },
        {
          $set: {
            name: 'WhatsApp Cloud API',
            category: 'webhook',
            status: 'active',
            'config.accessToken': token,
            'config.phoneNumberId': phoneId,
            'config.webhookVerifyToken': verifyToken || 'zest_eat_meta_verify_8f9q2a',
            'config.wabaId': phoneId,
          },
        },
        { upsert: true, new: true }
      );
      console.log('✅ [DB SYNC] Meta WhatsApp Cloud API integration active and synced');
    }
  } catch (err) {
    console.error('❌ [DB SYNC] WhatsApp integration sync error:', err.message);
  }
}

module.exports = connectDB;