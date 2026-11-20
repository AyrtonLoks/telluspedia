"""Build the J2000 catalog and HIP paths. See docs/DATA_SOURCES.md for inputs."""
import argparse
import csv
import json
import math
import re
import struct
from pathlib import Path

MAGNITUDE_LIMIT = 6.5
RECORD = struct.Struct("<IffffI")


def load_constellations(source, translations):
    messages = {
        json.loads(key): json.loads(value)
        for key, value in re.findall(
            r'^msgctxt "IAU constellation name"\nmsgid (".*")\nmsgstr (".*")$',
            translations.read_text(encoding="utf-8"),
            re.MULTILINE,
        )
    }
    constellations = []
    for constellation in json.loads(source.read_text(encoding="utf-8"))["constellations"]:
        names = constellation["common_name"]
        constellations.append({
            "iauCode": constellation["id"].split()[-1],
            "nameLat": names["native"],
            "namePt": messages[names["english"]],
            "paths": constellation["lines"],
        })
    if len({c["iauCode"] for c in constellations}) != 88 or not all(c["namePt"] for c in constellations):
        raise ValueError("Expected 88 distinct constellations with pt-BR labels")
    return sorted(constellations, key=lambda constellation: constellation["iauCode"])


def load_stars(source, required_hips):
    stars = []
    with source.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["id"] == "0" or not row["mag"]:  # The Sun is rendered separately.
                continue
            hip = int(row["hip"] or 0)
            magnitude = float(row["mag"])
            if magnitude > MAGNITUDE_LIMIT and hip not in required_hips:
                continue
            ra = (float(row["ra"]) * 15) % 360
            dec = float(row["dec"])
            bv = float(row["ci"]) if row["ci"] else math.nan
            if not all(map(math.isfinite, (ra, dec, magnitude))) or not -90 <= dec <= 90:
                raise ValueError(f"Invalid coordinates or magnitude for HYG {row['id']}")
            stars.append((magnitude, int(row["id"]), hip, ra, dec, bv, row["proper"]))

    missing = required_hips - {star[2] for star in stars}
    if missing:
        raise ValueError(f"Missing HIP references: {sorted(missing)}")
    return sorted(stars)


def write_catalog(target, stars):
    records = bytearray()
    names = bytearray(b"\0")
    for magnitude, _, hip, ra, dec, bv, name in stars:
        offset = len(names) if name else 0
        if name:
            names.extend(name.encode("utf-8") + b"\0")
        records.extend(RECORD.pack(hip, ra, dec, magnitude, bv, offset))

    visible = sum(magnitude <= MAGNITUDE_LIMIT for magnitude, *_ in stars)
    target.write_bytes(struct.pack("<4sII", b"HYG1", len(stars), visible) + records + names)
    print(f"{visible} stars through V={MAGNITUDE_LIMIT}, {len(stars) - visible} extra HIP vertices")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("hyg", type=Path)
    parser.add_argument("stellarium", type=Path)
    parser.add_argument("pt_br", type=Path)
    args = parser.parse_args()

    constellations = load_constellations(args.stellarium, args.pt_br)
    hips = {hip for constellation in constellations for path in constellation["paths"] for hip in path}
    output = Path(__file__).resolve().parents[1]
    write_catalog(output / "public/data/sky/hyg-v4.1.bin", load_stars(args.hyg, hips))
    (output / "src/lib/sky-constellations.json").write_text(
        json.dumps(constellations, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
