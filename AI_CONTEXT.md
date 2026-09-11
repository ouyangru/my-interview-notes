# AI Knowledge Base Context

本文件是 `ouyangru/my-interview-notes` 的 AI 入口文件。

当 ChatGPT / Codex / 其他 Agent 被要求“加载我的面试知识库”“模拟面试”“按知识库复习”“沉淀一下”或“面试复盘入库”时，先读取本文件，再按下面的规则检索和写入。不要把整个仓库一次性塞进上下文，只加载与当前任务相关的内容。

## 仓库身份

- 默认知识库：`https://github.com/ouyangru/my-interview-notes`
- 默认分支：`main`
- 主要内容目录：`docs/`
- 长期个人知识增量：`docs/knowledge/`
- 能力状态索引：`docs/knowledge/STATUS.md`
- 真实面试复盘：`docs/interviews/`
- 模板：`docs/templates/`

## 现有知识地图

### 原始/大体量资料

这些文件内容较大，适合按关键词检索，不要默认整篇读取。

- C/C++：`docs/C++.md`
- Linux / 网络编程：`docs/linux服务器.md`
- 操作系统：`docs/操作系统.md`
- 计算机网络：`docs/计算机网络.md`
- 数据结构与算法：`docs/数据结构及算法.md`
- 手撕代码：`docs/手撕代码.md`
- LeetCode：`docs/leetcode刷题.md`
- 数据库：`docs/数据库.md`
- 其他技术栈：`docs/其他技术栈.md`
- 离谱/零散问题：`docs/离谱问题.md`
- 书籍笔记：`docs/书籍笔记/`

### 个人增量知识

优先把长期有价值、带有个人理解的内容写到：

- `docs/knowledge/`
- 当前已有：`docs/knowledge/操作系统/进程与线程.md`
- 能力状态入口：`docs/knowledge/STATUS.md`

个人知识页的定位不是复制原始题库，而是记录：

1. 我真实被问过什么；
2. 我当时怎么回答；
3. 哪里答错、答不完整或容易混淆；
4. 我现在自己的理解；
5. 和项目/实习的连接；
6. 下一步应该被怎样追问。

### 面试复盘

- 目录：`docs/interviews/`
- 模板：`docs/templates/interview-review.md`

一场真实面试优先形成一份复盘；其中真正值得长期记忆的问题，再沉淀到 `docs/knowledge/`，两边建立链接。

## 能力状态标记

统一使用以下状态，便于后续搜索和针对性复习：

- `[weak]`：不会、答错、明显薄弱，后续模拟面试优先追问。
- `[learning]`：已经理解一部分，但还不稳定。
- `[mastered]`：能够比较稳定地解释，并能应对至少一层追问。
- `[wrong]`：曾经出现过明确错误理解；即使之后掌握，也保留历史记录。
- `[interview]`：真实面试出现过。
- `[project]`：能与自己的项目/实习经历建立连接。
- `[todo]`：需要后续补充或验证。

状态的集中索引维护在 `docs/knowledge/STATUS.md`。具体知识页仍是事实和个人理解的正文来源；`STATUS.md` 只维护复习优先级、卡点、来源和链接，不要复制整段知识正文。

不要为了“看起来进步”自动把 `[weak]` 改成 `[mastered]`。只有在后续问答中确实能够独立回答并通过追问时，才建议升级状态。

## 读取规则

### 1. 模拟面试

用户说“模拟面试”“按我的简历问”“考我 Linux/C++/网络/AI Infra”等时：

1. 先读取 `docs/knowledge/STATUS.md`，确定当前 `[weak]` / `[wrong]` / `[learning]` 优先队列。
2. 再确定目标岗位/主题，只保留与岗位相关的优先项。
3. 搜索 `docs/knowledge/` 中相关内容。
4. 搜索 `docs/interviews/` 中最近相关复盘。
5. 再从对应的大体量原始资料中按关键词补充背景。
6. 如果是项目面试，同时检索与该项目相关的 `[project]` 内容。
7. 一次只问少量问题，等待用户回答后继续追问，不要一次抛出整套题库。
8. 面试结束或用户明确复盘时，再根据实际回答更新 `STATUS.md`；不要在普通问答过程中频繁写库。

问题优先级：

`真实面试暴露的问题 > STATUS 中 weak/wrong > learning > 项目设计取舍 > 高频基础知识 > mastered 抽样复查 > 随机扩展`

### 2. 按知识库复习

用户说“按知识库复习”时：

1. 先读取 `docs/knowledge/STATUS.md`；
2. 第一轮：`[weak]` / `[wrong]`；
3. 第二轮：`[learning]`；
4. 第三轮：从 `[mastered]` 中抽样复查；
5. 主要从仓库已有内容出题，不要把通用知识无限扩展成新的复习范围。

如果 `STATUS.md` 里暂无条目，则从最近 `docs/interviews/` 和当前主题知识页中开始提问，并在用户明确要求复盘/沉淀后建立首批状态。

### 3. 回答技术问题

知识库是“用户当前理解和历史记录”，不是绝对事实来源。

如果知识库内容与可靠技术知识冲突：

1. 明确指出冲突；
2. 给出正确解释；
3. 建议把错误理解以“历史错误 + 修正”形式追加，而不是静默覆盖掉原记录；
4. 如果该错误会影响后续面试表现，在复盘时同步记录为 `[wrong]` 或 `[weak]`。

## 写入规则

### 触发词：`沉淀一下`

默认处理当前对话最近一个明确主题：

1. 提取值得长期保存的核心内容；
2. 先搜索仓库，检查是否已有对应知识页；
3. 有页面：优先追加到已有页面；
4. 没有页面：按照 `docs/templates/knowledge-note.md` 新建；
5. 不复制大段聊天原文；
6. 优先写“我的理解 / 易错点 / 项目连接 / 继续追问”；
7. 保留日期和来源；
8. 如果本次对话真实暴露了掌握程度，再同步更新 `docs/knowledge/STATUS.md`；否则不猜测状态；
9. 一次只做一个主题的小提交。

### 触发词：`面试复盘入库`

1. 按 `docs/templates/interview-review.md` 建立复盘；
2. 保存真实问题、用户原回答、复盘判断和更好的回答；
3. 标出本场最重要的 2～3 个薄弱点；
4. 对高价值问题建立或更新 `docs/knowledge/` 页面；
5. 把本场最影响结果的 2～3 个问题同步到 `docs/knowledge/STATUS.md`；
6. 面试复盘与知识页互相链接；
7. 不因为一场面试大规模改写原始题库。

### 触发词：`只记我的理解`

只追加用户自己的解释、类比、项目关联和易错点，不重复通用教科书内容。除非对话中真实验证了掌握状态，否则不改 `STATUS.md`。

## STATUS 更新规则

- `weak → learning`：用户能够独立解释核心因果，但一层追问仍不稳定。
- `learning → mastered`：在新的问答中独立回答正确，并通过至少一层追问。
- `mastered` 可以重新降级，不维持单向升级。
- `[wrong]` 作为历史标签保留，可以与后续 `[mastered]` 同时存在。
- 一场面试最多新增或升级 2～3 个最关键状态，避免 `STATUS.md` 变成第二份题库。
- 不依据历史聊天印象、泛化记忆或“看过答案”自动标状态；优先依据当前真实回答、明确面试记录和仓库已有证据。

## Git 提交规则

知识沉淀应使用小而清晰的提交，不把无关主题混在一起。

示例：

- `docs(os): add personal notes on task_struct address space`
- `docs(network): record TCP sticky packet interview pitfalls`
- `interview: add 2026-09-11 byte linux review`
- `docs(ai-infra): refine RDMA memory registration understanding`
- `docs(kb): update mastery status after linux mock interview`

默认不要覆盖用户原有内容；除非是明显的格式修复，否则优先追加。

## 新对话启动约定

如果当前会话已经知道本仓库地址，用户只需要说：

- `加载我的面试知识库`
- `模拟面试`
- `按知识库复习`
- `沉淀一下`
- `面试复盘入库`

AI 应把本仓库视为默认知识库，并先读取本文件。

如果一个全新的 AI 会话完全不知道仓库地址，仓库内部文件本身无法主动让模型发现自己。此时至少需要一个外部持久入口（例如 ChatGPT Custom Instructions、固定 Plugin/Connector、项目级指令或用户提供一次仓库 URL）。GitHub Action 不能解决“新会话如何知道仓库在哪里”这个问题，它只适合在仓库变化后生成索引、做校验或部署。
