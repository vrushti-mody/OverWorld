import { reply, requireContext, toWorld } from '../lib/server.js';
export default async (request) => {
  if (request.method !== 'GET') return reply(405, { error: 'Use GET.' }, { Allow: 'GET' });
  try { const context = await requireContext(request); if (context.error) return context.error; return reply(200, toWorld(context.map, context.workspace._id)); }
  catch (error) { console.error('Map load failed:', error.message); return reply(500, { error: 'Could not load your map.' }); }
};
