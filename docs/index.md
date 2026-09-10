<div class="kb-hero" markdown>

# Embedded / Linux Interview KB

面向嵌入式软件、Linux 系统与 C/C++ 面试的个人知识库。保留原始题库作为参考层，把真实面试中暴露的问题逐步沉淀成自己的知识网络。

<div class="kb-meta">
  <span class="kb-chip">Base：原始资料</span>
  <span class="kb-chip">Overlay：个人理解</span>
  <span class="kb-chip">History：面试复盘</span>
</div>

</div>

## 快速入口

<div class="grid cards" markdown>

-   :material-brain: **个人知识库**

    ---

    只保存真正需要长期复用的知识节点，重点记录自己的理解、误区、项目关联和继续追问。

    [:octicons-arrow-right-24: 进入知识地图](knowledge/index.md)

-   :material-message-text-outline: **面试复盘**

    ---

    按时间保存每一场真实面试，先忠实记录现场，再把高价值问题归并到个人知识库。

    [:octicons-arrow-right-24: 查看复盘区](interviews/index.md)

-   :material-bookshelf: **原始资料**

    ---

    Fork 下来的 C++、操作系统、网络、Linux 等资料继续保留，作为稳定的参考底座，不直接覆盖成个人笔记。

    [:octicons-arrow-right-24: 操作系统](操作系统.md) · [:octicons-arrow-right-24: 计算机网络](计算机网络.md)

-   :material-file-document-edit-outline: **笔记模板**

    ---

    新增知识点或面试复盘时直接沿用固定结构，避免每次重新想排版，也方便后续自动整理。

    [:octicons-arrow-right-24: 知识点模板](templates/knowledge-note.md) · [:octicons-arrow-right-24: 面试模板](templates/interview-review.md)

</div>

## 当前个人知识

目前先从真实出现过的问题开始，不追求一次把整个题库重写。第一批个人节点从操作系统展开：

- [进程与线程：`task_struct` 在哪里？](knowledge/操作系统/进程与线程.md)

后续每次面试结束，只新增这场面试真正暴露出来的知识缺口；已有主题就继续往原节点追加，不重复复制整页内容。

## 推荐工作流

```text
一场真实面试
      ↓
interviews/ 记录现场问题与当时回答
      ↓
筛出值得长期保留的问题
      ↓
knowledge/ 合并到对应知识节点
      ↓
补充：我的理解 / 易错点 / 项目关联 / 继续追问
      ↓
下一次面试前只复习高频和薄弱节点
```

!!! tip "维护原则"
    原始资料负责“覆盖面”，个人知识库负责“和你有关的深度”，面试复盘负责“历史证据”。三层分开以后，既不会破坏原题库，也不会让自己的笔记越来越散。
