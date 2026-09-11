from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTERVIEWS = ROOT / "docs" / "interviews"


def _title_for(path: Path) -> str:
    stem = path.stem
    parts = stem.split("-")
    if len(parts) >= 5 and all(part.isdigit() for part in parts[:3]):
        date = "-".join(parts[:3])
        rest = " ".join(parts[3:])
        return f"{date} {rest}"
    return stem.replace("-", " ")


def build_interview_nav():
    pages = [path for path in INTERVIEWS.glob("*.md") if path.name != "index.md"]
    pages.sort(key=lambda path: path.name, reverse=True)
    return [
        {"使用说明": "interviews/index.md"},
        *[{_title_for(path): f"interviews/{path.name}"} for path in pages],
    ]


def on_config(config):
    nav = config.get("nav") or []
    for item in nav:
        if isinstance(item, dict) and "面试复盘" in item:
            item["面试复盘"] = build_interview_nav()
            break
    return config
