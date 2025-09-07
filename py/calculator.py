from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Any


@dataclass
class Ingredient:
    name: str
    volume_ml: float
    abv_percent: float = 0.0
    brix: float = 0.0


@dataclass
class MixResult:
    total_volume_ml: float
    final_abv_percent: float
    final_brix: float
    ethanol_ml: float
    sugar_mass_g: float


def aggregate(ingredients: List[Ingredient]) -> Dict[str, float]:
    total_volume_ml = 0.0
    ethanol_ml = 0.0
    sugar_mass_g = 0.0

    for ing in ingredients:
        v = max(0.0, float(ing.volume_ml))
        abv_frac = max(0.0, min(100.0, float(ing.abv_percent))) / 100.0
        brix_frac = max(0.0, min(100.0, float(ing.brix))) / 100.0

        total_volume_ml += v
        ethanol_ml += v * abv_frac
        sugar_mass_g += v * brix_frac  # assume density ~ 1 g/mL

    return {
        "total_volume_ml": total_volume_ml,
        "ethanol_ml": ethanol_ml,
        "sugar_mass_g": sugar_mass_g,
    }


def compute(agg: Dict[str, float]) -> MixResult:
    total_volume_ml = agg.get("total_volume_ml", 0.0)
    ethanol_ml = agg.get("ethanol_ml", 0.0)
    sugar_mass_g = agg.get("sugar_mass_g", 0.0)

    final_abv_percent = (ethanol_ml / total_volume_ml * 100.0) if total_volume_ml > 0 else 0.0

    # °Bx approximation using mass fraction (density ~= 1 g/mL)
    total_mass_g = total_volume_ml
    final_brix = (sugar_mass_g / total_mass_g * 100.0) if total_mass_g > 0 else 0.0

    return MixResult(
        total_volume_ml=round(total_volume_ml, 4),
        final_abv_percent=round(final_abv_percent, 4),
        final_brix=round(final_brix, 4),
        ethanol_ml=round(ethanol_ml, 4),
        sugar_mass_g=round(sugar_mass_g, 4),
    )


def mix(ingredients: List[Ingredient]) -> MixResult:
    return compute(aggregate(ingredients))


def ingredient_from_dict(d: Dict[str, Any]) -> Ingredient:
    return Ingredient(
        name=str(d.get("name", "")),
        volume_ml=float(d.get("volume_ml", 0.0)),
        abv_percent=float(d.get("abv_percent", 0.0)),
        brix=float(d.get("brix", 0.0)),
    )


