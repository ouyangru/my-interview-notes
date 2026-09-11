(() => {
  const STORAGE_KEY = 'interview-notes-editor-key';

  function pagePath() {
    return `${location.pathname}${location.search || ''}`;
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

  async function currentPage() {
    return api(`/api/editor/page?path=${encodeURIComponent(pagePath())}`);
  }

  function getKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function setPageState(message, error = false) {
    const el = document.getElementById('kbPageState');
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
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  function parentUrl(sourcePath) {
    if (sourcePath.startsWith('docs/interviews/')) return '/interviews/';
    if (sourcePath.startsWith('docs/knowledge/')) return '/knowledge/';
    return '/';
  }

  async function refreshDeleteButton(button) {
    try {
      const page = await currentPage();
      button.dataset.sourcePath = page.source_path || '';
      button.disabled = !page.deletable || !getKey();
      if (page.deletable) {
        button.textContent = '删除此页';
        button.title = getKey() ? '删除当前 Markdown 笔记' : '先解锁编辑器后才能删除';
      } else {
        button.textContent = '删除此页（受保护）';
        button.title = '为避免破坏 MkDocs 导航，index.md 和原始资料页不能从轻量编辑器删除';
      }
    } catch (_) {
      button.disabled = true;
      button.textContent = '删除此页';
    }
  }

  async function deleteCurrentPage(button) {
    if (!getKey()) {
      setPageState('请先输入编辑口令解锁', true);
      return;
    }

    let page;
    try {
      page = await currentPage();
    } catch (error) {
      setPageState(error.message, true);
      return;
    }

    if (!page.deletable) {
      setPageState('当前页属于导航/原始资料，轻量编辑器不允许直接删除', true);
      return;
    }

    const name = page.source_path.replace(/^docs\//, '');
    if (!window.confirm(`确定删除这篇笔记吗？\n\n${name}\n\n删除会直接提交到 GitHub main，但仍可通过 Git 历史恢复。`)) return;

    button.disabled = true;
    button.textContent = '删除中…';
    setPageState('正在提交删除 commit…');

    try {
      const result = await api('/api/editor/page', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Editor-Key': getKey(),
        },
        body: JSON.stringify({
          source_path: page.source_path,
          sha: page.sha,
          message: `docs: delete ${name}`,
        }),
      });
      showToast('页面已删除并提交 GitHub');
      setPageState(result.commit_sha ? `已删除 · ${result.commit_sha.slice(0, 7)}` : '已删除');
      window.setTimeout(() => { location.href = parentUrl(page.source_path); }, 900);
    } catch (error) {
      setPageState(error.message, true);
      button.disabled = false;
      button.textContent = '删除此页';
    }
  }

  function mount() {
    const pane = document.getElementById('kbPageEditor');
    const actions = pane?.querySelector('.kb-editor-actions');
    if (!pane || !actions) {
      window.setTimeout(mount, 80);
      return;
    }
    if (document.getElementById('kbPageDelete')) return;

    const button = document.createElement('button');
    button.id = 'kbPageDelete';
    button.type = 'button';
    button.className = 'kb-secondary-button';
    button.textContent = '删除此页';
    button.style.borderColor = 'rgba(210, 88, 88, .55)';
    button.style.color = '#d96f6f';
    button.addEventListener('click', () => deleteCurrentPage(button));

    const reload = document.getElementById('kbReloadPage');
    if (reload?.nextSibling) actions.insertBefore(button, reload.nextSibling);
    else actions.prepend(button);

    document.querySelectorAll('[data-kb-mode="page"]').forEach((tab) => {
      tab.addEventListener('click', () => window.setTimeout(() => refreshDeleteButton(button), 50));
    });
    document.getElementById('kbEditorUnlockButton')?.addEventListener('click', () => window.setTimeout(() => refreshDeleteButton(button), 50));
    document.getElementById('kbEditorLock')?.addEventListener('click', () => window.setTimeout(() => refreshDeleteButton(button), 20));

    refreshDeleteButton(button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(mount, 0), { once: true });
  } else {
    window.setTimeout(mount, 0);
  }
})();
