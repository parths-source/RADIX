from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.services.samples import list_samples

router = APIRouter()


@router.get("/samples")
def samples(settings: Settings = Depends(get_settings)) -> dict:
    return {"samples": list_samples(settings.data_dir)}
