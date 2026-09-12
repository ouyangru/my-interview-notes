# Repository instructions

## 面试复盘入库

当新增、重命名或删除 `docs/interviews/` 下的真实面试复盘时，必须把网页入口一起维护完整：

1. 更新 `docs/interviews/index.md` 的“最近复盘”列表。
2. 左侧“面试复盘”导航由 `hooks/interview_nav.py` 在 MkDocs 构建时自动扫描 `docs/interviews/*.md` 生成，不再手工逐条维护 `mkdocs.yml`。
3. 执行 `python scripts/check-interview-nav.py`，确认所有 `docs/interviews/*.md`（`index.md` 除外）都能进入自动生成导航，并且同时存在于复盘首页。
4. 只有复盘文件、复盘首页和自动生成导航三者一致，才算“面试复盘入库”完成；仅提交 Markdown 文件不算完成。

## 知识库双链与小标题

知识页之间、面试复盘到知识页之间建立关联时，优先链接到**具体小标题**，不要只链接到整个大页面。

推荐直接使用 Obsidian 风格双链：

- `[[进程与线程]]`：跳到知识页顶部；
- `[[进程与线程#线程和进程到底共享什么]]`：跳到具体小标题；
- `[[进程与线程#线程和进程到底共享什么|线程共享关系]]`：用自定义显示文本跳到具体小标题。

MkDocs 构建时由 `hooks/wikilinks.py` 把双链转换成普通 Markdown 深链。中文标题使用稳定 Unicode 锚点，因此不要再手工引用 `#_8`、`#_13` 这类构建序号。

如果使用普通 Markdown 链接，也必须在有明确对应知识点时带 fragment，例如：`../knowledge/操作系统/进程与线程.md#线程和进程到底共享什么`。

## 线上验证

涉及网页展示的改动，不要把“GitHub commit 已存在”当作“网页已更新”。如果任务要求确认线上结果，还需要检查部署后的实际页面或构建状态。
