import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGODB_URI'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length && process.env.NODE_ENV !== 'test') {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET || '',
  // Optional local auth (bcrypt + JWT) required by the assignment text. Disable with ENABLE_LOCAL_AUTH=false
  enableLocalAuth: process.env.ENABLE_LOCAL_AUTH !== 'false',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  currency: process.env.CURRENCY || '$',
};

if (env.enableLocalAuth && !env.jwtSecret && env.nodeEnv !== 'test') {
  console.error('ENABLE_LOCAL_AUTH is on but JWT_SECRET is not set. Set JWT_SECRET or ENABLE_LOCAL_AUTH=false.');
  process.exit(1);
}

export default env;
