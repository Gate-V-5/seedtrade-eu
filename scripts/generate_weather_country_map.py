"""Generate a compact, static Europe basemap from Natural Earth public-domain geometry.

Run manually when the cartographic source changes. The Hostinger build uses only
the checked-in generated JSON and never needs Python or a network request.
"""

import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
WEST, EAST, SOUTH, NORTH = -13, 37, 34, 62
WIDTH, HEIGHT = 900, 530


def projected(point):
    longitude, latitude = point[:2]
    return [round((longitude - WEST) / (EAST - WEST) * WIDTH, 1), round((NORTH - latitude) / (NORTH - SOUTH) * HEIGHT, 1)]


def rings(geometry):
    coordinates = geometry["coordinates"]
    return [coordinates] if geometry["type"] == "Polygon" else coordinates


def render_path(geometry):
    parts = []
    for polygon in rings(geometry):
        for ring in polygon:
            if not ring or not any(WEST - 5 <= p[0] <= EAST + 5 and SOUTH - 5 <= p[1] <= NORTH + 5 for p in ring):
                continue
            points = [projected(point) for point in ring]
            parts.append("M" + " L".join(f"{x:g},{y:g}" for x, y in points) + " Z")
    return " ".join(parts)


def main():
    with urllib.request.urlopen(SOURCE, timeout=30) as response:
        raw = response.read()
    source = json.loads(raw)
    monitored = json.loads((ROOT / "src/generated/weather_public.json").read_text())
    counts = {}
    for region in monitored["regions"]:
        counts[region["code"].split("_")[0]] = counts.get(region["code"].split("_")[0], 0) + 1
    countries = []
    for feature in source["features"]:
        properties = feature["properties"]
        code = properties.get("ISO_A2_EH") or properties.get("ISO_A2")
        path = render_path(feature["geometry"])
        if not path:
            continue
        # Retain nearby coastlines as context, but no unmonitored area is marked.
        label = projected([properties["LABEL_X"], properties["LABEL_Y"]]) if properties.get("LABEL_X") is not None else None
        countries.append({"code": code, "name": properties["ADMIN"], "path": path, "label": label if code in counts else None})
    assert counts.keys() <= {country["code"] for country in countries}
    output = {
        "source": SOURCE,
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "license": "Natural Earth public domain; https://www.naturalearthdata.com/about/terms-of-use/",
        "extent": [WEST, SOUTH, EAST, NORTH],
        "view_box": [0, 0, WIDTH, HEIGHT],
        "monitored_country_counts": counts,
        "countries": sorted(countries, key=lambda item: (item["code"] in counts, item["name"])),
    }
    target = ROOT / "src/generated/europe_country_map_public.json"
    target.write_text(json.dumps(output, separators=(",", ":"), ensure_ascii=False) + "\n")
    print(f"{target}: {len(countries)} country shapes, {sum(counts.values())} monitored regions, source SHA256 {output['source_sha256']}")


if __name__ == "__main__":
    main()
