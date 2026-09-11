# Repository instructions

## 面试复盘入库

当新增、重命名或删除 `docs/interviews/` 下的真实面试复盘时，必须把网页入口一起维护完整：

1. 更新 `docs/interviews/index.md` 的“最近复盘”列表。
2. 更新 `mkdocs.yml` 的“面试复盘”导航，使对应 Markdown 出现在网页左侧栏。
3. 执行 `python scripts/check-interview-nav.py`，确认所有 `docs/interviews/*.md`（`index.md` 除外）同时存在于复盘首页和 MkDocs 导航中。
4. 只有文件、索引和导航三者一致，才算“面试复盘入库”完成；仅提交 Markdown 文件不算完成。

## 线上验证

涉及网页展示的改动，不要把“GitHub commit 已存在”当作“网页已更新”。如果任务要求确认线上结果，还需要检查部署后的实际页面或构建状态。
