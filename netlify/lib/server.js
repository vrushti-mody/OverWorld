import { createHmac, timingSafeEqual } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';

let clientPromise;
const SESSION_COOKIE = 'ow_session';
const STATUSES = new Set(['idea','planned','partial','done','live','waiting','blocked','drift','dropped']);
const DOMAINS = new Set(['systems','content','career','life','money']);
const MODES = new Set(['campaign','practice','fallow','idea','archive']);

export function reply(statusCode, data, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status: statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders } });
}

export async function bodyJson(request) {
  try { return await request.json(); } catch { return null; }
}

export async function db() {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) throw new Error('MongoDB is not configured. Add MONGODB_URI and MONGODB_DB in Netlify environment variables.');
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 10000 });
    clientPromise = client.connect();
  }
  return (await clientPromise).db(process.env.MONGODB_DB);
}

export function appBaseUrl() {
  const value = process.env.APP_BASE_URL || process.env.URL;
  if (!value) throw new Error('Set APP_BASE_URL to the deployed HTTPS site URL.');
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('APP_BASE_URL must use HTTPS.');
  return url.origin;
}

export async function provisionGoogleProfile(profile) {
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
  return { database, user, workspace };
}

function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  return process.env.SESSION_SECRET;
}

export function createSession(user, workspaceId) {
  const payload = Buffer.from(JSON.stringify({ sub: String(user._id), workspaceId: String(workspaceId), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14 })).toString('base64url');
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function sessionCookie(value, maxAge = 60 * 60 * 24 * 14) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NETLIFY ? '; Secure' : ''}`;
}

export function sessionHeaders(token) { return { 'Set-Cookie': sessionCookie(token) }; }
export function clearSessionHeaders() { return { 'Set-Cookie': sessionCookie('', 0) }; }

function parseCookies(request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const at = part.indexOf('='); return [part.slice(0, at), decodeURIComponent(part.slice(at + 1))];
  }));
}

function decodeSession(token) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  let expected;
  try { expected = createHmac('sha256', secret()).update(payload).digest(); } catch { return null; }
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.exp > Math.floor(Date.now() / 1000) ? decoded : null;
  } catch { return null; }
}

export async function requireContext(request) {
  const session = decodeSession(parseCookies(request)[SESSION_COOKIE]);
  if (!session || !ObjectId.isValid(session.sub) || !ObjectId.isValid(session.workspaceId)) return { error: reply(401, { error: 'Please sign in again.' }) };
  const database = await db();
  const user = await database.collection('users').findOne({ _id: new ObjectId(session.sub) }, { projection: { email: 1, name: 1, picture: 1 } });
  const workspace = await database.collection('workspaces').findOne({ _id: new ObjectId(session.workspaceId) });
  if (!user || !workspace || (String(workspace.ownerId) !== String(user._id) && !(workspace.members || []).some((member) => String(member.userId) === String(user._id)))) return { error: reply(403, { error: 'This workspace is not available to your account.' }) };
  const map = await database.collection('maps').findOne({ workspaceId: String(workspace._id) });
  if (!map) return { error: reply(404, { error: 'Workspace map was not found.' }) };
  return { database, user, workspace, map };
}

export function slug(value) {
  const result = String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  return result || `item-${Date.now().toString(36)}`;
}

export function validId(value) { return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value); }
export const keyPart = (value) => String(value).replace(/~/g, '~0').replace(/\//g, '~1');
export const unkeyPart = (value) => String(value).replace(/~1/g, '/').replace(/~0/g, '~');

export function toWorld(map, workspaceId) {
  const transform = (source, parentKey = '') => {
    const children = Array.isArray(source.nodes) ? source.nodes.map((child) => transform(child, `${parentKey}/${keyPart(child.id)}`)) : [];
    const { nodes, weight, ...rest } = source;
    return { ...rest, key: `${parentKey}/${keyPart(source.id)}`, source: `mongodb:${workspaceId}`, w: weight ?? 1, kind: parentKey ? (source.kind || (children.length ? 'component' : 'task')) : 'project', ...(children.length ? { children } : {}) };
  };
  return { id: 'world', key: '', name: 'Overworld', kind: 'world', as_of: new Date().toISOString().slice(0, 10), children: (map.projects || []).map((project) => transform(project)) };
}

export async function commitProjects(context, projects, action, details = {}) {
  const now = new Date();
  const result = await context.database.collection('maps').updateOne(
    { _id: context.map._id, revision: context.map.revision },
    { $set: { projects, updatedAt: now }, $inc: { revision: 1 } },
  );
  if (result.matchedCount !== 1) return reply(409, { error: 'The map changed while you were editing. Refresh and try again.' });
  try { await context.database.collection('audit').insertOne({ workspaceId: String(context.workspace._id), userId: String(context.user._id), action, details, createdAt: now }); }
  catch (error) { console.error('Audit write failed after map save:', error.message); }
  return null;
}

export function decodeKey(key) {
  if (typeof key !== 'string' || !key.startsWith('/')) return null;
  return key.split('/').slice(1).map(unkeyPart);
}

export function findNode(projects, key) {
  const path = decodeKey(key);
  if (!path?.length) return null;
  let node = projects.find((project) => project.id === path[0]);
  if (!node) return null;
  for (const id of path.slice(1)) {
    node = (node.nodes || []).find((child) => child.id === id);
    if (!node) return null;
  }
  return node;
}

export function validateNewProject(project) {
  if (!project || !validId(project.id) || !text(project.name, 1, 100) || !text(project.goal, 1, 2000) || !text(project.done_when, 1, 2000)) return 'Project needs a valid id, name, goal, and finish line.';
  if (!DOMAINS.has(project.domain) || !MODES.has(project.mode)) return 'Choose a supported project domain and commitment.';
  return null;
}

export function validateNewTask(task) {
  if (!task || !validId(task.id) || !text(task.name, 1, 100) || !text(task.done_when, 1, 2000)) return 'Task needs a valid id, name, and finish line.';
  if (task.status && !STATUSES.has(task.status)) return 'Task status is not supported.';
  if (task.needs && (!Array.isArray(task.needs) || task.needs.some((id) => !validId(id)))) return 'Task prerequisites must be sibling task IDs.';
  if (task.weight !== undefined && (!Number.isFinite(task.weight) || task.weight <= 0 || task.weight > 5)) return 'Task weight must be between 0 and 5.';
  return null;
}

function text(value, min, max) { return typeof value === 'string' && value.trim().length >= min && value.length <= max; }
export { STATUSES };
