from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WRITTEN_TESTS = ROOT / "docs" / "written-tests"


def _title_for(path: Path) -> str:
    """优先使用正文一级标题，让侧栏名称与页面标题保持一致。"""
    try:
        for line in path.read_text(encoding="utf-8").splitlines()[:40]:
            if line.startswith("# "):
                title = line[2:].strip()
                if title:
                    return title
    except (OSError, UnicodeError):
        pass
    return path.stem.replace("-", " ")


def build_written_test_nav():
    pages = [path for path in WRITTEN_TESTS.glob("*.md") if path.name != "index.md"]
    pages.sort(key=lambda path: path.name, reverse=True)
    return [
        {"使用说明与目录": "written-tests/index.md"},
        *[{_title_for(path): f"written-tests/{path.name}"} for path in pages],
    ]


def on_config(config):
    nav = config.get("nav") or []
    for item in nav:
        if isinstance(item, dict) and "笔试复盘" in item:
            item["笔试复盘"] = build_written_test_nav()
            break
    return config
