import { reply, requireContext } from '../lib/server.js';
export default async (request) => {
  if (request.method !== 'GET') return reply(405, { error: 'Use GET.' }, { Allow: 'GET' });
  try {
    const context = await requireContext(request);
    if (context.error) return context.error;
    return reply(200, { user: { name: context.user.name, email: context.user.email, picture: context.user.picture }, workspace: { id: String(context.workspace._id), name: context.workspace.name }, revision: context.map.revision });
  } catch (error) { console.error('Session lookup failed:', error.message); return reply(500, { error: 'Could not load your session.' }); }
};
