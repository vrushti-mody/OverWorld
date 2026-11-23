import { clearSessionHeaders, reply } from '../lib/server.js';
export default async (request) => request.method === 'POST' ? reply(200, { ok: true }, clearSessionHeaders()) : reply(405, { error: 'Use POST.' }, { Allow: 'POST' });
