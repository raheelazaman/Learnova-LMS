import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import env from './config/env.js';
import routes from './routes/index.js';
import { clerkWebhook } from './controllers/webhookController.js';
import { uploadDir } from './middleware/upload.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // allow thumbnails to load from the React app
app.use(cors({ origin: env.clientUrls, credentials: true }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// Clerk webhook needs the RAW body for signature verification → mount BEFORE express.json()
app.post('/api/webhooks/clerk', express.raw({ type: 'application/json' }), clerkWebhook);

app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir));

if (env.nodeEnv !== 'test') {
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: 'Too many attempts, try again later' } }));
}

app.get('/', (_req, res) => res.json({ success: true, message: 'LMS API is running', docs: '/api/health' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
