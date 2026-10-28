"""Company bars derived from each company's sample JDs (decision D20).

The organizers supplied no company export, so each company's required level per skillset
comes from the distinct skills its JDs ask for in that skillset (required 1, preferred 0.5).
This is a documented rule over real files, not RADIX hiring data, and the output says so.
"""

from collections import defaultdict
from datetime import date

from app.models.contract import SKILLSET_CODES, CategoryCode, ExtractedSkillList
from app.scoring import config as cfg
from app.scoring.rounding import round_half_up
from app.services.company_data import CompanyData

METHOD = "derived_from_jds"
SOURCE = "derived from each company's two sample JDs (data/fixtures), not RADIX hiring data"


def level_for(weighted: float) -> int:
    level = cfg.COMPANY_BASE_LEVEL + round_half_up(cfg.COMPANY_PER_SKILL * weighted)
    return max(cfg.COMPANY_BASE_LEVEL, min(cfg.COMPANY_MAX_LEVEL, level))


def weighted_counts(jds: list[ExtractedSkillList]) -> dict[CategoryCode, float]:
    """Per skillset, the weight of the distinct skills these JDs ask for. A skill named in
    several JDs counts once, at its strongest requirement (required beats preferred)."""
    strongest: dict[tuple[CategoryCode, str], float] = {}
    for jd in jds:
        for skill in jd.skills:
            if skill.category_code == CategoryCode.OTHER:
                continue
            weight = cfg.REQUIREMENT_WEIGHT[skill.requirement_type or "required"]
            key = (skill.category_code, " ".join(skill.skill_name.split()).casefold())
            strongest[key] = max(strongest.get(key, 0.0), weight)
    totals: dict[CategoryCode, float] = defaultdict(float)
    for (code, _), weight in strongest.items():
        totals[code] += weight
    return {code: totals.get(code, 0.0) for code in SKILLSET_CODES}


def derive_company_data(template: CompanyData, jds: list[ExtractedSkillList], today: date) -> dict:
    """Build the company file (same shape as the placeholder) from the JD extractions.
    Company keys, names and aliases come from the template; every company needs at least one JD."""
    by_company: dict[str, list[ExtractedSkillList]] = defaultdict(list)
    for jd in jds:
        company = template.find(jd.company or "")
        if company is None:
            raise ValueError(f"{jd.source_file}: company {jd.company!r} matches no company in the template")
        by_company[company.company_key].append(jd)

    companies = []
    for company in template.companies:
        company_jds = by_company.get(company.company_key)
        if not company_jds:
            raise ValueError(f"no JD found for {company.display_name}")
        counts = weighted_counts(company_jds)
        companies.append({
            "company_key": company.company_key,
            "display_name": company.display_name,
            "aliases": company.aliases,
            "derived_from": sorted(jd.source_file for jd in company_jds),
            "skillsets": [{"category_code": code.value, "required_level": level_for(counts[code])} for code in SKILLSET_CODES],
        })
    note = (
        f"required_level = clamp({cfg.COMPANY_BASE_LEVEL} + round_half_up({cfg.COMPANY_PER_SKILL:g} x weighted), "
        f"{cfg.COMPANY_BASE_LEVEL}, {cfg.COMPANY_MAX_LEVEL}); weighted = distinct skills the company's JDs ask for "
        "in the skillset, required 1, preferred 0.5. Replace with a real staging_company_skill_levels export when available."
    )
    return {
        "_meta": {"source": SOURCE, "dummy": False, "method": METHOD, "exported_at": today.isoformat(), "note": note},
        "companies": companies,
    }
