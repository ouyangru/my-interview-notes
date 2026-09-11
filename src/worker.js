const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const API_VERSION = '2022-11-28';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/editor/')) {
      try {
        return await handleEditorApi(request, env, url);
      } catch (error) {
        if (error instanceof HttpError) {
          return json({ detail: error.message }, error.status);
        }
        console.error('editor api error', error);
        return json({ detail: error?.message || '编辑服务暂时不可用' }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleEditorApi(request, env, url) {
  if (url.pathname === '/api/editor/status' && request.method === 'GET') {
    return json({
      configured: Boolean(env.GITHUB_TOKEN && env.EDITOR_KEY),
      token_configured: Boolean(env.GITHUB_TOKEN),
      editor_key_configured: Boolean(env.EDITOR_KEY),
      repository: `${env.GITHUB_OWNER || 'ouyangru'}/${env.GITHUB_REPO || 'my-interview-notes'}`,
      branch: env.GITHUB_BRANCH || 'main',
    });
  }

  if (url.pathname === '/api/editor/page' && request.method === 'GET') {
    const webPath = url.searchParams.get('path') || '/';
    const page = await resolvePage(env, webPath);
    if (!page) return json({ detail: '没有找到当前网页对应的 Markdown 源文件' }, 404);
    return json({ ...page, deletable: canDeleteSourcePath(page.source_path) });
  }

  if (url.pathname === '/api/editor/page' && request.method === 'PUT') {
    const denied = authorize(request, env);
    if (denied) return denied;

    const body = await readJson(request);
    const sourcePath = normalizeSourcePath(body.source_path);
    if (!sourcePath) return json({ detail: '非法的 Markdown 路径' }, 400);
    if (typeof body.content !== 'string') return json({ detail: 'content 必须是字符串' }, 400);
    if (!body.sha) return json({ detail: '缺少源文件版本信息，请刷新后再保存' }, 400);

    const result = await githubWriteFile(
      env,
      sourcePath,
      body.content,
      body.sha,
      webCommitMessage(body.message, `docs: edit ${sourcePath.replace(/^docs\//, '')}`),
    );
    return json({
      ok: true,
      source_path: sourcePath,
      sha: result.content?.sha || null,
      commit_sha: result.commit?.sha || null,
      commit_url: result.commit?.html_url || null,
    });
  }

  if (url.pathname === '/api/editor/page' && request.method === 'DELETE') {
    const denied = authorize(request, env);
    if (denied) return denied;

    const body = await readJson(request);
    const sourcePath = normalizeSourcePath(body.source_path);
    if (!sourcePath) return json({ detail: '非法的 Markdown 路径' }, 400);
    if (!canDeleteSourcePath(sourcePath)) {
      return json({ detail: '为避免破坏导航，只允许删除 knowledge / interviews 下的普通笔记，index.md 与原始资料受保护' }, 400);
    }
    if (!body.sha) return json({ detail: '缺少源文件版本信息，请刷新后再删除' }, 400);

    const result = await githubDeleteFile(
      env,
      sourcePath,
      body.sha,
      webCommitMessage(body.message, `docs: delete ${sourcePath.replace(/^docs\//, '')}`),
    );
    return json({
      ok: true,
      source_path: sourcePath,
      commit_sha: result.commit?.sha || null,
      commit_url: result.commit?.html_url || null,
    });
  }

  if (url.pathname === '/api/editor/supplement' && request.method === 'POST') {
    const denied = authorize(request, env);
    if (denied) return denied;

    const body = await readJson(request);
    let sourcePath = normalizeSourcePath(body.source_path);
    let page;

    if (sourcePath) {
      page = await githubReadFile(env, sourcePath);
    } else {
      page = await resolvePage(env, body.path || '/');
      sourcePath = page?.source_path || null;
    }

    if (!sourcePath || !page) return json({ detail: '没有找到当前网页对应的 Markdown 源文件' }, 404);

    const note = String(body.note || '').trim();
    const quote = String(body.quote || '').trim().slice(0, 1200);
    const kind = ['understanding', 'interview', 'pitfall', 'todo'].includes(body.kind) ? body.kind : 'understanding';
    if (!note) return json({ detail: '补充内容不能为空' }, 400);
    if (note.length > 12000) return json({ detail: '单次补充内容过长' }, 400);

    const content = appendSupplement(page.content, { quote, note, kind });
    const result = await githubWriteFile(
      env,
      sourcePath,
      content,
      page.sha,
      webCommitMessage(body.message, `docs: add supplement to ${sourcePath.replace(/^docs\//, '')}`),
    );

    return json({
      ok: true,
      source_path: sourcePath,
      sha: result.content?.sha || null,
      commit_sha: result.commit?.sha || null,
      commit_url: result.commit?.html_url || null,
    });
  }

  return json({ detail: 'Not found' }, 404);
}

function authorize(request, env) {
  if (!env.GITHUB_TOKEN || !env.EDITOR_KEY) {
    return json({ detail: '在线编辑尚未完成服务器配置' }, 503);
  }
  const key = request.headers.get('x-editor-key') || '';
  if (!key || key !== env.EDITOR_KEY) {
    return json({ detail: '编辑口令不正确' }, 401);
  }
  return null;
}

async function resolvePage(env, webPath) {
  const candidates = sourceCandidates(webPath);
  for (const candidate of candidates) {
    const page = await githubReadFile(env, candidate, true);
    if (page) return page;
  }
  return null;
}

function sourceCandidates(webPath) {
  let clean = '/';
  try {
    clean = decodeURIComponent(String(webPath || '/').split('?')[0].split('#')[0]);
  } catch (_) {
    clean = String(webPath || '/').split('?')[0].split('#')[0];
  }

  clean = clean.replace(/^\/+|\/+$/g, '').replace(/\.html$/i, '');
  if (!clean) return ['docs/index.md'];

  const safe = clean
    .split('/')
    .filter(Boolean)
    .filter((part) => part !== '.' && part !== '..')
    .join('/');

  if (!safe) return ['docs/index.md'];
  return [`docs/${safe}.md`, `docs/${safe}/index.md`];
}

function normalizeSourcePath(value) {
  const source = String(value || '').trim().replace(/\\/g, '/');
  if (!source.startsWith('docs/') || !source.endsWith('.md')) return null;
  if (source.includes('../') || source.includes('/..') || source.includes('\0')) return null;
  return source;
}

function canDeleteSourcePath(sourcePath) {
  if (!/^docs\/(knowledge|interviews)\/.+\.md$/i.test(sourcePath)) return false;
  return !/(^|\/)index\.md$/i.test(sourcePath);
}

async function githubReadFile(env, sourcePath, allowMissing = false) {
  const owner = env.GITHUB_OWNER || 'ouyangru';
  const repo = env.GITHUB_REPO || 'my-interview-notes';
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeRepoPath(sourcePath)}?ref=${encodeURIComponent(branch)}`;
  const headers = githubHeaders(env, false);
  const response = await fetch(url, { headers });

  if (response.status === 404 && allowMissing) return null;
  if (!response.ok) {
    const payload = await safeJson(response);
    throw new Error(payload?.message || `GitHub 读取失败 (${response.status})`);
  }

  const payload = await response.json();
  if (payload.type !== 'file' || typeof payload.content !== 'string') {
    if (allowMissing) return null;
    throw new Error('目标不是普通 Markdown 文件');
  }

  return {
    source_path: sourcePath,
    sha: payload.sha,
    content: decodeBase64(payload.content),
    html_url: payload.html_url || null,
  };
}

async function githubWriteFile(env, sourcePath, content, sha, message) {
  const owner = env.GITHUB_OWNER || 'ouyangru';
  const repo = env.GITHUB_REPO || 'my-interview-notes';
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeRepoPath(sourcePath)}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: githubHeaders(env, true),
    body: JSON.stringify({
      message,
      content: encodeBase64(content),
      sha,
      branch,
    }),
  });

  const payload = await safeJson(response);
  if (response.status === 409 || response.status === 422) {
    throw new HttpError(409, 'GitHub 上的内容已经变化，请刷新页面后重新编辑');
  }
  if (!response.ok) {
    throw new HttpError(response.status === 403 ? 403 : 502, payload?.message || `GitHub 保存失败 (${response.status})`);
  }
  return payload;
}

async function githubDeleteFile(env, sourcePath, sha, message) {
  const owner = env.GITHUB_OWNER || 'ouyangru';
  const repo = env.GITHUB_REPO || 'my-interview-notes';
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeRepoPath(sourcePath)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: githubHeaders(env, true),
    body: JSON.stringify({ message, sha, branch }),
  });

  const payload = await safeJson(response);
  if (response.status === 409 || response.status === 422) {
    throw new HttpError(409, 'GitHub 上的内容已经变化，请刷新页面后重新删除');
  }
  if (!response.ok) {
    throw new HttpError(response.status === 403 ? 403 : 502, payload?.message || `GitHub 删除失败 (${response.status})`);
  }
  return payload;
}

function githubHeaders(env, write) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'my-interview-notes-web-editor',
    'X-GitHub-Api-Version': API_VERSION,
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  if (write) headers['Content-Type'] = 'application/json';
  return headers;
}

function appendSupplement(content, { quote, note, kind }) {
  const marker = '<!-- web-editor:supplements -->';
  const labels = {
    understanding: '我的理解',
    interview: '面试追问',
    pitfall: '踩坑',
    todo: '待确认',
  };
  const stamp = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date()).replaceAll('/', '-');

  const quoted = quote
    ? `\n\n> 关联原文：${quote.replace(/\s+/g, ' ').trim().replace(/\n/g, '\n> ')}`
    : '';
  const block = `\n\n<div class="web-supplement" markdown>\n\n**${labels[kind]} · ${stamp}**${quoted}\n\n${note.trim()}\n\n</div>`;

  if (content.includes(marker)) return `${content.trimEnd()}${block}\n`;
  return `${content.trimEnd()}\n\n---\n\n${marker}\n## 网页补充${block}\n`;
}

function cleanCommitMessage(value, fallback) {
  const message = String(value || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 174);
  return message || fallback;
}

function webCommitMessage(value, fallback) {
  const message = cleanCommitMessage(value, fallback).replace(/^\[WEB\]\s*/i, '');
  return `[WEB] ${message}`;
}

function encodeRepoPath(path) {
  return path.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function decodeBase64(base64) {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (_) {
    throw new HttpError(400, '请求数据格式不正确');
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
