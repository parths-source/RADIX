"""Company expectations (D4): one JSON file, validated at startup.

Uses data/talent_check_company_skillsets.json when present (derived from the sample JDs,
decision D20, until a real export replaces it), else data/company_skillsets.placeholder.json,
which must be marked "dummy": true.
Any problem raises CompanyDataError with a message saying what to fix.
"""

import json
import re
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.models.contract import SKILLSET_CODES, CategoryCode, Level, NonEmptyStr


class CompanyDataError(RuntimeError):
    pass


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class CompanySkillset(_Strict):
    category_code: CategoryCode
    required_level: Level

    @field_validator("category_code", mode="before")
    @classmethod
    def _code_from_str(cls, value):
        # strict mode would otherwise refuse a plain string for the enum
        return CategoryCode(value) if isinstance(value, str) else value


class Company(_Strict):
    company_key: NonEmptyStr
    display_name: NonEmptyStr
    aliases: list[NonEmptyStr] = Field(default_factory=list)
    derived_from: list[NonEmptyStr] = Field(default_factory=list)  # JD files the bars were derived from (D20)
    skillsets: list[CompanySkillset]

    @field_validator("skillsets")
    @classmethod
    def _exactly_the_twelve(cls, skillsets: list[CompanySkillset]) -> list[CompanySkillset]:
        codes = [s.category_code for s in skillsets]
        duplicates = sorted({c.value for c in codes if codes.count(c) > 1})
        if duplicates:
            raise ValueError(f"duplicate category codes: {', '.join(duplicates)}")
        missing = [c.value for c in SKILLSET_CODES if c not in codes]
        if missing:
            raise ValueError(f"missing category codes: {', '.join(missing)}")
        if CategoryCode.OTHER in codes:
            raise ValueError("OTHER is not one of the 12 skillsets")
        return skillsets

    def required_levels(self) -> dict[CategoryCode, int]:
        return {s.category_code: s.required_level for s in self.skillsets}


class CompanyDataMeta(_Strict):
    source: str
    dummy: bool
    method: str | None = None  # "derived_from_jds" for the D20 file; None for a real export
    exported_at: str | None = None
    note: str | None = None


class CompanyData(_Strict):
    meta: CompanyDataMeta = Field(alias="_meta")
    companies: list[Company] = Field(min_length=1)

    @property
    def dummy(self) -> bool:
        return self.meta.dummy

    def find(self, name_or_key: str) -> Company | None:
        """Match a company_key, display name or alias, ignoring case and spacing."""
        wanted = _key(name_or_key)
        for company in self.companies:
            names = [company.company_key, company.display_name, *company.aliases]
            if wanted in {_key(n) for n in names}:
                return company
        return None


def _key(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip()).casefold()


def load_company_data(real_path: Path, placeholder_path: Path) -> CompanyData:
    using_placeholder = not real_path.is_file()
    path = placeholder_path if using_placeholder else real_path
    if not path.is_file():
        raise CompanyDataError(f"No company data found. Expected {real_path} or {placeholder_path}.")
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise CompanyDataError(f"{path.name} is not valid JSON: {exc}") from exc
    try:
        data = CompanyData.model_validate(raw)
    except ValidationError as exc:
        raise CompanyDataError(f"{path.name} is invalid:\n{exc}") from exc

    keys = [c.company_key for c in data.companies]
    if len(keys) != len(set(keys)):
        raise CompanyDataError(f"{path.name} has duplicate company_key values")
    if using_placeholder and not data.dummy:
        raise CompanyDataError(f"{path.name} is the placeholder and must set _meta.dummy to true")
    return data
