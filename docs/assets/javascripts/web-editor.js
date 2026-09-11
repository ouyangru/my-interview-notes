(() => {
  const STORAGE_KEY = 'interview-notes-editor-key';
  const pagePath = () => `${location.pathname}${location.search || ''}`;
  let pageData = null;
  let editorStatus = null;
  let selectedQuote = '';
  let activeMode = 'quick';

  const labels = {
    understanding: '我的理解',
    interview: '面试追问',
    pitfall: '踩坑',
    todo: '待确认',
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function mount() {
    if (document.getElementById('kbEditorToggle')) return;

    const toggle = document.createElement('button');
    toggle.id = 'kbEditorToggle';
    toggle.className = 'kb-editor-toggle';
    toggle.type = 'button';
    toggle.innerHTML = '<span aria-hidden="true">✎</span><b>补充</b>';
    toggle.setAttribute('aria-label', '打开在线编辑侧栏');

    const bubble = document.createElement('button');
    bubble.id = 'kbSelectionAdd';
    bubble.className = 'kb-selection-add';
    bubble.type = 'button';
    bubble.textContent = '＋ 补充';
    bubble.hidden = true;

    const drawer = document.createElement('aside');
    drawer.id = 'kbEditorDrawer';
    drawer.className = 'kb-editor-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <div class="kb-editor-head">
        <div>
          <span class="kb-editor-kicker">WEB EDITOR</span>
          <strong id="kbEditorPageTitle">当前页面</strong>
        </div>
        <button id="kbEditorClose" class="kb-icon-button" type="button" aria-label="关闭">×</button>
      </div>

      <div class="kb-editor-tabs" role="tablist">
        <button type="button" class="is-active" data-kb-mode="quick">快速补充</button>
        <button type="button" data-kb-mode="page">整页 Markdown</button>
      </div>

      <div id="kbEditorSetup" class="kb-editor-setup" hidden></div>

      <section id="kbEditorUnlock" class="kb-editor-unlock">
        <label for="kbEditorKey">编辑口令</label>
        <div class="kb-editor-key-row">
          <input id="kbEditorKey" type="password" autocomplete="current-password" placeholder="只保存在当前浏览器">
          <button id="kbEditorUnlockButton" type="button">解锁</button>
        </div>
        <small>GitHub Token 不会发送到浏览器；这里只填写你给网页设置的编辑口令。</small>
      </section>

      <section id="kbQuickEditor" class="kb-editor-pane">
        <label class="kb-field">
          <span>类型</span>
          <select id="kbSupplementKind">
            <option value="understanding">我的理解</option>
            <option value="interview">面试追问</option>
            <option value="pitfall">踩坑</option>
            <option value="todo">待确认</option>
          </select>
        </label>
        <div id="kbQuoteWrap" class="kb-quote-wrap" hidden>
          <div class="kb-field-label"><span>关联原文</span><button id="kbClearQuote" type="button">清除</button></div>
          <blockquote id="kbSelectedQuote"></blockquote>
        </div>
        <label class="kb-field kb-field-grow">
          <span>补充内容</span>
          <textarea id="kbSupplementText" rows="10" placeholder="直接写你的理解、追问、踩坑或待确认点。支持 Markdown。"></textarea>
        </label>
        <div class="kb-editor-actions">
          <span id="kbQuickState" class="kb-save-state"></span>
          <button id="kbSupplementSave" class="kb-primary-button" type="button">写入 GitHub</button>
        </div>
      </section>

      <section id="kbPageEditor" class="kb-editor-pane" hidden>
        <div class="kb-source-meta">
          <code id="kbSourcePath">正在解析当前页面…</code>
          <a id="kbGithubEditLink" href="#" target="_blank" rel="noopener noreferrer">GitHub 编辑</a>
        </div>
        <textarea id="kbMarkdownEditor" class="kb-markdown-editor" spellcheck="false" placeholder="正在读取 Markdown…"></textarea>
        <div class="kb-editor-actions">
          <button id="kbReloadPage" class="kb-secondary-button" type="button">重新读取</button>
          <span id="kbPageState" class="kb-save-state"></span>
          <button id="kbPageSave" class="kb-primary-button" type="button">保存整页</button>
        </div>
      </section>

      <footer class="kb-editor-footer">
        <button id="kbEditorLock" type="button">锁定编辑器</button>
        <span>保存后会产生一个 GitHub commit，并触发站点自动部署。</span>
      </footer>`;

    document.body.append(toggle, bubble, drawer);

    bind(toggle, bubble, drawer);
    updatePageTitle();
    loadStatus();
  }

  function bind(toggle, bubble, drawer) {
    toggle.addEventListener('click', () => openDrawer('quick'));
    bubble.addEventListener('click', () => {
      bubble.hidden = true;
      openDrawer('quick');
      syncQuoteUi();
      window.setTimeout(() => document.getElementById('kbSupplementText')?.focus(), 50);
    });

    document.getElementById('kbEditorClose').addEventListener('click', closeDrawer);
    document.getElementById('kbEditorUnlockButton').addEventListener('click', unlock);
    document.getElementById('kbEditorKey').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') unlock();
    });
    document.getElementById('kbSupplementSave').addEventListener('click', saveSupplement);
    document.getElementById('kbPageSave').addEventListener('click', savePage);
    document.getElementById('kbReloadPage').addEventListener('click', () => loadPage(true));
    document.getElementById('kbClearQuote').addEventListener('click', () => {
      selectedQuote = '';
      syncQuoteUi();
    });
    document.getElementById('kbEditorLock').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      document.getElementById('kbEditorKey').value = '';
      syncUnlockUi();
      setState('kbQuickState', '已锁定');
    });

    drawer.querySelectorAll('[data-kb-mode]').forEach((button) => {
      button.addEventListener('click', () => switchMode(button.dataset.kbMode));
    });

    document.addEventListener('mouseup', handleSelection, true);
    document.addEventListener('touchend', () => window.setTimeout(handleSelection, 20), { passive: true, capture: true });
    document.addEventListener('scroll', () => { bubble.hidden = true; }, { passive: true });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });
  }

  function updatePageTitle() {
    const title = document.querySelector('.md-content h1')?.textContent?.trim() || document.title.replace(/\s+-\s+.*$/, '') || '当前页面';
    const el = document.getElementById('kbEditorPageTitle');
    if (el) el.textContent = title;
  }

  async function loadStatus() {
    const setup = document.getElementById('kbEditorSetup');
    try {
      editorStatus = await api('/api/editor/status');
      if (!editorStatus.configured) {
        setup.hidden = false;
        const missing = [];
        if (!editorStatus.token_configured) missing.push('GITHUB_TOKEN');
        if (!editorStatus.editor_key_configured) missing.push('EDITOR_KEY');
        setup.innerHTML = `<strong>还差一次服务器配置</strong><p>Cloudflare Worker 缺少 ${escapeHtml(missing.join(' / '))}。配置后无需改网页代码。</p>`;
      } else {
        setup.hidden = true;
      }
    } catch (error) {
      setup.hidden = false;
      setup.innerHTML = `<strong>编辑服务未加载</strong><p>${escapeHtml(error.message)}</p>`;
    }
    syncUnlockUi();
  }

  function syncUnlockUi() {
    const key = getKey();
    const unlock = document.getElementById('kbEditorUnlock');
    const ready = Boolean(key && editorStatus?.configured);
    unlock.classList.toggle('is-unlocked', ready);
    document.getElementById('kbEditorUnlockButton').textContent = ready ? '已解锁' : '解锁';
    document.getElementById('kbSupplementSave').disabled = !ready;
    document.getElementById('kbPageSave').disabled = !ready;
  }

  function unlock() {
    const input = document.getElementById('kbEditorKey');
    const value = input.value.trim();
    if (!value) return;
    localStorage.setItem(STORAGE_KEY, value);
    input.value = '';
    syncUnlockUi();
    setState('kbQuickState', editorStatus?.configured ? '编辑器已解锁' : '请先完成 Worker Secret 配置');
  }

  function getKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function openDrawer(mode = 'quick') {
    const drawer = document.getElementById('kbEditorDrawer');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('kb-editor-open');
    switchMode(mode);
    updatePageTitle();
    loadPage(false);
  }

  function closeDrawer() {
    const drawer = document.getElementById('kbEditorDrawer');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('kb-editor-open');
  }

  function switchMode(mode) {
    activeMode = mode === 'page' ? 'page' : 'quick';
    document.querySelectorAll('[data-kb-mode]').forEach((button) => button.classList.toggle('is-active', button.dataset.kbMode === activeMode));
    document.getElementById('kbQuickEditor').hidden = activeMode !== 'quick';
    document.getElementById('kbPageEditor').hidden = activeMode !== 'page';
    if (activeMode === 'page') loadPage(false);
  }

  function handleSelection() {
    const bubble = document.getElementById('kbSelectionAdd');
    if (!bubble) return;
    const selection = window.getSelection();
    const text = selection?.toString().replace(/\s+/g, ' ').trim() || '';
    if (text.length < 2 || text.length > 1200 || selection.rangeCount === 0) {
      bubble.hidden = true;
      return;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
    if (!container?.closest('.md-content') || container.closest('pre, code, .kb-editor-drawer')) {
      bubble.hidden = true;
      return;
    }

    selectedQuote = text;
    syncQuoteUi();
    const rect = range.getBoundingClientRect();
    bubble.style.left = `${Math.min(window.innerWidth - 92, Math.max(10, rect.right - 70))}px`;
    bubble.style.top = `${Math.max(10, rect.bottom + 8)}px`;
    bubble.hidden = false;
  }

  function syncQuoteUi() {
    const wrap = document.getElementById('kbQuoteWrap');
    const quote = document.getElementById('kbSelectedQuote');
    if (!wrap || !quote) return;
    wrap.hidden = !selectedQuote;
    quote.textContent = selectedQuote;
  }

  async function loadPage(force = false) {
    if (pageData && !force) return pageData;
    const pathEl = document.getElementById('kbSourcePath');
    const editor = document.getElementById('kbMarkdownEditor');
    if (pathEl) pathEl.textContent = '正在解析当前页面…';
    if (force && editor) editor.value = '';

    try {
      pageData = await api(`/api/editor/page?path=${encodeURIComponent(pagePath())}`);
      if (pathEl) pathEl.textContent = pageData.source_path;
      if (editor && (force || !editor.value)) editor.value = pageData.content || '';
      const link = document.getElementById('kbGithubEditLink');
      if (link) link.href = `https://github.com/ouyangru/my-interview-notes/edit/main/${pageData.source_path.split('/').map(encodeURIComponent).join('/')}`;
      return pageData;
    } catch (error) {
      if (pathEl) pathEl.textContent = '当前页面无法映射到 Markdown';
      setState('kbPageState', error.message, true);
      return null;
    }
  }

  async function saveSupplement() {
    const text = document.getElementById('kbSupplementText');
    const kind = document.getElementById('kbSupplementKind').value;
    const note = text.value.trim();
    if (!note) {
      text.focus();
      setState('kbQuickState', '先写一点补充内容', true);
      return;
    }

    const page = await loadPage(false);
    if (!page) return;
    const button = document.getElementById('kbSupplementSave');
    button.disabled = true;
    button.textContent = '写入中…';
    setState('kbQuickState', '正在提交 GitHub…');

    try {
      const result = await api('/api/editor/supplement', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          source_path: page.source_path,
          quote: selectedQuote,
          note,
          kind,
          message: `docs: add ${labels[kind]} from web`,
        }),
      });
      text.value = '';
      selectedQuote = '';
      syncQuoteUi();
      pageData = null;
      setState('kbQuickState', '已写入 GitHub，站点会自动重新部署');
      showToast('补充已提交');
      if (result.commit_url) window.__lastKbCommitUrl = result.commit_url;
    } catch (error) {
      if (error.status === 401) localStorage.removeItem(STORAGE_KEY);
      syncUnlockUi();
      setState('kbQuickState', error.message, true);
    } finally {
      button.textContent = '写入 GitHub';
      syncUnlockUi();
    }
  }

  async function savePage() {
    const page = await loadPage(false);
    if (!page) return;
    const editor = document.getElementById('kbMarkdownEditor');
    const content = editor.value;
    const button = document.getElementById('kbPageSave');
    button.disabled = true;
    button.textContent = '保存中…';
    setState('kbPageState', '正在提交 GitHub…');

    try {
      const result = await api('/api/editor/page', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          source_path: page.source_path,
          content,
          sha: page.sha,
          message: `docs: edit ${page.source_path.replace(/^docs\//, '')} from web`,
        }),
      });
      pageData = { ...page, content, sha: result.sha || page.sha };
      setState('kbPageState', '已保存，等待自动部署');
      showToast('页面已提交');
    } catch (error) {
      if (error.status === 401) localStorage.removeItem(STORAGE_KEY);
      syncUnlockUi();
      setState('kbPageState', error.message, true);
    } finally {
      button.textContent = '保存整页';
      syncUnlockUi();
    }
  }

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Editor-Key': getKey(),
    };
  }

  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const error = new Error(payload.detail || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function setState(id, message, error = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-error', error);
  }

  function showToast(message) {
    let toast = document.getElementById('kbEditorToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'kbEditorToast';
      toast.className = 'kb-editor-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
