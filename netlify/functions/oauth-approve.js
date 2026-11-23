import { OAuth2Client } from 'google-auth-library';
import { approveAuthorization } from '../lib/oauth.js';
import { reply, provisionGoogleProfile } from '../lib/server.js';

export default async (request) => {
  try {
    const wrapper = async (credential) => {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error('Google sign-in is not configured.');
      const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
      const profile = ticket.getPayload();
      if (!profile?.sub || !profile.email || profile.email_verified !== true) throw new Error('Google did not return a verified account.');
      const allow = (process.env.ALLOWED_EMAILS || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
      if (allow.length && !allow.includes(profile.email.toLowerCase())) throw new Error('This draft is limited to invited accounts.');
      return provisionGoogleProfile(profile);
    };
    return await approveAuthorization(request, wrapper);
  } catch (error) { console.error('Gemini account linking failed:', error.message); return reply(401, { error: error.message || 'Could not link this Overworld account.' }); }
};
