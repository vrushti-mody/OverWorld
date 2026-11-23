import { OAuth2Client } from 'google-auth-library';
import { bodyJson, createSession, db, reply, sessionHeaders } from '../lib/server.js';

export default async (request) => {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
  try {
    if (!process.env.GOOGLE_CLIENT_ID) return reply(503, { error: 'Google sign-in is not configured.' });
    const body = await bodyJson(request);
    if (!body?.credential || typeof body.credential !== 'string') return reply(400, { error: 'Google credential is missing.' });
    const ticket = await new OAuth2Client(process.env.GOOGLE_CLIENT_ID).verifyIdToken({ idToken: body.credential, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || profile.email_verified !== true) return reply(401, { error: 'Google did not return a verified account.' });
    const allowedEmails = (process.env.ALLOWED_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (allowedEmails.length && !allowedEmails.includes(profile.email.toLowerCase())) return reply(403, { error: 'This draft is limited to invited accounts.' });
    const database = await db();
    await database.collection('users').updateOne(
      { googleSub: profile.sub },
      { $set: { email: profile.email, name: profile.name || profile.email, picture: profile.picture || '', lastLoginAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    const user = await database.collection('users').findOne({ googleSub: profile.sub });
    const workspaces = database.collection('workspaces');
    await workspaces.updateOne({ ownerId: String(user._id), isDefault: true }, { $setOnInsert: { ownerId: String(user._id), name: 'My workspace', members: [], isDefault: true, createdAt: new Date() } }, { upsert: true });
    const workspace = await workspaces.findOne({ ownerId: String(user._id), isDefault: true });
    await database.collection('maps').updateOne({ workspaceId: String(workspace._id) }, { $setOnInsert: { workspaceId: String(workspace._id), schemaVersion: 1, revision: 1, projects: [], createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
    return reply(200, { ok: true }, sessionHeaders(createSession(user, workspace._id)));
  } catch (error) {
    console.error('Sign-in failed:', error.message);
    return reply(401, { error: 'Could not verify Google sign-in. Check the OAuth client ID and try again.' });
  }
};
