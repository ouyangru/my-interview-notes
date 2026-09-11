from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
KNOWLEDGE = DOCS / "knowledge"

# 网页上的逻辑分组，不要求调整仓库里的历史目录结构。
MODULES = [
    (
        "基础知识",
        [
            ("C++", ["C++"]),
            ("操作系统", ["操作系统"]),
            ("Linux", ["Linux"]),
            ("网络与通信", ["网络", "计算机网络"]),
        ],
    ),
    (
        "项目与工程",
        [
            ("项目复盘", ["项目复盘"]),
            ("嵌入式 UI", ["嵌入式UI"]),
        ],
    ),
    (
        "AI Infra / 高性能",
        [
            (
                "AI Infra / 高性能",
                [
                    "AI Infra",
                    "AIInfra",
                    "AI-Infra",
                    "高性能",
                    "高性能网络",
                    "RDMA",
                    "GPU",
                    "CUDA",
                    "NCCL",
                    "HCCL",
                    "集合通信",
                ],
            ),
        ],
    ),
]

SPECIAL_ROOT_FILES = {"index.md", "STATUS.md"}


def _title_for(path: Path) -> str:
    """优先使用 Markdown 的一级标题作为侧栏名称。"""
    try:
        for line in path.read_text(encoding="utf-8").splitlines()[:80]:
            if line.startswith("# "):
                title = line[2:].strip()
                if title:
                    return title
    except (OSError, UnicodeError):
        pass
    return path.stem.replace("_", " ").replace("-", " ")


def _doc_ref(path: Path) -> str:
    return path.relative_to(DOCS).as_posix()


def _pages_for_dirs(dir_names):
    pages = []
    seen = set()
    for dir_name in dir_names:
        directory = KNOWLEDGE / dir_name
        if not directory.is_dir():
            continue
        for path in directory.rglob("*.md"):
            if path.name == "index.md":
                continue
            ref = _doc_ref(path)
            if ref in seen:
                continue
            seen.add(ref)
            pages.append(path)

    pages.sort(key=lambda path: (_title_for(path).casefold(), _doc_ref(path).casefold()))
    return [{_title_for(path): _doc_ref(path)} for path in pages]


def _known_directory_names():
    return {
        dir_name
        for _, module_groups in MODULES
        for _, dir_names in module_groups
        for dir_name in dir_names
    }


def build_knowledge_nav():
    nav = [
        {"当前复习状态": "knowledge/STATUS.md"},
        {"知识地图": "knowledge/index.md"},
    ]

    for module_name, module_groups in MODULES:
        groups = []
        for group_name, dir_names in module_groups:
            pages = _pages_for_dirs(dir_names)
            if pages:
                groups.append({group_name: pages})
        if groups:
            nav.append({module_name: groups})

    # 新建但还没有加入映射的目录也必须可见，避免“文件在仓库里、网页找不到”。
    known = _known_directory_names()
    other_groups = []
    if KNOWLEDGE.exists():
        for directory in sorted(
            (path for path in KNOWLEDGE.iterdir() if path.is_dir() and path.name not in known),
            key=lambda path: path.name.casefold(),
        ):
            pages = _pages_for_dirs([directory.name])
            if pages:
                other_groups.append({directory.name: pages})

    root_pages = []
    if KNOWLEDGE.exists():
        for path in sorted(KNOWLEDGE.glob("*.md"), key=lambda path: path.name.casefold()):
            if path.name in SPECIAL_ROOT_FILES:
                continue
            root_pages.append({_title_for(path): _doc_ref(path)})
    if root_pages:
        other_groups.append({"未分类": root_pages})

    if other_groups:
        nav.append({"其他沉淀": other_groups})

    return nav


def on_config(config):
    nav = config.get("nav") or []
    for item in nav:
        if isinstance(item, dict) and "个人知识库" in item:
            item["个人知识库"] = build_knowledge_nav()
            break
    return config
