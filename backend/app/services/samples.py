"""The hackathon sample pack in data/samples (PLAN.md section 3b)."""

from pathlib import Path

from app.models.contract import SourceType

FOLDERS: dict[SourceType, str] = {"jd": "jds", "resume": "resumes"}
EXTENSIONS = (".docx", ".pdf")


def list_samples(data_dir: Path) -> list[dict]:
    samples = []
    for source_type, folder in FOLDERS.items():
        for path in sorted((data_dir / "samples" / folder).glob("*")):
            if path.suffix in EXTENSIONS:
                samples.append({
                    "sample_id": f"{source_type}:{path.name}",
                    "source_type": source_type,
                    "file_name": path.name,
                    "label": path.stem.replace("_", " ").title(),
                    "format": path.suffix[1:],
                    # PDFs were not supplied; ours are converted from the DOCX files.
                    "converted": path.suffix == ".pdf",
                })
    return samples


def resolve_sample(data_dir: Path, sample_id: str, source_type: SourceType) -> Path | None:
    """Only ids from list_samples resolve, so no path from the client reaches the filesystem."""
    for sample in list_samples(data_dir):
        if sample["sample_id"] == sample_id and sample["source_type"] == source_type:
            return data_dir / "samples" / FOLDERS[source_type] / sample["file_name"]
    return None
