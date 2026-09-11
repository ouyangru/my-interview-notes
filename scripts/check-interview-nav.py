from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
INTERVIEWS = ROOT / "docs" / "interviews"
MKDOCS = ROOT / "mkdocs.yml"
INDEX = INTERVIEWS / "index.md"

sys.path.insert(0, str(ROOT))
from hooks.interview_nav import build_interview_nav  # noqa: E402

config = MKDOCS.read_text(encoding="utf-8")
index = INDEX.read_text(encoding="utf-8")

if "hooks/interview_nav.py" not in config:
    print("mkdocs.yml is not loading hooks/interview_nav.py")
    raise SystemExit(1)

nav_refs = set()
for item in build_interview_nav():
    if isinstance(item, dict):
        nav_refs.update(str(value) for value in item.values())

missing_generated_nav = []
missing_index = []

for path in sorted(INTERVIEWS.glob("*.md")):
    if path.name == "index.md":
        continue

    nav_ref = f"interviews/{path.name}"
    if nav_ref not in nav_refs:
        missing_generated_nav.append(nav_ref)

    if path.name not in index:
        missing_index.append(path.name)

if missing_generated_nav or missing_index:
    if missing_generated_nav:
        print("Interview reviews missing from generated MkDocs nav:")
        for item in missing_generated_nav:
            print(f"  - {item}")
    if missing_index:
        print("Interview reviews missing from docs/interviews/index.md:")
        for item in missing_index:
            print(f"  - {item}")
    raise SystemExit(1)

print("Interview review navigation is in sync.")
