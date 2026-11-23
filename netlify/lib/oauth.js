import { createHash, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { appBaseUrl, db, reply } from './server.js';

export const READ_SCOPE = 'overworld.read';
export const WRITE_SCOPE = 'overworld.write';
const scopes = new Set([READ_SCOPE, WRITE_SCOPE]);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const random = (size = 32) => randomBytes(size).toString('base64url');
const formResponse = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export function oauthError(error, status = 400, description) {
  return formResponse({ error, ...(description ? { error_description: description } : {}) }, status);
}

export function oauthMetadata() {
  const base = appBaseUrl();
  return reply(200, {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    revocation_endpoint: `${base}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [...scopes],
  });
}

export function protectedResourceMetadata() {
  const base = appBaseUrl();
  return reply(200, { resource: `${base}/mcp/v1`, authorization_servers: [base], bearer_methods_supported: ['header'], scopes_supported: [...scopes] });
}

function allowedRedirect(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['oauth-redirect.googleusercontent.com', 'oauth-redirect-sandbox.googleusercontent.com', 'oauth-redirect-test.googleusercontent.com'].includes(url.hostname);
  } catch { return false; }
}

export async function registerClient(request) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
  let input; try { input = await request.json(); } catch { return oauthError('invalid_client_metadata'); }
  if (!Array.isArray(input?.redirect_uris) || !input.redirect_uris.length || input.redirect_uris.length > 20 || input.redirect_uris.some((uri) => !allowedRedirect(uri))) return oauthError('invalid_redirect_uri');
  if (input.response_types && !input.response_types.includes('code')) return oauthError('invalid_client_metadata');
  if (input.grant_types && input.grant_types.some((grant) => !['authorization_code', 'refresh_token'].includes(grant))) return oauthError('invalid_client_metadata');
  const clientId = `owc_${random(24)}`;
  const client = { client_id: clientId, client_name: String(input.client_name || 'Gemini Connected App').slice(0, 120), redirect_uris: input.redirect_uris, grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none', createdAt: new Date() };
  await (await db()).collection('oauth_clients').insertOne(client);
  return formResponse({ client_id: clientId, client_name: client.client_name, redirect_uris: client.redirect_uris, grant_types: client.grant_types, response_types: client.response_types, token_endpoint_auth_method: 'none' }, 201);
}

export async function validateAuthorization(params) {
  const database = await db();
  if (params.get('response_type') !== 'code') return { error: 'unsupported_response_type' };
  const clientId = params.get('client_id');
  const client = clientId ? await database.collection('oauth_clients').findOne({ client_id: clientId }) : null;
  if (!client) return { error: 'unauthorized_client' };
  const redirectUri = params.get('redirect_uri');
  if (!redirectUri || !client.redirect_uris.includes(redirectUri)) return { error: 'invalid_request' };
  if (!params.get('state')) return { error: 'invalid_request' };
  if (params.get('code_challenge_method') !== 'S256' || !params.get('code_challenge')) return { error: 'invalid_request' };
  const requested = (params.get('scope') || `${READ_SCOPE} ${WRITE_SCOPE}`).split(/\s+/).filter(Boolean);
  if (!requested.length || requested.some((scope) => !scopes.has(scope))) return { error: 'invalid_scope' };
  return { database, client, clientId, redirectUri, codeChallenge: params.get('code_challenge'), state: params.get('state'), scope: requested.join(' ') };
}

export async function exchangeToken(request) {
  if (request.method !== 'POST') return oauthError('invalid_request', 405);
  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const database = await db();
  const clientId = params.get('client_id');
  const client = clientId ? await database.collection('oauth_clients').findOne({ client_id: clientId }) : null;
  if (!client) return oauthError('invalid_client', 401);
  if (params.get('grant_type') === 'authorization_code') {
    const code = params.get('code'); const redirectUri = params.get('redirect_uri'); const verifier = params.get('code_verifier');
    if (!code || !verifier || !redirectUri) return oauthError('invalid_request');
    const record = await database.collection('oauth_codes').findOneAndDelete({ codeHash: hash(code), clientId, redirectUri, expiresAt: { $gt: new Date() } });
    const auth = record?.value || record;
    if (!auth) return oauthError('invalid_grant');
    const actualChallenge = createHash('sha256').update(verifier).digest('base64url');
    if (actualChallenge !== auth.codeChallenge) return oauthError('invalid_grant');
    return issueTokens(database, auth);
  }
  if (params.get('grant_type') === 'refresh_token') {
    const refresh = params.get('refresh_token');
    if (!refresh) return oauthError('invalid_request');
    const record = await database.collection('oauth_tokens').findOneAndDelete({ refreshHash: hash(refresh), clientId, refreshExpiresAt: { $gt: new Date() } });
    if (!record) return oauthError('invalid_grant');
    return issueTokens(database, record);
  }
  return oauthError('unsupported_grant_type');
}

async function issueTokens(database, subject) {
  const access = random(32); const refresh = random(48); const now = new Date();
  await database.collection('oauth_tokens').insertOne({ accessHash: hash(access), refreshHash: hash(refresh), clientId: subject.clientId, userId: subject.userId, workspaceId: subject.workspaceId, scope: subject.scope, accessExpiresAt: new Date(now.getTime() + 60 * 60 * 1000), refreshExpiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), createdAt: now });
  return formResponse({ access_token: access, token_type: 'Bearer', expires_in: 3600, refresh_token: refresh, scope: subject.scope });
}

export async function revokeToken(request) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
  const params = new URLSearchParams(await request.text()); const token = params.get('token');
  if (token) {
    const database = await db(); const tokenHash = hash(token);
    await database.collection('oauth_tokens').deleteMany({ $or: [{ accessHash: tokenHash }, { refreshHash: tokenHash }] });
  }
  return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function authorizeRequest(request) {
  if (request.method !== 'GET') return reply(405, { error: 'Use GET.' }, { Allow: 'GET' });
  const url = new URL(request.url); const params = url.searchParams;
  const checked = await validateAuthorization(params);
  if (checked.error) return new Response(`Invalid authorization request: ${checked.error}`, { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  const consent = new URL('/oauth-consent.html', appBaseUrl());
  for (const key of ['client_id','redirect_uri','response_type','state','scope','code_challenge','code_challenge_method']) if (params.has(key)) consent.searchParams.set(key, params.get(key));
  return new Response(null, { status: 302, headers: { Location: consent.toString(), 'Cache-Control': 'no-store' } });
}

export async function approveAuthorization(request, provisionGoogleProfile) {
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
  let body; try { body = await request.json(); } catch { return reply(400, { error: 'Invalid authorization request.' }); }
  const params = new URLSearchParams(body.request || {});
  const checked = await validateAuthorization(params);
  if (checked.error) return reply(400, { error: `Authorization failed: ${checked.error}` });
  const googleCredential = typeof body.credential === 'string' ? body.credential : '';
  if (!googleCredential) return reply(400, { error: 'Sign in with Google to link your workspace.' });
  const profile = await provisionGoogleProfile(googleCredential);
  const code = random(32);
  await checked.database.collection('oauth_codes').insertOne({ codeHash: hash(code), clientId: checked.clientId, redirectUri: checked.redirectUri, codeChallenge: checked.codeChallenge, scope: checked.scope, userId: String(profile.user._id), workspaceId: String(profile.workspace._id), expiresAt: new Date(Date.now() + 5 * 60 * 1000), createdAt: new Date() });
  const callback = new URL(checked.redirectUri); callback.searchParams.set('code', code); callback.searchParams.set('state', checked.state);
  return reply(200, { redirect: callback.toString() });
}

export async function requireMcpContext(request) {
  const token = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { error: mcpUnauthorized() };
  const database = await db(); const tokenHash = hash(token);
  const authorization = await database.collection('oauth_tokens').findOne({ accessHash: tokenHash, accessExpiresAt: { $gt: new Date() } });
  if (!authorization) return { error: mcpUnauthorized() };
  const user = await database.collection('users').findOne({ _id: new ObjectId(authorization.userId) }, { projection: { name: 1, email: 1 } });
  const workspace = await database.collection('workspaces').findOne({ _id: new ObjectId(authorization.workspaceId) });
  const map = await database.collection('maps').findOne({ workspaceId: authorization.workspaceId });
  if (!user || !workspace || !map) return { error: mcpUnauthorized() };
  return { database, authorization, user, workspace, map };
}

function mcpUnauthorized() {
  const metadata = `${appBaseUrl()}/.well-known/oauth-protected-resource`;
  return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401, headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': `Bearer resource_metadata="${metadata}"`, 'Cache-Control': 'no-store' } });
}

export function hasScope(context, scope) { return (context.authorization.scope || '').split(/\s+/).includes(scope); }
