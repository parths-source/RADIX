"""Every scoring constant lives here (CLAUDE.md rule 4). Scoring functions import, never hard-code.

Talent Check v0.1 (PLAN.md section 7, decision D6). These are judgment calls, tunable
after seeing real sample results; record any change in docs/DECISIONS.md.
"""

TALENT_CHECK_VERSION = "tc-v0.1"

# strength(s) = CONFIDENCE_WEIGHT[confidence] * tier(s)
CONFIDENCE_WEIGHT = {"high": 1.0, "medium": 0.7, "low": 0.4}

# tier(s): the strongest place the skill appears in a profile entry's skills_used.
TIER_INTERNSHIP = 1.0
TIER_PROJECT = 0.7  # projects and hackathons (D10: experience without a kind is a hackathon)
TIER_HACKATHON = 0.7
TIER_CERTIFICATION = 0.6
TIER_SKILLS_LIST_ONLY = 0.3

# D_c = min(1, sum of strengths / DEPTH_SATURATION): about three well-evidenced skills give full depth.
DEPTH_SATURATION = 2.5
# X_c = min(1, E_c / EXPERIENCE_SATURATION), E_c = internship/hackathon/project entries using category c.
EXPERIENCE_SATURATION = 3

# raw_c = DEPTH_WEIGHT * D_c + EXPERIENCE_WEIGHT * X_c
DEPTH_WEIGHT = 0.6
EXPERIENCE_WEIGHT = 0.4

# candidate_level_c = LEVEL_MIN + round_half_up(LEVEL_SPAN * raw_c)
LEVEL_MIN = 1
LEVEL_MAX = 10
LEVEL_SPAN = LEVEL_MAX - LEVEL_MIN

# A category backed only by a skills list (no experience, no certification) cannot exceed this level.
CLAIMS_ONLY_CAP = 5

# Float tolerance so values like 4.4999999999 from binary arithmetic round as the exact 4.5 they represent.
ROUNDING_EPSILON = 1e-9


# Skill Matching v0.1 (PLAN.md section 8, decision D7 — a [Proposal] the user has not reviewed yet).

SKILL_MATCH_VERSION = "sm-v0.1"

# Quality credited to a JD skill by the first tier that matches it.
MATCH_QUALITY = {"exact": 1.0, "alias": 1.0, "fuzzy": 0.8, "llm": 0.6}

# rapidfuzz.fuzz.ratio on normalized names (0-100). Never partial/token ratios: they match Java to JavaScript.
FUZZY_MIN_RATIO = 88

# match_score = 100 * sum(weight * quality over matched) / sum(weight over all JD skills)
REQUIREMENT_WEIGHT = {"required": 1.0, "preferred": 0.5}
