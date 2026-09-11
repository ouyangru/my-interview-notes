# Repository instructions

## 面试复盘入库

当新增、重命名或删除 `docs/interviews/` 下的真实面试复盘时，必须把网页入口一起维护完整：

1. 更新 `docs/interviews/index.md` 的“最近复盘”列表。
2. 左侧“面试复盘”导航由 `hooks/interview_nav.py` 在 MkDocs 构建时自动扫描 `docs/interviews/*.md` 生成，不再手工逐条维护 `mkdocs.yml`。
3. 执行 `python scripts/check-interview-nav.py`，确认所有 `docs/interviews/*.md`（`index.md` 除外）都能进入自动生成导航，并且同时存在于复盘首页。
4. 只有复盘文件、复盘首页和自动生成导航三者一致，才算“面试复盘入库”完成；仅提交 Markdown 文件不算完成。

## 线上验证

涉及网页展示的改动，不要把“GitHub commit 已存在”当作“网页已更新”。如果任务要求确认线上结果，还需要检查部署后的实际页面或构建状态。
