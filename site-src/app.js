const accountName = document.getElementById('ow-user');

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) location.replace('/');
    throw new Error(data.error || 'The request failed.');
  }
  return data;
}

window.OW_PERSIST_NODES = async (updates) => {
  if (!updates?.length) return;
  await api('/api/node-update', { method: 'POST', body: JSON.stringify({ updates }) });
};

function openForm(title, fields, submitLabel, endpoint) {
  const modal = document.getElementById('modal');
  const controls = fields.map((field) => {
    if (field.type === 'select') return `<label>${field.label}<select name="${field.name}" required>${field.options.map(([v, label]) => `<option value="${escapeHtml(v)}">${escapeHtml(label)}</option>`).join('')}</select></label>`;
    return `<label>${field.label}${field.multiline ? `<textarea name="${field.name}" ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder || '')}"></textarea>` : `<input name="${field.name}" ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder || '')}">`}</label>`;
  }).join('');
  modal.innerHTML = `<section class="ow-form" role="dialog" aria-modal="true"><h3>${escapeHtml(title)}</h3><form>${controls}<div class="ow-form-actions"><button type="button" class="ow-action" data-close>Cancel</button><button type="submit" class="ow-action ow-primary">${escapeHtml(submitLabel)}</button></div><p class="ow-form-message" role="status"></p></form></section>`;
  modal.hidden = false;
  modal.querySelector('[data-close]').onclick = () => { modal.hidden = true; };
  modal.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    const button = modal.querySelector('button[type="submit"]');
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    const message = modal.querySelector('.ow-form-message');
    button.disabled = true;
    try { await api(endpoint, { method: 'POST', body: JSON.stringify(payload) }); location.reload(); }
    catch (error) { message.textContent = error.message; button.disabled = false; }
  };
  modal.onclick = (event) => { if (event.target === modal) modal.hidden = true; };
}

function showNotice(title, messageText) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `<section class="ow-form" role="dialog" aria-modal="true"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(messageText)}</p><div class="ow-form-actions"><button type="button" class="ow-action ow-primary" data-close>Close</button></div></section>`;
  modal.hidden = false;
  modal.querySelector('[data-close]').onclick = () => { modal.hidden = true; };
}

function showConnectInstructions(mcpUrl) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `<section class="ow-form ow-connect" role="dialog" aria-modal="true"><h3>Connect Gemini</h3><p>Gemini’s phone app connects through its Connected Apps settings. Add this MCP server in Gemini on the web first, then it will be available in the phone app.</p><ol><li>Open <a href="https://gemini.google.com" target="_blank" rel="noopener">Gemini on the web</a> and find <b>Settings → Connected Apps</b>.</li><li>Choose to add a custom app / MCP server and enter this URL:</li></ol><div class="ow-url"><code>${escapeHtml(mcpUrl)}</code><button class="ow-action" data-copy>Copy</button></div><p>When Gemini opens the Overworld sign-in screen, choose the Google account that owns this workspace and approve access. Gemini may ask you to confirm before it changes your map.</p><p class="ow-form-message" role="status"></p><div class="ow-form-actions"><button type="button" class="ow-action" data-close>Close</button><a class="ow-action ow-primary" href="https://gemini.google.com" target="_blank" rel="noopener">Open Gemini</a></div></section>`;
  modal.hidden = false;
  modal.querySelector('[data-close]').onclick = () => { modal.hidden = true; };
  modal.querySelector('[data-copy]').onclick = async () => {
    const status = modal.querySelector('.ow-form-message');
    try { await navigator.clipboard.writeText(mcpUrl); status.textContent = 'Server URL copied.'; }
    catch { status.textContent = `Copy this URL: ${mcpUrl}`; }
  };
  modal.onclick = (event) => { if (event.target === modal) modal.hidden = true; };
}

function addAppStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .ow-form{width:min(480px,100%);max-height:90vh;overflow:auto;background:var(--bg-2);border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:var(--shadow)}
    .ow-form h3{font:600 18px var(--f-display);margin:0 0 14px}.ow-form form{display:grid;gap:11px}.ow-form label{display:grid;gap:5px;color:var(--fg-2);font-size:12px}
    .ow-form input,.ow-form textarea,.ow-form select{width:100%;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);padding:9px;font:14px var(--f-body)}.ow-form textarea{min-height:72px;resize:vertical}
    .ow-form-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:14px}.ow-form-message{color:var(--s-blocked);font-size:12px;margin:0}.ow-connect>p,.ow-connect li{font-size:13px;line-height:1.55;color:var(--fg-2)}.ow-connect a{color:var(--accent)}.ow-url{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--bg)}.ow-url code{font-size:12px;overflow-wrap:anywhere;flex:1;color:var(--fg)}
  `;
  document.head.append(style);
}

async function boot() {
  addAppStyles();
  const [session, map, config] = await Promise.all([api('/api/auth-session'), api('/api/world'), api('/api/config')]);
  accountName.textContent = session.user?.name || session.user?.email || 'Workspace';
  document.getElementById('ow-logout').onclick = async () => { await api('/api/auth-logout', { method: 'POST', body: '{}' }); location.replace('/'); };
  document.getElementById('ow-add-project').onclick = () => openForm('Add a project', [
    { name: 'name', label: 'Project name', required: true, placeholder: 'Plan the product launch' },
    { name: 'goal', label: 'Goal', multiline: true, required: true, placeholder: 'What outcome should this project create?' },
    { name: 'done_when', label: 'Finish line', multiline: true, required: true, placeholder: 'What observable result means it is complete?' },
    { name: 'domain', label: 'Domain', type: 'select', options: [['systems','Systems'],['content','Content'],['career','Career'],['life','Life'],['money','Money']] },
    { name: 'mode', label: 'Commitment', type: 'select', options: [['campaign','Campaign'],['practice','Practice'],['fallow','Fallow'],['idea','Idea']] },
  ], 'Create project', '/api/projects');
  document.getElementById('ow-add-task').onclick = () => {
    const projects = (map.children || []).filter((p) => p.mode !== 'archive');
    if (!projects.length) { showNotice('Create a project first', 'Add a project, then you can attach tasks to it.'); return; }
    openForm('Add a task', [
      { name: 'projectId', label: 'Project', type: 'select', options: projects.map((p) => [p.id, p.name]) },
      { name: 'name', label: 'Task name', required: true, placeholder: 'Draft the landing page' },
      { name: 'done_when', label: 'Finish line', multiline: true, required: true, placeholder: 'What will you be able to check?' },
    ], 'Create task', '/api/tasks');
  };
  document.getElementById('ow-connect-gemini').onclick = () => showConnectInstructions(config.mcpUrl);
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]); }

boot().catch((error) => { accountName.textContent = error.message; });
