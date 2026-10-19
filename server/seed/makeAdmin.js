// Usage: npm run make-admin -- someone@example.com
// The user must already exist (sign in once through the React app so Clerk + the webhook create them).
import env from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import { getClerk } from '../middleware/auth.js';

const email = (process.argv[2] || '').toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- someone@example.com');
  process.exit(1);
}
await connectDB();
const user = await User.findOne({ email });
if (!user) {
  console.error(`No user with email ${email}. Sign in once through the app first.`);
  await disconnectDB();
  process.exit(1);
}
user.role = 'admin';
await user.save();
console.log(`✅ ${email} is now an admin in MongoDB.`);
const clerk = getClerk();
if (clerk && user.authProvider === 'clerk') {
  await clerk.users.updateUserMetadata(user._id, { publicMetadata: { role: 'admin' } });
  console.log('✅ Clerk publicMetadata.role synced.');
} else if (env.clerkSecretKey === '') {
  console.log('ℹ️  CLERK_SECRET_KEY not set – skipped Clerk metadata sync (DB role is what the API checks).');
}
await disconnectDB();
