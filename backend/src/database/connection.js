const mongoose = require('mongoose');
const dns = require('dns');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Fix for "querySrv ECONNREFUSED" on Windows — force Google DNS
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
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 10000,
          maxPoolSize: 10,
          minPoolSize: 2,
          socketTimeoutMS: 45000,
          family: 4
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
      } catch (primaryErr) {
        if (!allowMemoryFallback) {
          throw new Error(`Primary MongoDB connection failed: ${primaryErr.message}`);
        }
        console.warn(`Primary MongoDB connection failed: ${primaryErr.message}. Falling back to local MongoDB memory server.`);
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
