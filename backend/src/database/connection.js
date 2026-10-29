const mongoose = require('mongoose');
const dns = require('dns');

// Fix for "querySrv ECONNREFUSED" on Windows — use reliable multi-DNS servers
try {
  dns.setServers(['1.1.1.1', '8.8.8.8', '1.0.0.1', '8.8.4.4']);
} catch (_) {}

let memoryServer;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    const allowMemoryFallback = process.env.ALLOW_MEMORY_DB_FALLBACK === 'true';

    if (uri) {
      let lastErr;
      let connected = false;
      const MAX_RETRIES = 3;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            maxPoolSize: 10,
            minPoolSize: 1,
            socketTimeoutMS: 60000,
            family: 4
          });
          console.log(`MongoDB Connected: ${conn.connection.host}`);
          connected = true;
          break;
        } catch (attemptErr) {
          lastErr = attemptErr;
          if (attempt < MAX_RETRIES) {
            console.warn(`[MongoDB connection attempt ${attempt} timed out. Retrying in 2s...]`);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      if (!connected) {
        if (!allowMemoryFallback) {
          throw new Error(`Primary MongoDB connection failed: ${lastErr?.message || 'Timeout'}`);
        }
        console.warn(`Primary MongoDB connection failed: ${lastErr?.message}. Falling back to local MongoDB memory server.`);
        await connectToMemoryServer();
      }
    } else {
      if (!allowMemoryFallback) {
        throw new Error('MONGODB_URI or MONGO_URI is required. Set ALLOW_MEMORY_DB_FALLBACK=true for local dev.');
      }
      await connectToMemoryServer();
    }

    return mongoose.connection;
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

async function connectToMemoryServer() {
  let MongoMemoryServer;
  try {
    const memModule = require('mongodb-memory-server');
    MongoMemoryServer = memModule.MongoMemoryServer;
  } catch (err) {
    throw new Error('mongodb-memory-server is not installed. Please configure a valid MONGODB_URI.');
  }

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

module.exports = connectDB;
