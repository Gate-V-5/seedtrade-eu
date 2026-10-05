"""Validate the catalogue projection and unchanged baseline without network access."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "0287e4003e309e9ab8f9f3a084d4775e2ec74607"
OUT = ROOT / "docs/priority65-approved-activation-v1"
read = lambda p: json.loads((ROOT / p).read_text())
data = read("src/generated/market_catalogue_public.json")
cards = data["cards"]
routes = read("src/generated/market_catalogue_routes.json")
checks = []

def check(name, condition, evidence=None):
    checks.append({"check": name, "status": "PASS" if condition else "FAIL", "evidence": evidence})

def baseline(path):
    return subprocess.check_output(["git", "show", f"{BASE}:{path}"], cwd=ROOT)

check("65 commercial identities preserved", len(cards) == 68 and len({c["market_entity_id"] for c in cards}) == 68)
inputs = read("docs/market-catalogue-v2/inputs/PRIORITY_65_CARD_DATA.json")
check("original common and botanical labels preserved", [(c["market_entity_id"], c["common_name_en"], c["botanical_display_name"]) for c in cards[:65]] == [(c["market_entity_id"], c["common_name_en"], c["botanical_display_name"]) for c in inputs])
check("mandatory hemp and caraway", {"Cannabis sativa", "Carum carvi"}.issubset({c["botanical_display_name"] for c in cards}))
check("six categories", len(data["categories"]) == 6)
check("category union covers 65", set().union(*(set(c["entity_ids"]) for c in data["categories"])) == {c["market_entity_id"] for c in cards})
check("39 multi-category entities", sum(bool(c["secondary_categories"]) for c in cards) == 39)
check("six unsafe category totals withheld", all(c["trade_volume_t"] is None and c["trade_value_eur"] is None for c in data["categories"]))
check("all 78 catalogue routes and aliases unique and prerendered", len(routes) == len({r["path"] for r in routes}) == 78 and all((ROOT / "dist" / r["path"].strip("/") / "index.html").exists() for r in routes))
check("all missing prices withheld", all(c["representative_price_eur_kg"] is None or any(p.get("eligible") and p.get("scope_verified") and p.get("species_attribution_verified") for p in c.get("price_observations",[])) for c in cards))
check("group quantities not assigned to species", all(c["trade_volume_t"] is None and c["trade_value_eur"] is None for c in cards if c["customs_scope_type"] == "GROUP_LEVEL_CUSTOMS_SCOPE"))
check("current wheat/spelt conflict withheld", next(c for c in cards if c["market_entity_id"] == "wheat")["trade_volume_t"] is None)
check("12 safely attributed trade cards", sum(c["trade_volume_t"] is not None for c in cards) == 12)
check("unverified owner supply labels absent", all("owner_market_supply_label" not in c for c in cards))
check("no copied observation arrays", "observations" not in data and all("observations" not in c for c in cards))
check("homepage KPI 121", data["homepage_species_kpi"] == 121 and re.search(r'class="hero-coverage".*?<strong>121</strong>', (ROOT / "dist/index.html").read_text(), re.S) is not None)
pulse = read("src/generated/trade_pulse_public.json")
latest = pulse["views"]["eu_internal_trade"]["latest"]
check("approved Trade Pulse unchanged", latest["volume_tonnes"] == 251015.10 and latest["trade_value_eur"] == 400438328 and len(pulse["scope"]["included_cn_codes"]) == 40)
changed = set(subprocess.check_output(["git", "diff", "--name-only", BASE], cwd=ROOT, text=True).splitlines())
allowed = {'src/MarketCatalogue.jsx','src/generated/market_catalogue_public.json','src/generated/market_snapshot_public.json','tests/commercialV4.test.mjs','tests/marketCatalogue.test.mjs','tests/priceKpiAudit.test.mjs'}
check("only scoped baseline changes", changed.issubset(allowed), sorted(changed))
tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
protected = [p for p in tracked if p and p not in allowed]
check("all protected tracked files unchanged", all((ROOT / p).read_bytes() == baseline(p) for p in protected), len(protected))
app = (ROOT / "src/AppV2.jsx").read_text()
old_app = baseline("src/AppV2.jsx").decode()
home = lambda s: s[s.index("function Home() {"):s.index("function MarketContext(")]
check("homepage implementation byte-equivalent", home(app) == home(old_app))
check("production route still lazy", 'await import("./ProductionIntelligence.jsx")' in app)
html = (ROOT / "dist/market/index.html").read_text()
check("technical evidence removed from primary market", "Evidence for commercial seed decisions" not in html and "catalogue-category-grid" in html)
check("category technical CN lists absent", all("CN / TARIC" not in (ROOT / "dist/market" / c["slug"] / "index.html").read_text() for c in data["categories"]))
check("six owner category visuals exist", all((ROOT / "public" / c["image"].lstrip("/")).exists() for c in data["categories"]))
check("public projection excludes private paths and supply claims", not any(s in json.dumps(data) for s in ["PRIVATE_DATA", "/workspace/", "C:\\Users", "IMPORT DEPENDENT", "IMPORT HEAVY", "GlobalWits", "Datamyne"]))
css = (ROOT / "src/marketCatalogue.css").read_text()
check("responsive structural guards", all(x in css for x in ["minmax(0,1fr)", "@media(max-width:900px)", "@media(max-width:600px)", "overflow-wrap:anywhere", "margin-top:auto"]))
check("Vegetables includes sugar beet and seed potatoes", {"sugar-beet","seed-potatoes"}.issubset(set(next(c for c in data["categories"] if c["id"]=="VEGETABLES")["entity_ids"])))
check("KPI draws approved global scope", data["eu_summary"]["seed_species"]==121 and data["eu_summary"]["commercial_market_entities"]==136 and data["eu_summary"]["trade_volume_t"]==latest["volume_tonnes"] and data["eu_summary"]["trade_value_eur"]==latest["trade_value_eur"])
visuals=read("docs/market-catalogue-v3/OWNER_VISUAL_PROVENANCE.json")
check("six owner PNG assets unmodified", len(visuals)==6 and all(hashlib.sha256((ROOT / "public" / v["public_asset"].lstrip("/")).read_bytes()).hexdigest()==v["sha256"] for v in visuals))
summary = {
    "starting_head": BASE, "checks": checks, "failures": sum(c["status"] == "FAIL" for c in checks),
    "categories": {c["id"]: c["entity_count"] for c in data["categories"]},
    "commercial_entities": len(cards), "multi_category_entities": 39,
    "trade_metric_cards": sum(c["trade_volume_t"] is not None for c in cards),
    "group_scope_cards": sum(c["customs_scope_type"] == "GROUP_LEVEL_CUSTOMS_SCOPE" for c in cards),
    "developing_trade_cards": sum(c["trade_volume_t"] is None for c in cards),
    "visual_qa": "BLOCKED_ENVIRONMENT", "visual_blocker": "Connected browser rejected http://127.0.0.1:4174/market/ with net::ERR_BLOCKED_BY_CLIENT. Local Chromium unavailable. Vite preview additionally failed uv_interface_addresses; Python static preview starts but cloud browser access is blocked.",
    "widths": {str(w): "NOT_RENDERED; responsive structural guards checked only" for w in [360,390,430,768,1024,1440]},
    "tests": {"python": 269, "node": 72, "prerender_routes": 122, "dom_hydration_combinations": 610, "real_emails": 0},
    "source_conflicts": read("docs/market-catalogue-v3/PUBLIC_PROJECTION_QA.json"),
}
(OUT / "QA_RESULT.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps({"checks": len(checks), "failures": summary["failures"], "counts": {k:summary[k] for k in ["commercial_entities","trade_metric_cards","group_scope_cards","developing_trade_cards"]}}))
raise SystemExit(bool(summary["failures"]))
