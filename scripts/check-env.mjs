const required = ['GOOGLE_CLIENT_ID', 'APP_BASE_URL', 'MONGODB_URI', 'MONGODB_DB', 'SESSION_SECRET'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing deployment environment variables: ${missing.join(', ')}`);
  process.exitCode = 1;
} else if (process.env.SESSION_SECRET.length < 32) {
  console.error('SESSION_SECRET must contain at least 32 characters.');
  process.exitCode = 1;
} else {
  console.log('Required Overworld environment variables are present.');
}
