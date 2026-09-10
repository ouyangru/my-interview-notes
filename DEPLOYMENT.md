# 部署说明

当前站点使用 Cloudflare Pages 部署，避免依赖 GitHub Actions。

Cloudflare Pages 创建项目时使用以下配置：

- Git 仓库：`ouyangru/my-interview-notes`
- Production branch：`main`
- Build command：`mkdocs build`
- Build output directory：`site`
- Root directory：仓库根目录

仓库中的 `requirements.txt` 提供 MkDocs Material 依赖，`mkdocs.yml` 位于仓库根目录。Cloudflare Pages 构建成功后会生成 `*.pages.dev` 地址；之后每次向 `main` 推送修改，Cloudflare Pages 会自动重新构建并部署。

站点域名确定后，再把实际地址补回 `mkdocs.yml` 的 `site_url`。
