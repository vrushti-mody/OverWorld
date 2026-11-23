const request = new URLSearchParams(location.search);
const message = document.getElementById('message');
let credential = '';
let config = null;

async function boot() {
  const required = ['client_id','redirect_uri','response_type','state','scope','code_challenge','code_challenge_method'];
  if (required.some((key) => !request.has(key))) throw new Error('Gemini sent an incomplete authorization request. Return to Gemini and try connecting again.');
  const configResponse = await fetch('/api/config', { cache: 'no-store' });
  config = await configResponse.json();
  if (!configResponse.ok || !config.googleClientId) throw new Error('Google sign-in is not configured for this Overworld site.');
  await new Promise((resolve, reject) => {
    const started = Date.now();
    const wait = () => {
      if (window.google?.accounts?.id) {
        google.accounts.id.initialize({ client_id: config.googleClientId, callback: onCredential });
        google.accounts.id.renderButton(document.getElementById('signin'), { theme: 'outline', size: 'large', text: 'signin_with' });
        resolve();
      } else if (Date.now() - started > 12000) reject(new Error('Google sign-in could not load. Check your network and try again.'));
      else setTimeout(wait, 100);
    };
    wait();
  });
}

function onCredential(result) {
  credential = result.credential;
  try {
    const payload = JSON.parse(atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    document.getElementById('account').textContent = `Signed in as ${payload.email || 'your Google account'}.`;
  } catch { document.getElementById('account').textContent = 'Google account verified.'; }
  document.getElementById('approval').hidden = false;
  document.getElementById('allow').disabled = false;
  message.textContent = '';
}

document.getElementById('allow').onclick = async () => {
  const button = document.getElementById('allow'); button.disabled = true; message.textContent = 'Connecting securely…';
  try {
    const response = await fetch('/api/oauth-approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential, request: Object.fromEntries(request.entries()) }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not link this workspace.');
    location.assign(data.redirect);
  } catch (error) { message.textContent = error.message; button.disabled = false; }
};

boot().catch((error) => { message.textContent = error.message; });
