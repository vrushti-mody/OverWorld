import { bodyJson, commitProjects, requireContext, reply, slug, validateNewProject } from '../lib/server.js';

export default async (request) => {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
  try {
    const context = await requireContext(request); if (context.error) return context.error;
    const body = await bodyJson(request); const id = slug(body?.id || body?.name);
    const project = { id, name: String(body?.name || '').trim(), goal: String(body?.goal || '').trim(), done_when: String(body?.done_when || '').trim(), domain: body?.domain, mode: body?.mode, status: 'planned', weight: 1, nodes: [] };
    const error = validateNewProject(project); if (error) return reply(400, { error });
    if ((context.map.projects || []).some((p) => p.id === project.id)) return reply(409, { error: 'A project with this name or ID already exists.' });
    const projects = [...(context.map.projects || []), project];
    const conflict = await commitProjects(context, projects, 'project.create', { projectId: id });
    return conflict || reply(201, { ok: true, projectId: id });
  } catch (error) { console.error('Project creation failed:', error.message); return reply(500, { error: 'Could not create the project.' }); }
};
