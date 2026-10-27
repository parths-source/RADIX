"""Module 5, Skill Matching: candidate skills + one JD skill list -> match score, matched, missing.

Tiers per JD skill, first hit wins (PLAN.md section 8): exact -> alias -> fuzzy ->
optional LLM judge (ENABLE_LLM_MATCH, off by default). Constants: app/scoring/config.py.
Scoring v0.1 is decision D7, a proposal not yet reviewed by the user.
"""

import logging
from pathlib import Path
from typing import Optional

from pydantic import BaseModel
from rapidfuzz import fuzz

from app.errors import AppError
from app.models.contract import ExtractedSkillList, MatchedSkill, MissingSkill, Skill, SkillMatchResult
from app.scoring import config as cfg
from app.scoring.rounding import round_half_up
from app.services.llm import StructuredLLM
from app.services.normalization import canonical_name, normalize_name

logger = logging.getLogger(__name__)

JUDGE_PROMPT = Path(__file__).resolve().parent.parent / "prompts" / "skill_judge_v1.md"
NO_MATCH_REASON = "No matching skill in profile"


class JudgeVerdict(BaseModel):
    jd_skill: str
    candidate_skill: Optional[str] = None  # None when nothing in the profile covers it
    reason: str


class JudgeOut(BaseModel):
    verdicts: list[JudgeVerdict]


def _unique_jd_skills(jd: ExtractedSkillList) -> list[Skill]:
    """Duplicates count once; if any copy is required, the skill is required."""
    unique: dict[str, Skill] = {}
    for skill in jd.skills:
        key = canonical_name(skill.skill_name)
        if key not in unique:
            unique[key] = skill
        elif (skill.requirement_type or "required") == "required":
            unique[key] = unique[key].model_copy(update={"requirement_type": "required"})
    return list(unique.values())


def _requirement(skill: Skill) -> str:
    return skill.requirement_type or "required"


def _rule_match(jd_skill: Skill, candidates: list[Skill]) -> Optional[tuple[Skill, str, str]]:
    """(candidate skill, match_type, evidence) for the first rule tier that matches, else None."""
    jd_norm, jd_canon = normalize_name(jd_skill.skill_name), canonical_name(jd_skill.skill_name)
    for c in candidates:
        if normalize_name(c.skill_name) == jd_norm:
            return c, "exact", c.evidence or "Same skill name"
    for c in candidates:
        if canonical_name(c.skill_name) == jd_canon:
            return c, "alias", f"Alias of {c.skill_name}"
    best, best_ratio = None, 0.0
    for c in candidates:
        ratio = fuzz.ratio(jd_norm, normalize_name(c.skill_name))
        if ratio > best_ratio:
            best, best_ratio = c, ratio
    if best is not None and best_ratio >= cfg.FUZZY_MIN_RATIO:
        return best, "fuzzy", f"Similar name (similarity {round(best_ratio)})"
    return None


def _llm_judge(unmatched: list[Skill], candidates: list[Skill], llm: StructuredLLM) -> dict[str, tuple[Optional[Skill], str]]:
    """One batched call. Returns canonical JD name -> (candidate skill or None, reason). Failures return {}."""
    by_name = {canonical_name(c.skill_name): c for c in candidates}
    user = "JD skills to judge:\n" + "\n".join(f"- {s.skill_name} ({s.category_code.value})" for s in unmatched)
    user += "\n\nCandidate skills:\n" + "\n".join(f"- {c.skill_name} ({c.category_code.value})" for c in candidates)
    try:
        result = llm(JudgeOut, JUDGE_PROMPT.read_text(encoding="utf-8"), user)
    except Exception as exc:
        logger.warning("skill_judge_error error=%s", type(exc).__name__)
        return {}
    if result.parsed is None:
        logger.warning("skill_judge_invalid_output")
        return {}
    verdicts: dict[str, tuple[Optional[Skill], str]] = {}
    for v in result.parsed.verdicts:
        candidate = by_name.get(canonical_name(v.candidate_skill)) if v.candidate_skill else None
        verdicts[canonical_name(v.jd_skill)] = (candidate, " ".join(v.reason.split())[:200])
    return verdicts


def run(candidate_skills: list[Skill], jd: ExtractedSkillList, llm: StructuredLLM | None = None) -> SkillMatchResult:
    jd_skills = _unique_jd_skills(jd)
    if not jd_skills:
        raise AppError(422, "jd_has_no_skills", "This JD extraction has no skills to match against. Analyze the JD again.")

    matched: list[MatchedSkill] = []
    missing: list[tuple[int, Skill]] = []
    credit = 0.0
    for order, jd_skill in enumerate(jd_skills):
        hit = _rule_match(jd_skill, candidate_skills)
        if hit is None:
            missing.append((order, jd_skill))
            continue
        candidate, match_type, evidence = hit
        credit += cfg.REQUIREMENT_WEIGHT[_requirement(jd_skill)] * cfg.MATCH_QUALITY[match_type]
        matched.append(MatchedSkill(jd_skill=jd_skill.skill_name, candidate_skill=candidate.skill_name,
                                    category_code=jd_skill.category_code, match_type=match_type, evidence=evidence))

    reasons: dict[str, str] = {}
    if llm is not None and missing and candidate_skills:
        verdicts = _llm_judge([s for _, s in missing], candidate_skills, llm)
        still_missing = []
        for order, jd_skill in missing:
            candidate, reason = verdicts.get(canonical_name(jd_skill.skill_name), (None, ""))
            if candidate is None:
                if reason:
                    reasons[canonical_name(jd_skill.skill_name)] = reason
                still_missing.append((order, jd_skill))
                continue
            credit += cfg.REQUIREMENT_WEIGHT[_requirement(jd_skill)] * cfg.MATCH_QUALITY["llm"]
            matched.append(MatchedSkill(jd_skill=jd_skill.skill_name, candidate_skill=candidate.skill_name,
                                        category_code=jd_skill.category_code, match_type="llm", evidence=reason))
        missing = still_missing

    total = sum(cfg.REQUIREMENT_WEIGHT[_requirement(s)] for s in jd_skills)
    # Required before preferred, then the order the JD lists them.
    missing.sort(key=lambda item: (_requirement(item[1]) != "required", item[0]))
    return SkillMatchResult(
        jd_source_file=jd.source_file,
        match_score=round_half_up(100 * credit / total),
        matched_skills=matched,
        missing_skills=[
            MissingSkill(skill_name=s.skill_name, category_code=s.category_code,
                         reason=reasons.get(canonical_name(s.skill_name), NO_MATCH_REASON),
                         requirement_type=_requirement(s))
            for _, s in missing
        ],
        scoring_version=cfg.SKILL_MATCH_VERSION,
    )
