import jwt from 'jsonwebtoken';
import { verifyToken, createClerkClient } from '@clerk/express';
import env from '../config/env.js';
import User, { ROLES } from '../models/User.js';
import ApiError from '../utils/ApiError.js';

export const LOCAL_ISSUER = 'lms-local';

let _clerk;
export const getClerk = () => {
  if (!env.clerkSecretKey) return null;
  if (!_clerk) _clerk = createClerkClient({ secretKey: env.clerkSecretKey });
  return _clerk;
};

const bearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
};

const primaryEmail = (clerkUser) => {
  const list = clerkUser.emailAddresses || [];
  const primary = list.find((e) => e.id === clerkUser.primaryEmailAddressId) || list[0];
  return primary?.emailAddress?.toLowerCase();
};

// Used when the Clerk webhook has not created the user yet (e.g. localhost without a tunnel).
const provisionFromClerk = async (userId) => {
  const clerk = getClerk();
  const cu = await clerk.users.getUser(userId);
  const email = primaryEmail(cu);
  if (!email) throw new ApiError(400, 'Clerk user has no email address');
  const name = [cu.firstName, cu.lastName].filter(Boolean).join(' ') || cu.username || email.split('@')[0];
  const metaRole = cu.publicMetadata?.role;
  try {
    await User.updateOne(
      { _id: userId },
      {
        $setOnInsert: {
          name,
          email,
          imageUrl: cu.imageUrl || '',
          role: ROLES.includes(metaRole) ? metaRole : 'student',
          authProvider: 'clerk',
        },
      },
      { upsert: true }
    );
  } catch (err) {
    if (err?.code !== 11000) throw err; // created concurrently by the webhook
  }
  return User.findById(userId);
};

/**
 * Verifies the Bearer token and attaches req.user (Mongo document) and req.auth.userId.
 *  - Clerk session tokens (from getToken() in the React app) are verified with CLERK_SECRET_KEY.
 *  - If ENABLE_LOCAL_AUTH is on, JWTs issued by POST /api/auth/login are accepted too.
 */
export const authenticate = async (req, _res, next) => {
  const token = bearer(req);
  if (!token) throw new ApiError(401, 'Authentication required: missing Bearer token');

  let userId;
  let provider;
  const decoded = jwt.decode(token);

  if (decoded?.iss === LOCAL_ISSUER) {
    if (!env.enableLocalAuth) throw new ApiError(401, 'Local authentication is disabled');
    try {
      userId = jwt.verify(token, env.jwtSecret, { issuer: LOCAL_ISSUER }).sub;
      provider = 'local';
    } catch {
      throw new ApiError(401, 'Invalid or expired token');
    }
  } else {
    if (!env.clerkSecretKey) throw new ApiError(503, 'Clerk is not configured on the server (CLERK_SECRET_KEY missing)');
    try {
      const res = await verifyToken(token, {
        secretKey: env.clerkSecretKey,
        authorizedParties: env.clientUrls,
      });
      if (res?.errors?.length) throw res.errors[0];
      userId = (res?.data ?? res)?.sub;
      provider = 'clerk';
      if (!userId) throw new Error('no sub');
    } catch {
      throw new ApiError(401, 'Invalid or expired token');
    }
  }

  let user = await User.findById(userId);
  if (!user && provider === 'clerk') user = await provisionFromClerk(userId);
  if (!user) throw new ApiError(401, 'User not found');

  req.user = user;
  req.auth = { userId: user._id, provider };
  next();
};

/** Role-based authorization. Usage: router.post('/', authenticate, requireRole('educator', 'admin'), ...) */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Forbidden: requires role ${roles.join(' or ')}`));
    }
    next();
  };
