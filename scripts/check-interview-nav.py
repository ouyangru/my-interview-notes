from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTERVIEWS = ROOT / "docs" / "interviews"
MKDOCS = ROOT / "mkdocs.yml"
INDEX = INTERVIEWS / "index.md"

config = MKDOCS.read_text(encoding="utf-8")
index = INDEX.read_text(encoding="utf-8")

missing_nav = []
missing_index = []

for path in sorted(INTERVIEWS.glob("*.md")):
    if path.name == "index.md":
        continue

    nav_ref = f"interviews/{path.name}"
    if nav_ref not in config:
        missing_nav.append(nav_ref)

    if path.name not in index:
        missing_index.append(path.name)

if missing_nav or missing_index:
    if missing_nav:
        print("Interview reviews missing from mkdocs.yml nav:")
        for item in missing_nav:
            print(f"  - {item}")
    if missing_index:
        print("Interview reviews missing from docs/interviews/index.md:")
        for item in missing_index:
            print(f"  - {item}")
    raise SystemExit(1)

print("Interview review navigation is in sync.")
