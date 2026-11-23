import { bodyJson, commitProjects, findNode, requireContext, reply, STATUSES } from '../lib/server.js';

export default async (request) => {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
  try {
    const context = await requireContext(request); if (context.error) return context.error;
    const body = await bodyJson(request);
    const updates = Array.isArray(body?.updates) ? body.updates : [body];
    if (!updates.length || updates.length > 500) return reply(400, { error: 'Invalid update list.' });
    const projects = structuredClone(context.map.projects || []);
    const changedKeys = [];
    for (const update of updates) {
      const node = findNode(projects, update?.key);
      if (!node) return reply(404, { error: 'A project item no longer exists. Refresh the map.' });
      if (Object.hasOwn(update, 'status')) {
        if (update.status !== null && !STATUSES.has(update.status)) return reply(400, { error: 'Unsupported status.' });
        if (node.work_type === 'area' && ['done','live'].includes(update.status)) return reply(400, { error: 'Ongoing areas cannot be marked done or live.' });
        if (update.status === null) delete node.status; else node.status = update.status;
      }
      if (Array.isArray(update.steps)) {
        if (update.steps.some((step) => typeof step.name !== 'string' || typeof step.done !== 'boolean')) return reply(400, { error: 'Checklist data is invalid.' });
        node.steps = update.steps;
      }
      changedKeys.push(update.key);
    }
    const conflict = await commitProjects(context, projects, 'node.update', { keys: changedKeys });
    return conflict || reply(200, { ok: true });
  } catch (error) { console.error('Task update failed:', error.message); return reply(500, { error: 'Could not save this change.' }); }
};
