import { commitProjects, findNode, requireContext, slug, validateNewProject, validateNewTask, STATUSES } from '../lib/server.js';
import { hasScope, requireMcpContext, READ_SCOPE, WRITE_SCOPE } from '../lib/oauth.js';

const protocolVersion = '2025-11-25';
const serverInfo = { name: 'overworld', version: '0.1.0' };
const instructions = 'Overworld stores each user’s projects and testable tasks. Use list_projects or get_project to inspect their workspace. Use create_project, add_task, or update_node to make only the requested change. A successful write updates the user’s Overworld map. Never invent verification or claim a task is verified without the user’s evidence.';
const tools = [
  { name: 'list_projects', description: 'Show the projects in the signed-in user’s Overworld workspace, including their goals and current status.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { title: 'List projects', readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'get_project', description: 'Read one project and its task tree from the signed-in user’s Overworld workspace.', inputSchema: { type: 'object', properties: { project_id: { type: 'string', description: 'Stable project ID returned by list_projects.' } }, required: ['project_id'], additionalProperties: false }, annotations: { title: 'Read project', readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'create_project', description: 'Create a project in the signed-in user’s workspace after the user asks to track a new outcome.', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Short project name.' }, goal: { type: 'string', description: 'Why the project exists.' }, done_when: { type: 'string', description: 'Observable finish line.' }, domain: { type: 'string', enum: ['systems','content','career','life','money'] }, mode: { type: 'string', enum: ['campaign','practice','fallow','idea'] } }, required: ['name','goal','done_when','domain','mode'], additionalProperties: false }, annotations: { title: 'Create project', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } },
  { name: 'add_task', description: 'Add a testable task to one of the signed-in user’s projects. Include a clear finish line and only hard prerequisites.', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, name: { type: 'string', description: 'Short task name.' }, done_when: { type: 'string', description: 'Observable result that proves the task is complete.' }, parent_key: { type: 'string', description: 'Optional full key of an existing component; omit to add at the project root.' }, needs: { type: 'array', items: { type: 'string' }, description: 'Optional sibling task IDs that must be complete first.' } }, required: ['project_id','name','done_when'], additionalProperties: false }, annotations: { title: 'Add task', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } },
  { name: 'update_node', description: 'Update the status, finish line, or note of one existing project or task. Use done only when the user confirms the finish line was checked.', inputSchema: { type: 'object', properties: { key: { type: 'string', description: 'Full Overworld key for the project or task.' }, status: { type: 'string', enum: ['idea','planned','partial','done','live','waiting','blocked','drift','dropped'] }, done_when: { type: 'string' }, note: { type: 'string' } }, required: ['key'], additionalProperties: false }, annotations: { title: 'Update project item', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } },
];

const jsonReply = (id, result) => ({ jsonrpc: '2.0', id, result });
const errorReply = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const toolResult = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
const toolError = (message) => ({ isError: true, content: [{ type: 'text', text: message }] });
const keyPart = (value) => String(value).replace(/~/g, '~0').replace(/\//g, '~1');

async function callTool(context, name, args) {
  if (name === 'list_projects') {
    if (!hasScope(context, READ_SCOPE)) return toolError('This Gemini link does not have permission to read projects. Disconnect it and connect again.');
    const projects = context.map.projects || [];
    return toolResult(projects.map((p) => ({ id: p.id, name: p.name, goal: p.goal || '', done_when: p.done_when || '', status: p.status || 'derived', domain: p.domain, mode: p.mode })));
  }
  if (name === 'get_project') {
    if (!hasScope(context, READ_SCOPE)) return toolError('This Gemini link does not have permission to read projects.');
    const project = (context.map.projects || []).find((p) => p.id === args.project_id);
    return project ? toolResult(project) : toolError('No project with that ID exists in this workspace.');
  }
  if (!hasScope(context, WRITE_SCOPE)) return toolError('This Gemini link does not have permission to change the map. Disconnect it and reconnect with write access.');
  const projects = structuredClone(context.map.projects || []);
  let action;
  let details = {};
  if (name === 'create_project') {
    const project = { id: slug(args.name), name: String(args.name || '').trim(), goal: String(args.goal || '').trim(), done_when: String(args.done_when || '').trim(), domain: args.domain, mode: args.mode, status: 'planned', weight: 1, nodes: [] };
    const invalid = validateNewProject(project);
    if (invalid) return toolError(invalid);
    if (projects.some((p) => p.id === project.id)) return toolError('A project with that name already exists. Choose a different name.');
    projects.push(project); action = 'mcp.project.create'; details = { projectId: project.id };
  } else if (name === 'add_task') {
    const project = projects.find((p) => p.id === args.project_id);
    if (!project) return toolError('No project with that ID exists in this workspace.');
    let siblings;
    if (args.parent_key) {
      const parentPath = String(args.parent_key).split('/').filter(Boolean);
      const parent = findNode(projects, args.parent_key);
      if (!parent || parentPath[0] !== project.id || !Array.isArray(parent.nodes)) return toolError('Choose an existing component in the selected project.');
      siblings = parent.nodes;
    } else siblings = project.nodes || (project.nodes = []);
    const task = { id: slug(args.name), name: String(args.name || '').trim(), done_when: String(args.done_when || '').trim(), status: 'planned', weight: 1, ...(Array.isArray(args.needs) && args.needs.length ? { needs: args.needs } : {}) };
    const invalid = validateNewTask(task);
    if (invalid) return toolError(invalid);
    if (siblings.some((node) => node.id === task.id)) return toolError('A task with that name already exists at this level.');
    const siblingIds = new Set(siblings.map((node) => node.id));
    if ((task.needs || []).some((id) => !siblingIds.has(id))) return toolError('Each prerequisite must be an existing sibling task ID.');
    siblings.push(task); action = 'mcp.task.create'; details = { projectId: project.id, taskId: task.id };
  } else if (name === 'update_node') {
    const node = findNode(projects, args.key);
    if (!node) return toolError('No project item with that key exists in this workspace.');
    if (args.status !== undefined) {
      if (!STATUSES.has(args.status)) return toolError('Unsupported status.');
      if (node.work_type === 'area' && ['done','live'].includes(args.status)) return toolError('Ongoing areas cannot be marked done or live.');
      node.status = args.status;
    }
    if (args.done_when !== undefined) {
      if (typeof args.done_when !== 'string' || !args.done_when.trim() || args.done_when.length > 2000) return toolError('Finish line must be text between 1 and 2000 characters.');
      node.done_when = args.done_when.trim();
    }
    if (args.note !== undefined) {
      if (typeof args.note !== 'string' || args.note.length > 2000) return toolError('Note must be text up to 2000 characters.');
      node.note = args.note.trim();
    }
    if (args.status === undefined && args.done_when === undefined && args.note === undefined) return toolError('Provide a status, finish line, or note to update.');
    action = 'mcp.node.update'; details = { key: args.key, status: args.status };
  } else return null;
  const conflict = await commitProjects(context, projects, action, details);
  if (conflict) return toolError('The map changed while this tool was working. Refresh Overworld and ask Gemini to try again.');
  return toolResult({ saved: true, action, ...details });
}

export default async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const context = await requireMcpContext(request);
  if (context.error) return context.error;
  let input;
  try { input = await request.json(); } catch { return new Response(JSON.stringify(errorReply(null, -32700, 'Parse error')), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
  const id = input?.id ?? null;
  if (input?.jsonrpc !== '2.0' || typeof input.method !== 'string') return new Response(JSON.stringify(errorReply(id, -32600, 'Invalid Request')), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (input.method === 'notifications/initialized' || input.method === 'notifications/cancelled') return new Response(null, { status: 202 });
  let result;
  if (input.method === 'initialize') result = { protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo, instructions };
  else if (input.method === 'ping') result = {};
  else if (input.method === 'tools/list') result = { tools };
  else if (input.method === 'tools/call') {
    const name = input.params?.name; const args = input.params?.arguments || {};
    if (!tools.some((tool) => tool.name === name)) return new Response(JSON.stringify(errorReply(id, -32601, `Unknown tool: ${name}`)), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try { result = await callTool(context, name, args); }
    catch (error) { console.error('MCP tool failed:', error.message); result = toolError('Overworld could not complete that action. Try again or open the map to check its current state.'); }
  } else return new Response(JSON.stringify(errorReply(id, -32601, 'Method not found')), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (id === null) return new Response(null, { status: 202 });
  return new Response(JSON.stringify(jsonReply(id, result)), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
};
