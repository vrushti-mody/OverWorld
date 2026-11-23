const message = document.getElementById('message');

async function start() {
  const [config, session] = await Promise.all([
    fetch('/api/config').then((r) => r.json()),
    fetch('/api/auth-session', { credentials: 'same-origin' }),
  ]);
  if (session.ok) { location.replace('/dashboard'); return; }
  if (!config.googleClientId) throw new Error('Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID in Netlify environment variables.');
  const untilReady = () => {
    if (!window.google?.accounts?.id) return setTimeout(untilReady, 100);
    google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: async ({ credential }) => {
        message.textContent = 'Signing you in…';
        try {
          const response = await fetch('/api/auth-login', {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Sign-in failed.');
          location.replace('/dashboard');
        } catch (error) { message.textContent = error.message; }
      },
    });
    google.accounts.id.renderButton(document.getElementById('signin'), { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with' });
    message.textContent = 'Sign in with Google to open your workspace.';
  };
  untilReady();
}

start().catch((error) => { message.textContent = error.message; });
