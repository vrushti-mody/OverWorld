import { oauthMetadata } from '../lib/oauth.js';
export default async (request) => request.method === 'GET' ? oauthMetadata() : new Response(null, { status: 405, headers: { Allow: 'GET' } });
