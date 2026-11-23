import { protectedResourceMetadata } from '../lib/oauth.js';
export default async (request) => request.method === 'GET' ? protectedResourceMetadata() : new Response(null, { status: 405, headers: { Allow: 'GET' } });
