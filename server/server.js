import env from './config/env.js';
import app from './app.js';
import { connectDB } from './config/db.js';

const start = async () => {
  await connectDB();
  if (!env.clerkSecretKey) console.warn('CLERK_SECRET_KEY not set – Clerk-authenticated routes will return 503 until you add it.');
  if (!env.clerkWebhookSecret) console.warn('CLERK_WEBHOOK_SECRET not set – /api/webhooks/clerk will return 503 until you add it.');
  app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}  (${env.nodeEnv})`));
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
