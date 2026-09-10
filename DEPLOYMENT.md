# 部署说明

当前站点使用 Cloudflare Workers Static Assets 部署，站点地址为：

`https://my-interview-notes.aosikagirl23.workers.dev`

仓库已经包含 `wrangler.jsonc`，其中将 MkDocs 构建产物目录 `site/` 配置为 Worker 的静态资源目录。Cloudflare Workers Builds 连接 GitHub 仓库时，请使用以下配置：

- Git 仓库：`ouyangru/my-interview-notes`
- Production branch：`main`
- Root directory：仓库根目录
- Build command：`pip install -r requirements.txt && mkdocs build`
- Deploy command：`npx wrangler deploy`

MkDocs 会先把 `docs/` 下的 Markdown 构建为 `site/` 中的 HTML、CSS 和 JavaScript，随后 Wrangler 根据 `wrangler.jsonc` 将 `site/` 作为静态资源部署到 `workers.dev`。

如果 Worker 已经创建但网页无法访问，优先检查 Cloudflare 项目的最新 deployment/build log，确认 Build command 确实生成了 `site/`，并确认 Deploy command 成功执行。仅创建 Worker 或仅连接 GitHub 仓库，并不会自动知道 MkDocs 的构建产物目录。
