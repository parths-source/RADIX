"""Skill-name normalization (PLAN.md section 8).

normalize_name: lowercase, trim, collapse whitespace, strip punctuation noise
but keep + # . so C++, C# and Node.js survive. canonical_name additionally maps
through data/skill_aliases.json (keys and values normalized on load).
"""

import json
import re
from functools import lru_cache
from pathlib import Path

from app.config import REPO_ROOT

ALIASES_PATH = REPO_ROOT / "data" / "skill_aliases.json"

_NOISE = re.compile(r"[^\w\s+#.]")


def normalize_name(name: str) -> str:
    text = _NOISE.sub(" ", name.lower())
    text = re.sub(r"\s+", " ", text).strip()
    return text.strip(".").strip()


@lru_cache
def load_aliases(path: Path = ALIASES_PATH) -> dict[str, str]:
    raw = json.loads(path.read_text(encoding="utf-8"))["aliases"]
    return {normalize_name(k): normalize_name(v) for k, v in raw.items()}


def canonical_name(name: str) -> str:
    normalized = normalize_name(name)
    return load_aliases().get(normalized, normalized)
