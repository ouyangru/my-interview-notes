import posixpath
import re
import unicodedata
from pathlib import Path

from markdown.extensions.toc import slugify_unicode

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
WIKILINK_RE = re.compile(r"\[\[([^\[\]]+?)\]\]")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")

# 原始 fork 资料里有同名文件（例如 docs/操作系统.md 与 docs/书籍笔记/操作系统.md）。
# 对知识库双链，短名称默认指向根目录下的原始题库，避免歧义。
ROOT_REFERENCE_TARGETS = {
    "C++": "C++.md",
    "linux服务器": "linux服务器.md",
    "操作系统": "操作系统.md",
    "计算机网络": "计算机网络.md",
    "数据结构及算法": "数据结构及算法.md",
    "手撕代码": "手撕代码.md",
    "数据库": "数据库.md",
    "设计模式": "设计模式.md",
    "其他技术栈": "其他技术栈.md",
    "离谱问题": "离谱问题.md",
    "leetcode刷题": "leetcode刷题.md",
}

# 用户习惯写“概念名”，而原 fork 的标题经常带 ☆、前缀或更宽泛的章节名。
# 这里把稳定的语义别名映射到原文真实标题；最终 fragment 永远基于真实标题生成。
HEADING_ALIASES = {
    ("操作系统.md", "页表与tlb"): "解决速度问题",
    ("操作系统.md", "tlb"): "解决速度问题",
    ("操作系统.md", "进程与线程"): "进程和线程的区别和联系",
    ("操作系统.md", "线程共享资源"): "线程和进程之前共享那些资源？",
    ("操作系统.md", "进程间通信"): "进程间通信方式",
    ("操作系统.md", "malloc"): "malloc是如何实现内存管理的",
    ("操作系统.md", "malloc内存管理"): "malloc是如何实现内存管理的",
    ("计算机网络.md", "tcp三次握手"): "☆TCP三次握手",
    ("计算机网络.md", "三次握手"): "☆TCP三次握手",
    ("C++.md", "智能指针"): "c++智能指针",
    ("C++.md", "右值引用"): "右值引用",
    ("linux服务器.md", "tcp客户端服务端"): "实现基于TCP/IP的客户端服务端",
    ("linux服务器.md", "tcpip客户端服务端"): "实现基于TCP/IP的客户端服务端",
}


def _all_markdown_files():
    return [path for path in DOCS.rglob("*.md") if path.is_file()]


def _strip_heading_markup(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = text.replace("`", "").replace("**", "").replace("__", "")
    text = text.strip().rstrip("#").strip()
    return text


def _normalize_heading(text: str) -> str:
    text = unicodedata.normalize("NFKC", _strip_heading_markup(text)).casefold()
    # 匹配时忽略空格、装饰符号和标点，例如 ☆TCP三次握手 == TCP 三次握手。
    return "".join(ch for ch in text if ch.isalnum())


def _headings(path: Path):
    headings = []
    in_fence = False
    fence_marker = None
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        stripped = line.lstrip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            marker = stripped[:3]
            if not in_fence:
                in_fence = True
                fence_marker = marker
            elif marker == fence_marker:
                in_fence = False
                fence_marker = None
            continue
        if in_fence:
            continue
        match = HEADING_RE.match(stripped)
        if not match:
            continue
        title = _strip_heading_markup(match.group(2))
        if title:
            headings.append(title)
    return headings


def _resolve_target(raw_target: str, page_src_path: str):
    target = raw_target.strip().replace("\\", "/")
    if target.endswith(".md"):
        target = target[:-3]

    # 原始大题库的短双链优先指向 docs 根目录，避免被书籍笔记同名文件干扰。
    root_ref = ROOT_REFERENCE_TARGETS.get(target)
    if root_ref:
        root_target = (DOCS / root_ref).resolve()
        if root_target.is_file():
            return root_target

    current_dir = posixpath.dirname(page_src_path)
    candidates = []

    if "/" in target:
        relative_candidate = posixpath.normpath(posixpath.join(current_dir, target))
        candidates.append(DOCS / f"{relative_candidate}.md")
        candidates.append(DOCS / f"{target.lstrip('/')}.md")
    else:
        candidates.append(DOCS / current_dir / f"{target}.md")
        matches = [path for path in _all_markdown_files() if path.stem == target]
        if len(matches) == 1:
            candidates.append(matches[0])

    seen = set()
    for candidate in candidates:
        try:
            candidate = candidate.resolve()
            candidate.relative_to(DOCS.resolve())
        except (OSError, ValueError):
            continue
        if candidate in seen:
            continue
        seen.add(candidate)
        if candidate.is_file():
            return candidate
    return None


def _resolve_heading(target_path: Path, requested: str):
    requested = requested.strip()
    if not requested:
        return None

    headings = _headings(target_path)
    if not headings:
        return None

    target_ref = target_path.relative_to(DOCS).as_posix()
    alias_key = (target_ref, _normalize_heading(requested))
    canonical = HEADING_ALIASES.get(alias_key)
    if canonical:
        canonical_norm = _normalize_heading(canonical)
        for title in headings:
            if _normalize_heading(title) == canonical_norm:
                return title

    requested_norm = _normalize_heading(requested)
    if not requested_norm:
        return None

    # 先做规范化后的精确匹配。
    exact = [title for title in headings if _normalize_heading(title) == requested_norm]
    if len(exact) == 1:
        return exact[0]

    # 再做唯一的包含匹配，例如“智能指针” -> “c++智能指针”。
    contains = [
        title
        for title in headings
        if requested_norm in _normalize_heading(title) or _normalize_heading(title) in requested_norm
    ]
    if len(contains) == 1:
        return contains[0]

    return None


def _relative_link(target_path: Path, page_src_path: str, canonical_heading: str | None):
    source_dir = posixpath.dirname(page_src_path)
    target_ref = target_path.relative_to(DOCS).as_posix()
    relative = posixpath.relpath(target_ref, source_dir or ".")
    if canonical_heading:
        fragment = slugify_unicode(canonical_heading.strip(), "-")
        if fragment:
            relative = f"{relative}#{fragment}"
    return relative


def _rewrite_wikilink(match, page_src_path: str):
    body = match.group(1).strip()
    target_expr, alias = (body.split("|", 1) + [None])[:2] if "|" in body else (body, None)

    if "#" in target_expr:
        target, heading = target_expr.split("#", 1)
        target = target.strip()
        heading = heading.strip()
    else:
        target, heading = target_expr.strip(), None

    if not target:
        return match.group(0)

    target_path = _resolve_target(target, page_src_path)
    if not target_path:
        print(f"[wikilinks] unresolved page in {page_src_path}: {match.group(0)}")
        return match.group(0)

    canonical_heading = None
    if heading:
        canonical_heading = _resolve_heading(target_path, heading)
        if not canonical_heading:
            # 不生成一个看似可点、实际 404 到页首的 fragment。保留原双链，构建日志也能看见。
            print(f"[wikilinks] unresolved heading in {page_src_path}: {match.group(0)}")
            return match.group(0)

    href = _relative_link(target_path, page_src_path, canonical_heading)
    label = (alias or heading or target_path.stem).strip()
    return f"[{label}]({href})"


def on_page_markdown(markdown, page, config, files):
    """把 Obsidian 风格双链转换为 MkDocs 深链，并校验小标题真实存在。

    例如：
    - [[操作系统#页表与 TLB]] -> docs/操作系统.md 的“解决速度问题”小节
    - [[计算机网络#TCP 三次握手]] -> “☆TCP三次握手”小节
    - [[C++#智能指针]] -> “c++智能指针”小节
    - [[进程与线程#共享内存：共享的是物理页，不要求虚拟地址相同]]

    fenced code block 内不做替换，避免修改代码示例。
    """
    page_src_path = page.file.src_path
    out = []
    in_fence = False
    fence_marker = None

    for line in markdown.splitlines(keepends=True):
        stripped = line.lstrip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            marker = stripped[:3]
            if not in_fence:
                in_fence = True
                fence_marker = marker
            elif marker == fence_marker:
                in_fence = False
                fence_marker = None
            out.append(line)
            continue

        if in_fence:
            out.append(line)
            continue

        out.append(WIKILINK_RE.sub(lambda match: _rewrite_wikilink(match, page_src_path), line))

    return "".join(out)
