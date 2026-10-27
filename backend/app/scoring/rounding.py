import math

from app.scoring import config as cfg


def round_half_up(value: float) -> int:
    """Scores and levels round half up (Python's round() rounds half to even)."""
    return math.floor(value + 0.5 + cfg.ROUNDING_EPSILON)
