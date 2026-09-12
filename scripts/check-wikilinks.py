from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
sys.path.insert(0, str(ROOT))

from hooks.wikilinks import WIKILINK_RE, _resolve_heading, _resolve_target  # noqa: E402


def wikilinks_outside_fences(text: str):
    in_fence = False
    fence_marker = None
    for line_no, line in enumerate(text.splitlines(), start=1):
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
        for match in WIKILINK_RE.finditer(line):
            yield line_no, match.group(0), match.group(1).strip()


def main():
    errors = []
    checked = 0

    for path in sorted(DOCS.rglob("*.md")):
        page_src_path = path.relative_to(DOCS).as_posix()
        text = path.read_text(encoding="utf-8", errors="ignore")

        for line_no, original, body in wikilinks_outside_fences(text):
            target_expr = body.split("|", 1)[0].strip()
            if "#" in target_expr:
                target, heading = target_expr.split("#", 1)
                target = target.strip()
                heading = heading.strip()
            else:
                target, heading = target_expr.strip(), None

            if not target:
                continue

            checked += 1
            target_path = _resolve_target(target, page_src_path)
            if not target_path:
                errors.append(f"{page_src_path}:{line_no}: page not found: {original}")
                continue

            if heading and not _resolve_heading(target_path, heading):
                errors.append(f"{page_src_path}:{line_no}: heading not found/ambiguous: {original}")

    if errors:
        print("Invalid knowledge-base wikilinks:")
        for error in errors:
            print(f"  - {error}")
        raise SystemExit(1)

    print(f"Wikilinks are valid: {checked} checked.")


if __name__ == "__main__":
    main()
