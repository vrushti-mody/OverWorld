import { appBaseUrl, reply } from '../lib/server.js';
export default async () => reply(200, { googleClientId: process.env.GOOGLE_CLIENT_ID || '', mcpUrl: `${appBaseUrl()}/mcp/v1` });
