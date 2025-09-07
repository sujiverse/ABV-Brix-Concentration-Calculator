from __future__ import annotations

import argparse
import json
from typing import List

from .calculator import Ingredient, mix, ingredient_from_dict


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Mixing calculator for ABV and Brix")
    p.add_argument("--ingredients", "-i", type=str, help="JSON array of ingredients")
    p.add_argument("--file", "-f", type=str, help="Path to JSON file with ingredients[]")
    return p.parse_args()


def load_ingredients(args: argparse.Namespace) -> List[Ingredient]:
    data = None
    if args.ingredients:
        data = json.loads(args.ingredients)
    elif args.file:
        with open(args.file, "r", encoding="utf-8") as rf:
            data = json.load(rf)
    else:
        raise SystemExit("Provide --ingredients '[...]' or --file path.json")

    if isinstance(data, dict) and "ingredients" in data:
        data = data["ingredients"]

    if not isinstance(data, list):
        raise SystemExit("Input must be a list of ingredients")

    return [ingredient_from_dict(d) for d in data]


def main() -> None:
    args = parse_args()
    ingredients = load_ingredients(args)
    result = mix(ingredients)
    print(json.dumps(result.__dict__, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()


