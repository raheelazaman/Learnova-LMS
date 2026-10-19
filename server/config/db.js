import dns from 'node:dns'

dns.setServers(['8.8.8.8', '8.8.4.4'])

import mongoose from 'mongoose';
import env from './env.js';

export const connectDB = async (uri = env.mongoUri) => {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri);
  console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

export const disconnectDB = () => mongoose.disconnect();
