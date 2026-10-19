import { Webhook } from 'svix';
import env from '../config/env.js';
import User, { ROLES } from '../models/User.js';
import { purgeStudentData } from '../utils/cleanup.js';
import ApiError from '../utils/ApiError.js';

const fromClerkPayload = (d) => {
  const emails = d.email_addresses || [];
  const primary = emails.find((e) => e.id === d.primary_email_address_id) || emails[0];
  const email = primary?.email_address?.toLowerCase();
  const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.username || email?.split('@')[0] || 'User';
  const role = ROLES.includes(d.public_metadata?.role) ? d.public_metadata.role : undefined;
  return { id: d.id, email, name, imageUrl: d.image_url || '', role };
};

/**
 * POST /api/webhooks/clerk
 * Must receive the RAW body (mounted with express.raw in app.js) so the Svix signature can be verified.
 */
export const clerkWebhook = async (req, res) => {
  if (!env.clerkWebhookSecret) throw new ApiError(503, 'CLERK_WEBHOOK_SECRET is not configured');

  let evt;
  try {
    const raw = req.body.toString('utf8');
    // svix throws on a bad signature/timestamp; on success we parse the exact payload that was verified
    new Webhook(env.clerkWebhookSecret).verify(raw, {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    });
    evt = JSON.parse(raw);
  } catch {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const { type, data } = evt;

  if (type === 'user.created' || type === 'user.updated') {
    const u = fromClerkPayload(data);
    if (!u.email) return res.json({ success: true, ignored: 'no email' });
    const set = { name: u.name, email: u.email, imageUrl: u.imageUrl, authProvider: 'clerk' };
    const update = { $set: set };
    if (type === 'user.updated' && u.role) set.role = u.role; // Clerk publicMetadata.role can promote (e.g. first admin)
    else update.$setOnInsert = { role: u.role || 'student' };
    try {
      await User.updateOne({ _id: u.id }, update, { upsert: true });
    } catch (err) {
      // Concurrent webhook + lazy provisioning can race on the unique email; the user then already exists.
      if (err?.code !== 11000) throw err;
    }
  } else if (type === 'user.deleted' && data.id) {
    await purgeStudentData(data.id);
    await User.deleteOne({ _id: data.id });
  }

  res.json({ success: true });
};
