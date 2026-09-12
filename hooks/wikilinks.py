import posixpath
import re
from pathlib import Path

from markdown.extensions.toc import slugify_unicode

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
WIKILINK_RE = re.compile(r"\[\[([^\[\]]+?)\]\]")


def _all_markdown_files():
    return [path for path in DOCS.rglob("*.md") if path.is_file()]


def _resolve_target(raw_target: str, page_src_path: str):
    target = raw_target.strip().replace("\\", "/")
    if target.endswith(".md"):
        target = target[:-3]

    current_dir = posixpath.dirname(page_src_path)
    candidates = []

    if "/" in target:
        relative_candidate = posixpath.normpath(posixpath.join(current_dir, target))
        candidates.append(DOCS / f"{relative_candidate}.md")
        candidates.append(DOCS / f"{target.lstrip('/')}.md")
    else:
        # 先尝试当前目录，再按文件名在整个 docs 中唯一匹配。
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


def _relative_link(target_path: Path, page_src_path: str, heading: str | None):
    source_dir = posixpath.dirname(page_src_path)
    target_ref = target_path.relative_to(DOCS).as_posix()
    relative = posixpath.relpath(target_ref, source_dir or ".")
    if heading:
        fragment = slugify_unicode(heading.strip(), "-")
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
        return match.group(0)

    href = _relative_link(target_path, page_src_path, heading)
    label = (alias or heading or target_path.stem).strip()
    return f"[{label}]({href})"


def on_page_markdown(markdown, page, config, files):
    """把 Obsidian 风格双链转换为 MkDocs 可点击的页内深链。

    支持：
    - [[进程与线程]]
    - [[进程与线程#线程和进程到底共享什么]]
    - [[进程与线程#线程和进程到底共享什么|线程共享关系]]

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
