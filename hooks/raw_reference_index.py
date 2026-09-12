from pathlib import Path

from markdown.extensions.toc import slugify_unicode

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
INDEX_PATH = "reference-index.md"

RAW_FILES = [
    "C++.md",
    "linux服务器.md",
    "操作系统.md",
    "计算机网络.md",
    "数据结构及算法.md",
    "手撕代码.md",
    "数据库.md",
    "设计模式.md",
    "其他技术栈.md",
    "离谱问题.md",
    "leetcode刷题.md",
    "书籍笔记/操作系统.md",
    "书籍笔记/c++语言核心及进阶.md",
    "书籍笔记/linux高性能服务器.md",
    "书籍笔记/汇编语言.md",
    "书籍笔记/设计模式.md",
]


def _headings(path: Path):
    result = []
    in_fence = False
    fence = None
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        stripped = line.lstrip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            marker = stripped[:3]
            if not in_fence:
                in_fence, fence = True, marker
            elif marker == fence:
                in_fence, fence = False, None
            continue
        if in_fence:
            continue

        level = None
        for candidate in (1, 2, 3):
            prefix = "#" * candidate + " "
            if stripped.startswith(prefix) and not stripped.startswith("#" * (candidate + 1)):
                level = candidate
                break
        if level is None:
            continue

        title = stripped[level + 1 :].strip().rstrip("#").strip()
        if title:
            result.append((level, title))
    return result


def _build_index():
    out = [
        "# 原始资料章节索引\n",
        "这里按 Markdown 标题索引原始 fork 知识库。点击条目直接跳到对应大文件的小节，而不是文件顶部。\n",
        "推荐在其他 Markdown 中使用语义双链，例如 `[[操作系统#页表与 TLB]]`、`[[计算机网络#TCP 三次握手]]`、`[[C++#智能指针]]`。构建时会先核对原文真实标题，再生成 fragment。\n",
    ]
    for ref in RAW_FILES:
        path = DOCS / ref
        if not path.is_file():
            continue
        headings = _headings(path)
        if not headings:
            continue
        out.append(f"\n## {path.stem}\n")
        for level, title in headings:
            slug = slugify_unicode(title, "-")
            indent = "  " * max(0, level - 1)
            out.append(f"{indent}- [{title}]({ref}#{slug})\n")
    return "".join(out)


def on_page_markdown(markdown, page, config, files):
    if page.file.src_path != INDEX_PATH:
        return markdown
    return _build_index()
