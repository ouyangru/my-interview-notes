# 在线编辑模式

站点内置轻量级在线编辑器，不需要本地拉仓库。

## 能做什么

- 右下角“补充”按钮打开侧边栏。
- 在正文中选中文字后，会出现“＋ 补充”，选中文字自动成为关联原文。
- 快速补充支持：我的理解、面试追问、踩坑、待确认。
- “整页 Markdown”可以直接编辑当前页面的源 Markdown。
- 保存会直接提交到 GitHub `main`，随后由 Cloudflare Workers Builds 自动重新构建站点。
- 如果同一个文件已经被别人或其他设备修改，保存会拒绝覆盖并提示重新读取。

## 安全模型

浏览器不会持有 GitHub Token。

写入链路：

`网页 -> Cloudflare Worker -> GitHub Contents API -> main -> Cloudflare 自动部署`

Worker 需要两个 Secret：

- `GITHUB_TOKEN`：GitHub fine-grained personal access token，只授权 `ouyangru/my-interview-notes`，Repository permissions 中给 `Contents: Read and write`。
- `EDITOR_KEY`：你自己设置的一段随机编辑口令。网页只保存这个口令到当前浏览器的 `localStorage`，请求写入时通过 `X-Editor-Key` 发给 Worker。

不要把这两个值写进仓库、`wrangler.jsonc` 或聊天记录。

## 一次性配置

### 方式 A：Cloudflare Dashboard

进入：Workers & Pages -> `my-interview-notes` -> Settings -> Variables and Secrets。

分别新增两个 `Secret`：

- `GITHUB_TOKEN`
- `EDITOR_KEY`

保存并 Deploy。

### 方式 B：Wrangler

在仓库根目录执行：

```bash
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put EDITOR_KEY
```

命令会交互式要求输入值，Secret 不会写进仓库。

## GitHub Token 建议权限

创建 fine-grained personal access token 时：

- Resource owner：`ouyangru`
- Repository access：Only select repositories -> `my-interview-notes`
- Repository permissions：Contents -> Read and write
- 其他权限保持默认即可

建议设置合理有效期，并在 GitHub 中定期轮换。

## 使用

部署完成后打开知识库任意页面：

1. 点右下角“补充”。
2. 第一次在该设备上输入 `EDITOR_KEY` 解锁。
3. 快速补充：写完直接“写入 GitHub”。
4. 整页修改：切到“整页 Markdown”后保存。
5. GitHub commit 产生后，等待 Cloudflare 自动构建完成，刷新页面即可看到最新内容。

在手机上同样可用，侧边栏会自动切换为全屏编辑。
