"""Module 4, Talent Check: saved profile + company -> readiness score and per-skillset gaps.

Plain code, deterministic, no LLM (PLAN.md section 7). The levels are evidence-based
estimates from documents, not verified proficiency. Constants: app/scoring/config.py.
"""

from dataclasses import dataclass

from app.models.contract import SKILLSET_CODES, CandidateProfile, CategoryCode, Skill, SkillsetGap, TalentCheckResult
from app.scoring import config as cfg
from app.scoring.rounding import round_half_up
from app.services.company_data import Company
from app.services.normalization import canonical_name


@dataclass
class CategoryEstimate:
    level: int
    evidence_status: str  # none | claimed_only | evidenced


def _skill_tiers(profile: CandidateProfile) -> dict[str, float]:
    """canonical skill name -> strongest tier it reaches through an entry's skills_used."""
    sources = [
        (profile.internships, cfg.TIER_INTERNSHIP),
        (profile.projects, cfg.TIER_PROJECT),
        (profile.hackathons, cfg.TIER_HACKATHON),
        (profile.certifications, cfg.TIER_CERTIFICATION),
    ]
    tiers: dict[str, float] = {}
    for entries, tier in sources:
        for entry in entries:
            for name in entry.skills_used:
                key = canonical_name(name)
                tiers[key] = max(tiers.get(key, 0.0), tier)
    return tiers


def _unique_skills(profile: CandidateProfile) -> dict[str, Skill]:
    """One skill per canonical name, keeping the highest confidence, OTHER excluded."""
    unique: dict[str, Skill] = {}
    for skill in profile.skills:
        if skill.category_code is CategoryCode.OTHER:
            continue
        key = canonical_name(skill.skill_name)
        current = unique.get(key)
        if current is None or cfg.CONFIDENCE_WEIGHT[skill.confidence] > cfg.CONFIDENCE_WEIGHT[current.confidence]:
            unique[key] = skill
    return unique


def estimate_levels(profile: CandidateProfile) -> dict[CategoryCode, CategoryEstimate]:
    skills = _unique_skills(profile)
    tiers = _skill_tiers(profile)
    category_of = {key: skill.category_code for key, skill in skills.items()}
    experience_entries = [*profile.internships, *profile.projects, *profile.hackathons]

    estimates: dict[CategoryCode, CategoryEstimate] = {}
    for code in SKILLSET_CODES:
        in_category = {key: s for key, s in skills.items() if s.category_code is code}
        if not in_category:
            estimates[code] = CategoryEstimate(cfg.LEVEL_MIN, "none")
            continue

        strengths = [
            cfg.CONFIDENCE_WEIGHT[s.confidence] * tiers.get(key, cfg.TIER_SKILLS_LIST_ONLY)
            for key, s in in_category.items()
        ]
        depth = min(1.0, sum(strengths) / cfg.DEPTH_SATURATION)
        entries_using = sum(
            1 for e in experience_entries if any(category_of.get(canonical_name(n)) is code for n in e.skills_used)
        )
        experience = min(1.0, entries_using / cfg.EXPERIENCE_SATURATION)
        raw = cfg.DEPTH_WEIGHT * depth + cfg.EXPERIENCE_WEIGHT * experience
        level = min(cfg.LEVEL_MAX, cfg.LEVEL_MIN + round_half_up(cfg.LEVEL_SPAN * raw))

        claims_only = entries_using == 0 and all(key not in tiers for key in in_category)
        if claims_only:
            level = min(level, cfg.CLAIMS_ONLY_CAP)
        estimates[code] = CategoryEstimate(level, "claimed_only" if claims_only else "evidenced")
    return estimates


def run(profile: CandidateProfile, company: Company) -> TalentCheckResult:
    estimates = estimate_levels(profile)
    required = company.required_levels()
    gaps, weighted, total = [], 0.0, 0
    for code in SKILLSET_CODES:
        if code not in required:  # categories without a bar are skipped
            continue
        bar, estimate = required[code], estimates[code]
        weighted += bar * min(1.0, estimate.level / bar)  # no bonus for exceeding the bar
        total += bar
        gaps.append(SkillsetGap(
            category_code=code,
            required_level=bar,
            candidate_level=estimate.level,
            gap=estimate.level < bar,
            evidence_status=estimate.evidence_status,
        ))
    readiness = round_half_up(100 * weighted / total) if total else 0
    return TalentCheckResult(
        company=company.display_name,
        skillset_gap=gaps,
        readiness_score=readiness,
        scoring_version=cfg.TALENT_CHECK_VERSION,
    )
