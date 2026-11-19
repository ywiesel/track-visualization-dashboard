"""Build the browser-readable inventory of Dataset 1 CSV files."""

import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = PROJECT_ROOT / "data"
MANIFEST_PATH = DATA_ROOT / "datasets.json"


def find_datasets():
    entries = []
    for csv_path in sorted(DATA_ROOT.glob("*/GT_FLD_*.csv")):
        entries.append({
            "cellTrack": csv_path.parent.name,
            "sequence": csv_path.stem.removeprefix("GT_"),
            "path": csv_path.relative_to(PROJECT_ROOT).as_posix(),
        })
    return entries


def main():
    entries = find_datasets()
    if not entries:
        raise SystemExit(f"No GT_FLD_*.csv files found under {DATA_ROOT}")

    MANIFEST_PATH.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(entries)} datasets to {MANIFEST_PATH.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
