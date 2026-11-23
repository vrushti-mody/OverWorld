import { bodyJson, commitProjects, requireContext, reply, slug, validateNewTask } from '../lib/server.js';

export default async (request) => {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
  try {
    const context = await requireContext(request); if (context.error) return context.error;
    const body = await bodyJson(request);
    const project = (context.map.projects || []).find((p) => p.id === body?.projectId);
    if (!project) return reply(404, { error: 'Choose a project in this workspace.' });
    const siblingNodes = Array.isArray(project.nodes) ? project.nodes : (project.nodes = []);
    const task = { id: slug(body?.id || body?.name), name: String(body?.name || '').trim(), status: 'planned', done_when: String(body?.done_when || '').trim(), weight: 1 };
    const error = validateNewTask(task); if (error) return reply(400, { error });
    if (siblingNodes.some((node) => node.id === task.id)) return reply(409, { error: 'A task with this name or ID already exists in this project.' });
    siblingNodes.push(task);
    const conflict = await commitProjects(context, context.map.projects, 'task.create', { projectId: project.id, taskId: task.id });
    return conflict || reply(201, { ok: true, taskId: task.id });
  } catch (error) { console.error('Task creation failed:', error.message); return reply(500, { error: 'Could not create the task.' }); }
};
